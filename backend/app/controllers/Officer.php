<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Officer portal API (lgy_db). Pinapayagan ang role 'officer' at 'admin'.
 *  GET  /api/officer/dashboard
 *  POST /api/officer/registrations/review   { id (members.id), status: approved|rejected }
 */
class Officer extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    private function require_officer()
    {
        $user = require_auth_user();
        if (!in_array($user['role'], ['officer', 'admin'], true)) {
            api_response(['error' => 'Forbidden. Officer privileges required.'], 403);
        }
        return $user;
    }

    private function one($sql, $params = [])
    {
        $row = $this->db->raw($sql, $params)->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['total'] ?? 0);
    }

    public function dashboard()
    {
        $this->require_officer();

        $members  = $this->one("SELECT COUNT(*) AS total FROM members WHERE is_active = 1");
        $pendingApps = $this->one("SELECT COUNT(*) AS total FROM ministry_applications WHERE status = 'pending'");
        $pendingMems = $this->one("SELECT COUNT(*) AS total FROM members WHERE status = 'pending'");
        $pendingDonations = $this->one("SELECT COUNT(*) AS total FROM donations WHERE status = 'pending'");
        $pending = $pendingApps + $pendingMems;

        $upcoming = $this->one("SELECT COUNT(*) AS total FROM events WHERE event_date >= CURDATE() AND is_active = 1");

        // Attendance this month
        $present = $this->one(
            "SELECT COUNT(*) AS total FROM event_attendances ea
             JOIN events e ON e.id = ea.event_id
             WHERE ea.checked_in = 1
               AND YEAR(e.event_date) = YEAR(CURDATE()) AND MONTH(e.event_date) = MONTH(CURDATE())"
        );
        $rsvps = $this->one(
            "SELECT COUNT(*) AS total FROM event_attendances ea
             JOIN events e ON e.id = ea.event_id
             WHERE ea.rsvp_status = 'attending'
               AND YEAR(e.event_date) = YEAR(CURDATE()) AND MONTH(e.event_date) = MONTH(CURDATE())"
        );
        $rate = $rsvps > 0 ? min(100, (int) round($present / $rsvps * 100)) : 0;

        // Pending list: combines pending registrations and ministry applications
        $pendingMembersList = $this->db->raw(
            "SELECT m.id, m.full_name, u.email, COALESCE(m.created_at, m.joined_at, u.created_at) AS created_at
             FROM members m LEFT JOIN users u ON u.id = m.user_id
             WHERE m.status = 'pending'
             ORDER BY m.id ASC LIMIT 8"
        )->fetchAll(PDO::FETCH_ASSOC);

        $pendingAppsList = $this->db->raw(
            "SELECT ma.id, ma.member_name AS full_name, u.email, ma.created_at
             FROM ministry_applications ma
             JOIN users u ON u.id = ma.user_id
             WHERE ma.status = 'pending'
             ORDER BY ma.created_at ASC LIMIT 8"
        )->fetchAll(PDO::FETCH_ASSOC);

        $pendingList = array_slice(array_merge($pendingMembersList, $pendingAppsList), 0, 8);

        $events = $this->db->raw(
            "SELECT e.id, e.title, e.event_date,
                    (SELECT COUNT(*) FROM event_attendances ea WHERE ea.event_id = e.id AND ea.rsvp_status = 'attending') AS signups
             FROM events e WHERE e.event_date >= CURDATE() AND e.is_active = 1
             ORDER BY e.event_date ASC LIMIT 5"
        )->fetchAll(PDO::FETCH_ASSOC);

        $trend = array_reverse($this->db->raw(
            "SELECT e.id, e.title, e.event_date,
                    (SELECT COUNT(*) FROM event_attendances ea WHERE ea.event_id = e.id AND ea.checked_in = 1) AS present
             FROM events e WHERE e.event_date < CURDATE()
             ORDER BY e.event_date DESC LIMIT 6"
        )->fetchAll(PDO::FETCH_ASSOC));

        // Hindi um-attend sa huling 3 event
        $absent = [];
        $last3 = $this->db->raw(
            "SELECT id FROM events WHERE event_date < CURDATE() ORDER BY event_date DESC LIMIT 3"
        )->fetchAll(PDO::FETCH_COLUMN);
        if (count($last3) === 3) {
            $ids = implode(',', array_map('intval', $last3));
            $absent = $this->db->raw(
                "SELECT u.id AS member_id, COALESCE(m.full_name, u.username) AS full_name, 3 AS missed
                 FROM users u
                 LEFT JOIN members m ON m.user_id = u.id
                 WHERE u.is_active = 1 AND u.role = 'user'
                   AND NOT EXISTS (
                     SELECT 1 FROM event_attendances ea
                     WHERE ea.user_id = u.id AND ea.event_id IN ($ids) AND ea.checked_in = 1
                   )
                 ORDER BY full_name ASC LIMIT 8"
            )->fetchAll(PDO::FETCH_ASSOC);
        }

        $announcements = $this->db->raw(
            "SELECT id, title, created_at FROM announcements ORDER BY created_at DESC LIMIT 5"
        )->fetchAll(PDO::FETCH_ASSOC);

        api_response([
            'stats' => [
                'members' => $members,
                'pending' => $pending,
                'upcoming_events' => $upcoming,
                'attendance_rate' => $rate,
                'pending_donations' => $pendingDonations,
            ],
            'pending' => $pendingList,
            'events' => $events,
            'trend' => $trend,
            'absent' => $absent,
            'announcements' => $announcements,
        ]);
    }

    public function review_registration()
    {
        $this->require_officer();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);
        $status = strtolower(trim($input['status'] ?? ''));

        if ($id <= 0 || !in_array($status, ['approved', 'rejected'], true)) {
            api_response(['error' => 'A valid ID and status (approved/rejected) are required.'], 422);
        }

        // 1. Check if it's a pending member registration
        $member = $this->db->raw("SELECT id, status FROM members WHERE id = ? LIMIT 1", [$id])->fetch(PDO::FETCH_ASSOC);
        if ($member && ($member['status'] ?? '') === 'pending') {
            $this->db->raw(
                "UPDATE members SET status = ?, is_active = ? WHERE id = ?",
                [$status, $status === 'approved' ? 1 : 0, $id]
            );
            api_response(['success' => true, 'message' => "Registration {$status}."]);
        }

        // 2. Check if it's a ministry application
        $app = $this->db->raw("SELECT * FROM ministry_applications WHERE id = ? LIMIT 1", [$id])->fetch(PDO::FETCH_ASSOC);
        if ($app) {
            $this->db->raw(
                "UPDATE ministry_applications SET status = ?, updated_at = NOW() WHERE id = ?",
                [$status, $id]
            );
            if ($status === 'approved') {
                $this->db->raw(
                    "UPDATE members SET ministry_id = ?, updated_at = NOW() WHERE user_id = ?",
                    [$app['ministry_id'], $app['user_id']]
                );
            }
            api_response(['success' => true, 'message' => "Application {$status}."]);
        }

        // Fallback for member
        if ($member) {
            $this->db->raw(
                "UPDATE members SET status = ?, is_active = ? WHERE id = ?",
                [$status, $status === 'approved' ? 1 : 0, $id]
            );
            api_response(['success' => true, 'message' => "Member {$status}."]);
        }

        api_response(['error' => 'Record not found.'], 404);
    }
}