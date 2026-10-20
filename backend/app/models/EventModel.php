<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class EventModel extends Model {

    public function all() {
        $stmt = $this->db->raw(
            'SELECT id, title, description, venue, start_at, capacity
             FROM events ORDER BY start_at ASC'
        );
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find($id) {
        $stmt = $this->db->raw(
            'SELECT id, title, description, venue, start_at, capacity
             FROM events WHERE id = ? LIMIT 1',
            [$id]
        );
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function count_all() {
        $row = $this->db->raw('SELECT COUNT(*) AS total FROM events')->fetch(PDO::FETCH_ASSOC);
        return (int) $row['total'];
    }
}