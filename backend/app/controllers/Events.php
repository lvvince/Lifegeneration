<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Events extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function index()
    {
        $user = get_auth_user();
        $userId = $user['id'] ?? 0;

        $stmt = $this->db->raw(
            "SELECT e.*, COUNT(ea.id) AS attendee_count
             FROM events e
             LEFT JOIN event_attendances ea ON ea.event_id = e.id AND ea.rsvp_status = 'attending'
             WHERE e.is_active = 1
             GROUP BY e.id
             ORDER BY e.event_date ASC"
        );
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $userRsvps = [];
        if ($userId > 0) {
            $rStmt = $this->db->raw(
                "SELECT event_id, rsvp_status, checked_in, checked_in_at FROM event_attendances WHERE user_id = ?",
                [$userId]
            );
            foreach ($rStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $userRsvps[$r['event_id']] = $r;
            }
        }

        foreach ($events as &$ev) {
            $ev['attendee_count'] = (int) $ev['attendee_count'];
            $ev['user_rsvp'] = $userRsvps[$ev['id']]['rsvp_status'] ?? null;
            $ev['checked_in'] = (int) ($userRsvps[$ev['id']]['checked_in'] ?? 0);
            $ev['checked_in_at'] = $userRsvps[$ev['id']]['checked_in_at'] ?? null;
        }

        api_response($events);
    }

    public function show($id)
    {
        $id = (int) $id;
        $stmt = $this->db->raw("SELECT * FROM events WHERE id = ? LIMIT 1", [$id]);
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$event) {
            api_response(['error' => 'Event not found.'], 404);
        }

        $user = get_auth_user();
        if ($user) {
            $rStmt = $this->db->raw(
                "SELECT rsvp_status, checked_in, checked_in_at FROM event_attendances WHERE event_id = ? AND user_id = ? LIMIT 1",
                [$id, $user['id']]
            );
            $r = $rStmt->fetch(PDO::FETCH_ASSOC);
            $event['user_rsvp'] = $r['rsvp_status'] ?? null;
            $event['checked_in'] = (int) ($r['checked_in'] ?? 0);
            $event['checked_in_at'] = $r['checked_in_at'] ?? null;
        }

        api_response($event);
    }

    public function rsvp()
    {
        $user = require_auth_user();
        $input = api_input();
        $eventId = (int) ($input['event_id'] ?? $input['id'] ?? 0);

        if ($eventId <= 0) {
            api_response(['error' => 'Event ID is required.'], 422);
        }

        $event = $this->db->raw("SELECT id, title, event_date, event_time, location, capacity FROM events WHERE id = ? LIMIT 1", [$eventId])->fetch(PDO::FETCH_ASSOC);
        if (!$event) {
            api_response(['error' => 'Event not found.'], 404);
        }

        $memberId = $user['member_id'] ?: 'LG-USER';
        $memberName = $user['full_name'] ?: $user['username'];

        $existing = $this->db->raw(
            "SELECT id FROM event_attendances WHERE event_id = ? AND user_id = ? LIMIT 1",
            [$eventId, $user['id']]
        )->fetch();

        if ($existing) {
            $this->db->raw(
                "UPDATE event_attendances SET rsvp_status = 'attending', member_name = ? WHERE id = ?",
                [$memberName, $existing['id']]
            );
        } else {
            $this->db->raw(
                "INSERT INTO event_attendances (event_id, user_id, member_id, member_name, rsvp_status, checked_in, created_at)
                 VALUES (?, ?, ?, ?, 'attending', 0, NOW())",
                [$eventId, $user['id'], $memberId, $memberName]
            );
        }

        // Automated Gmail SMTP Confirmation
        try {
            require_once dirname(dirname(__FILE__)) . '/helpers/mailer_helper.php';
            send_event_rsvp_email($user, $event);
        } catch (Exception $e) {}

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

        $this->db->raw(
            "UPDATE event_attendances SET rsvp_status = 'cancelled' WHERE event_id = ? AND user_id = ?",
            [$eventId, $user['id']]
        );

        api_response(['success' => true, 'message' => 'RSVP cancelled.']);
    }

    public function check_in()
    {
        require_staff_user();
        $input = api_input();
        $eventId  = (int) ($input['event_id'] ?? 0);
        $memberId = trim($input['member_id'] ?? '');

        if ($eventId <= 0 || empty($memberId)) {
            api_response(['error' => 'Event ID and Member ID are required for check-in.'], 422);
        }

        // Look up member
        $memStmt = $this->db->raw(
            "SELECT m.*, u.id AS uid, u.username, u.email
             FROM members m
             JOIN users u ON u.id = m.user_id
             WHERE m.member_id = ? OR u.member_id = ? OR u.username = ? OR u.email = ?
             LIMIT 1",
            [$memberId, $memberId, $memberId, $memberId]
        );
        $member = $memStmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            api_response(['error' => "No member found matching identifier: {$memberId}."], 404);
        }

        $attStmt = $this->db->raw(
            "SELECT id, checked_in FROM event_attendances WHERE event_id = ? AND user_id = ? LIMIT 1",
            [$eventId, $member['user_id']]
        );
        $attendance = $attStmt->fetch(PDO::FETCH_ASSOC);

        if ($attendance && $attendance['checked_in'] == 1) {
            api_response([
                'success'    => true,
                'already_in' => true,
                'message'    => "{$member['full_name']} is already checked in!",
                'member'     => $member
            ]);
        }

        if ($attendance) {
            $this->db->raw(
                "UPDATE event_attendances SET checked_in = 1, checked_in_at = NOW(), rsvp_status = 'attending' WHERE id = ?",
                [$attendance['id']]
            );
        } else {
            // Walk-in check in
            $this->db->raw(
                "INSERT INTO event_attendances (event_id, user_id, member_id, member_name, rsvp_status, checked_in, checked_in_at, created_at)
                 VALUES (?, ?, ?, ?, 'attending', 1, NOW(), NOW())",
                [$eventId, $member['user_id'], $member['member_id'], $member['full_name']]
            );
        }

        api_response([
            'success' => true,
            'message' => "Check-in successful! Welcome, {$member['full_name']} ({$member['member_id']}).",
            'member'  => $member
        ]);
    }

    public function attendees($eventId)
    {
        require_staff_user();
        $eventId = (int) $eventId;
        $stmt = $this->db->raw(
            "SELECT ea.*, u.email, u.role
             FROM event_attendances ea
             JOIN users u ON u.id = ea.user_id
             WHERE ea.event_id = ? AND ea.rsvp_status = 'attending'
             ORDER BY ea.checked_in DESC, ea.created_at ASC",
            [$eventId]
        );
        api_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function create()
    {
        require_admin_user();
        $input = api_input();

        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $bannerImage = trim($input['banner_image'] ?? $input['image'] ?? '');
        $location    = trim($input['location'] ?? $input['venue'] ?? '');
        $mapUrl      = trim($input['map_url'] ?? '');
        $eventDate   = trim($input['event_date'] ?? date('Y-m-d'));
        $eventTime   = trim($input['event_time'] ?? '10:00 AM');
        $capacity    = !empty($input['capacity']) ? (int) $input['capacity'] : null;

        if (empty($title)) {
            api_response(['error' => 'Event title is required.'], 422);
        }

        $this->db->raw(
            "INSERT INTO events (title, description, banner_image, location, map_url, event_date, event_time, capacity, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())",
            [$title, $description, $bannerImage ?: null, $location, $mapUrl ?: null, $eventDate, $eventTime, $capacity]
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
        $bannerImage = trim($input['banner_image'] ?? $input['image'] ?? '');
        $location    = trim($input['location'] ?? $input['venue'] ?? '');
        $mapUrl      = trim($input['map_url'] ?? '');
        $eventDate   = trim($input['event_date'] ?? date('Y-m-d'));
        $eventTime   = trim($input['event_time'] ?? '');
        $capacity    = !empty($input['capacity']) ? (int) $input['capacity'] : null;

        $this->db->raw(
            "UPDATE events
             SET title = ?, description = ?, banner_image = ?, location = ?, map_url = ?, event_date = ?, event_time = ?, capacity = ?, updated_at = NOW()
             WHERE id = ?",
            [$title, $description, $bannerImage ?: null, $location, $mapUrl ?: null, $eventDate, $eventTime, $capacity, $id]
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
        
        // Base public path
        $publicDir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public';
        $uploadDir = $publicDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'events' . DIRECTORY_SEPARATOR;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            api_response(['error' => 'Failed to save uploaded image.'], 500);
        }

        // Return relative path
        $relativeUrl = 'uploads/events/' . $filename;
        api_response([
            'success' => true,
            'url'     => $relativeUrl,
            'message' => 'Event banner uploaded successfully.'
        ]);
    }
}
