<?php

class Create_dgroups_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create dgroups table
        if (!$this->_lava->dbforge->table_exists('dgroups')) {
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
                    'leader_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 150,
                        'null'       => FALSE,
                    ],
                    'schedule' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 100,
                        'null'       => FALSE,
                    ],
                    'location' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => FALSE,
                    ],
                    'description' => [
                        'type' => 'TEXT',
                        'null' => TRUE,
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
                ->create_table('dgroups');
        }

        // 2. Add dgroup_id to members table
        if ($this->_lava->dbforge->table_exists('members')) {
            if (!$this->_lava->dbforge->column_exists('members', 'dgroup_id')) {
                $this->_lava->dbforge->add_column('members', [
                    'dgroup_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'user_id',
                    ]
                ]);
            }
        }
    }

    public function down()
    {
        // 1. Drop dgroup_id from members
        if ($this->_lava->dbforge->table_exists('members')) {
            if ($this->_lava->dbforge->column_exists('members', 'dgroup_id')) {
                $this->_lava->dbforge->drop_column('members', 'dgroup_id');
            }
        }

        // 2. Drop dgroups table
        $this->_lava->dbforge->drop_table('dgroups');
    }
}
