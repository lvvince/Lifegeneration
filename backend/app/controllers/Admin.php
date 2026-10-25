<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Admin extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    private function count($sql)
    {
        $row = $this->db->raw($sql)->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['total'] ?? 0);
    }

    public function stats()
    {
        require_admin_user();

        api_response([
            'members'              => $this->count("SELECT COUNT(*) AS total FROM members WHERE is_active = 1"),
            'events'               => $this->count("SELECT COUNT(*) AS total FROM events"),
            'dgroups'              => $this->count("SELECT COUNT(*) AS total FROM dgroups"),
            'ministries'           => $this->count("SELECT COUNT(*) AS total FROM ministries"),
            'pending_applications' => $this->count("SELECT COUNT(*) AS total FROM ministry_applications WHERE status = 'pending'"),
            'active_prayers'       => $this->count("SELECT COUNT(*) AS total FROM prayers WHERE is_answered = 0"),
            'checked_in_attendees' => $this->count("SELECT COUNT(*) AS total FROM attendance"),
        ]);
    }
}