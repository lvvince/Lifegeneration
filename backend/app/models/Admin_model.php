<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Admin_model extends Model {

    protected $table = 'admins';
    protected $primary_key = 'id';

    protected $fillable = [
        'username',
        'full_name',
        'email',
        'password',
        'role',
        'avatar',
        'is_active',
        'created_at',
        'updated_at',
    ];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Find an admin by email or username
     *
     * @param string $identifier
     * @return array|null
     */
    public function find_by_identifier($identifier)
    {
        $admin = $this->db->table($this->table)
            ->where('email', $identifier)
            ->get();

        if (!empty($admin)) {
            return $admin;
        }

        $admin = $this->db->table($this->table)
            ->where('username', $identifier)
            ->get();

        if (!empty($admin)) {
            return $admin;
        }

        return null;
    }

    /**
     * Get admin by ID
     *
     * @param int $id
     * @return array|null
     */
    public function get_by_id($id)
    {
        return $this->db->table($this->table)->where('id', (int)$id)->get();
    }

    /**
     * Check if email exists
     */
    public function email_exists($email, $exclude_id = null)
    {
        $res = $this->db->table($this->table)->where('email', $email)->get();
        if (empty($res)) return false;
        if ($exclude_id && (int)($res['id'] ?? 0) === (int)$exclude_id) return false;
        return true;
    }

    /**
     * Check if username exists
     */
    public function username_exists($username, $exclude_id = null)
    {
        $res = $this->db->table($this->table)->where('username', $username)->get();
        if (empty($res)) return false;
        if ($exclude_id && (int)($res['id'] ?? 0) === (int)$exclude_id) return false;
        return true;
    }

    /**
     * Create an admin
     */
    public function create_admin($data)
    {
        if (isset($data['password']) && !password_get_info($data['password'])['algo']) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        $data['created_at'] = date('Y-m-d H:i:s');
        return $this->db->table($this->table)->insert($data);
    }

    /**
     * Update admin
     */
    public function update_admin($id, $data)
    {
        if (isset($data['password']) && !empty($data['password']) && !password_get_info($data['password'])['algo']) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        $data['updated_at'] = date('Y-m-d H:i:s');
        return $this->db->table($this->table)->where('id', (int)$id)->update($data);
    }

    /**
     * List all admins
     */
    public function get_all()
    {
        return $this->db->table($this->table)->order_by('id', 'DESC')->get_all();
    }
}
