<?php

class Add_avatar_to_members_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if ($this->_lava->dbforge->table_exists('members')) {
            if (!$this->_lava->dbforge->column_exists('members', 'avatar')) {
                $this->_lava->dbforge->add_column('members', [
                    'avatar' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
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
            if ($this->_lava->dbforge->column_exists('members', 'avatar')) {
                $this->_lava->dbforge->drop_column('members', 'avatar');
            }
        }
    }
}
