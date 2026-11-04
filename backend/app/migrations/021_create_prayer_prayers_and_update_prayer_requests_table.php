<?php

class Create_prayer_prayers_and_update_prayer_requests_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Update prayer_requests table with missing columns
        if ($this->_lava->dbforge->table_exists('prayer_requests')) {
            if (!$this->_lava->dbforge->column_exists('prayer_requests', 'image')) {
                $this->_lava->dbforge->add_column('prayer_requests', [
                    'image' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'body',
                    ]
                ]);
            }
            if (!$this->_lava->dbforge->column_exists('prayer_requests', 'category')) {
                $this->_lava->dbforge->add_column('prayer_requests', [
                    'category' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'personal',
                    ]
                ]);
            }
            if (!$this->_lava->dbforge->column_exists('prayer_requests', 'testimony')) {
                $this->_lava->dbforge->add_column('prayer_requests', [
                    'testimony' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                    ]
                ]);
            }
            if (!$this->_lava->dbforge->column_exists('prayer_requests', 'answered_at')) {
                $this->_lava->dbforge->add_column('prayer_requests', [
                    'answered_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ]
                ]);
            }
        }

        // 2. Create prayer_prayers table
        if (!$this->_lava->dbforge->table_exists('prayer_prayers')) {
            $this->_lava->dbforge
                ->add_field([
                    'prayer_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key(['prayer_id', 'user_id'], TRUE)
                ->add_key('user_id', FALSE, FALSE, 'pp_user_idx')
                ->create_table('prayer_prayers');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('prayer_prayers');

        if ($this->_lava->dbforge->table_exists('prayer_requests')) {
            foreach (['answered_at', 'testimony', 'category', 'image'] as $col) {
                if ($this->_lava->dbforge->column_exists('prayer_requests', $col)) {
                    $this->_lava->dbforge->drop_column('prayer_requests', $col);
                }
            }
        }
    }
}

