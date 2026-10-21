<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class UserSeeder {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->database();
        $this->_lava->call->dbforge();
    }

    /**
     * Run the database seeds.
     * Creates demo accounts in BOTH the users table AND the members table.
     *
     * @return void
     */
    public function run()
    {
        $db = $this->_lava->db;

        // ── Seed D-Groups ───────────────────────────────────────────────────
        $dgroup_ids = [];
        $groups_to_seed = [
            [
                'name'        => 'LifeGen Young Professionals',
                'leader_name' => 'Pastor Marcus Rivera',
                'schedule'    => 'Saturdays 5:00 PM',
                'location'    => 'Fellowship Room A & Zoom',
                'description' => 'A discipleship group for young working professionals navigating career, life, and faith.',
            ],
            [
                'name'        => 'Youth Ignite',
                'leader_name' => 'Danielle Vitto',
                'schedule'    => 'Saturdays 1:30 PM',
                'location'    => 'Youth Hall B',
                'description' => 'Unleashing the passion of high school and college students to make a difference for Christ.',
            ],
            [
                'name'        => 'Couples Fellowship',
                'leader_name' => 'Elder Thomas & Sarah Cruz',
                'schedule'    => 'Fridays 7:30 PM',
                'location'    => 'Main Sanctuary Room 3',
                'description' => 'Discipleship and fellowship for married couples focused on building Christ-centered families.',
            ]
        ];

        foreach ($groups_to_seed as $group) {
            $existing = $db->table('dgroups')->where('name', $group['name'])->get();
            if (!$existing) {
                $db->table('dgroups')->insert($group);
                $dgroup_ids[$group['name']] = $db->last_id();
            } else {
                $dgroup_ids[$group['name']] = $existing['id'];
            }
        }
        echo "  ✓ Seeded default D-Groups.\n";

        // ── Admin Account (in dedicated admins table) ──────────────────────
        if ($this->_lava->dbforge->table_exists('admins')) {
            $admin_record = $db->table('admins')->where('email', 'admin@example.com')->get();
            if (!$admin_record) {
                $db->table('admins')->insert([
                    'username'   => 'admin',
                    'full_name'  => 'Chief Master Administrator',
                    'email'      => 'admin@example.com',
                    'password'   => password_hash('password123', PASSWORD_DEFAULT),
                    'role'       => 'admin',
                    'is_active'  => 1,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
                echo "  ✓ Created admin in admins table (email: admin@example.com, password: password123)\n";
            }
        }

        // ── Also seed in users/members for backward compatibility ──────────
        $admin_user = $db->table('users')->where('email', 'admin@example.com')->get();

        if (!$admin_user) {
            $admin_user_id = $db->table('users')->insert([
                'username'   => 'admin',
                'email'      => 'admin@example.com',
                'password'   => password_hash('password123', PASSWORD_DEFAULT),
                'role'       => 'admin',
                'is_active'  => 1,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            if (!$admin_user_id) {
                $admin_user_id = $db->last_id();
            }

            // Check members table for this user before inserting
            $admin_member = $db->table('members')->where('user_id', $admin_user_id)->get();
            if (!$admin_member) {
                $db->table('members')->insert([
                    'user_id'        => $admin_user_id,
                    'member_id'      => 'LG-2026-ADMIN',
                    'full_name'      => 'Chief Master Administrator',
                    'age'            => 32,
                    'address'        => '100 Life Generation HQ, Innovation Blvd, Metro Manila',
                    'email'          => 'admin@example.com',
                    'is_active'      => 1,
                    'joined_at'      => date('Y-m-d H:i:s'),
                ]);
            }

            echo "  ✓ Created admin user (email: admin@example.com, password: password123)\n";
        }

        // ── Demo Member Account ─────────────────────────────────────────────
        $demo_user = $db->table('users')->where('email', 'user@example.com')->get();

        if (!$demo_user) {
            $demo_user_id = $db->table('users')->insert([
                'username'   => 'danielle',
                'email'      => 'user@example.com',
                'password'   => password_hash('password123', PASSWORD_DEFAULT),
                'role'       => 'user',
                'is_active'  => 1,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            if (!$demo_user_id) {
                $demo_user_id = $db->last_id();
            }

            $demo_member = $db->table('members')->where('user_id', $demo_user_id)->get();
            if (!$demo_member) {
                $db->table('members')->insert([
                    'user_id'        => $demo_user_id,
                    'member_id'      => 'LG-2026-DEMO1',
                    'full_name'      => 'Danielle Vitto',
                    'age'            => 24,
                    'address'        => '742 Evergreen Terrace, Sector 4, Calabarzon',
                    'email'          => 'user@example.com',
                    'is_active'      => 1,
                    'joined_at'      => date('Y-m-d H:i:s'),
                ]);
            }

            echo "  ✓ Created demo member (email: user@example.com, password: password123)\n";
        }

        // ── Seed Ministries ─────────────────────────────────────────────────
        $ministries_to_seed = [
            ['name' => 'Worship Team',    'icon' => '🎵', 'description' => 'Lead the congregation in musical worship through singing and instruments. Serve in Sunday services and special events.'],
            ['name' => 'Media & Tech',    'icon' => '📽️', 'description' => 'Operate cameras, livestreaming, sound systems, and presentation software to support church services.'],
            ['name' => 'Ushers & Greeters','icon' => '🤝', 'description' => 'Welcome guests, guide seating, maintain order, and create a warm, hospitable environment every service.'],
            ['name' => 'Outreach Team',   'icon' => '🌍', 'description' => 'Organize and participate in community outreach, evangelism, and social impact projects in our city.'],
            ['name' => 'Children\'s Ministry', 'icon' => '👶', 'description' => 'Nurture the faith of the youngest members through age-appropriate teaching and creative activities.'],
            ['name' => 'Prayer Warriors', 'icon' => '🙏', 'description' => 'Intercede for the congregation, city, and nation. Lead and participate in dedicated prayer sessions.'],
        ];

        $existing_ministries = $db->table('ministries')->get_all();
        if (empty($existing_ministries)) {
            foreach ($ministries_to_seed as $ministry) {
                $db->table('ministries')->insert([
                    'name'        => $ministry['name'],
                    'icon'        => $ministry['icon'],
                    'description' => $ministry['description'],
                    'is_active'   => 1,
                    'created_at'  => date('Y-m-d H:i:s'),
                ]);
            }
            echo "  ✓ Seeded " . count($ministries_to_seed) . " ministries\n";
        } else {
            echo "  ✓ Ministries already seeded — skipping\n";
        }

        // ── Seed Events ─────────────────────────────────────────────────────
        $events_to_seed = [
            [
                'title'       => 'Sunday Celebration & Encounter Service',
                'description' => 'Join us for our main weekly worship gathering with live praise, communion, and an uplifting message of hope.',
                'location'    => 'LifeGen Main Sanctuary & Online',
                'event_date'  => date('Y-m-d', strtotime('next Sunday')),
                'event_time'  => '10:00 AM - 12:00 PM',
                'capacity'    => 350,
            ],
            [
                'title'       => 'Youth & Young Adults Ignite Night',
                'description' => 'An energetic night of acoustic worship, real conversations, mentorship, and fellowship for high school & college students.',
                'location'    => 'Youth Center Hall B',
                'event_date'  => date('Y-m-d', strtotime('next Friday')),
                'event_time'  => '6:30 PM - 9:00 PM',
                'capacity'    => 120,
            ],
            [
                'title'       => 'LifeGen Leadership & Ministry Summit',
                'description' => 'Equipping and alignment session for all ministry volunteers, D-Group leaders, and ministry team coordinators.',
                'location'    => 'Conference Room 1 & Zoom',
                'event_date'  => date('Y-m-d', strtotime('+2 weeks Saturday')),
                'event_time'  => '1:00 PM - 4:00 PM',
                'capacity'    => 80,
            ],
        ];

        $existing_events = $db->table('events')->get_all();
        if (empty($existing_events)) {
            foreach ($events_to_seed as $ev) {
                $db->table('events')->insert([
                    'title'       => $ev['title'],
                    'description' => $ev['description'],
                    'location'    => $ev['location'],
                    'event_date'  => $ev['event_date'],
                    'event_time'  => $ev['event_time'],
                    'capacity'    => $ev['capacity'],
                    'is_active'   => 1,
                    'created_at'  => date('Y-m-d H:i:s'),
                ]);
            }
            echo "  ✓ Seeded " . count($events_to_seed) . " upcoming church events\n";
        } else {
            echo "  ✓ Events already seeded — skipping\n";
        }
    }
}

