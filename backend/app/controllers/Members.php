<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Members extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    // Officers at admins ang pwedeng tumingin ng buong listahan ng members
    public function index()
    {
        $user = require_auth_user();
        if (!in_array($user['role'], ['admin', 'officer'], true)) {
            api_response(['error' => 'Forbidden. Admin or officer privileges required.'], 403);
        }

        $stmt = $this->db->raw(
            "SELECT m.*, u.username, u.email, u.role, u.is_active AS user_active,
                    d.name AS dgroup_name, min.name AS ministry_name
             FROM members m
             JOIN users u ON u.id = m.user_id
             LEFT JOIN dgroups d ON d.id = m.dgroup_id
             LEFT JOIN ministries min ON min.id = m.ministry_id
             ORDER BY m.joined_at DESC"
        );
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($members as &$m) {
            $m['member_id'] = $m['member_id'] ?? ($m['member_code'] ?? null);
            $m['status']    = $m['status'] ?? ($m['is_active'] ? 'approved' : 'inactive');
            $m['joined_at'] = $m['joined_at'] ?? ($m['created_at'] ?? null);
        }
        api_response($members);
    }


    // Attended-event history ng sariling account (member)
    public function my_attendance()
    {
        $user = require_auth_user();
        api_response($this->attendance_for((int) $user['id']));
    }

    // Attended-event history ng isang member (staff lang). {id} = users.id
    public function attendance($userId)
    {
        require_staff_user();
        api_response($this->attendance_for((int) $userId));
    }

    private function attendance_for($userId)
    {
        $rows = $this->db->raw(
            "SELECT e.id AS event_id, e.title, e.event_date, e.event_time, e.location,
                    ea.rsvp_status, ea.checked_in, ea.checked_in_at
             FROM event_attendances ea
             JOIN events e ON e.id = ea.event_id
             WHERE ea.user_id = ?
             ORDER BY e.event_date DESC, e.id DESC",
            [$userId]
        )->fetchAll(PDO::FETCH_ASSOC);

        $today = date('Y-m-d');
        $attended = 0; $missed = 0; $first = null; $last = null;
        foreach ($rows as &$r) {
            $r['checked_in'] = (int) $r['checked_in'];
            $past = substr($r['event_date'], 0, 10) < $today;
            if ($r['checked_in'] === 1) { $r['status'] = 'attended'; $attended++; $last = $last ?: $r['event_date']; $first = $r['event_date']; }
            elseif ($r['rsvp_status'] === 'cancelled') { $r['status'] = 'cancelled'; }
            elseif ($past) { $r['status'] = 'missed'; $missed++; }
            else { $r['status'] = 'upcoming'; }
        }
        unset($r);

        // Streak: magkakasunod na attended sa pinakabagong past events na may record
        $streak = 0;
        foreach ($rows as $r) {
            if ($r['status'] === 'upcoming' || $r['status'] === 'cancelled') continue;
            if ($r['status'] === 'attended') $streak++; else break;
        }

        $counted = $attended + $missed;
        return [
            'summary' => [
                'attended'   => $attended,
                'missed'     => $missed,
                'rate'       => $counted > 0 ? (int) round($attended / $counted * 100) : 0,
                'streak'     => $streak,
                'first_date' => $first,
                'last_date'  => $last,
            ],
            'history' => $rows,
        ];
    }

    public function update()
    {
        $user  = require_auth_user();
        $input = api_input();
        $targetUserId = (int) ($input['user_id'] ?? $input['id'] ?? $user['id']);

        $isAdmin = $user['role'] === 'admin';
        $isOfficer = $user['role'] === 'officer';
        $isStaff = $isAdmin || $isOfficer;
        $isSelf  = (int) $user['id'] === $targetUserId;

        if (!$isStaff && !$isSelf) {
            api_response(['error' => 'Permission denied.'], 403);
        }

        // Profile: ina-update lang ang mga field na ipinadala
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
        if (array_key_exists('gender', $input)) {
            $rawGender = trim((string) $input['gender']);
            if ($rawGender !== '') {
                $normGender = ucfirst(strtolower($rawGender));
                if (!in_array($normGender, ['Male', 'Female'])) {
                    api_response(['error' => 'Gender must be either Male or Female.'], 422);
                }
                $sets[] = 'gender = ?';
                $params[] = $normGender;
            } else {
                $sets[] = 'gender = NULL';
            }
        }
        if (array_key_exists('age', $input)) {
            $sets[] = 'age = ?';
            $params[] = ($input['age'] !== '' && $input['age'] !== null) ? (int) $input['age'] : null;
        }
        if (array_key_exists('address', $input)) {
            $sets[] = 'address = ?';
            $params[] = trim((string) $input['address']);
        }
        if (array_key_exists('bio', $input)) {
            $bioVal = trim((string) $input['bio']);
            $sets[] = 'bio = ?';
            $params[] = $bioVal !== '' ? $bioVal : null;
        }

        if ($sets) {
            // Walang updated_at column sa members ng lgy_db
            $params[] = $targetUserId;
            $this->db->raw("UPDATE members SET " . implode(', ', $sets) . " WHERE user_id = ?", $params);

            // Keep users table in sync with profile details
            $uSets = [];
            $uParams = [];
            if (array_key_exists('full_name', $input)) {
                $uSets[] = 'full_name = ?';
                $uParams[] = $fullName;
            }
            if (array_key_exists('gender', $input)) {
                $uSets[] = isset($normGender) ? 'gender = ?' : 'gender = NULL';
                if (isset($normGender)) $uParams[] = $normGender;
            }
            if (array_key_exists('age', $input)) {
                $uSets[] = 'age = ?';
                $uParams[] = ($input['age'] !== '' && $input['age'] !== null) ? (int) $input['age'] : null;
            }
            if (array_key_exists('address', $input)) {
                $uSets[] = 'address = ?';
                $uParams[] = trim((string) $input['address']);
            }
            if (array_key_exists('bio', $input)) {
                $uSets[] = 'bio = ?';
                $uParams[] = $bioVal !== '' ? $bioVal : null;
            }
            if ($uSets) {
                $uParams[] = $targetUserId;
                $this->db->raw("UPDATE users SET " . implode(', ', $uSets) . " WHERE id = ?", $uParams);
            }
        }

        // Role: admin at officer lang ang pwedeng magbago ng role
        if (isset($input['role'])) {
            if (!$isAdmin && !$isOfficer) {
                api_response(['error' => 'Only an admin or officer can change roles.'], 403);
            }
            $targetRole = strtolower(trim((string)$input['role']));
            if ($targetRole === 'member') {
                $targetRole = 'user';
            }
            // Officer cannot assign admin role
            if (!$isAdmin && $targetRole === 'admin') {
                api_response(['error' => 'Only an administrator can assign the admin role.'], 403);
            }
            $allowed_roles = ['user', 'officer', 'admin'];
            if ($isSelf) {
                // Only an admin may change their own role (officers can never self-promote),
                // and the organisation must always keep at least one active admin.
                if (!$isAdmin) {
                    api_response(['error' => 'You cannot change your own role.'], 403);
                }
                if ($targetRole !== 'admin') {
                    $left = (int) $this->db->raw("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ?", [$targetUserId])->fetchColumn();
                    try {
                        $left += (int) $this->db->raw("SELECT COUNT(*) FROM admins WHERE is_active = 1 AND email <> ?", [(string) ($user['email'] ?? '')])->fetchColumn();
                    } catch (Exception $e) {}
                    if ($left < 1) {
                        api_response(['error' => 'You are the only active admin. Make another admin first.'], 409);
                    }
                }
            }
            if (in_array($targetRole, $allowed_roles, true)) {
                $this->db->raw("UPDATE users SET role = ? WHERE id = ?", [$targetRole, $targetUserId]);
            } else {
                api_response(['error' => 'Invalid role specified.'], 422);
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

        $this->db->raw("UPDATE members SET avatar = ? WHERE user_id = ?", [$relativeUrl, $user['id']]);

        api_response([
            'success' => true,
            'message' => 'Profile picture updated successfully!',
            'avatar'  => $relativeUrl
        ]);
    }

    public function remove_avatar()
    {
        $user = require_auth_user();

        $this->db->raw("UPDATE members SET avatar = NULL WHERE user_id = ?", [$user['id']]);

        api_response([
            'success' => true,
            'message' => 'Profile picture removed.'
        ]);
    }
}