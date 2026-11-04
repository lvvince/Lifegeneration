<?php

class Create_chat_channels_and_messages_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create chat_channels table
        if (!$this->_lava->dbforge->table_exists('chat_channels')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'slug' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 80,
                        'null'       => FALSE,
                    ],
                    'name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 100,
                        'null'       => FALSE,
                    ],
                    'description' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'kind' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'general',
                    ],
                    'ref_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'is_readonly' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                    'staff_only' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                    'sort_order' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                        'default'    => 10,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('slug', FALSE, TRUE, 'chat_slug')
                ->create_table('chat_channels');

            // Seed default channels
            $seed = [
                ['announcements', 'announcements', 'Important updates from admins and officers.', 'announcement', 1, 0, 1],
                ['general', 'general', 'Everyday fellowship. Say hi, ask, share.', 'general', 0, 0, 2],
                ['prayer-support', 'prayer-support', 'Encourage one another and pray together.', 'general', 0, 0, 3],
                ['staff-lounge', 'staff-lounge', 'Admins and officers only.', 'staff', 0, 1, 9],
            ];
            foreach ($seed as $s) {
                $this->_lava->db->raw(
                    "INSERT IGNORE INTO chat_channels (slug, name, description, kind, is_readonly, staff_only, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [$s[0], $s[1], $s[2], $s[3], $s[4], $s[5], $s[6]]
                );
            }
        }

        // 2. Create chat_messages table
        if (!$this->_lava->dbforge->table_exists('chat_messages')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'channel_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'kind' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'message',
                    ],
                    'title' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 160,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'body' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'image' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'reply_to' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'is_pinned' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                    'is_important' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                    'edited_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'deleted_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key(['channel_id', 'id'], FALSE, FALSE, 'chat_ch')
                ->add_key(['user_id', 'created_at'], FALSE, FALSE, 'chat_user')
                ->create_table('chat_messages');
        }

        // 3. Create chat_reactions table
        if (!$this->_lava->dbforge->table_exists('chat_reactions')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'message_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'reaction' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 32,
                        'null'       => FALSE,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key(['message_id', 'user_id', 'reaction'], FALSE, TRUE, 'uq_msg_user_reaction')
                ->add_key('message_id', FALSE, FALSE, 'idx_message')
                ->create_table('chat_reactions');
        }

        // 4. Create chat_mentions table
        if (!$this->_lava->dbforge->table_exists('chat_mentions')) {
            $this->_lava->dbforge
                ->add_field([
                    'message_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                ])
                ->add_key(['message_id', 'user_id'], TRUE)
                ->add_key('user_id', FALSE, FALSE, 'chat_men_user')
                ->create_table('chat_mentions');
        }

        // 5. Create chat_acks table
        if (!$this->_lava->dbforge->table_exists('chat_acks')) {
            $this->_lava->dbforge
                ->add_field([
                    'message_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key(['message_id', 'user_id'], TRUE)
                ->create_table('chat_acks');
        }

        // 6. Create chat_reads table
        if (!$this->_lava->dbforge->table_exists('chat_reads')) {
            $this->_lava->dbforge
                ->add_field([
                    'channel_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'last_read_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                ])
                ->add_key(['channel_id', 'user_id'], TRUE)
                ->create_table('chat_reads');
        }

        // 7. Create chat_mutes table
        if (!$this->_lava->dbforge->table_exists('chat_mutes')) {
            $this->_lava->dbforge
                ->add_field([
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'until_at' => [
                        'type' => 'DATETIME',
                        'null' => FALSE,
                    ],
                    'reason' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'by_user' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                ])
                ->add_key('user_id', TRUE)
                ->create_table('chat_mutes');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('chat_mutes');
        $this->_lava->dbforge->drop_table('chat_reads');
        $this->_lava->dbforge->drop_table('chat_acks');
        $this->_lava->dbforge->drop_table('chat_mentions');
        $this->_lava->dbforge->drop_table('chat_reactions');
        $this->_lava->dbforge->drop_table('chat_messages');
        $this->_lava->dbforge->drop_table('chat_channels');
    }
}

