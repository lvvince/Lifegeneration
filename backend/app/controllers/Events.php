<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Events extends Controller
{
    // Mga field na ibinabalik sa React (may aliases para tumugma sa frontend)
    private const EVENT_FIELDS = "e.id, e.title, e.description, e.venue, e.venue AS location,
        e.start_at, DATE(e.start_at) AS event_date,
        TIME_FORMAT(e.start_at, '%h:%i %p') AS event_time,
        e.capacity, e.banner, e.banner AS banner_image, e.created_by, e.created_at";

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    private function member_of($user)
    {
        if (!$user) return null;
        $row = $this->db->raw(
            "SELECT id, member_code, full_name FROM members WHERE user_id = ? LIMIT 1",
            [(int) $user['id']]
        )->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function to_start_at($date, $time)
    {
        $date = $date !== '' ? $date : date('Y-m-d');
        $ts = strtotime(trim($date . ' ' . $time));
        return $ts ? date('Y-m-d H:i:s', $ts) : $date . ' 10:00:00';
    }

    private function attach_user_state(array &$events, $member)
    {
        $rsvps = [];
        $checked = [];
        if ($member) {
            $r = $this->db->raw(
                "SELECT event_id, status FROM event_rsvps WHERE member_id = ?",
                [(int) $member['id']]
            )->fetchAll(PDO::FETCH_ASSOC);
            foreach ($r as $x) $rsvps[$x['event_id']] = $x['status'];

            $a = $this->db->raw(
                "SELECT event_id, checked_in_at FROM attendance WHERE member_id = ?",
                [(int) $member['id']]
            )->fetchAll(PDO::FETCH_ASSOC);
            foreach ($a as $x) $checked[$x['event_id']] = $x['checked_in_at'];
        }
        foreach ($events as &$ev) {
            $ev['attendee_count'] = (int) ($ev['attendee_count'] ?? 0);
            $ev['user_rsvp'] = $rsvps[$ev['id']] ?? null;
            $ev['checked_in'] = isset($checked[$ev['id']]) ? 1 : 0;
            $ev['checked_in_at'] = $checked[$ev['id']] ?? null;
        }
        unset($ev);
    }

    public function index()
    {
        $user = get_auth_user();

        $events = $this->db->raw(
            "SELECT " . self::EVENT_FIELDS . ",
                    (SELECT COUNT(*) FROM event_rsvps r
                     WHERE r.event_id = e.id AND r.status = 'confirmed') AS attendee_count
             FROM events e
             ORDER BY e.start_at ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $this->attach_user_state($events, $this->member_of($user));
        api_response($events);
    }

    public function show($id)
    {
        $id = (int) $id;
        $event = $this->db->raw(
            "SELECT " . self::EVENT_FIELDS . ",
                    (SELECT COUNT(*) FROM event_rsvps r
                     WHERE r.event_id = e.id AND r.status = 'confirmed') AS attendee_count
             FROM events e WHERE e.id = ? LIMIT 1",
            [$id]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            api_response(['error' => 'Event not found.'], 404);
        }

        $list = [$event];
        $this->attach_user_state($list, $this->member_of(get_auth_user()));
        api_response($list[0]);
    }

    public function rsvp()
    {
        $user = require_auth_user();
        $input = api_input();
        $eventId = (int) ($input['event_id'] ?? $input['id'] ?? 0);

        if ($eventId <= 0) {
            api_response(['error' => 'Event ID is required.'], 422);
        }

        $event = $this->db->raw(
            "SELECT id, title, capacity FROM events WHERE id = ? LIMIT 1", [$eventId]
        )->fetch(PDO::FETCH_ASSOC);
        if (!$event) {
            api_response(['error' => 'Event not found.'], 404);
        }

        $member = $this->member_of($user);
        if (!$member) {
            api_response(['error' => 'No member profile is linked to this account.'], 404);
        }

        $existing = $this->db->raw(
            "SELECT id, status FROM event_rsvps WHERE event_id = ? AND member_id = ? LIMIT 1",
            [$eventId, $member['id']]
        )->fetch(PDO::FETCH_ASSOC);

        if (!empty($event['capacity']) && (!$existing || $existing['status'] !== 'confirmed')) {
            $count = (int) $this->db->raw(
                "SELECT COUNT(*) FROM event_rsvps WHERE event_id = ? AND status = 'confirmed'",
                [$eventId]
            )->fetchColumn();
            if ($count >= (int) $event['capacity']) {
                api_response(['error' => 'Sorry, this event is already full.'], 409);
            }
        }

        if ($existing) {
            $this->db->raw("UPDATE event_rsvps SET status = 'confirmed' WHERE id = ?", [$existing['id']]);
        } else {
            $this->db->raw(
                "INSERT INTO event_rsvps (event_id, member_id, status, created_at)
                 VALUES (?, ?, 'confirmed', NOW())",
                [$eventId, $member['id']]
            );
        }

        api_response([
            'success' => true,
            'message' => "RSVP confirmed for {$event['title']}! See you there."
        ]);
    }

    public function cancel_rsvp()
    {
        $user = require_auth_user();
        $input = api_input();
        $eventId = (int) ($input['event_id'] ?? $input['id'] ?? 0);

        if ($eventId <= 0) {
            api_response(['error' => 'Event ID is required.'], 422);
        }

        $member = $this->member_of($user);
        if ($member) {
            $this->db->raw(
                "UPDATE event_rsvps SET status = 'cancelled' WHERE event_id = ? AND member_id = ?",
                [$eventId, $member['id']]
            );
        }

        api_response(['success' => true, 'message' => 'RSVP cancelled.']);
    }

    public function check_in()
    {
        require_staff_user();
        $input = api_input();
        $eventId = (int) ($input['event_id'] ?? 0);
        $code = trim($input['member_id'] ?? '');

        if ($eventId <= 0 || $code === '') {
            api_response(['error' => 'Event ID and Member ID are required for check-in.'], 422);
        }

        $member = $this->db->raw(
            "SELECT m.id, m.user_id, m.member_code, m.member_code AS member_id, m.full_name,
                    u.username, u.email
             FROM members m
             JOIN users u ON u.id = m.user_id
             WHERE m.member_code = ? OR u.username = ? OR u.email = ?
             LIMIT 1",
            [$code, $code, $code]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            api_response(['error' => "No member found matching identifier: {$code}."], 404);
        }

        $attendance = $this->db->raw(
            "SELECT id FROM attendance WHERE event_id = ? AND member_id = ? LIMIT 1",
            [$eventId, $member['id']]
        )->fetch(PDO::FETCH_ASSOC);

        if ($attendance) {
            api_response([
                'success'    => true,
                'already_in' => true,
                'message'    => "{$member['full_name']} is already checked in!",
                'member'     => $member
            ]);
        }

        $this->db->raw(
            "INSERT INTO attendance (event_id, member_id, checked_in_at) VALUES (?, ?, NOW())",
            [$eventId, $member['id']]
        );

        // Walk-in: siguraduhing may RSVP row din
        $rsvp = $this->db->raw(
            "SELECT id FROM event_rsvps WHERE event_id = ? AND member_id = ? LIMIT 1",
            [$eventId, $member['id']]
        )->fetch(PDO::FETCH_ASSOC);
        if (!$rsvp) {
            $this->db->raw(
                "INSERT INTO event_rsvps (event_id, member_id, status, created_at)
                 VALUES (?, ?, 'confirmed', NOW())",
                [$eventId, $member['id']]
            );
        }

        api_response([
            'success' => true,
            'message' => "Check-in successful! Welcome, {$member['full_name']} ({$member['member_code']}).",
            'member'  => $member
        ]);
    }

    public function attendees($eventId)
    {
        require_staff_user();
        $eventId = (int) $eventId;

        $rows = $this->db->raw(
            "SELECT r.id, r.event_id, r.member_id AS member_pk, m.member_code AS member_id,
                    m.full_name AS member_name, m.user_id, u.email, u.role,
                    r.status AS rsvp_status, r.created_at,
                    (a.id IS NOT NULL) AS checked_in, a.checked_in_at
             FROM event_rsvps r
             JOIN members m ON m.id = r.member_id
             LEFT JOIN users u ON u.id = m.user_id
             LEFT JOIN attendance a ON a.event_id = r.event_id AND a.member_id = r.member_id
             WHERE r.event_id = ? AND r.status = 'confirmed'
             ORDER BY checked_in DESC, r.created_at ASC",
            [$eventId]
        )->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['checked_in'] = (int) $row['checked_in'];
        }
        unset($row);

        api_response($rows);
    }

    public function create()
    {
        $user = require_admin_user();
        $input = api_input();

        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $banner      = trim($input['banner_image'] ?? $input['image'] ?? '');
        $venue       = trim($input['location'] ?? $input['venue'] ?? '');
        $startAt     = $this->to_start_at(trim($input['event_date'] ?? ''), trim($input['event_time'] ?? '10:00 AM'));
        $capacity    = !empty($input['capacity']) ? (int) $input['capacity'] : null;

        if ($title === '') {
            api_response(['error' => 'Event title is required.'], 422);
        }

        $this->db->raw(
            "INSERT INTO events (title, description, venue, start_at, capacity, banner, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            [$title, $description, $venue, $startAt, $capacity, $banner ?: null, (int) $user['id']]
        );

        api_response([
            'success' => true,
            'message' => 'Event created successfully.',
            'id'      => $this->db->last_id()
        ], 201);
    }

    public function update()
    {
        require_admin_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response(['error' => 'Event ID is required.'], 422);
        }

        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $banner      = trim($input['banner_image'] ?? $input['image'] ?? '');
        $venue       = trim($input['location'] ?? $input['venue'] ?? '');
        $startAt     = $this->to_start_at(trim($input['event_date'] ?? ''), trim($input['event_time'] ?? '10:00 AM'));
        $capacity    = !empty($input['capacity']) ? (int) $input['capacity'] : null;

        if ($title === '') {
            api_response(['error' => 'Event title is required.'], 422);
        }

        $this->db->raw(
            "UPDATE events
             SET title = ?, description = ?, venue = ?, start_at = ?, capacity = ?, banner = ?
             WHERE id = ?",
            [$title, $description, $venue, $startAt, $capacity, $banner ?: null, $id]
        );

        api_response(['success' => true, 'message' => 'Event updated successfully.']);
    }

    public function delete()
    {
        require_admin_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response(['error' => 'Event ID is required.'], 422);
        }

        $this->db->raw("DELETE FROM attendance WHERE event_id = ?", [$id]);
        $this->db->raw("DELETE FROM event_rsvps WHERE event_id = ?", [$id]);
        $this->db->raw("DELETE FROM events WHERE id = ?", [$id]);
        api_response(['success' => true, 'message' => 'Event deleted.']);
    }

    public function upload_banner()
    {
        require_admin_user();

        if (!isset($_FILES['banner']) || $_FILES['banner']['error'] !== UPLOAD_ERR_OK) {
            api_response(['error' => 'No image file uploaded or upload error occurred.'], 400);
        }

        $file = $_FILES['banner'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!in_array($ext, $allowed)) {
            api_response(['error' => 'Invalid file format. Allowed: JPG, PNG, WEBP, GIF.'], 422);
        }

        if ($file['size'] > 60 * 1024 * 1024) {
            api_response(['error' => 'File size exceeds 60MB limit.'], 422);
        }

        $filename = 'event_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;

        $publicDir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public';
        $uploadDir = $publicDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'events' . DIRECTORY_SEPARATOR;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            api_response(['error' => 'Failed to save uploaded image.'], 500);
        }

        api_response([
            'success' => true,
            'url'     => 'uploads/events/' . $filename,
            'message' => 'Event banner uploaded successfully.'
        ]);
    }
}