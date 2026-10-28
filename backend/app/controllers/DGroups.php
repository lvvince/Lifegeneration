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
        $userId = $user['id'] ?? 0;
        $userRole = $user['role'] ?? '';
        $isAdmin = ($userRole === 'admin');

        $userDgroupId = null;
        if ($userId > 0) {
            $mStmt = $this->db->raw("SELECT dgroup_id FROM members WHERE user_id = ? LIMIT 1", [$userId]);
            $mRow = $mStmt->fetch(PDO::FETCH_ASSOC);
            $userDgroupId = $mRow['dgroup_id'] ?? null;
        }

        $userRequests = [];
        if ($userId > 0) {
            try {
                $rStmt = $this->db->raw("SELECT dgroup_id, status FROM dgroup_requests WHERE user_id = ?", [$userId]);
                foreach ($rStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                    $userRequests[$r['dgroup_id']] = $r['status'];
                }
            } catch (Exception $e) {
                $userRequests = [];
            }
        }

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
            $isMember = ($userDgroupId && (int)$userDgroupId === (int)$g['id']);
            $g['is_joined'] = $isMember;

            $reqStatus = $userRequests[$g['id']] ?? ($isMember ? 'approved' : null);
            $g['request_status'] = $reqStatus;

            $g['has_gc'] = !empty($g['gc_link']);

            // Only reveal the direct GC link to approved members or admins
            if (!$isMember && !$isAdmin) {
                $g['gc_link'] = null;
            }
        }
        unset($g);

        api_response($groups);
    }

    public function join()
    {
        // Legacy direct join redirected to request_join
        return $this->request_join();
    }

    /**
     * POST /api/dgroups/request
     * Youth submits request to join a D-Group
     */
    public function request_join()
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];
        $input = api_input();
        $dgroupId = (int) ($input['dgroup_id'] ?? $input['id'] ?? 0);
        $note = trim($input['note'] ?? $input['request_note'] ?? '');

        if ($dgroupId <= 0) {
            api_response(['error' => 'Valid D-Group ID is required.'], 422);
        }

        // Verify D-Group exists
        $check = $this->db->raw("SELECT id, name FROM dgroups WHERE id = ? LIMIT 1", [$dgroupId])->fetch(PDO::FETCH_ASSOC);
        if (!$check) {
            api_response(['error' => 'D-Group not found.'], 404);
        }

        // Already in a D-Group? (members.dgroup_id holds only one)
        $mem = $this->db->raw("SELECT dgroup_id FROM members WHERE user_id = ? LIMIT 1", [$userId])->fetch(PDO::FETCH_ASSOC);
        if ($mem && !empty($mem['dgroup_id'])) {
            if ((int)$mem['dgroup_id'] === $dgroupId) {
                api_response(['error' => "You are already an approved member of {$check['name']}!"], 400);
            }
            api_response(['error' => 'You are already in a D-Group. Leave it first before joining another.'], 409);
        }

        // Only one pending request at a time
        $otherPending = $this->db->raw(
            "SELECT id FROM dgroup_requests WHERE user_id = ? AND status = 'pending' AND dgroup_id <> ? LIMIT 1",
            [$userId, $dgroupId]
        )->fetch(PDO::FETCH_ASSOC);

        if ($otherPending) {
            api_response(['error' => 'You already have a pending request for another D-Group. Cancel it first before requesting a new one.'], 409);
        }

        // Upsert join request
        $existing = $this->db->raw(
            "SELECT id, status FROM dgroup_requests WHERE dgroup_id = ? AND user_id = ? LIMIT 1",
            [$dgroupId, $userId]
        )->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $this->db->raw(
                "UPDATE dgroup_requests SET status = 'pending', request_note = ?, updated_at = NOW() WHERE id = ?",
                [$note ?: null, $existing['id']]
            );
        } else {
            $this->db->raw(
                "INSERT INTO dgroup_requests (dgroup_id, user_id, status, request_note, created_at) VALUES (?, ?, 'pending', ?, NOW())",
                [$dgroupId, $userId, $note ?: null]
            );
        }

        api_response([
            'success'   => true,
            'status'    => 'pending',
            'message'   => "Request submitted to join {$check['name']}! The leader will review your request to grant Group Chat (GC) access.",
            'dgroup_id' => $dgroupId
        ]);
    }

    /**
     * POST /api/dgroups/cancel-request
     * Youth cancels their pending join request
     */
    public function cancel_request()
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];
        $input = api_input();
        $dgroupId = (int) ($input['dgroup_id'] ?? $input['id'] ?? 0);

        if ($dgroupId > 0) {
            $this->db->raw("DELETE FROM dgroup_requests WHERE dgroup_id = ? AND user_id = ? AND status = 'pending'", [$dgroupId, $userId]);
        } else {
            $this->db->raw("DELETE FROM dgroup_requests WHERE user_id = ? AND status = 'pending'", [$userId]);
        }

        api_response([
            'success' => true,
            'message' => 'Join request cancelled.'
        ]);
    }

    public function leave()
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];

        $this->db->raw(
            "UPDATE members SET dgroup_id = NULL, updated_at = NOW() WHERE user_id = ?",
            [$userId]
        );

        $this->db->raw(
            "DELETE FROM dgroup_requests WHERE user_id = ?",
            [$userId]
        );

        api_response([
            'success' => true,
            'message' => 'You have left your D-Group.'
        ]);
    }

    /**
     * GET /api/dgroups/requests
     * Admin view of all D-Group join requests
     */
    public function requests()
    {
        require_staff_user();

        $stmt = $this->db->raw(
            "SELECT dr.*,
                    d.name AS dgroup_name, d.leader_name, d.gc_link,
                    u.username, u.email,
                    COALESCE(m.full_name, u.username) AS full_name,
                    m.member_code AS member_id, m.avatar, m.age, m.address
             FROM dgroup_requests dr
             INNER JOIN dgroups d ON d.id = dr.dgroup_id
             INNER JOIN users u ON u.id = dr.user_id
             LEFT JOIN members m ON m.user_id = u.id
             ORDER BY dr.created_at DESC"
        );
        $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($requests as &$r) {
            $r['id'] = (int) $r['id'];
            $r['dgroup_id'] = (int) $r['dgroup_id'];
            $r['user_id'] = (int) $r['user_id'];
            $r['display_name'] = $r['full_name'] ?: $r['username'];
        }
        unset($r);

        api_response($requests);
    }

    /**
     * POST /api/dgroups/accept-request
     * Admin approves youth request and unlocks GC
     */
    public function accept_request()
    {
        require_staff_user();
        $input = api_input();
        $requestId = (int) ($input['request_id'] ?? $input['id'] ?? 0);

        if ($requestId <= 0) {
            api_response(['error' => 'Request ID is required.'], 422);
        }

        $req = $this->db->raw(
            "SELECT dr.*, d.name AS dgroup_name, d.leader_name, d.schedule, d.location, d.gc_link,
                    u.email, u.username,
                    COALESCE(m.full_name, u.username) AS full_name
             FROM dgroup_requests dr
             INNER JOIN dgroups d ON d.id = dr.dgroup_id
             INNER JOIN users u ON u.id = dr.user_id
             LEFT JOIN members m ON m.user_id = u.id
             WHERE dr.id = ? LIMIT 1",
            [$requestId]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$req) {
            api_response(['error' => 'Request not found.'], 404);
        }

        // The user must have a member profile, otherwise the approval would do nothing
        $hasMember = $this->db->raw("SELECT id FROM members WHERE user_id = ? LIMIT 1", [$req['user_id']])->fetch(PDO::FETCH_ASSOC);
        if (!$hasMember) {
            api_response(['error' => 'This user has no member profile yet, so they cannot be added to a D-Group.'], 422);
        }

        // 1. Mark request approved
        $this->db->raw(
            "UPDATE dgroup_requests SET status = 'approved', updated_at = NOW() WHERE id = ?",
            [$requestId]
        );

        // 2. Assign to member profile
        $this->db->raw(
            "UPDATE members SET dgroup_id = ?, updated_at = NOW() WHERE user_id = ?",
            [$req['dgroup_id'], $req['user_id']]
        );

        // 3. Clear this user's other pending requests (they can only be in one D-Group)
        $this->db->raw(
            "DELETE FROM dgroup_requests WHERE user_id = ? AND status = 'pending' AND id <> ?",
            [$req['user_id'], $requestId]
        );

        // Automated Gmail SMTP Acceptance Notification
        try {
            require_once dirname(dirname(__FILE__)) . '/helpers/mailer_helper.php';
            send_dgroup_accepted_email($req);
        } catch (Exception $e) {}

        api_response([
            'success' => true,
            'message' => "Request approved! Member now has official access to {$req['dgroup_name']} and the Group Chat (GC)."
        ]);
    }

    /**
     * POST /api/dgroups/reject-request
     * Admin rejects youth request
     */
    public function reject_request()
    {
        require_staff_user();
        $input = api_input();
        $requestId = (int) ($input['request_id'] ?? $input['id'] ?? 0);

        if ($requestId <= 0) {
            api_response(['error' => 'Request ID is required.'], 422);
        }

        $exists = $this->db->raw("SELECT id FROM dgroup_requests WHERE id = ? LIMIT 1", [$requestId])->fetch(PDO::FETCH_ASSOC);
        if (!$exists) {
            api_response(['error' => 'Request not found.'], 404);
        }

        $this->db->raw(
            "UPDATE dgroup_requests SET status = 'rejected', updated_at = NOW() WHERE id = ?",
            [$requestId]
        );

        api_response([
            'success' => true,
            'message' => 'Request declined.'
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
        $gcLink      = trim($input['gc_link'] ?? '');
        $description = trim($input['description'] ?? '');
        $image       = trim($input['image'] ?? '');

        if ($name === '' || $leaderName === '') {
            api_response(['error' => 'Group name and leader name are required.'], 422);
        }

        $this->db->raw(
            "INSERT INTO dgroups (name, leader_name, schedule, location, gc_link, description, image, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            [$name, $leaderName, $schedule, $location, $gcLink ?: null, $description, $image ?: null]
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
        $gcLink      = trim($input['gc_link'] ?? '');
        $description = trim($input['description'] ?? '');

        if ($name === '' || $leaderName === '') {
            api_response(['error' => 'Group name and leader name are required.'], 422);
        }

        if (array_key_exists('image', $input)) {
            // Image field sent: update it
            $image = trim($input['image'] ?? '');
            $this->db->raw(
                "UPDATE dgroups
                 SET name = ?, leader_name = ?, schedule = ?, location = ?, gc_link = ?, description = ?, image = ?
                 WHERE id = ?",
                [$name, $leaderName, $schedule, $location, $gcLink ?: null, $description, $image ?: null, $id]
            );
        } else {
            // Image field not sent: keep the existing image
            $this->db->raw(
                "UPDATE dgroups
                 SET name = ?, leader_name = ?, schedule = ?, location = ?, gc_link = ?, description = ?
                 WHERE id = ?",
                [$name, $leaderName, $schedule, $location, $gcLink ?: null, $description, $id]
            );
        }

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
        $this->db->raw("DELETE FROM dgroup_requests WHERE dgroup_id = ?", [$id]);
        $this->db->raw("DELETE FROM dgroups WHERE id = ?", [$id]);

        api_response(['success' => true, 'message' => 'D-Group deleted successfully.']);
    }

    public function upload_image()
    {
        require_admin_user();

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            api_response(['error' => 'No image file uploaded or upload error occurred.'], 400);
        }

        $file    = $_FILES['image'];
        $ext     = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!in_array($ext, $allowed)) {
            api_response(['error' => 'Invalid file format. Allowed: JPG, PNG, WEBP, GIF.'], 422);
        }

        if ($file['size'] > 20 * 1024 * 1024) {
            api_response(['error' => 'File size exceeds 20 MB limit.'], 422);
        }

        $filename  = 'dgroup_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $publicDir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public';
        $uploadDir = $publicDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'dgroups' . DIRECTORY_SEPARATOR;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            api_response(['error' => 'Failed to save uploaded image.'], 500);
        }

        $relativeUrl = 'uploads/dgroups/' . $filename;
        api_response([
            'success' => true,
            'url'     => $relativeUrl,
            'message' => 'D-Group image uploaded successfully.'
        ]);
    }
}