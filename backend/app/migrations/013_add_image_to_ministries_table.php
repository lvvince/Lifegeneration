<?php

class Add_image_to_ministries_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if ($this->_lava->dbforge->table_exists('ministries')) {
            if (!$this->_lava->dbforge->column_exists('ministries', 'image')) {
                $fields = [
                    'image' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'icon',
                    ],
                ];
                $this->_lava->dbforge->add_column('ministries', $fields);
            }
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('ministries')) {
            $this->_lava->dbforge->drop_column('ministries', 'image');
        }
    }
}
