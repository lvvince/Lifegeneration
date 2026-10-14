<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * User Model
 * ----------
 * Handles user data operations for Life Generation Youth.
 */
class User extends Model {

    protected $table      = 'users';
    protected $primaryKey = 'id';

    /**
     * Find a user by email address.
     *
     * @param  string $email
     * @return object|null
     */
    public function find_by_email(string $email): ?object
    {
        $result = $this->db
            ->select('*')
            ->from($this->table)
            ->where('email', $email)
            ->limit(1)
            ->get()
            ->result();

        return $result[0] ?? null;
    }

    /**
     * Find a user by username.
     *
     * @param  string $username
     * @return object|null
     */
    public function find_by_username(string $username): ?object
    {
        $result = $this->db
            ->select('*')
            ->from($this->table)
            ->where('username', $username)
            ->limit(1)
            ->get()
            ->result();

        return $result[0] ?? null;
    }

    /**
     * Find a user by ID.
     *
     * @param  int $id
     * @return object|null
     */
    public function find_by_id(int $id): ?object
    {
        $result = $this->db
            ->select('id, username, email, role, is_active, created_at')
            ->from($this->table)
            ->where('id', $id)
            ->limit(1)
            ->get()
            ->result();

        return $result[0] ?? null;
    }

    /**
     * Register a new user.
     *
     * @param  string $username
     * @param  string $email
     * @param  string $password  Plain-text password (will be hashed)
     * @param  string $role      'user' | 'moderator' | 'admin'
     * @return int|false         Inserted ID on success, false on failure
     */
    public function register(string $username, string $email, string $password, string $role = 'user'): int|false
    {
        $hashed = password_hash($password, PASSWORD_BCRYPT);

        $this->db->insert($this->table, [
            'username' => $username,
            'email'    => $email,
            'password' => $hashed,
            'role'     => $role,
        ]);

        return $this->db->insert_id() ?: false;
    }

    /**
     * Check if an email already exists.
     *
     * @param  string $email
     * @return bool
     */
    public function email_exists(string $email): bool
    {
        return $this->find_by_email($email) !== null;
    }

    /**
     * Check if a username already exists.
     *
     * @param  string $username
     * @return bool
     */
    public function username_exists(string $username): bool
    {
        return $this->find_by_username($username) !== null;
    }

    /**
     * Verify a plain-text password against a stored hash.
     *
     * @param  string $password
     * @param  string $hash
     * @return bool
     */
    public function verify_password(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}
?>
