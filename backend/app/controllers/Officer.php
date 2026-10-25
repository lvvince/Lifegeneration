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
        $pending  = $this->one("SELECT COUNT(*) AS total FROM members WHERE status = 'pending'");
        $upcoming = $this->one("SELECT COUNT(*) AS total FROM events WHERE start_at >= NOW()");

        // Attendance ngayong buwan = present / confirmed RSVPs ng mga event ngayong buwan
        $present = $this->one(
            "SELECT COUNT(*) AS total FROM attendance a JOIN events e ON e.id = a.event_id
             WHERE YEAR(e.start_at) = YEAR(CURDATE()) AND MONTH(e.start_at) = MONTH(CURDATE())"
        );
        $rsvps = $this->one(
            "SELECT COUNT(*) AS total FROM event_rsvps r JOIN events e ON e.id = r.event_id
             WHERE r.status = 'confirmed'
               AND YEAR(e.start_at) = YEAR(CURDATE()) AND MONTH(e.start_at) = MONTH(CURDATE())"
        );
        $rate = $rsvps > 0 ? min(100, (int) round($present / $rsvps * 100)) : 0;

        $pendingList = $this->db->raw(
            "SELECT m.id, m.full_name, u.email, m.created_at
             FROM members m LEFT JOIN users u ON u.id = m.user_id
             WHERE m.status = 'pending'
             ORDER BY m.created_at ASC LIMIT 8"
        )->fetchAll(PDO::FETCH_ASSOC);

        $events = $this->db->raw(
            "SELECT e.id, e.title, DATE(e.start_at) AS event_date,
                    (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id = e.id AND r.status = 'confirmed') AS signups
             FROM events e WHERE e.start_at >= NOW()
             ORDER BY e.start_at ASC LIMIT 5"
        )->fetchAll(PDO::FETCH_ASSOC);

        $trend = array_reverse($this->db->raw(
            "SELECT e.id, e.title, DATE(e.start_at) AS event_date,
                    (SELECT COUNT(*) FROM attendance a WHERE a.event_id = e.id) AS present
             FROM events e WHERE e.start_at < NOW()
             ORDER BY e.start_at DESC LIMIT 6"
        )->fetchAll(PDO::FETCH_ASSOC));

        // Hindi um-attend sa huling 3 event
        $absent = [];
        $last3 = $this->db->raw(
            "SELECT id FROM events WHERE start_at < NOW() ORDER BY start_at DESC LIMIT 3"
        )->fetchAll(PDO::FETCH_COLUMN);
        if (count($last3) === 3) {
            $ids = implode(',', array_map('intval', $last3));
            $absent = $this->db->raw(
                "SELECT m.id AS member_id, m.full_name, 3 AS missed
                 FROM members m
                 WHERE m.is_active = 1
                   AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.member_id = m.id AND a.event_id IN ($ids))
                 ORDER BY m.full_name ASC LIMIT 8"
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
            api_response(['error' => 'A valid member ID and status (approved/rejected) are required.'], 422);
        }

        $member = $this->db->raw("SELECT id FROM members WHERE id = ? LIMIT 1", [$id])->fetch(PDO::FETCH_ASSOC);
        if (!$member) {
            api_response(['error' => 'Registration not found.'], 404);
        }

        $this->db->raw(
            "UPDATE members SET status = ?, is_active = ? WHERE id = ?",
            [$status, $status === 'approved' ? 1 : 0, $id]
        );

        api_response(['success' => true, 'message' => "Registration {$status}."]);
    }
}