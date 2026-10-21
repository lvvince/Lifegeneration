<?php

class Add_image_to_dgroups_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if ($this->_lava->dbforge->table_exists('dgroups')) {
            if (!$this->_lava->dbforge->column_exists('dgroups', 'image')) {
                $fields = [
                    'image' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'description',
                    ],
                ];
                $this->_lava->dbforge->add_column('dgroups', $fields);
            }
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('dgroups')) {
            $this->_lava->dbforge->drop_column('dgroups', 'image');
        }
    }
}
