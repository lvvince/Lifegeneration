<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class MemberModel extends Model {

    // Creates a pending member and assigns the ID in the format LG-YYYY-XXXXX
    public function create($user_id, $full_name, $age, $address) {
        $this->db->raw(
            'INSERT INTO members (user_id, full_name, age, address, status) VALUES (?, ?, ?, ?, "pending")',
            [$user_id, $full_name, $age, $address]
        );
        $id = $this->db->last_id();
        $code = sprintf('LG-%s-%05d', date('Y'), $id);
        $this->db->raw('UPDATE members SET member_code = ? WHERE id = ?', [$code, $id]);
        return $code;
    }

    public function all_with_users() {
        $stmt = $this->db->raw(
            'SELECT m.id, m.member_code, m.full_name, m.age, m.status, u.email
             FROM members m JOIN users u ON u.id = m.user_id
             ORDER BY m.created_at DESC'
        );
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function count_all() {
        $row = $this->db->raw('SELECT COUNT(*) AS total FROM members')->fetch(PDO::FETCH_ASSOC);
        return (int) $row['total'];
    }

    public function count_pending() {
        $row = $this->db->raw('SELECT COUNT(*) AS total FROM members WHERE status = "pending"')->fetch(PDO::FETCH_ASSOC);
        return (int) $row['total'];
    }
}