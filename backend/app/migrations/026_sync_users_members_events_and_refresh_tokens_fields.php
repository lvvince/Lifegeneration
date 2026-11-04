<?php

class Sync_users_members_events_and_refresh_tokens_fields {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // 1. Users table fields
        if ($this->_lava->dbforge->table_exists('users')) {
            if (!$this->_lava->dbforge->column_exists('users', 'google_id')) {
                $this->_lava->dbforge->add_column('users', [
                    'google_id' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'email',
                    ]
                ]);
            }
            if (!$this->_lava->dbforge->column_exists('users', 'password_hash')) {
                $this->_lava->dbforge->add_column('users', [
                    'password_hash' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'password',
                    ]
                ]);
                $this->_lava->db->raw("UPDATE `users` SET `password_hash` = `password` WHERE `password_hash` IS NULL AND `password` IS NOT NULL");
            }
            if (!$this->_lava->dbforge->column_exists('users', 'bio')) {
                $this->_lava->dbforge->add_column('users', [
                    'bio' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                        'after'   => 'address',
                    ]
                ]);
            }

            // Ensure role is VARCHAR(50) instead of strict enum
            $this->_lava->db->raw("ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'user'");
        }

        // 2. Members table fields
        if ($this->_lava->dbforge->table_exists('members')) {
            if (!$this->_lava->dbforge->column_exists('members', 'member_code')) {
                $this->_lava->dbforge->add_column('members', [
                    'member_code' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'user_id',
                    ]
                ]);
                $this->_lava->db->raw("UPDATE `members` SET `member_code` = `member_id` WHERE `member_code` IS NULL AND `member_id` IS NOT NULL");
            }
            if (!$this->_lava->dbforge->column_exists('members', 'status')) {
                $this->_lava->dbforge->add_column('members', [
                    'status' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 20,
                        'null'       => FALSE,
                        'default'    => 'approved',
                        'after'      => 'is_active',
                    ]
                ]);
            }
            if (!$this->_lava->dbforge->column_exists('members', 'bio')) {
                $this->_lava->dbforge->add_column('members', [
                    'bio' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                        'after'   => 'address',
                    ]
                ]);
            }
            if (!$this->_lava->dbforge->column_exists('members', 'created_at')) {
                $this->_lava->dbforge->add_column('members', [
                    'created_at' => [
                        'type'    => 'DATETIME',
                        'null'    => TRUE,
                        'default' => 'CURRENT_TIMESTAMP',
                        'after'   => 'joined_at',
                    ]
                ]);
                $this->_lava->db->raw("UPDATE `members` SET `created_at` = `joined_at` WHERE `joined_at` IS NOT NULL");
            }
        }

        // 3. Events table fields
        if ($this->_lava->dbforge->table_exists('events')) {
            if (!$this->_lava->dbforge->column_exists('events', 'map_url')) {
                $this->_lava->dbforge->add_column('events', [
                    'map_url' => [
                        'type'    => 'TEXT',
                        'null'    => TRUE,
                        'default' => NULL,
                        'after'   => 'location',
                    ]
                ]);
            }
        }

        // 4. Refresh tokens table fields
        if ($this->_lava->dbforge->table_exists('refresh_tokens')) {
            if (!$this->_lava->dbforge->column_exists('refresh_tokens', 'token_hash')) {
                $this->_lava->dbforge->add_column('refresh_tokens', [
                    'token_hash' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 64,
                        'null'       => TRUE,
                        'default'    => NULL,
                        'after'      => 'token',
                    ]
                ]);
            }
            $this->_lava->db->raw("ALTER TABLE `refresh_tokens` MODIFY COLUMN `jti` VARCHAR(64) NULL DEFAULT NULL");
        }
    }

    public function down()
    {
        if ($this->_lava->dbforge->table_exists('users')) {
            if ($this->_lava->dbforge->column_exists('users', 'google_id')) {
                $this->_lava->dbforge->drop_column('users', 'google_id');
            }
            if ($this->_lava->dbforge->column_exists('users', 'password_hash')) {
                $this->_lava->dbforge->drop_column('users', 'password_hash');
            }
            if ($this->_lava->dbforge->column_exists('users', 'bio')) {
                $this->_lava->dbforge->drop_column('users', 'bio');
            }
        }

        if ($this->_lava->dbforge->table_exists('members')) {
            if ($this->_lava->dbforge->column_exists('members', 'member_code')) {
                $this->_lava->dbforge->drop_column('members', 'member_code');
            }
            if ($this->_lava->dbforge->column_exists('members', 'status')) {
                $this->_lava->dbforge->drop_column('members', 'status');
            }
            if ($this->_lava->dbforge->column_exists('members', 'bio')) {
                $this->_lava->dbforge->drop_column('members', 'bio');
            }
            if ($this->_lava->dbforge->column_exists('members', 'created_at')) {
                $this->_lava->dbforge->drop_column('members', 'created_at');
            }
        }

        if ($this->_lava->dbforge->table_exists('events')) {
            if ($this->_lava->dbforge->column_exists('events', 'map_url')) {
                $this->_lava->dbforge->drop_column('events', 'map_url');
            }
        }

        if ($this->_lava->dbforge->table_exists('refresh_tokens')) {
            if ($this->_lava->dbforge->column_exists('refresh_tokens', 'token_hash')) {
                $this->_lava->dbforge->drop_column('refresh_tokens', 'token_hash');
            }
        }
    }
}

