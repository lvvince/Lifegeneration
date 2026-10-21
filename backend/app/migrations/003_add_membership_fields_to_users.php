<?php

class Add_membership_fields_to_users {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if (!$this->_lava->dbforge->column_exists('users', 'full_name')) {
            $this->_lava->dbforge->add_column('users', [
                'full_name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 150,
                    'null'       => TRUE,
                    'default'    => NULL,
                    'after'      => 'username'
                ]
            ]);
        }

        if (!$this->_lava->dbforge->column_exists('users', 'address')) {
            $this->_lava->dbforge->add_column('users', [
                'address' => [
                    'type'    => 'TEXT',
                    'null'    => TRUE,
                    'default' => NULL,
                    'after'   => 'email'
                ]
            ]);
        }

        if (!$this->_lava->dbforge->column_exists('users', 'age')) {
            $this->_lava->dbforge->add_column('users', [
                'age' => [
                    'type'       => 'INT',
                    'constraint' => 3,
                    'unsigned'   => TRUE,
                    'null'       => TRUE,
                    'default'    => NULL,
                    'after'      => 'address'
                ]
            ]);
        }

        if (!$this->_lava->dbforge->column_exists('users', 'member_id')) {
            $this->_lava->dbforge->add_column('users', [
                'member_id' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => TRUE,
                    'default'    => NULL,
                    'after'      => 'id'
                ]
            ]);
        }

        if (!$this->_lava->dbforge->column_exists('users', 'membership_tier')) {
            $this->_lava->dbforge->add_column('users', [
                'membership_tier' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => FALSE,
                    'default'    => 'Standard Member',
                    'after'      => 'role'
                ]
            ]);
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->column_exists('users', 'full_name')) {
            $this->_lava->dbforge->drop_column('users', 'full_name');
        }
        if ($this->_lava->dbforge->column_exists('users', 'address')) {
            $this->_lava->dbforge->drop_column('users', 'address');
        }
        if ($this->_lava->dbforge->column_exists('users', 'age')) {
            $this->_lava->dbforge->drop_column('users', 'age');
        }
        if ($this->_lava->dbforge->column_exists('users', 'member_id')) {
            $this->_lava->dbforge->drop_column('users', 'member_id');
        }
        if ($this->_lava->dbforge->column_exists('users', 'membership_tier')) {
            $this->_lava->dbforge->drop_column('users', 'membership_tier');
        }
    }
}
