<?php

class Create_ministries_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create ministries table
        if (!$this->_lava->dbforge->table_exists('ministries')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 100,
                        'null'       => FALSE,
                    ],
                    'description' => [
                        'type' => 'TEXT',
                        'null' => TRUE,
                    ],
                    'icon' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 10,
                        'null'       => TRUE,
                        'default'    => '✦',
                    ],
                    'slots_available' => [
                        'type'       => 'INT',
                        'constraint' => 5,
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
                ])
                ->add_key('id', TRUE)
                ->create_table('ministries');
        }

        // 2. Create ministry_applications table
        if (!$this->_lava->dbforge->table_exists('ministry_applications')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'ministry_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'member_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 150,
                        'null'       => FALSE,
                    ],
                    'message' => [
                        'type' => 'TEXT',
                        'null' => TRUE,
                    ],
                    'status' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'pending',
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
                ->create_table('ministry_applications');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('ministry_applications');
        $this->_lava->dbforge->drop_table('ministries');
    }
}
