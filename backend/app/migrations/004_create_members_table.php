<?php

class Create_members_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        // Create the members table
        if (!$this->_lava->dbforge->table_exists('members')) {
            $this->_lava->dbforge
                ->add_field([
                    'id' => [
                        'type'           => 'INT',
                        'constraint'     => 11,
                        'unsigned'       => TRUE,
                        'auto_increment' => TRUE,
                        'null'           => FALSE,
                    ],
                    'user_id' => [
                        'type'       => 'INT',
                        'constraint' => 11,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                    ],
                    'member_id' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'full_name' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 150,
                        'null'       => FALSE,
                    ],
                    'age' => [
                        'type'       => 'INT',
                        'constraint' => 3,
                        'unsigned'   => TRUE,
                        'null'       => TRUE,
                        'default'    => NULL,
                    ],
                    'address' => [
                        'type' => 'TEXT',
                        'null' => TRUE,
                    ],
                    'email' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 255,
                        'null'       => FALSE,
                    ],
                    'membership_tier' => [
                        'type'       => 'VARCHAR',
                        'constraint' => 50,
                        'null'       => FALSE,
                        'default'    => 'Standard Member',
                    ],
                    'is_active' => [
                        'type'       => 'TINYINT',
                        'constraint' => 1,
                        'unsigned'   => TRUE,
                        'null'       => FALSE,
                        'default'    => 1,
                    ],
                    'joined_at' => [
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
                ->add_key('id', TRUE)
                ->add_key('user_id', FALSE, TRUE, 'members_user_id_unique')
                ->add_key('member_id', FALSE, TRUE, 'members_member_id_unique')
                ->add_key('email', FALSE, FALSE, 'members_email_idx')
                ->create_table('members');
        }

        // Migrate existing data from users table into members table
        // Only migrate rows that have a full_name (i.e. were member registrations)
        $lava = $this->_lava;
        $db   = $lava->db;

        // Check if the old columns exist on users before trying to migrate
        if ($this->_lava->dbforge->column_exists('users', 'full_name')) {
            $existing_users = $db->table('users')
                ->where_not_null('full_name')
                ->get_all();

            if (!empty($existing_users)) {
                foreach ($existing_users as $user) {
                    // Skip if already migrated
                    $already = $db->table('members')
                        ->where('user_id', $user['id'])
                        ->get();

                    if (!empty($already)) {
                        continue;
                    }

                    // Generate member_id if missing
                    $member_id = $user['member_id'] ?? null;
                    if (empty($member_id)) {
                        do {
                            $year      = date('Y');
                            $rand      = strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
                            $member_id = "LG-{$year}-{$rand}";
                            $chk       = $db->table('members')->where('member_id', $member_id)->get();
                        } while (!empty($chk));
                    }

                    $db->table('members')->insert([
                        'user_id'        => $user['id'],
                        'member_id'      => $member_id,
                        'full_name'      => $user['full_name'] ?? ($user['username'] ?? 'Unknown'),
                        'age'            => $user['age'] ?? null,
                        'address'        => $user['address'] ?? null,
                        'email'          => $user['email'],
                        'membership_tier'=> $user['membership_tier'] ?? 'Standard Member',
                        'is_active'      => $user['is_active'] ?? 1,
                        'joined_at'      => $user['created_at'] ?? date('Y-m-d H:i:s'),
                        'updated_at'     => $user['updated_at'] ?? null,
                    ]);
                }
            }
        }
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('members');
    }
}
