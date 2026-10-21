<?php

class Add_banner_image_to_events_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if ($this->_lava->dbforge->table_exists('events')) {
            if (!$this->_lava->dbforge->column_exists('events', 'banner_image')) {
                $fields = [
                    'banner_image' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'description',
                    ],
                ];
                $this->_lava->dbforge->add_column('events', $fields);
            }
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('events')) {
            $this->_lava->dbforge->drop_column('events', 'banner_image');
        }
    }
}
