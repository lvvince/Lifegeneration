<?php

class Create_dgroup_requests_and_update_dgroups_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create dgroup_requests table
        if (!$this->_lava->dbforge->table_exists('dgroup_requests')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'dgroup_id' => [
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
                    'status' => [
                        'type'       => 'ENUM',
                        'constraint' => "'pending','approved','rejected'",
                        'null'       => FALSE,
                        'default'    => 'pending',
                    ],
                    'request_note' => [
                        'type'    => 'TEXT',
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
                ->add_key(['dgroup_id', 'user_id'], FALSE, TRUE, 'unique_dgroup_user')
                ->add_key('status', FALSE, FALSE, 'idx_status')
                ->add_key('user_id', FALSE, FALSE, 'idx_user')
                ->add_key('dgroup_id', FALSE, FALSE, 'idx_dgroup')
                ->create_table('dgroup_requests');
        }

        // 2. Add gc_link column to dgroups if missing
        if ($this->_lava->dbforge->table_exists('dgroups')) {
            if (!$this->_lava->dbforge->column_exists('dgroups', 'gc_link')) {
                $this->_lava->dbforge->add_column('dgroups', [
                    'gc_link' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'location',
                    ]
                ]);
            }
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('dgroup_requests');
        if ($this->_lava->dbforge->table_exists('dgroups') && $this->_lava->dbforge->column_exists('dgroups', 'gc_link')) {
            $this->_lava->dbforge->drop_column('dgroups', 'gc_link');
        }
    }
}

