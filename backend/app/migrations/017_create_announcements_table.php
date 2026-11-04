<?php

class Create_announcements_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if (!$this->_lava->dbforge->table_exists('announcements')) {
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
                        'constraint' => 200,
                        'null'       => FALSE,
                    ],
                    'content' => [
                        'type' => 'TEXT',
                        'null' => FALSE,
                    ],
                    'category' => [
                        'type'       => 'ENUM',
                        'constraint' => "'urgent','event','ministry','general'",
                        'null'       => FALSE,
                        'default'    => 'general',
                    ],
                    'badge_text' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'link_url' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'link_text' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 100,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'is_pinned' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                    'is_active' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                        'default'    => 1,
                    ],
                    'expires_at' => [
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
                ->add_key(['is_active', 'is_pinned', 'created_at'], FALSE, FALSE, 'idx_active_pinned')
                ->create_table('announcements');
        }

        // Seed welcome announcement if empty
        $count = (int) $this->_lava->db->raw("SELECT COUNT(*) FROM `announcements`")->fetchColumn();
        if ($count === 0) {
            $this->_lava->db->raw("
                INSERT IGNORE INTO `announcements` (`id`, `title`, `content`, `category`, `badge_text`, `link_url`, `link_text`, `is_pinned`, `is_active`)
                VALUES (1, 'Welcome to Life Generation Calapan!', 'Join us this week for youth gatherings, discipleship groups, and fellowship. Check our events tab to register!', 'general', 'WELCOME', '/events', 'View Gatherings', 1, 1)
            ");
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('announcements');
    }
}

