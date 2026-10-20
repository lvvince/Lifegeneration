<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class DGroups extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function index()
    {
        $user = get_auth_user();
        $userDgroupId = $user['dgroup_id'] ?? null;

        $stmt = $this->db->raw(
            "SELECT d.*, COUNT(m.id) AS member_count
             FROM dgroups d
             LEFT JOIN members m ON m.dgroup_id = d.id AND m.is_active = 1
             GROUP BY d.id
             ORDER BY d.id ASC"
        );
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($groups as &$g) {
            $g['member_count'] = (int) $g['member_count'];
            $g['is_joined'] = ($userDgroupId && (int)$userDgroupId === (int)$g['id']);
        }

        api_response($groups);
    }

    public function join()
    {
        $user = require_auth_user();
        $input = api_input();
        $dgroupId = (int) ($input['dgroup_id'] ?? $input['id'] ?? 0);

        if ($dgroupId <= 0) {
            api_response(['error' => 'Valid D-Group ID is required.'], 422);
        }

        // Verify D-Group exists
        $check = $this->db->raw("SELECT id, name FROM dgroups WHERE id = ? LIMIT 1", [$dgroupId])->fetch();
        if (!$check) {
            api_response(['error' => 'D-Group not found.'], 404);
        }

        // Assign to user's member profile
        $this->db->raw(
            "UPDATE members SET dgroup_id = ?, updated_at = NOW() WHERE user_id = ?",
            [$dgroupId, $user['id']]
        );

        api_response([
            'success'   => true,
            'message'   => "Successfully joined {$check['name']}!",
            'dgroup_id' => $dgroupId
        ]);
    }

    public function leave()
    {
        $user = require_auth_user();
        $this->db->raw(
            "UPDATE members SET dgroup_id = NULL, updated_at = NOW() WHERE user_id = ?",
            [$user['id']]
        );

        api_response([
            'success' => true,
            'message' => 'You have left your D-Group.'
        ]);
    }

    public function create()
    {
        require_admin_user();
        $input = api_input();

        $name        = trim($input['name'] ?? '');
        $leaderName  = trim($input['leader_name'] ?? '');
        $schedule    = trim($input['schedule'] ?? '');
        $location    = trim($input['location'] ?? '');
        $description = trim($input['description'] ?? '');
        $image       = trim($input['image'] ?? '');

        if (empty($name) || empty($leaderName)) {
            api_response(['error' => 'Group name and leader name are required.'], 422);
        }

        $this->db->raw(
            "INSERT INTO dgroups (name, leader_name, schedule, location, description, image, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [$name, $leaderName, $schedule, $location, $description, $image]
        );

        $newId = (int) $this->db->last_id();
        api_response([
            'success' => true,
            'message' => 'D-Group created successfully.',
            'id'      => $newId
        ], 201);
    }

    public function update()
    {
        require_admin_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response(['error' => 'D-Group ID is required.'], 422);
        }

        $name        = trim($input['name'] ?? '');
        $leaderName  = trim($input['leader_name'] ?? '');
        $schedule    = trim($input['schedule'] ?? '');
        $location    = trim($input['location'] ?? '');
        $description = trim($input['description'] ?? '');
        $image       = trim($input['image'] ?? '');

        $this->db->raw(
            "UPDATE dgroups
             SET name = ?, leader_name = ?, schedule = ?, location = ?, description = ?, image = ?, updated_at = NOW()
             WHERE id = ?",
            [$name, $leaderName, $schedule, $location, $description, $image, $id]
        );

        api_response(['success' => true, 'message' => 'D-Group updated successfully.']);
    }

    public function delete()
    {
        require_admin_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response(['error' => 'D-Group ID is required.'], 422);
        }

        $this->db->raw("UPDATE members SET dgroup_id = NULL WHERE dgroup_id = ?", [$id]);
        $this->db->raw("DELETE FROM dgroups WHERE id = ?", [$id]);

        api_response(['success' => true, 'message' => 'D-Group deleted successfully.']);
    }
}
