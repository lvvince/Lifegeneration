<?php

class Create_prayer_requests_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if (!$this->_lava->dbforge->table_exists('prayer_requests')) {
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
                    'member_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 150,
                        'null'       => FALSE,
                        'default'    => 'Anonymous',
                    ],
                    'title' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 200,
                        'null'       => FALSE,
                    ],
                    'body' => [
                        'type' => 'TEXT',
                        'null' => FALSE,
                    ],
                    'visibility' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'public',
                    ],
                    'status' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'active',
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
                ->create_table('prayer_requests');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('prayer_requests');
    }
}
