<?php

class Create_password_resets_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if (!$this->_lava->dbforge->table_exists('password_resets')) {
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
                    'token_hash' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 64,
                        'null'       => FALSE,
                    ],
                    'expires_at' => [
                        'type' => 'DATETIME',
                        'null' => FALSE,
                    ],
                    'used_at' => [
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
                ->add_key('token_hash', FALSE, FALSE, 'idx_token_hash')
                ->add_key('user_id', FALSE, FALSE, 'idx_user_id')
                ->create_table('password_resets');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('password_resets');
    }
}

