<?php

class Create_donation_campaigns_and_donations_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create donation_campaigns table
        if (!$this->_lava->dbforge->table_exists('donation_campaigns')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'title' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 150,
                        'null'       => FALSE,
                    ],
                    'category' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => FALSE,
                        'default'    => 'offering',
                    ],
                    'description' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'target_amount' => [
                        'type'       => 'DECIMAL',
                        'constraint' => '12,2',
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'collected_amount' => [
                        'type'       => 'DECIMAL',
                        'constraint' => '12,2',
                        'null'       => FALSE,
                        'default'    => '0.00',
                    ],
                    'image' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'is_active' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                        'default'    => 1,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                    'updated_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('is_active', FALSE, FALSE, 'idx_active')
                ->add_key('category', FALSE, FALSE, 'idx_cat')
                ->create_table('donation_campaigns');

            // Seed initial donation campaigns
            $campaigns = [
                ['Tithes & General Offerings', 'tithe', 'Support Sunday celebrations, weekly discipleship gatherings, and regular ministry operations.', NULL],
                ['Youth Camp & Summit 2026', 'camp_sponsor', 'Sponsor a student or young adult to attend the LifeGen Leadership & Ministry Summit.', 50000.00],
                ['Missions & Community Outreach', 'missions', 'Fund school supply drives, feeding programs, and rural mission works.', 30000.00],
                ['Audio & Multimedia Equipment Fund', 'building_fund', 'Help improve sound system, musical instruments, and media livestreaming gear.', 45000.00],
                ['Benevolence & Love Gift', 'benevolence', 'Provide immediate financial or medical aid to brethren and community members in need.', NULL],
            ];

            foreach ($campaigns as $c) {
                $this->_lava->db->raw(
                    "INSERT IGNORE INTO `donation_campaigns` (`title`, `category`, `description`, `target_amount`, `is_active`) VALUES (?, ?, ?, ?, 1)",
                    [$c[0], $c[1], $c[2], $c[3]]
                );
            }
        }

        // 2. Create donations table
        if (!$this->_lava->dbforge->table_exists('donations')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'tracking_code' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 32,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'campaign_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'donor_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 150,
                        'null'       => FALSE,
                    ],
                    'is_anonymous' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                    'donor_email' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'donor_phone' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'category' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => FALSE,
                        'default'    => 'offering',
                    ],
                    'amount' => [
                        'type'       => 'DECIMAL',
                        'constraint' => '12,2',
                        'null'       => FALSE,
                    ],
                    'payment_method' => [
                        'type'       => 'ENUM',
                        'constraint' => "'gcash','maya','bank_transfer','cash','other'",
                        'null'       => FALSE,
                        'default'    => 'gcash',
                    ],
                    'reference_number' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 100,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'proof_receipt' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'status' => [
                        'type'       => 'ENUM',
                        'constraint' => "'pending','verified','rejected'",
                        'null'       => FALSE,
                        'default'    => 'pending',
                    ],
                    'admin_notes' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'donor_message' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'verified_by' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'verified_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                    'updated_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('tracking_code', FALSE, TRUE, 'tracking_code')
                ->add_key('user_id', FALSE, FALSE, 'idx_user')
                ->add_key('campaign_id', FALSE, FALSE, 'idx_campaign')
                ->add_key('status', FALSE, FALSE, 'idx_status')
                ->add_key('created_at', FALSE, FALSE, 'idx_created')
                ->create_table('donations');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('donations');
        $this->_lava->dbforge->drop_table('donation_campaigns');
    }
}

