<?php

class Create_chat_rooms_and_members_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create chat_rooms table
        if (!$this->_lava->dbforge->table_exists('chat_rooms')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 120,
                        'null'       => FALSE,
                    ],
                    'description' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'type' => [
                        'type'       => 'ENUM',
                        'constraint' => "'announcement','general','ministry','dgroup','direct'",
                        'null'       => TRUE,
                        'default'    => 'general',
                    ],
                    'ref_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'icon' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 60,
                        'null'       => TRUE,
                        'default'    => 'message-square',
                    ],
                    'created_by' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'is_active' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'null'       => TRUE,
                        'default'    => 1,
                    ],
                    'created_at' => [
                        'type'    => 'TIMESTAMP',
                        'null'    => TRUE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                    'updated_at' => [
                        'type'    => 'TIMESTAMP',
                        'null'    => TRUE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('type', FALSE, FALSE, 'idx_type')
                ->add_key('ref_id', FALSE, FALSE, 'idx_ref')
                ->create_table('chat_rooms');
        }

        // 2. Create chat_room_members table
        if (!$this->_lava->dbforge->table_exists('chat_room_members')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'room_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'last_read_message_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => TRUE,
                        'default'    => 0,
                    ],
                    'is_muted' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'null'       => TRUE,
                        'default'    => 0,
                    ],
                    'joined_at' => [
                        'type'    => 'TIMESTAMP',
                        'null'    => TRUE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key(['room_id', 'user_id'], FALSE, TRUE, 'uq_room_user')
                ->add_key('user_id', FALSE, FALSE, 'idx_user')
                ->add_key('room_id', FALSE, FALSE, 'idx_room')
                ->create_table('chat_room_members');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('chat_room_members');
        $this->_lava->dbforge->drop_table('chat_rooms');
    }
}

