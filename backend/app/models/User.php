<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * User Model
 * ----------
 * Handles user data operations for Life Generation Youth.
 */
class User extends Model {

    protected $table = 'users';

    /**
     * Find a user by email address.
     */
    public function find_by_email(string $email): ?object
    {
        $res = $this->db
            ->table($this->table)
            ->select('*')
            ->where('email', $email)
            ->get(PDO::FETCH_OBJ);

        return $res ?: null;
    }

    /**
     * Find a user by username.
     */
    public function find_by_username(string $username): ?object
    {
        $res = $this->db
            ->table($this->table)
            ->select('*')
            ->where('username', $username)
            ->get(PDO::FETCH_OBJ);

        return $res ?: null;
    }

    /**
     * Find a user by ID.
     */
    public function find_by_id(int $id): ?object
    {
        $res = $this->db
            ->table($this->table)
            ->select('id, username, email, role, is_active, created_at')
            ->where('id', $id)
            ->get(PDO::FETCH_OBJ);

        return $res ?: null;
    }

    /**
     * Register a new user.
     */
    public function register(string $username, string $email, string $password, string $role = 'user'): int|false
    {
        $hashed = password_hash($password, PASSWORD_BCRYPT);

        $this->db->table($this->table)->insert([
            'username' => $username,
            'email'    => $email,
            'password' => $hashed,
            'role'     => $role,
        ]);

        return $this->db->last_id() ?: false;
    }

    /**
     * Check if an email already exists.
     */
    public function email_exists(string $email): bool
    {
        return $this->find_by_email($email) !== null;
    }

    /**
     * Check if a username already exists.
     */
    public function username_exists(string $username): bool
    {
        return $this->find_by_username($username) !== null;
    }

    /**
     * Verify a plain-text password against a stored hash.
     */
    public function verify_password(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}
?>
