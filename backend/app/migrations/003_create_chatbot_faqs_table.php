<?php

class Create_chatbot_faqs_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        if ($this->_lava->dbforge->table_exists('chatbot_faqs')) {
            return;
        }

        $this->_lava->dbforge
            ->add_field([
                'id' => [
                    'type'           => 'INT',
                    'constraint'     => 11,
                    'unsigned'       => TRUE,
                    'auto_increment' => TRUE,
                    'null'           => FALSE,
                ],
                'category' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => FALSE,
                ],
                'question' => [
                    'type' => 'TEXT',
                    'null' => FALSE,
                ],
                'answer' => [
                    'type' => 'TEXT',
                    'null' => FALSE,
                ],
                'keywords' => [
                    'type' => 'TEXT',
                    'null' => TRUE,
                    'default' => NULL,
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
            ->add_key('id', primary: TRUE)
            ->add_key('category', name: 'category_idx')
            ->create_table('chatbot_faqs');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('chatbot_faqs');
    }
}
