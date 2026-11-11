<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Matcher Controller
 * Spiritual Gifts & Community Matcher
 *
 * Fetches live Ministries & D-Groups from DB,
 * then scores user quiz answers using weighted keyword matching
 * to recommend the best-fit Ministry team AND D-Group.
 *
 * GET  /api/matcher/config   → returns quiz questions + live ministry/dgroup options
 * POST /api/matcher/suggest  → accepts quiz answers, returns ranked recommendations
 */
class Matcher extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    // ─────────────────────────────────────────────
    // GET /api/matcher/config
    // Returns quiz questions + live ministry & dgroup lists
    // ─────────────────────────────────────────────
    public function config()
    {
        // Fetch active ministries
        $ministries = $this->db->raw(
            "SELECT id, name, icon, description, slots_available,
                    (SELECT COUNT(*) FROM members WHERE ministry_id = m.id AND is_active = 1) AS volunteer_count
             FROM ministries m WHERE m.is_active = 1 ORDER BY m.id ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        // Fetch all dgroups
        $dgroups = $this->db->raw(
            "SELECT d.id, d.name, d.description, d.schedule, d.location,
                    COUNT(m.id) AS member_count
             FROM dgroups d
             LEFT JOIN members m ON m.dgroup_id = d.id AND m.is_active = 1
             GROUP BY d.id ORDER BY d.id ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        // Normalize types
        foreach ($ministries as &$row) {
            $row['volunteer_count'] = (int) $row['volunteer_count'];
            $row['slots_available'] = $row['slots_available'] ? (int) $row['slots_available'] : null;
        }
        foreach ($dgroups as &$row) {
            $row['member_count'] = (int) $row['member_count'];
        }

        api_response([
            'questions'  => $this->getQuestions(),
            'ministries' => $ministries,
            'dgroups'    => $dgroups,
        ]);
    }

    // ─────────────────────────────────────────────
    // POST /api/matcher/suggest
    // Body: { answers: { q1: "option_key", q2: "...", ... } }
    // Returns: { ministry: {..., score}, dgroup: {..., score}, all_ministry_scores, all_dgroup_scores }
    // ─────────────────────────────────────────────
    public function suggest()
    {
        $input   = api_input();
        $answers = $input['answers'] ?? [];

        if (empty($answers) || !is_array($answers)) {
            api_response(['error' => 'Quiz answers are required.'], 422);
        }

        // Fetch live ministries & dgroups
        $ministries = $this->db->raw(
            "SELECT id, name, icon, description, slots_available,
                    (SELECT COUNT(*) FROM members WHERE ministry_id = m.id AND is_active = 1) AS volunteer_count
             FROM ministries m WHERE m.is_active = 1 ORDER BY m.id ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $dgroups = $this->db->raw(
            "SELECT d.id, d.name, d.description, d.schedule, d.location,
                    COUNT(m.id) AS member_count
             FROM dgroups d
             LEFT JOIN members m ON m.dgroup_id = d.id AND m.is_active = 1
             GROUP BY d.id ORDER BY d.id ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        // Build scoring signals from answers
        $signals = $this->buildSignals($answers);

        // Score each ministry
        $ministryScores = [];
        foreach ($ministries as $m) {
            $score = $this->scoreMinistry($m, $signals);
            $ministryScores[] = array_merge($m, [
                'score'          => $score,
                'volunteer_count'=> (int)$m['volunteer_count'],
                'slots_available'=> $m['slots_available'] ? (int)$m['slots_available'] : null,
            ]);
        }
        usort($ministryScores, fn($a, $b) => $b['score'] <=> $a['score']);

        // Score each dgroup
        $dgroupScores = [];
        foreach ($dgroups as $d) {
            $score = $this->scoreDGroup($d, $signals);
            $dgroupScores[] = array_merge($d, [
                'score'        => $score,
                'member_count' => (int)$d['member_count'],
            ]);
        }
        usort($dgroupScores, fn($a, $b) => $b['score'] <=> $a['score']);

        // Top picks
        $topMinistry = $ministryScores[0] ?? null;
        $topDGroup   = $dgroupScores[0] ?? null;

        // Build personality summary label
        $personalityLabel = $this->buildPersonalityLabel($signals);

        api_response([
            'success'              => true,
            'personality'          => $personalityLabel,
            'signals'              => $signals,
            'top_ministry'         => $topMinistry,
            'top_dgroup'           => $topDGroup,
            'all_ministry_scores'  => $ministryScores,
            'all_dgroup_scores'    => $dgroupScores,
        ]);
    }

    // ─────────────────────────────────────────────
    // Build a weighted signal vector from quiz answers (5 Questions)
    // ─────────────────────────────────────────────
    private function buildSignals(array $answers): array
    {
        $signals = [
            // Ministry affinity
            'worship'          => 0,
            'media'            => 0,
            'hospitality'      => 0,
            'outreach'         => 0,
            'children'         => 0,
            // D-Group affinity
            'youth'            => 0,
            'young_professional' => 0,
            'minsu'            => 0,
            'boys'             => 0,
            'girls'            => 0,
            // Personality traits
            'creative'         => 0,
            'technical'        => 0,
            'relational'       => 0,
            'leadership'       => 0,
            'introverted'      => 0,
        ];

        // 5-Question Scoring Map
        $scoringMap = [
            // Q1: Calling & Primary Gifts
            'gift' => [
                'worship_arts'  => ['worship' => 6, 'creative' => 4],
                'technology'    => ['media' => 6, 'technical' => 5],
                'hospitality'   => ['hospitality' => 6, 'relational' => 4],
                'evangelism'    => ['outreach' => 6, 'leadership' => 3],
                'children_care' => ['children' => 6, 'relational' => 4, 'youth' => 2],
            ],
            // Q2: How you prefer to serve during events
            'serve_style' => [
                'on_stage'        => ['worship' => 5, 'creative' => 4, 'leadership' => 2],
                'behind_camera'   => ['media' => 6, 'technical' => 5, 'introverted' => 3],
                'greet_people'    => ['hospitality' => 6, 'relational' => 5],
                'community_hands' => ['outreach' => 6, 'leadership' => 3, 'relational' => 3],
                'kids_teaching'   => ['children' => 6, 'relational' => 4],
            ],
            // Q3: Life stage & community fit
            'life_stage' => [
                'high_school_college' => ['youth' => 6, 'relational' => 3],
                'minsu_student'       => ['minsu' => 7, 'youth' => 3],
                'young_professional'  => ['young_professional' => 7, 'leadership' => 3],
                'young_men'           => ['boys' => 7, 'youth' => 3],
                'young_women'         => ['girls' => 7, 'youth' => 3],
            ],
            // Q4: Availability & fellowship routine
            'availability' => [
                'sat_afternoon' => ['youth' => 4, 'girls' => 4],
                'sat_evening'   => ['young_professional' => 5],
                'fri_evening'   => ['boys' => 5],
                'mon_morning'   => ['minsu' => 5],
                'flexible'      => ['youth' => 2, 'young_professional' => 2, 'minsu' => 2],
            ],
            // Q5: Heart & growth desire
            'community_desire' => [
                'grow_in_faith'         => ['youth' => 3, 'young_professional' => 3, 'minsu' => 3],
                'brotherhood_sisterhood'=> ['boys' => 4, 'girls' => 4, 'relational' => 5],
                'campus_impact'         => ['minsu' => 5, 'outreach' => 4],
                'use_gifts'             => ['worship' => 3, 'media' => 3, 'children' => 3, 'hospitality' => 3],
                'mentor_others'         => ['young_professional' => 4, 'children' => 4, 'leadership' => 4],
            ],
        ];

        foreach ($answers as $questionKey => $answerKey) {
            if (isset($scoringMap[$questionKey][$answerKey])) {
                foreach ($scoringMap[$questionKey][$answerKey] as $signal => $weight) {
                    if (isset($signals[$signal])) {
                        $signals[$signal] += $weight;
                    }
                }
            }
        }

        return $signals;
    }

    // ─────────────────────────────────────────────
    // Score a Ministry based on signals
    // ─────────────────────────────────────────────
    private function scoreMinistry(array $ministry, array $signals): int
    {
        $name = strtolower($ministry['name'] ?? '');
        $desc = strtolower($ministry['description'] ?? '');
        $combined = $name . ' ' . $desc;

        $score = 0;

        $keywordSignals = [
            'worship'    => ['worship', 'music', 'sing', 'choir', 'instrument', 'band', 'praise'],
            'media'      => ['media', 'tech', 'camera', 'video', 'sound', 'livestream', 'streaming', 'presentation', 'graphic'],
            'hospitality'=> ['usher', 'greet', 'welcome', 'hospitality', 'seat', 'host'],
            'outreach'   => ['outreach', 'evangelism', 'community', 'mission', 'social'],
            'children'   => ['children', 'kids', 'youngest', 'teach', 'nurture', 'child'],
        ];

        foreach ($keywordSignals as $signal => $keywords) {
            foreach ($keywords as $kw) {
                if (strpos($combined, $kw) !== false) {
                    $score += ($signals[$signal] ?? 0) * 2;
                    break;
                }
            }
        }

        if (strpos($name, 'worship') !== false)     $score += ($signals['worship'] ?? 0) * 3;
        if (strpos($name, 'media') !== false)       $score += ($signals['media'] ?? 0) * 3;
        if (strpos($name, 'usher') !== false || strpos($name, 'greet') !== false) $score += ($signals['hospitality'] ?? 0) * 3;
        if (strpos($name, 'outreach') !== false)    $score += ($signals['outreach'] ?? 0) * 3;
        if (strpos($name, 'children') !== false)    $score += ($signals['children'] ?? 0) * 3;

        return $score;
    }

    // ─────────────────────────────────────────────
    // Score a D-Group based on signals
    // ─────────────────────────────────────────────
    private function scoreDGroup(array $dgroup, array $signals): int
    {
        $name = strtolower($dgroup['name'] ?? '');
        $desc = strtolower($dgroup['description'] ?? '');
        $sched = strtolower($dgroup['schedule'] ?? '');
        $loc = strtolower($dgroup['location'] ?? '');
        $combined = $name . ' ' . $desc . ' ' . $sched . ' ' . $loc;

        $score = 0;

        if (strpos($combined, 'minsu') !== false) {
            $score += ($signals['minsu'] ?? 0) * 4;
        }
        if (strpos($combined, 'boy') !== false || strpos($combined, 'brotherhood') !== false) {
            $score += ($signals['boys'] ?? 0) * 4;
        }
        if (strpos($combined, 'girl') !== false || strpos($combined, 'sisterhood') !== false) {
            $score += ($signals['girls'] ?? 0) * 4;
        }
        if (strpos($combined, 'young pro') !== false || strpos($combined, 'professional') !== false || strpos($combined, 'career') !== false) {
            $score += ($signals['young_professional'] ?? 0) * 4;
        }
        if (strpos($combined, 'youth ministry') !== false || strpos($combined, 'high school') !== false || strpos($combined, 'college') !== false) {
            $score += ($signals['youth'] ?? 0) * 3;
        }

        // Schedule boosts
        if (strpos($sched, 'friday') !== false) {
            $score += ($signals['boys'] ?? 0) * 2;
        }
        if (strpos($sched, 'monday') !== false) {
            $score += ($signals['minsu'] ?? 0) * 2;
        }
        if (strpos($sched, '5:00') !== false) {
            $score += ($signals['young_professional'] ?? 0) * 2;
        }
        if (strpos($sched, '1:30') !== false) {
            $score += ($signals['youth'] ?? 0) + ($signals['girls'] ?? 0);
        }

        return $score;
    }

    // ─────────────────────────────────────────────
    // Generate a human-readable personality summary
    // ─────────────────────────────────────────────
    private function buildPersonalityLabel(array $signals): array
    {
        // Top ministry signal
        $ministrySignals = [
            'worship'     => $signals['worship'] ?? 0,
            'media'       => $signals['media'] ?? 0,
            'hospitality' => $signals['hospitality'] ?? 0,
            'outreach'    => $signals['outreach'] ?? 0,
            'children'    => $signals['children'] ?? 0,
        ];
        arsort($ministrySignals);
        $topMinistrySignal = array_key_first($ministrySignals) ?? 'worship';

        // Top dgroup signal
        $dgroupSignals = [
            'youth'              => $signals['youth'] ?? 0,
            'young_professional' => $signals['young_professional'] ?? 0,
            'minsu'              => $signals['minsu'] ?? 0,
            'boys'               => $signals['boys'] ?? 0,
            'girls'              => $signals['girls'] ?? 0,
        ];
        arsort($dgroupSignals);
        $topDGroupSignal = array_key_first($dgroupSignals) ?? 'youth';

        // Top personality trait
        $traitSignals = [
            'creative'    => $signals['creative'] ?? 0,
            'technical'   => $signals['technical'] ?? 0,
            'relational'  => $signals['relational'] ?? 0,
            'leadership'  => $signals['leadership'] ?? 0,
            'introverted' => $signals['introverted'] ?? 0,
        ];
        arsort($traitSignals);
        $topTrait = array_key_first($traitSignals) ?? 'relational';

        $ministryLabels = [
            'worship'     => ['label' => 'The Worshipper', 'description' => 'You come alive when the music starts and your heart overflows in praise. Your gift is creating an atmosphere where others encounter God.'],
            'media'       => ['label' => 'The Production Builder', 'description' => 'You love making sure everything runs smoothly behind the scenes so people can experience the service without distraction.'],
            'hospitality' => ['label' => 'The Welcomer', 'description' => 'You have the gift of making every person feel immediately seen and at home. You are the warmth in every room.'],
            'outreach'    => ['label' => 'The Messenger', 'description' => 'You carry a passion to reach the community, bless families, and share God’s love beyond the walls of the church.'],
            'children'    => ['label' => 'The Youth Mentor', 'description' => 'You have an inspiring heart to guide, teach, and care for younger generations on their faith journey.'],
        ];

        $label = $ministryLabels[$topMinistrySignal] ?? ['label' => 'The Servant Heart', 'description' => 'You are gifted in multiple areas with a humble heart ready to serve wherever needed.'];

        return [
            'key'                => $topMinistrySignal,
            'label'              => $label['label'],
            'description'        => $label['description'],
            'top_ministry_signal'=> $topMinistrySignal,
            'top_dgroup_signal'  => $topDGroupSignal,
            'top_trait'          => $topTrait,
        ];
    }

    // ─────────────────────────────────────────────
    // Static 5-question quiz definition
    // Matches the 5 active Ministries & 5 active D-Groups
    // ─────────────────────────────────────────────
    private function getQuestions(): array
    {
        return [
            [
                'key'      => 'gift',
                'question' => 'What do you feel is your primary calling or spiritual gift?',
                'icon'     => 'gift',
                'options'  => [
                    ['key' => 'worship_arts',  'label' => 'Worship & Music',           'description' => 'Expressing praise through instruments, vocals, singing, or creative arts.'],
                    ['key' => 'technology',    'label' => 'Media & Production Tech',   'description' => 'Operating cameras, livestream, audio boards, or graphic visuals.'],
                    ['key' => 'hospitality',   'label' => 'Ushers & Hospitality',      'description' => 'Welcoming guests, guiding seating, and creating a hospitable environment.'],
                    ['key' => 'evangelism',    'label' => 'Outreach & Missions',       'description' => 'Community outreach, evangelism drives, and blessing families in need.'],
                    ['key' => 'children_care', 'label' => 'Children’s Ministry',        'description' => 'Nurturing the faith of the youngest generation through teaching and care.'],
                ],
            ],
            [
                'key'      => 'serve_style',
                'question' => 'How do you prefer to serve during gatherings and events?',
                'icon'     => 'serve_style',
                'options'  => [
                    ['key' => 'on_stage',        'label' => 'On-Stage / Musical Worship', 'description' => 'Leading singing, band instruments, or stage platform ministry.'],
                    ['key' => 'behind_camera',   'label' => 'Behind the Scenes & Systems', 'description' => 'Running technical production, cameras, video, sound, or media.'],
                    ['key' => 'greet_people',    'label' => 'Welcoming Guests at the Door', 'description' => 'First impressions, warm smiles, ushers, and fellowship care.'],
                    ['key' => 'community_hands', 'label' => 'Hands-On Community Action',  'description' => 'Active community work, relief distribution, and campus outreach.'],
                    ['key' => 'kids_teaching',   'label' => 'Guiding & Teaching Young Kids', 'description' => 'Interactive lessons, fun faith activities, and children mentorship.'],
                ],
            ],
            [
                'key'      => 'life_stage',
                'question' => 'Which season of life best describes you right now?',
                'icon'     => 'life_stage',
                'options'  => [
                    ['key' => 'high_school_college', 'label' => 'High School or College Youth', 'description' => 'Passionate student seeking to unleash potential for Christ.'],
                    ['key' => 'minsu_student',       'label' => 'MinSU Calapan Campus Student', 'description' => 'MinSU student looking for campus fellowship on the bleachers.'],
                    ['key' => 'young_professional',  'label' => 'Young Working Professional',   'description' => 'Navigating career, adulthood, and purpose in the workplace.'],
                    ['key' => 'young_men',           'label' => 'Young Man Seeking Brotherhood', 'description' => 'Focused on building Christ-centered brotherhood and accountability.'],
                    ['key' => 'young_women',         'label' => 'Young Woman Seeking Sisterhood', 'description' => 'Focused on building Christ-centered friendships and spiritual growth.'],
                ],
            ],
            [
                'key'      => 'availability',
                'question' => 'Which fellowship schedule fits naturally into your routine?',
                'icon'     => 'availability',
                'options'  => [
                    ['key' => 'sat_afternoon', 'label' => 'Saturdays at 1:30 PM',     'description' => 'Youth Ministry & Youth Girls Fellowship schedule.'],
                    ['key' => 'sat_evening',   'label' => 'Saturdays at 5:00 PM',     'description' => 'LifeGen Young Professionals fellowship time.'],
                    ['key' => 'fri_evening',   'label' => 'Fridays at 7:30 PM',       'description' => 'Youth Boys Fellowship schedule.'],
                    ['key' => 'mon_morning',   'label' => 'Mondays 8:00 AM – 10:00 AM','description' => 'Life Gen MinSU Calapan Campus bleachers schedule.'],
                    ['key' => 'flexible',      'label' => 'Flexible / Open Routine',   'description' => 'I can adapt or attend hybrid fellowships online & in person.'],
                ],
            ],
            [
                'key'      => 'community_desire',
                'question' => 'What is your biggest personal goal in joining a group?',
                'icon'     => 'community_desire',
                'options'  => [
                    ['key' => 'grow_in_faith',          'label' => 'Grow deeper in faith & discipleship', 'description' => 'Personal mentoring and deepening my prayer life.'],
                    ['key' => 'brotherhood_sisterhood', 'label' => 'Build authentic godly friendships',   'description' => 'Close friends who encourage, pray, and do life together.'],
                    ['key' => 'campus_impact',          'label' => 'Impact my campus and community',      'description' => 'Being a light in school, workplace, and neighborhood.'],
                    ['key' => 'use_gifts',              'label' => 'Serve the church with my gifts',      'description' => 'Actively contributing to weekly Sunday experiences.'],
                    ['key' => 'mentor_others',          'label' => 'Learn leadership and mentor others',  'description' => 'Growing as a discipleship leader in God’s kingdom.'],
                ],
            ],
        ];
    }
}

