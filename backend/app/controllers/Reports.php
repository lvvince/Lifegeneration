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

    /* ---------- Predictive analysis (staff: admin + officer) ----------
       Simple, explainable models (walang external library):
       - Linear regression (least squares) para sa trend ng attendance, bagong members at donations.
       - Show-up rate (attended / RSVP) para tantyahin ang dadating sa susunod na events.
       - Engagement score para sa members na maaaring lumayo (at-risk). */
    private function linreg(array $ys)
    {
        $n = count($ys);
        if ($n === 0) return ['a' => 0, 'b' => 0, 'sd' => 0, 'r2' => 0];
        if ($n === 1) return ['a' => (float) $ys[0], 'b' => 0, 'sd' => 0, 'r2' => 0];
        $sx = $sy = $sxy = $sxx = 0;
        foreach ($ys as $i => $y) { $sx += $i; $sy += $y; $sxy += $i * $y; $sxx += $i * $i; }
        $den = $n * $sxx - $sx * $sx;
        $b = $den != 0 ? ($n * $sxy - $sx * $sy) / $den : 0;
        $a = ($sy - $b * $sx) / $n;
        $ssRes = 0; $ssTot = 0; $mean = $sy / $n;
        foreach ($ys as $i => $y) { $f = $a + $b * $i; $ssRes += ($y - $f) ** 2; $ssTot += ($y - $mean) ** 2; }
        return [
            'a'  => $a, 'b' => $b,
            'sd' => $n > 2 ? sqrt($ssRes / ($n - 2)) : 0,
            'r2' => $ssTot > 0 ? max(0, 1 - $ssRes / $ssTot) : 0,
        ];
    }

    private function forecast(array $ys, $steps)
    {
        $m = $this->linreg($ys);
        $n = count($ys);
        $out = [];
        for ($k = 0; $k < $steps; $k++) {
            $v = max(0, $m['a'] + $m['b'] * ($n + $k));
            $out[] = ['value' => round($v, 1), 'low' => round(max(0, $v - 1.28 * $m['sd']), 1), 'high' => round($v + 1.28 * $m['sd'], 1)];
        }
        $dir = $m['b'] > 0.15 ? 'up' : ($m['b'] < -0.15 ? 'down' : 'flat');
        return ['points' => $out, 'slope' => round($m['b'], 2), 'confidence' => (int) round($m['r2'] * 100), 'direction' => $dir];
    }

    private function monthKeys($count)
    {
        $keys = [];
        for ($i = $count - 1; $i >= 0; $i--) $keys[] = date('Y-m', strtotime("first day of -$i month"));
        return $keys;
    }

    private function nextMonths($count)
    {
        $keys = [];
        for ($i = 1; $i <= $count; $i++) $keys[] = date('Y-m', strtotime("first day of +$i month"));
        return $keys;
    }

    public function predictive()
    {
        require_staff_user();

        /* 1. Attendance trend (huling 10 past events) */
        $past = array_reverse($this->db->raw(
            "SELECT e.id, e.title, e.event_date,
                    COALESCE(SUM(ea.rsvp_status = 'attending' OR ea.checked_in = 1), 0) AS rsvps,
                    COALESCE(SUM(ea.checked_in = 1), 0) AS attended
             FROM events e
             LEFT JOIN event_attendances ea ON ea.event_id = e.id
             WHERE e.is_active = 1 AND e.event_date < CURDATE()
             GROUP BY e.id, e.title, e.event_date
             ORDER BY e.event_date DESC LIMIT 10"
        )->fetchAll(PDO::FETCH_ASSOC));

        $attSeries = [];
        $totR = 0; $totA = 0;
        foreach ($past as &$p) {
            $p['rsvps'] = (int) $p['rsvps']; $p['attended'] = (int) $p['attended'];
            $attSeries[] = $p['attended'];
            $totR += $p['rsvps']; $totA += $p['attended'];
        }
        unset($p);
        $showRate = $totR > 0 ? min(1, $totA / $totR) : 0.7;
        $attForecast = $this->forecast($attSeries, 3);

        /* 2. Upcoming events: expected turnout = RSVPs x show-up rate */
        $upcoming = $this->db->raw(
            "SELECT e.id, e.title, e.event_date, e.capacity,
                    COALESCE(SUM(ea.rsvp_status = 'attending'), 0) AS rsvps
             FROM events e LEFT JOIN event_attendances ea ON ea.event_id = e.id
             WHERE e.is_active = 1 AND e.event_date >= CURDATE()
             GROUP BY e.id, e.title, e.event_date, e.capacity
             ORDER BY e.event_date ASC LIMIT 5"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($upcoming as &$u) {
            $u['rsvps'] = (int) $u['rsvps'];
            $u['capacity'] = $u['capacity'] !== null ? (int) $u['capacity'] : null;
            $u['expected'] = (int) round($u['rsvps'] * $showRate);
            $u['fill_pct'] = $u['capacity'] ? min(100, (int) round($u['rsvps'] / $u['capacity'] * 100)) : null;
        }
        unset($u);

        /* 3. Member growth (12 buwan) + forecast (3 buwan) */
        $keys = $this->monthKeys(12);
        $rows = $this->db->raw(
            "SELECT DATE_FORMAT(joined_at, '%Y-%m') AS month, COUNT(*) AS total
             FROM members WHERE joined_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
             GROUP BY month"
        )->fetchAll(PDO::FETCH_KEY_PAIR);
        $growth = [];
        foreach ($keys as $k) $growth[] = (int) ($rows[$k] ?? 0);
        $baseMembers = (int) ($this->db->raw("SELECT COUNT(*) FROM members WHERE is_active = 1")->fetchColumn());
        $growthFc = $this->forecast($growth, 3);

        /* 4. Giving (verified, 12 buwan) + forecast */
        $giving = array_fill(0, 12, 0.0);
        try {
            $g = $this->db->raw(
                "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COALESCE(SUM(amount), 0) AS total
                 FROM donations WHERE status = 'verified'
                   AND created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
                 GROUP BY month"
            )->fetchAll(PDO::FETCH_KEY_PAIR);
            foreach ($keys as $i => $k) $giving[$i] = (float) ($g[$k] ?? 0);
        } catch (Exception $e) {}
        $givingFc = $this->forecast($giving, 3);

        /* 5. At-risk members: huling 5 past events, bumaba ang attendance */
        $last5 = $this->db->raw("SELECT id FROM events WHERE is_active = 1 AND event_date < CURDATE() ORDER BY event_date DESC LIMIT 5")->fetchAll(PDO::FETCH_COLUMN);
        $atRisk = [];
        if (count($last5) >= 3) {
            $recent2 = array_map('intval', array_slice($last5, 0, 2));
            $all = array_map('intval', $last5);
            $idsAll = implode(',', $all);
            $idsRecent = implode(',', $recent2);
            $atRisk = $this->db->raw(
                "SELECT u.id AS user_id, COALESCE(m.full_name, u.username) AS full_name, m.member_id,
                        SUM(ea.checked_in = 1 AND ea.event_id IN ($idsAll)) AS recent_attended,
                        SUM(ea.checked_in = 1 AND ea.event_id IN ($idsRecent)) AS last2,
                        MAX(CASE WHEN ea.checked_in = 1 THEN ea.checked_in_at END) AS last_seen
                 FROM users u
                 LEFT JOIN members m ON m.user_id = u.id
                 JOIN event_attendances ea ON ea.user_id = u.id
                 WHERE u.is_active = 1 AND u.role = 'user'
                 GROUP BY u.id, m.full_name, u.username, m.member_id
                 HAVING SUM(ea.checked_in = 1) >= 2 AND last2 = 0
                 ORDER BY recent_attended DESC, full_name ASC LIMIT 10"
            )->fetchAll(PDO::FETCH_ASSOC);
            foreach ($atRisk as &$r) {
                $r['recent_attended'] = (int) $r['recent_attended'];
                $r['risk'] = $r['recent_attended'] >= 3 ? 'high' : 'medium'; // dating regular, biglang nawala
                unset($r['last2']);
            }
            unset($r);
        }

        api_response([
            'generated_at' => date('c'),
            'show_rate'    => (int) round($showRate * 100),
            'attendance'   => [
                'history'  => $past,
                'forecast' => $attForecast,
                'events_considered' => count($past),
            ],
            'upcoming'     => $upcoming,
            'growth'       => [
                'months'   => $keys,
                'values'   => $growth,
                'forecast_months' => $this->nextMonths(3),
                'forecast' => $growthFc,
                'active_members' => $baseMembers,
                'projected_members' => $baseMembers + (int) round(array_sum(array_column($growthFc['points'], 'value'))),
            ],
            'giving'       => [
                'months'   => $keys,
                'values'   => $giving,
                'forecast_months' => $this->nextMonths(3),
                'forecast' => $givingFc,
            ],
            'at_risk'      => $atRisk,
            'method'       => 'Least-squares trend on recent history. Ranges show an 80% band. More events and months make the forecast more reliable.',
        ]);
    }
}
