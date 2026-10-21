<?php

class Create_events_and_attendance_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create events table
        if (!$this->_lava->dbforge->table_exists('events')) {
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
                    'description' => [
                        'type' => 'TEXT',
                        'null' => TRUE,
                    ],
                    'location' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => FALSE,
                    ],
                    'event_date' => [
                        'type' => 'DATE',
                        'null' => FALSE,
                    ],
                    'event_time' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => FALSE,
                    ],
                    'capacity' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'is_active' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
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
                ->create_table('events');
        }

        // 2. Create event_attendances table (RSVP + QR Check-in)
        if (!$this->_lava->dbforge->table_exists('event_attendances')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'event_id' => [
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
                    'member_id' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => FALSE,
                    ],
                    'member_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 150,
                        'null'       => FALSE,
                    ],
                    'rsvp_status' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'attending',
                    ],
                    'checked_in' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'null'       => FALSE,
                        'default'    => 0,
                    ],
                    'checked_in_at' => [
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
                ->create_table('event_attendances');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('event_attendances');
        $this->_lava->dbforge->drop_table('events');
    }
}
