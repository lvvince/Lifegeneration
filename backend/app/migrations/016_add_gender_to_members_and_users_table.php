<?php

class Add_gender_to_members_and_users_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if ($this->_lava->dbforge->table_exists('members')) {
            if (!$this->_lava->dbforge->column_exists('members', 'gender')) {
                $this->_lava->dbforge->add_column('members', [
                    'gender' => [
                        'type'       => "ENUM('Male','Female')",
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'full_name',
                    ]
                ]);
            }
        }

        if ($this->_lava->dbforge->table_exists('users')) {
            if (!$this->_lava->dbforge->column_exists('users', 'gender')) {
                $this->_lava->dbforge->add_column('users', [
                    'gender' => [
                        'type'       => "ENUM('Male','Female')",
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'full_name',
                    ]
                ]);
            }
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('members')) {
            if ($this->_lava->dbforge->column_exists('members', 'gender')) {
                $this->_lava->dbforge->drop_column('members', 'gender');
            }
        }

        if ($this->_lava->dbforge->table_exists('users')) {
            if ($this->_lava->dbforge->column_exists('users', 'gender')) {
                $this->_lava->dbforge->drop_column('users', 'gender');
            }
        }
    }
}
