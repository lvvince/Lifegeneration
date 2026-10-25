<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Reports (admin lang)
 * GET /api/reports/summary
 */
class Reports extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function summary()
    {
        require_admin_user();

        $m = $this->db->raw(
            "SELECT COUNT(*) AS total,
                    COALESCE(SUM(is_active = 1), 0) AS active,
                    COALESCE(SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)), 0) AS new_30_days
             FROM members"
        )->fetch(PDO::FETCH_ASSOC);

        $byMonth = $this->db->raw(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
             FROM members
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $events = $this->db->raw(
            "SELECT e.id, e.title, DATE(e.start_at) AS event_date, e.capacity,
                    (SELECT COUNT(*) FROM event_rsvps r
                     WHERE r.event_id = e.id AND r.status = 'confirmed') AS rsvps,
                    (SELECT COUNT(*) FROM attendance a WHERE a.event_id = e.id) AS attended
             FROM events e
             ORDER BY e.start_at DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        foreach ($events as &$ev) {
            $ev['rsvps']    = (int) $ev['rsvps'];
            $ev['attended'] = (int) $ev['attended'];
            $ev['capacity'] = $ev['capacity'] !== null ? (int) $ev['capacity'] : null;
            $ev['attendance_rate'] = $ev['rsvps'] > 0
                ? min(100, (int) round(($ev['attended'] / $ev['rsvps']) * 100))
                : 0;
        }
        unset($ev);

        $dgroups = $this->db->raw(
            "SELECT d.name, COUNT(dm.id) AS total
             FROM dgroups d
             LEFT JOIN dgroup_members dm ON dm.dgroup_id = d.id AND dm.status = 'active'
             GROUP BY d.id, d.name
             ORDER BY total DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $ministries = $this->db->raw(
            "SELECT mi.name, COUNT(ma.id) AS total
             FROM ministries mi
             LEFT JOIN ministry_applications ma ON ma.ministry_id = mi.id AND ma.status = 'approved'
             GROUP BY mi.id, mi.name
             ORDER BY total DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        api_response([
            'members' => [
                'total'       => (int) $m['total'],
                'active'      => (int) $m['active'],
                'inactive'    => (int) $m['total'] - (int) $m['active'],
                'new_30_days' => (int) $m['new_30_days'],
            ],
            'members_by_month' => $byMonth,
            'events'           => $events,
            'dgroups'          => $dgroups,
            'ministries'       => $ministries,
        ]);
    }
}