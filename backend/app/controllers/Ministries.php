<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Ministries extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function index()
    {
        $user = get_auth_user();
        $userMinistryId = $user['ministry_id'] ?? null;
        $userId = $user['id'] ?? 0;

        $stmt = $this->db->raw(
            "SELECT m.*, COUNT(mem.id) AS volunteer_count
             FROM ministries m
             LEFT JOIN members mem ON mem.ministry_id = m.id AND mem.is_active = 1
             WHERE m.is_active = 1
             GROUP BY m.id
             ORDER BY m.id ASC"
        );
        $ministries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch user's pending/approved applications if authenticated
        $applications = [];
        if ($userId > 0) {
            $appStmt = $this->db->raw(
                "SELECT ministry_id, status FROM ministry_applications WHERE user_id = ?",
                [$userId]
            );
            $userApps = $appStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($userApps as $ua) {
                $applications[$ua['ministry_id']] = $ua['status'];
            }
        }

        foreach ($ministries as &$m) {
            $m['volunteer_count'] = (int) $m['volunteer_count'];
            $m['is_member'] = ($userMinistryId && (int)$userMinistryId === (int)$m['id']);
            $m['application_status'] = $applications[$m['id']] ?? null;
        }

        api_response($ministries);
    }

    public function apply()
    {
        $user = require_auth_user();
        $input = api_input();
        $ministryId = (int) ($input['ministry_id'] ?? 0);
        $message    = trim($input['message'] ?? '');

        if ($ministryId <= 0) {
            api_response(['error' => 'Ministry selection is required.'], 422);
        }

        $min = $this->db->raw("SELECT id, name FROM ministries WHERE id = ? LIMIT 1", [$ministryId])->fetch();
        if (!$min) {
            api_response(['error' => 'Ministry not found.'], 404);
        }

        // Check if already applied and pending
        $existing = $this->db->raw(
            "SELECT id, status FROM ministry_applications WHERE user_id = ? AND ministry_id = ? LIMIT 1",
            [$user['id'], $ministryId]
        )->fetch();

        if ($existing && $existing['status'] === 'pending') {
            api_response(['error' => 'You already have a pending application for this ministry.'], 409);
        }

        $memberName = $user['full_name'] ?: $user['username'];

        if ($existing) {
            $this->db->raw(
                "UPDATE ministry_applications SET message = ?, status = 'pending', updated_at = NOW() WHERE id = ?",
                [$message, $existing['id']]
            );
        } else {
            $this->db->raw(
                "INSERT INTO ministry_applications (user_id, ministry_id, member_name, message, status, created_at)
                 VALUES (?, ?, ?, ?, 'pending', NOW())",
                [$user['id'], $ministryId, $memberName, $message]
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

        if ($ministryId <= 0) {
            api_response(['error' => 'Ministry ID is required.'], 422);
        }

        $this->db->raw(
            "DELETE FROM ministry_applications WHERE user_id = ? AND ministry_id = ? AND status = 'pending'",
            [$user['id'], $ministryId]
        );

        api_response(['success' => true, 'message' => 'Application cancelled.']);
    }

    public function applications()
    {
        require_admin_user();
        $stmt = $this->db->raw(
            "SELECT a.*, min.name AS ministry_name, min.icon AS ministry_icon, u.email, u.member_id, m.age, m.address
             FROM ministry_applications a
             JOIN ministries min ON min.id = a.ministry_id
             JOIN users u ON u.id = a.user_id
             LEFT JOIN members m ON m.user_id = u.id
             ORDER BY a.created_at DESC"
        );
        api_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function update_application()
    {
        require_admin_user();
        $input = api_input();
        $appId = (int) ($input['application_id'] ?? $input['id'] ?? 0);
        $status = strtolower(trim($input['status'] ?? ''));

        if ($appId <= 0 || !in_array($status, ['approved', 'rejected', 'pending'])) {
            api_response(['error' => 'Valid application ID and status (approved/rejected) required.'], 422);
        }

        $app = $this->db->raw("SELECT * FROM ministry_applications WHERE id = ? LIMIT 1", [$appId])->fetch();
        if (!$app) {
            api_response(['error' => 'Application not found.'], 404);
        }

        $this->db->raw(
            "UPDATE ministry_applications SET status = ?, updated_at = NOW() WHERE id = ?",
            [$status, $appId]
        );

        // If approved, update member's ministry_id
        if ($status === 'approved') {
            $this->db->raw(
                "UPDATE members SET ministry_id = ?, updated_at = NOW() WHERE user_id = ?",
                [$app['ministry_id'], $app['user_id']]
            );

            // Send automated acceptance email
            try {
                require_once dirname(dirname(__FILE__)) . '/helpers/mailer_helper.php';
                $applicant = $this->db->raw(
                    "SELECT u.email, u.username, COALESCE(u.full_name, m.full_name, u.username) AS full_name, min.name AS ministry_name, min.icon AS ministry_icon
                     FROM users u
                     LEFT JOIN members m ON m.user_id = u.id
                     LEFT JOIN ministries min ON min.id = ?
                     WHERE u.id = ?
                     LIMIT 1",
                    [$app['ministry_id'], $app['user_id']]
                )->fetch(PDO::FETCH_ASSOC);

                if ($applicant) {
                    send_ministry_accepted_email($applicant);
                }
            } catch (Exception $e) {}
        } elseif ($status === 'rejected') {
            // If was previously connected to this ministry, remove
            $this->db->raw(
                "UPDATE members SET ministry_id = NULL WHERE user_id = ? AND ministry_id = ?",
                [$app['user_id'], $app['ministry_id']]
            );
        }

        api_response([
            'success' => true,
            'message' => "Application {$status} successfully."
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
        $icon        = trim($input['icon'] ?? '✦');
        $image       = trim($input['image'] ?? '');
        $description = trim($input['description'] ?? '');
        $slots       = !empty($input['slots_available']) ? (int) $input['slots_available'] : null;

        if (empty($name)) {
            api_response(['error' => 'Ministry name is required.'], 422);
        }

        $this->db->raw(
            "INSERT INTO ministries (name, icon, image, description, slots_available, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, 1, NOW())",
            [$name, $icon, $image ?: null, $description, $slots]
        );

        api_response(['success' => true, 'message' => 'Ministry created successfully.', 'id' => $this->db->last_id()], 201);
    }

    public function update()
    {
        require_admin_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);
        $name        = trim($input['name'] ?? '');
        $icon        = trim($input['icon'] ?? '✦');
        $description = trim($input['description'] ?? '');
        $slots       = !empty($input['slots_available']) ? (int) $input['slots_available'] : null;

        if ($id <= 0 || empty($name)) {
            api_response(['error' => 'Ministry ID and name are required.'], 422);
        }

        // If image key present, update it; otherwise leave it unchanged
        if (array_key_exists('image', $input)) {
            $image = trim($input['image'] ?? '');
            $this->db->raw(
                "UPDATE ministries SET name = ?, icon = ?, image = ?, description = ?, slots_available = ? WHERE id = ?",
                [$name, $icon, $image ?: null, $description, $slots, $id]
            );
        } else {
            $this->db->raw(
                "UPDATE ministries SET name = ?, icon = ?, description = ?, slots_available = ? WHERE id = ?",
                [$name, $icon, $description, $slots, $id]
            );
        }

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

        $this->db->raw("UPDATE members SET ministry_id = NULL WHERE ministry_id = ?", [$id]);
        $this->db->raw("DELETE FROM ministries WHERE id = ?", [$id]);

        api_response(['success' => true, 'message' => 'Ministry deleted.']);
    }

    public function upload_image()
    {
        require_admin_user();

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            api_response(['error' => 'No image file uploaded or upload error occurred.'], 400);
        }

        $file = $_FILES['image'];
        $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!in_array($ext, $allowed)) {
            api_response(['error' => 'Invalid file format. Allowed: JPG, PNG, WEBP, GIF.'], 422);
        }

        if ($file['size'] > 20 * 1024 * 1024) {
            api_response(['error' => 'File size exceeds 20MB limit.'], 422);
        }

        $filename  = 'ministry_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $publicDir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public';
        $uploadDir = $publicDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'ministries' . DIRECTORY_SEPARATOR;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            api_response(['error' => 'Failed to save uploaded image.'], 500);
        }

        $relativeUrl = 'uploads/ministries/' . $filename;
        api_response([
            'success' => true,
            'url'     => $relativeUrl,
            'message' => 'Ministry image uploaded successfully.'
        ]);
    }
}
