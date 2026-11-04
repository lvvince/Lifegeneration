<?php

class Create_sightings_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create sighting_posts table
        if (!$this->_lava->dbforge->table_exists('sighting_posts')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'author_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 120,
                        'null'       => FALSE,
                    ],
                    'body' => [
                        'type' => 'TEXT',
                        'null' => FALSE,
                    ],
                    'image' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('user_id', FALSE, FALSE, 'sp_user_idx')
                ->add_key('created_at', FALSE, FALSE, 'sp_created_idx')
                ->create_table('sighting_posts');
        }

        // 2. Create sighting_reactions table
        if (!$this->_lava->dbforge->table_exists('sighting_reactions')) {
            $this->_lava->dbforge
                ->add_field([
                    'post_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key(['post_id', 'user_id'], TRUE)
                ->create_table('sighting_reactions');
        }

        // 3. Create sighting_comments table
        if (!$this->_lava->dbforge->table_exists('sighting_comments')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'post_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'null'       => FALSE,
                    ],
                    'author_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 120,
                        'null'       => FALSE,
                    ],
                    'body' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 500,
                        'null'       => FALSE,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('post_id', FALSE, FALSE, 'sc_post_idx')
                ->create_table('sighting_comments');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('sighting_comments');
        $this->_lava->dbforge->drop_table('sighting_reactions');
        $this->_lava->dbforge->drop_table('sighting_posts');
    }
}

