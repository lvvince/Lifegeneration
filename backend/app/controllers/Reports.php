<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Reports (admin lang)
 * GET /api/reports/summary
 * Ibinabalik: members summary, bagong members kada buwan, attendance kada event,
 * at bilang ng members sa bawat D-Group at Ministry.
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
                    COALESCE(SUM(joined_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)), 0) AS new_30_days
             FROM members"
        )->fetch(PDO::FETCH_ASSOC);

        $byMonth = $this->db->raw(
            "SELECT DATE_FORMAT(joined_at, '%Y-%m') AS month, COUNT(*) AS total
             FROM members
             WHERE joined_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY DATE_FORMAT(joined_at, '%Y-%m')
             ORDER BY month ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $events = $this->db->raw(
            "SELECT e.id, e.title, e.event_date, e.capacity,
                    COALESCE(SUM(ea.rsvp_status = 'attending'), 0) AS rsvps,
                    COALESCE(SUM(ea.checked_in = 1), 0) AS attended
             FROM events e
             LEFT JOIN event_attendances ea ON ea.event_id = e.id
             WHERE e.is_active = 1
             GROUP BY e.id, e.title, e.event_date, e.capacity
             ORDER BY e.event_date DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        foreach ($events as &$ev) {
            $ev['rsvps']    = (int) $ev['rsvps'];
            $ev['attended'] = (int) $ev['attended'];
            $ev['capacity'] = $ev['capacity'] !== null ? (int) $ev['capacity'] : null;
            $ev['attendance_rate'] = $ev['rsvps'] > 0
                ? (int) round(($ev['attended'] / $ev['rsvps']) * 100)
                : 0;
        }
        unset($ev);

        $dgroups = $this->db->raw(
            "SELECT d.name, COUNT(mem.id) AS total
             FROM dgroups d
             LEFT JOIN members mem ON mem.dgroup_id = d.id
             GROUP BY d.id, d.name
             ORDER BY total DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $ministries = $this->db->raw(
            "SELECT mi.name, COUNT(mem.id) AS total
             FROM ministries mi
             LEFT JOIN members mem ON mem.ministry_id = mi.id
             WHERE mi.is_active = 1
             GROUP BY mi.id, mi.name
             ORDER BY total DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        api_response([
            'members' => [
                'total'       => (int) ($m['total'] ?? 0),
                'active'      => (int) ($m['active'] ?? 0),
                'inactive'    => (int) ($m['total'] ?? 0) - (int) ($m['active'] ?? 0),
                'new_30_days' => (int) ($m['new_30_days'] ?? 0),
            ],
            'members_by_month' => $byMonth,
            'events'           => $events,
            'dgroups'          => $dgroups,
            'ministries'       => $ministries,
        ]);
    }
}