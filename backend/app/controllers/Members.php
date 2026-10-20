<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Members extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function index()
    {
        $stmt = $this->db->raw(
            "SELECT m.*, u.username, u.role, u.is_active AS user_active,
                    d.name AS dgroup_name, min.name AS ministry_name
             FROM members m
             JOIN users u ON u.id = m.user_id
             LEFT JOIN dgroups d ON d.id = m.dgroup_id
             LEFT JOIN ministries min ON min.id = m.ministry_id
             ORDER BY m.joined_at DESC"
        );
        api_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function update()
    {
        $user = require_auth_user();
        $input = api_input();
        $targetUserId = (int) ($input['user_id'] ?? $input['id'] ?? $user['id']);

        $isAdmin = in_array($user['role'], ['admin', 'moderator']);
        if (!$isAdmin && (int)$user['id'] !== $targetUserId) {
            api_response(['error' => 'Permission denied.'], 403);
        }

        $fullName = trim($input['full_name'] ?? '');
        $age      = !empty($input['age']) ? (int) $input['age'] : null;
        $address  = trim($input['address'] ?? '');

        // Update members table
        $this->db->raw(
            "UPDATE members SET full_name = ?, age = ?, address = ?, updated_at = NOW() WHERE user_id = ?",
            [$fullName, $age, $address, $targetUserId]
        );

        // If admin is updating role or active status
        if ($isAdmin) {
            if (isset($input['role']) && in_array($input['role'], ['user', 'moderator', 'admin'])) {
                $this->db->raw("UPDATE users SET role = ? WHERE id = ?", [$input['role'], $targetUserId]);
            }
            if (isset($input['is_active'])) {
                $isActive = (int) $input['is_active'];
                $this->db->raw("UPDATE users SET is_active = ? WHERE id = ?", [$isActive, $targetUserId]);
                $this->db->raw("UPDATE members SET is_active = ? WHERE user_id = ?", [$isActive, $targetUserId]);
            }
        }

        api_response(['success' => true, 'message' => 'Member profile updated successfully.']);
    }
}