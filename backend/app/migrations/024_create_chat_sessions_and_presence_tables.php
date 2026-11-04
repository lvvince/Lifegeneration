<?php

class Create_chat_sessions_and_presence_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create chat_sessions table
        if (!$this->_lava->dbforge->table_exists('chat_sessions')) {
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
                        'constraint' => 160,
                        'null'       => FALSE,
                    ],
                    'kind' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'fellowship',
                    ],
                    'description' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'meet_url' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => FALSE,
                    ],
                    'starts_at' => [
                        'type' => 'DATETIME',
                        'null' => FALSE,
                    ],
                    'ends_at' => [
                        'type' => 'DATETIME',
                        'null' => FALSE,
                    ],
                    'channel_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'host_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'notes' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'event_id' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'status' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 12,
                        'null'       => FALSE,
                        'default'    => 'scheduled',
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('starts_at', FALSE, FALSE, 'chat_sess_time')
                ->create_table('chat_sessions');
        }

        // 2. Create chat_session_rsvps table
        if (!$this->_lava->dbforge->table_exists('chat_session_rsvps')) {
            $this->_lava->dbforge
                ->add_field([
                    'session_id' => [
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
                    'rsvp' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 10,
                        'null'       => FALSE,
                        'default'    => 'going',
                    ],
                    'joined_at' => [
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
                ->add_key(['session_id', 'user_id'], TRUE)
                ->create_table('chat_session_rsvps');
        }

        // 3. Create chat_presence table
        if (!$this->_lava->dbforge->table_exists('chat_presence')) {
            $this->_lava->dbforge
                ->add_field([
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'last_active' => [
                        'type'    => 'TIMESTAMP',
                        'null'    => TRUE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                    'typing_room_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'typing_at' => [
                        'type'    => 'TIMESTAMP',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'last_seen' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('user_id', TRUE)
                ->create_table('chat_presence');
        }

        // 4. Create chat_google table
        if (!$this->_lava->dbforge->table_exists('chat_google')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'       => 'TINYINT',
                        'constraint' => 3,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'refresh_token' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'email' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 190,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'oauth_state' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 64,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'state_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'connected_by' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'updated_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->create_table('chat_google');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('chat_google');
        $this->_lava->dbforge->drop_table('chat_presence');
        $this->_lava->dbforge->drop_table('chat_session_rsvps');
        $this->_lava->dbforge->drop_table('chat_sessions');
    }
}

