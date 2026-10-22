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
    public function upload_avatar()
    {
        $user = require_auth_user();

        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            api_response(['error' => 'No image file uploaded or upload error occurred.'], 400);
        }

        $file = $_FILES['avatar'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!in_array($ext, $allowed)) {
            api_response(['error' => 'Invalid file format. Allowed: JPG, PNG, WEBP, GIF.'], 422);
        }

        if ($file['size'] > 25 * 1024 * 1024) {
            api_response(['error' => 'File size exceeds 25MB limit.'], 422);
        }

        $filename = 'avatar_' . $user['id'] . '_' . time() . '.' . $ext;

        $publicDir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public';
        $uploadDir = $publicDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'avatars' . DIRECTORY_SEPARATOR;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            api_response(['error' => 'Failed to save avatar image.'], 500);
        }

        $relativeUrl = 'uploads/avatars/' . $filename;

        if (!empty($user['role']) && $user['role'] === 'admin') {
            $this->db->raw("UPDATE admins SET avatar = ? WHERE id = ?", [$relativeUrl, $user['id']]);
        } else {
            $this->db->raw("UPDATE members SET avatar = ? WHERE user_id = ?", [$relativeUrl, $user['id']]);
        }

        api_response([
            'success' => true,
            'message' => 'Profile picture updated successfully!',
            'avatar'  => $relativeUrl
        ]);
    }

    public function remove_avatar()
    {
        $user = require_auth_user();

        if (!empty($user['role']) && $user['role'] === 'admin') {
            $this->db->raw("UPDATE admins SET avatar = NULL WHERE id = ?", [$user['id']]);
        } else {
            $this->db->raw("UPDATE members SET avatar = NULL WHERE user_id = ?", [$user['id']]);
        }

        api_response([
            'success' => true,
            'message' => 'Profile picture removed.'
        ]);
    }
}