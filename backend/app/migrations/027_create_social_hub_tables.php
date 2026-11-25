<?php

class Create_social_hub_tables {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Create social_posts table
        if (!$this->_lava->dbforge->table_exists('social_posts')) {
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
                    'author_avatar' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'category' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => FALSE,
                        'default'    => 'general',
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
                    'event_title' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 200,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'event_type' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 80,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'event_date' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => NULL,
                    ],
                    'event_location' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'event_link' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'verse_reference' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 120,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'verse_text' => [
                        'type'    => 'TEXT',
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
                ->add_key('user_id', FALSE, FALSE, 'spost_user_idx')
                ->add_key('category', FALSE, FALSE, 'spost_cat_idx')
                ->add_key('created_at', FALSE, FALSE, 'spost_created_idx')
                ->create_table('social_posts');
        }

        // 2. Create social_reactions table
        if (!$this->_lava->dbforge->table_exists('social_reactions')) {
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
                    'reaction_type' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'like',
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key(['post_id', 'user_id'], TRUE)
                ->add_key('user_id', FALSE, FALSE, 'sreact_user_idx')
                ->create_table('social_reactions');
        }

        // 3. Create social_rsvps table (for fellowship & bible study invites)
        if (!$this->_lava->dbforge->table_exists('social_rsvps')) {
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
                    'user_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 120,
                        'null'       => FALSE,
                    ],
                    'status' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'going',
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key(['post_id', 'user_id'], TRUE)
                ->create_table('social_rsvps');
        }

        // 4. Create social_comments table
        if (!$this->_lava->dbforge->table_exists('social_comments')) {
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
                    'author_avatar' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'body' => [
                        'type' => 'TEXT',
                        'null' => FALSE,
                    ],
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => FALSE,
                        'default' => 'CURRENT_TIMESTAMP',
                    ],
                ])
                ->add_key('id', TRUE)
                ->add_key('post_id', FALSE, FALSE, 'scomm_post_idx')
                ->create_table('social_comments');
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('social_comments', TRUE);
        $this->_lava->dbforge->drop_table('social_rsvps', TRUE);
        $this->_lava->dbforge->drop_table('social_reactions', TRUE);
        $this->_lava->dbforge->drop_table('social_posts', TRUE);
    }
}
