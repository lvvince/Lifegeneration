<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Members extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    // Officers lang ang pwedeng tumingin ng buong listahan ng members
    public function index()
    {
        require_admin_user();

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
        $user  = require_auth_user();
        $input = api_input();
        $targetUserId = (int) ($input['user_id'] ?? $input['id'] ?? $user['id']);

        $isStaff = in_array($user['role'], ['admin', 'moderator']);
        $isAdmin = $user['role'] === 'admin';
        $isSelf  = (int) $user['id'] === $targetUserId;

        if (!$isStaff && !$isSelf) {
            api_response(['error' => 'Permission denied.'], 403);
        }

        // Profile: ina-update lang ang mga field na ipinadala (dati nabubura ang name/age/address)
        $sets = [];
        $params = [];

        if (array_key_exists('full_name', $input)) {
            $fullName = trim((string) $input['full_name']);
            if ($fullName === '') {
                api_response(['error' => 'Full name is required.'], 422);
            }
            $sets[] = 'full_name = ?';
            $params[] = $fullName;
        }
        if (array_key_exists('age', $input)) {
            $sets[] = 'age = ?';
            $params[] = ($input['age'] !== '' && $input['age'] !== null) ? (int) $input['age'] : null;
        }
        if (array_key_exists('address', $input)) {
            $sets[] = 'address = ?';
            $params[] = trim((string) $input['address']);
        }

        if ($sets) {
            $sets[] = 'updated_at = NOW()';
            $params[] = $targetUserId;
            $this->db->raw("UPDATE members SET " . implode(', ', $sets) . " WHERE user_id = ?", $params);
        }

        // Role: admin lang, at hindi sariling role
        if (isset($input['role'])) {
            if (!$isAdmin) {
                api_response(['error' => 'Only an admin can change roles.'], 403);
            }
            if ($isSelf) {
                api_response(['error' => 'You cannot change your own role.'], 422);
            }
            if (in_array($input['role'], ['user', 'moderator', 'admin'])) {
                $this->db->raw("UPDATE users SET role = ? WHERE id = ?", [$input['role'], $targetUserId]);
            }
        }

        // Active/inactive: officers lang, at hindi sarili
        if (isset($input['is_active'])) {
            if (!$isStaff) {
                api_response(['error' => 'Permission denied.'], 403);
            }
            if ($isSelf) {
                api_response(['error' => 'You cannot deactivate your own account.'], 422);
            }
            $isActive = (int) $input['is_active'] ? 1 : 0;
            $this->db->raw("UPDATE users SET is_active = ? WHERE id = ?", [$isActive, $targetUserId]);
            $this->db->raw("UPDATE members SET is_active = ? WHERE user_id = ?", [$isActive, $targetUserId]);
        }

        api_response(['success' => true, 'message' => 'Member updated successfully.']);
    }
}
