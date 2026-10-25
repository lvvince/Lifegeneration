<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * lgy_db:
 *  ministries:            id, name, description, icon, cover_image
 *  ministry_applications: id, ministry_id, member_id (members.id), message,
 *                         status enum('pending','approved','declined'), created_at
 * Ang 'rejected' sa frontend ay itinatabi bilang 'declined' at ibinabalik bilang 'rejected'.
 */
class Ministries extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    private function to_db_status($s)
    {
        $s = strtolower(trim($s));
        return $s === 'rejected' ? 'declined' : $s;
    }

    private function to_api_status($s)
    {
        return $s === 'declined' ? 'rejected' : $s;
    }

    public function index()
    {
        $user = get_auth_user();
        $userMinistryId = $user['ministry_id'] ?? null;
        $memberId = (int) ($user['member_record_id'] ?? 0);

        $ministries = $this->db->raw(
            "SELECT m.id, m.name, m.description, m.icon, m.cover_image, m.cover_image AS image,
                    (SELECT COUNT(*) FROM ministry_applications a
                     WHERE a.ministry_id = m.id AND a.status = 'approved') AS volunteer_count
             FROM ministries m
             ORDER BY m.id ASC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $applications = [];
        if ($memberId > 0) {
            $rows = $this->db->raw(
                "SELECT ministry_id, status FROM ministry_applications WHERE member_id = ?",
                [$memberId]
            )->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                $applications[$r['ministry_id']] = $this->to_api_status($r['status']);
            }
        }

        foreach ($ministries as &$m) {
            $m['volunteer_count'] = (int) $m['volunteer_count'];
            $m['is_member'] = ($userMinistryId && (int) $userMinistryId === (int) $m['id']);
            $m['application_status'] = $applications[$m['id']] ?? null;
        }
        unset($m);

        api_response($ministries);
    }

    public function apply()
    {
        $user = require_auth_user();
        $input = api_input();
        $ministryId = (int) ($input['ministry_id'] ?? 0);
        $message    = trim($input['message'] ?? '');
        $memberId   = (int) ($user['member_record_id'] ?? 0);

        if ($ministryId <= 0) {
            api_response(['error' => 'Ministry selection is required.'], 422);
        }
        if ($memberId <= 0) {
            api_response(['error' => 'No member profile is linked to this account.'], 404);
        }

        $min = $this->db->raw("SELECT id, name FROM ministries WHERE id = ? LIMIT 1", [$ministryId])->fetch(PDO::FETCH_ASSOC);
        if (!$min) {
            api_response(['error' => 'Ministry not found.'], 404);
        }

        $existing = $this->db->raw(
            "SELECT id, status FROM ministry_applications WHERE member_id = ? AND ministry_id = ? LIMIT 1",
            [$memberId, $ministryId]
        )->fetch(PDO::FETCH_ASSOC);

        if ($existing && $existing['status'] === 'pending') {
            api_response(['error' => 'You already have a pending application for this ministry.'], 409);
        }
        if ($existing && $existing['status'] === 'approved') {
            api_response(['error' => 'You are already a member of this ministry.'], 409);
        }

        if ($existing) {
            $this->db->raw(
                "UPDATE ministry_applications SET message = ?, status = 'pending' WHERE id = ?",
                [$message, $existing['id']]
            );
        } else {
            $this->db->raw(
                "INSERT INTO ministry_applications (ministry_id, member_id, message, status, created_at)
                 VALUES (?, ?, ?, 'pending', NOW())",
                [$ministryId, $memberId, $message]
            );
        }

        api_response([
            'success' => true,
            'message' => "Application submitted for {$min['name']}! Our team will contact you shortly."
        ], 201);
    }

    public function cancel()
    {
        $user = require_auth_user();
        $input = api_input();
        $ministryId = (int) ($input['ministry_id'] ?? 0);
        $memberId   = (int) ($user['member_record_id'] ?? 0);

        if ($ministryId <= 0) {
            api_response(['error' => 'Ministry ID is required.'], 422);
        }

        if ($memberId > 0) {
            $this->db->raw(
                "DELETE FROM ministry_applications WHERE member_id = ? AND ministry_id = ? AND status = 'pending'",
                [$memberId, $ministryId]
            );
        }

        api_response(['success' => true, 'message' => 'Application cancelled.']);
    }

    public function applications()
    {
        require_staff_user();

        $rows = $this->db->raw(
            "SELECT a.id, a.ministry_id, a.member_id AS member_pk, a.message, a.status, a.created_at,
                    mi.name AS ministry_name, mi.icon AS ministry_icon,
                    m.user_id, m.member_code AS member_id, m.full_name AS member_name,
                    m.age, m.address, u.email
             FROM ministry_applications a
             JOIN ministries mi ON mi.id = a.ministry_id
             JOIN members m ON m.id = a.member_id
             LEFT JOIN users u ON u.id = m.user_id
             ORDER BY a.created_at DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['status'] = $this->to_api_status($r['status']);
        }
        unset($r);

        api_response($rows);
    }

    public function update_application()
    {
        require_staff_user();
        $input = api_input();
        $appId  = (int) ($input['application_id'] ?? $input['id'] ?? 0);
        $status = $this->to_db_status($input['status'] ?? '');

        if ($appId <= 0 || !in_array($status, ['approved', 'declined', 'pending'], true)) {
            api_response(['error' => 'Valid application ID and status (approved/rejected) required.'], 422);
        }

        $app = $this->db->raw("SELECT id FROM ministry_applications WHERE id = ? LIMIT 1", [$appId])->fetch(PDO::FETCH_ASSOC);
        if (!$app) {
            api_response(['error' => 'Application not found.'], 404);
        }

        $this->db->raw("UPDATE ministry_applications SET status = ? WHERE id = ?", [$status, $appId]);

        $label = $this->to_api_status($status);
        api_response([
            'success' => true,
            'message' => "Application {$label} successfully."
        ]);
    }

    public function delete_application()
    {
        require_admin_user();
        $input = api_input();
        $appId = (int) ($input['application_id'] ?? $input['id'] ?? 0);

        if ($appId <= 0) {
            api_response(['error' => 'Application ID required.'], 422);
        }

        $this->db->raw("DELETE FROM ministry_applications WHERE id = ?", [$appId]);
        api_response(['success' => true, 'message' => 'Application removed.']);
    }

    public function create()
    {
        require_admin_user();
        $input = api_input();
        $name        = trim($input['name'] ?? '');
        $icon        = trim($input['icon'] ?? '');
        $description = trim($input['description'] ?? '');
        $cover       = trim($input['cover_image'] ?? $input['image'] ?? '');

        if ($name === '') {
            api_response(['error' => 'Ministry name is required.'], 422);
        }

        $this->db->raw(
            "INSERT INTO ministries (name, icon, description, cover_image) VALUES (?, ?, ?, ?)",
            [$name, $icon !== '' ? $icon : null, $description, $cover !== '' ? $cover : null]
        );

        api_response(['success' => true, 'message' => 'Ministry created successfully.', 'id' => $this->db->last_id()], 201);
    }

    public function update()
    {
        require_admin_user();
        $input = api_input();
        $id          = (int) ($input['id'] ?? 0);
        $name        = trim($input['name'] ?? '');
        $icon        = trim($input['icon'] ?? '');
        $description = trim($input['description'] ?? '');
        $cover       = trim($input['cover_image'] ?? $input['image'] ?? '');

        if ($id <= 0 || $name === '') {
            api_response(['error' => 'Ministry ID and name are required.'], 422);
        }

        $this->db->raw(
            "UPDATE ministries SET name = ?, icon = ?, description = ?, cover_image = ? WHERE id = ?",
            [$name, $icon !== '' ? $icon : null, $description, $cover !== '' ? $cover : null, $id]
        );

        api_response(['success' => true, 'message' => 'Ministry updated successfully.']);
    }

    public function delete()
    {
        require_admin_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response(['error' => 'Ministry ID required.'], 422);
        }

        $this->db->raw("DELETE FROM ministry_applications WHERE ministry_id = ?", [$id]);
        $this->db->raw("DELETE FROM ministries WHERE id = ?", [$id]);

        api_response(['success' => true, 'message' => 'Ministry deleted.']);
    }
}