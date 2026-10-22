<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Admin extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function stats()
    {
        require_admin_user();
        $membersCount = (int) $this->db->raw("SELECT COUNT(*) AS total FROM members WHERE is_active = 1")->fetch()['total'];
        $eventsCount = (int) $this->db->raw("SELECT COUNT(*) AS total FROM events WHERE is_active = 1")->fetch()['total'];
        $dgroupsCount = (int) $this->db->raw("SELECT COUNT(*) AS total FROM dgroups")->fetch()['total'];
        $ministriesCount = (int) $this->db->raw("SELECT COUNT(*) AS total FROM ministries WHERE is_active = 1")->fetch()['total'];
        $pendingApps = (int) $this->db->raw("SELECT COUNT(*) AS total FROM ministry_applications WHERE status = 'pending'")->fetch()['total'];
        $activePrayers = (int) $this->db->raw("SELECT COUNT(*) AS total FROM prayer_requests WHERE status = 'active'")->fetch()['total'];
        $checkedInCount = (int) $this->db->raw("SELECT COUNT(*) AS total FROM event_attendances WHERE checked_in = 1")->fetch()['total'];

        api_response([
            'members'              => $membersCount,
            'events'               => $eventsCount,
            'dgroups'              => $dgroupsCount,
            'ministries'           => $ministriesCount,
            'pending_applications' => $pendingApps,
            'active_prayers'       => $activePrayers,
            'checked_in_attendees' => $checkedInCount
        ]);
    }
}