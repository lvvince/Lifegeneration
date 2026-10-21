<?php

class Add_ministry_id_to_members_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if ($this->_lava->dbforge->table_exists('members')) {
            if (!$this->_lava->dbforge->column_exists('members', 'ministry_id')) {
                $this->_lava->dbforge->add_column('members', [
                    'ministry_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'dgroup_id',
                    ]
                ]);
            }
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('members')) {
            if ($this->_lava->dbforge->column_exists('members', 'ministry_id')) {
                $this->_lava->dbforge->drop_column('members', 'ministry_id');
            }
        }
    }
}
