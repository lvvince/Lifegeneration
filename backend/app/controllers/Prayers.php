<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Prayers extends Controller
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
        $isAdmin = $user && in_array($user['role'], ['admin', 'officer', 'moderator']);

        if ($isAdmin) {
            $stmt = $this->db->raw(
                "SELECT p.*, u.username, u.email
                 FROM prayer_requests p
                 LEFT JOIN users u ON u.id = p.user_id
                 ORDER BY (p.status = 'active') DESC, p.created_at DESC"
            );
        } elseif ($userId > 0) {
            $stmt = $this->db->raw(
                "SELECT p.*, (p.user_id = ?) AS is_mine
                 FROM prayer_requests p
                 WHERE p.visibility = 'public' OR p.user_id = ?
                 ORDER BY (p.status = 'active') DESC, p.created_at DESC",
                [$userId, $userId]
            );
        } else {
            $stmt = $this->db->raw(
                "SELECT p.*
                 FROM prayer_requests p
                 WHERE p.visibility = 'public'
                 ORDER BY (p.status = 'active') DESC, p.created_at DESC"
            );
        }

        api_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function submit()
    {
        $user = require_auth_user();
        $input = api_input();

        $title      = trim($input['title'] ?? '');
        $body       = trim($input['body'] ?? ($input['content'] ?? ''));
        $visibility = in_array($input['visibility'] ?? '', ['public', 'private']) ? $input['visibility'] : 'public';
        $anonymous  = !empty($input['is_anonymous']) && $input['is_anonymous'] !== '0' && $input['is_anonymous'] !== 'false';

        if (empty($title) || empty($body)) {
            api_response(['error' => 'Prayer title and description are required.'], 422);
        }

        // Optional photo (multipart). Images only, checked by real content, max 8 MB.
        $image = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $f = $_FILES['image'];
            if ($f['error'] !== UPLOAD_ERR_OK) {
                api_response(['error' => 'The photo could not be uploaded. Please try again.'], 422);
            }
            if ($f['size'] > 8 * 1024 * 1024) {
                api_response(['error' => 'The photo is over 8 MB. Please choose a smaller one.'], 422);
            }
            $info = @getimagesize($f['tmp_name']);
            $map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
            if (!$info || !isset($map[$info[2]])) {
                api_response(['error' => 'Please attach a JPG, PNG or WEBP photo.'], 422);
            }
            $dir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'prayers' . DIRECTORY_SEPARATOR;
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $name = 'prayer_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $map[$info[2]];
            if (!move_uploaded_file($f['tmp_name'], $dir . $name)) {
                api_response(['error' => 'Failed to save the photo.'], 500);
            }
            $image = 'uploads/prayers/' . $name;
        }

        $memberName = $anonymous ? 'Anonymous' : ($user['full_name'] ?: $user['username']);

        $this->db->raw(
            "INSERT INTO prayer_requests (user_id, member_name, title, body, image, visibility, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())",
            [$user['id'], $memberName, $title, $body, $image, $visibility]
        );

        api_response([
            'success' => true,
            'message' => 'Prayer request posted. Our community stands with you in faith!',
            'id'      => $this->db->last_id()
        ], 201);
    }

    public function mark_answered()
    {
        $user = require_auth_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response(['error' => 'Prayer request ID required.'], 422);
        }

        $req = $this->db->raw("SELECT * FROM prayer_requests WHERE id = ? LIMIT 1", [$id])->fetch();
        if (!$req) {
            api_response(['error' => 'Prayer request not found.'], 404);
        }

        if (!in_array($user['role'], ['admin', 'officer'], true) && (int)$req['user_id'] !== (int)$user['id']) {
            api_response(['error' => 'Not authorized to update this prayer request.'], 403);
        }

        $this->db->raw("UPDATE prayer_requests SET status = 'answered', updated_at = NOW() WHERE id = ?", [$id]);
        api_response(['success' => true, 'message' => 'Praise God! Prayer marked as answered.']);
    }

    public function delete()
    {
        $user = require_auth_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response(['error' => 'Prayer request ID required.'], 422);
        }

        $req = $this->db->raw("SELECT * FROM prayer_requests WHERE id = ? LIMIT 1", [$id])->fetch();
        if (!$req) {
            api_response(['error' => 'Prayer request not found.'], 404);
        }

        if (!in_array($user['role'], ['admin', 'officer'], true) && (int)$req['user_id'] !== (int)$user['id']) {
            api_response(['error' => 'Not authorized to delete this prayer request.'], 403);
        }

        $this->db->raw("DELETE FROM prayer_requests WHERE id = ?", [$id]);
        if (!empty($req['image']) && strpos($req['image'], 'uploads/prayers/') === 0) {
            $path = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $req['image']);
            if (is_file($path)) {
                @unlink($path);
            }
        }
        api_response(['success' => true, 'message' => 'Prayer request deleted.']);
    }
}