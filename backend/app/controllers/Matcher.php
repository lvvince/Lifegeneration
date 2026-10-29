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
    // Build a weighted signal vector from quiz answers
    // ─────────────────────────────────────────────
    private function buildSignals(array $answers): array
    {
        // Signal dimensions:
        // ministry: worship | media | hospitality | outreach
        // dgroup:   youth | young_professional | couples | general
        // traits:   creative | technical | relational | leadership | introverted

        $signals = [
            // Ministry affinity
            'worship'          => 0,
            'media'            => 0,
            'hospitality'      => 0,
            'outreach'         => 0,
            // D-Group affinity
            'youth'            => 0,
            'young_professional' => 0,
            'couples'          => 0,
            // Personality traits (used to break ties)
            'creative'         => 0,
            'technical'        => 0,
            'relational'       => 0,
            'leadership'       => 0,
            'introverted'      => 0,
        ];

        // Scoring map: question_key => [ answer_key => [ signal => weight ] ]
        $scoringMap = [
            // Q1: Primary spiritual gift
            'gift' => [
                'worship_arts'  => ['worship' => 5, 'creative' => 3],
                'technology'    => ['media' => 5, 'technical' => 4],
                'hospitality'   => ['hospitality' => 5, 'relational' => 3],
                'evangelism'    => ['outreach' => 5, 'leadership' => 2],
                'teaching'      => ['youth' => 3, 'young_professional' => 3, 'leadership' => 3],
                'encouragement' => ['relational' => 4, 'hospitality' => 3, 'youth' => 2],
            ],
            // Q2: How do you prefer to serve?
            'serve_style' => [
                'on_stage'       => ['worship' => 4, 'creative' => 3, 'leadership' => 2],
                'behind_camera'  => ['media' => 5, 'technical' => 4, 'introverted' => 2],
                'greet_people'   => ['hospitality' => 5, 'relational' => 4],
                'street_outreach'=> ['outreach' => 5, 'leadership' => 3],
                'small_groups'   => ['youth' => 3, 'young_professional' => 3, 'relational' => 3],
                'one_on_one'     => ['relational' => 4, 'introverted' => 2, 'youth' => 2],
            ],
            // Q3: Which skills do you have or want to grow in?
            'skills' => [
                'singing_playing'  => ['worship' => 5, 'creative' => 3],
                'video_sound_tech' => ['media' => 5, 'technical' => 5],
                'public_speaking'  => ['outreach' => 3, 'leadership' => 4, 'young_professional' => 2],
                'graphic_design'   => ['media' => 3, 'creative' => 5],
                'people_skills'    => ['hospitality' => 4, 'relational' => 5],
                'organizing'       => ['outreach' => 2, 'leadership' => 4, 'young_professional' => 3],
            ],
            // Q4: Availability (affects D-Group scheduling preference)
            'availability' => [
                'saturday_afternoon' => ['youth' => 3, 'young_professional' => 2],
                'saturday_morning'   => ['youth' => 2, 'couples' => 2],
                'friday_evening'     => ['couples' => 3, 'young_professional' => 2],
                'sunday_after'       => ['youth' => 3, 'general' => 2],
                'weekday_evening'    => ['young_professional' => 4],
                'flexible'           => [], // no boost, neutral
            ],
            // Q5: Who are you in your core?
            'personality' => [
                'creative_expressive' => ['worship' => 3, 'media' => 2, 'creative' => 5],
                'tech_builder'        => ['media' => 4, 'technical' => 5, 'introverted' => 2],
                'people_lover'        => ['hospitality' => 4, 'relational' => 5, 'youth' => 2],
                'mission_driven'      => ['outreach' => 4, 'leadership' => 4, 'young_professional' => 2],
                'quiet_faithful'      => ['introverted' => 5, 'hospitality' => 2, 'youth' => 2],
                'natural_leader'      => ['leadership' => 5, 'young_professional' => 3, 'outreach' => 2],
            ],
            // Q6: Life stage
            'life_stage' => [
                'high_school'        => ['youth' => 6],
                'college'            => ['youth' => 5, 'young_professional' => 2],
                'early_career'       => ['young_professional' => 6],
                'married'            => ['couples' => 6],
                'married_kids'       => ['couples' => 5],
                'single_professional'=> ['young_professional' => 5],
            ],
            // Q7: Biggest desire in joining a community
            'community_desire' => [
                'grow_in_faith'       => ['youth' => 3, 'young_professional' => 3],
                'meet_new_friends'    => ['youth' => 4, 'relational' => 4],
                'use_my_gifts'        => ['worship' => 2, 'media' => 2, 'outreach' => 2, 'hospitality' => 2],
                'get_accountability'  => ['young_professional' => 4, 'couples' => 3],
                'serve_community'     => ['outreach' => 4, 'hospitality' => 3],
                'grow_as_couple'      => ['couples' => 6],
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
    // Uses keyword matching on name + description as fallback boost
    // ─────────────────────────────────────────────
    private function scoreMinistry(array $ministry, array $signals): int
    {
        $name = strtolower($ministry['name'] ?? '');
        $desc = strtolower($ministry['description'] ?? '');
        $combined = $name . ' ' . $desc;

        $score = 0;

        // Primary keyword-to-signal mapping
        $keywordSignals = [
            'worship'    => ['worship', 'music', 'sing', 'choir', 'instrument', 'band', 'praise'],
            'media'      => ['media', 'tech', 'camera', 'video', 'sound', 'livestream', 'streaming', 'presentation', 'graphic'],
            'hospitality'=> ['usher', 'greet', 'welcome', 'hospitality', 'seat', 'host'],
            'outreach'   => ['outreach', 'evangelism', 'community', 'mission', 'social'],
        ];

        foreach ($keywordSignals as $signal => $keywords) {
            foreach ($keywords as $kw) {
                if (strpos($combined, $kw) !== false) {
                    $score += $signals[$signal] * 1; // semantic match boost
                    break; // one match per signal group is enough
                }
            }
        }

        // Direct signal score sum weighted
        $score += $signals['worship']     * (strpos($name, 'worship') !== false ? 2 : 0);
        $score += $signals['media']       * (strpos($name, 'media') !== false || strpos($name, 'tech') !== false ? 2 : 0);
        $score += $signals['hospitality'] * (strpos($name, 'usher') !== false || strpos($name, 'greet') !== false ? 2 : 0);
        $score += $signals['outreach']    * (strpos($name, 'outreach') !== false ? 2 : 0);

        // Personality trait boosts per ministry type
        if (strpos($combined, 'worship') !== false || strpos($combined, 'music') !== false) {
            $score += $signals['creative'] * 1;
        }
        if (strpos($combined, 'tech') !== false || strpos($combined, 'media') !== false) {
            $score += $signals['technical'] * 1;
        }
        if (strpos($combined, 'usher') !== false || strpos($combined, 'greet') !== false || strpos($combined, 'welcome') !== false) {
            $score += $signals['relational'] * 1;
        }
        if (strpos($combined, 'outreach') !== false) {
            $score += $signals['leadership'] * 1;
        }

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
        $combined = $name . ' ' . $desc . ' ' . $sched;

        $score = 0;

        // Keyword-signal mapping for D-Groups
        $keywordSignals = [
            'youth'             => ['youth', 'high school', 'college', 'student', 'teen', 'young people', 'campus'],
            'young_professional'=> ['professional', 'career', 'working', 'adult', 'young professional', 'young adults'],
            'couples'           => ['couple', 'married', 'marriage', 'husband', 'wife', 'family'],
        ];

        foreach ($keywordSignals as $signal => $keywords) {
            foreach ($keywords as $kw) {
                if (strpos($combined, $kw) !== false) {
                    $score += $signals[$signal] * 2;
                    break;
                }
            }
        }

        // Relational/introverted personality fit
        $score += $signals['relational'] * 1;
        if (strpos($combined, 'fellowship') !== false) {
            $score += $signals['relational'];
        }

        // Schedule matching boosts
        if (strpos($sched, 'saturday') !== false) {
            $score += $signals['youth'] * 1;
        }
        if (strpos($sched, 'friday') !== false) {
            $score += $signals['couples'] * 1;
        }
        if (strpos($sched, 'weekday') !== false || strpos($sched, 'wednesday') !== false || strpos($sched, 'thursday') !== false) {
            $score += $signals['young_professional'] * 1;
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
            'worship'     => $signals['worship'],
            'media'       => $signals['media'],
            'hospitality' => $signals['hospitality'],
            'outreach'    => $signals['outreach'],
        ];
        arsort($ministrySignals);
        $topMinistrySignal = array_key_first($ministrySignals);

        // Top dgroup signal
        $dgroupSignals = [
            'youth'             => $signals['youth'],
            'young_professional'=> $signals['young_professional'],
            'couples'           => $signals['couples'],
        ];
        arsort($dgroupSignals);
        $topDGroupSignal = array_key_first($dgroupSignals);

        // Top personality trait
        $traitSignals = [
            'creative'    => $signals['creative'],
            'technical'   => $signals['technical'],
            'relational'  => $signals['relational'],
            'leadership'  => $signals['leadership'],
            'introverted' => $signals['introverted'],
        ];
        arsort($traitSignals);
        $topTrait = array_key_first($traitSignals);

        $ministryLabels = [
            'worship'     => ['label' => 'The Worshipper 🎵', 'description' => 'You come alive when the music starts and your heart overflows in worship. Your gift is creating an atmosphere where others encounter God.'],
            'media'       => ['label' => 'The Technician ⚙️', 'description' => 'You see the world through a lens—literally. You love making sure everything runs perfectly behind the scenes so others can experience the moment.'],
            'hospitality' => ['label' => 'The Host 🤝', 'description' => 'You have the rare gift of making every person feel instantly seen and welcomed. You are the warmth in every room you enter.'],
            'outreach'    => ['label' => 'The Messenger 📣', 'description' => 'You carry a burning passion to reach the lost and serve the least. Your heart for the community is contagious and world-changing.'],
        ];

        $label = $ministryLabels[$topMinistrySignal] ?? ['label' => 'The Servant ✨', 'description' => 'You are gifted in many areas and have a humble heart that is ready to serve wherever you are needed.'];

        return [
            'label'              => $label['label'],
            'description'        => $label['description'],
            'top_ministry_signal'=> $topMinistrySignal,
            'top_dgroup_signal'  => $topDGroupSignal,
            'top_trait'          => $topTrait,
        ];
    }

    // ─────────────────────────────────────────────
    // Static quiz questions definition
    // ─────────────────────────────────────────────
    private function getQuestions(): array
    {
        return [
            [
                'key'      => 'gift',
                'question' => 'What do you feel is your primary spiritual gift?',
                'icon'     => '🎁',
                'options'  => [
                    ['key' => 'worship_arts',  'label' => 'Worship & Arts',        'emoji' => '🎵', 'description' => 'I love expressing faith through music, singing, or creative arts.'],
                    ['key' => 'technology',    'label' => 'Technology & Media',    'emoji' => '🎥', 'description' => 'I love operating cameras, livestreams, sound systems, or graphic design.'],
                    ['key' => 'hospitality',   'label' => 'Hospitality & Service', 'emoji' => '🤝', 'description' => 'I love welcoming people and making them feel at home.'],
                    ['key' => 'evangelism',    'label' => 'Evangelism & Outreach', 'emoji' => '📣', 'description' => 'I love sharing the Gospel and serving our community outside the church.'],
                    ['key' => 'teaching',      'label' => 'Teaching & Discipleship','emoji' => '📖', 'description' => 'I love mentoring others and helping people grow spiritually.'],
                    ['key' => 'encouragement', 'label' => 'Encouragement & Care',  'emoji' => '💛', 'description' => 'I love uplifting and supporting people in their daily walk.'],
                ],
            ],
            [
                'key'      => 'serve_style',
                'question' => 'How do you prefer to serve during events and gatherings?',
                'icon'     => '⚡',
                'options'  => [
                    ['key' => 'on_stage',        'label' => 'On Stage',            'emoji' => '🎤', 'description' => 'Leading worship, speaking, or performing in front of people.'],
                    ['key' => 'behind_camera',   'label' => 'Behind the Scenes',   'emoji' => '📸', 'description' => 'Running tech, cameras, sound board, or presentations.'],
                    ['key' => 'greet_people',    'label' => 'Greeting People',     'emoji' => '🙌', 'description' => 'Welcoming, ushering, and guiding people during events.'],
                    ['key' => 'street_outreach', 'label' => 'Community Outreach',  'emoji' => '🌍', 'description' => 'Going out to serve communities, feed programs, or evangelism drives.'],
                    ['key' => 'small_groups',    'label' => 'Small Group Facilitation', 'emoji' => '👥', 'description' => 'Leading discussions and facilitating group discipleship.'],
                    ['key' => 'one_on_one',      'label' => 'One-on-One',          'emoji' => '💬', 'description' => 'Deep personal mentoring, counseling, and prayer partnerships.'],
                ],
            ],
            [
                'key'      => 'skills',
                'question' => 'Which skill best represents you or what you want to grow in?',
                'icon'     => '🛠️',
                'options'  => [
                    ['key' => 'singing_playing',  'label' => 'Singing / Playing an Instrument', 'emoji' => '🎸'],
                    ['key' => 'video_sound_tech', 'label' => 'Video, Sound & Tech Production',  'emoji' => '🎬'],
                    ['key' => 'public_speaking',  'label' => 'Public Speaking & Communication', 'emoji' => '🗣️'],
                    ['key' => 'graphic_design',   'label' => 'Graphic Design & Visual Arts',    'emoji' => '🎨'],
                    ['key' => 'people_skills',    'label' => 'People Skills & Relationship',    'emoji' => '🤗'],
                    ['key' => 'organizing',       'label' => 'Organizing & Project Planning',   'emoji' => '📋'],
                ],
            ],
            [
                'key'      => 'availability',
                'question' => 'When are you usually free to commit to regular fellowship?',
                'icon'     => '📅',
                'options'  => [
                    ['key' => 'saturday_afternoon', 'label' => 'Saturdays (Afternoon)', 'emoji' => '☀️'],
                    ['key' => 'saturday_morning',   'label' => 'Saturdays (Morning)',   'emoji' => '🌤️'],
                    ['key' => 'friday_evening',     'label' => 'Fridays (Evening)',      'emoji' => '🌆'],
                    ['key' => 'sunday_after',       'label' => 'Sundays (After Service)','emoji' => '⛪'],
                    ['key' => 'weekday_evening',    'label' => 'Weekday Evenings',       'emoji' => '🌙'],
                    ['key' => 'flexible',           'label' => 'Flexible / Varies',      'emoji' => '🔄'],
                ],
            ],
            [
                'key'      => 'personality',
                'question' => 'Which best describes who you are at your core?',
                'icon'     => '🌟',
                'options'  => [
                    ['key' => 'creative_expressive', 'label' => 'Creative & Expressive',    'emoji' => '🎨', 'description' => 'I thrive in creative expression—music, visuals, stories, and art.'],
                    ['key' => 'tech_builder',         'label' => 'Tech Tinkerer & Builder',  'emoji' => '⚙️', 'description' => 'I love systems, gadgets, and building things that just work.'],
                    ['key' => 'people_lover',         'label' => 'People Person',             'emoji' => '🤝', 'description' => 'I get energy from people and love connecting with everyone.'],
                    ['key' => 'mission_driven',       'label' => 'Mission-Driven Doer',       'emoji' => '🚀', 'description' => 'I am fueled by purpose—reaching people, driving change, making impact.'],
                    ['key' => 'quiet_faithful',       'label' => 'Quiet & Faithful',          'emoji' => '🙏', 'description' => 'I prefer depth over width. I serve quietly but with great consistency.'],
                    ['key' => 'natural_leader',       'label' => 'Natural Leader',            'emoji' => '👑', 'description' => 'I step up naturally, can cast vision, and love guiding people toward goals.'],
                ],
            ],
            [
                'key'      => 'life_stage',
                'question' => 'What best describes your current life stage?',
                'icon'     => '🧭',
                'options'  => [
                    ['key' => 'high_school',         'label' => 'High School Student',        'emoji' => '📚'],
                    ['key' => 'college',              'label' => 'College / University',       'emoji' => '🎓'],
                    ['key' => 'early_career',         'label' => 'Young Professional (starting career)', 'emoji' => '💼'],
                    ['key' => 'single_professional',  'label' => 'Single Adult (established)', 'emoji' => '🙋'],
                    ['key' => 'married',              'label' => 'Married (No Kids Yet)',      'emoji' => '💍'],
                    ['key' => 'married_kids',         'label' => 'Married with Kids',         'emoji' => '👨‍👩‍👧'],
                ],
            ],
            [
                'key'      => 'community_desire',
                'question' => 'What do you most want from joining a community group?',
                'icon'     => '💡',
                'options'  => [
                    ['key' => 'grow_in_faith',     'label' => 'Grow deeper in my faith',         'emoji' => '📖'],
                    ['key' => 'meet_new_friends',  'label' => 'Make genuine Christ-centered friends', 'emoji' => '👫'],
                    ['key' => 'use_my_gifts',      'label' => 'Use my gifts to serve the church', 'emoji' => '✨'],
                    ['key' => 'get_accountability','label' => 'Get accountability and life coaching','emoji' => '🤜'],
                    ['key' => 'serve_community',   'label' => 'Serve the community outside church', 'emoji' => '🌍'],
                    ['key' => 'grow_as_couple',    'label' => 'Grow together as a couple',        'emoji' => '💑'],
                ],
            ],
        ];
    }
}

