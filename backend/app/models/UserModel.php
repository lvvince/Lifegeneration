<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class UserModel extends Model {

    public function find_by_identity($identity) {
        $stmt = $this->db->raw(
            'SELECT id, username, email, password_hash, role, is_active
             FROM users WHERE username = ? OR email = ? LIMIT 1',
            [$identity, $identity]
        );
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function exists($username, $email) {
        $stmt = $this->db->raw(
            'SELECT COUNT(*) AS total FROM users WHERE username = ? OR email = ?',
            [$username, $email]
        );
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return (int) $row['total'] > 0;
    }

    public function create($username, $email, $password_hash) {
        $this->db->raw(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, "user")',
            [$username, $email, $password_hash]
        );
        return $this->db->last_id();
    }

    public function remove($id) {
        $this->db->raw('DELETE FROM users WHERE id = ?', [$id]);
    }
}