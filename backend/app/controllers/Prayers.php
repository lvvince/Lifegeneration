<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Prayers extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->ensure_schema();
    }

    private $categories = ['personal', 'family', 'healing', 'guidance', 'gratitude', 'others'];

    /** Adds the new columns/tables on first use, so no manual migration is needed. */
    private function ensure_schema()
    {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            foreach ([
                'category'    => "ALTER TABLE prayer_requests ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'personal'",
                'testimony'   => "ALTER TABLE prayer_requests ADD COLUMN testimony TEXT NULL",
                'answered_at' => "ALTER TABLE prayer_requests ADD COLUMN answered_at DATETIME NULL",
            ] as $col => $sql) {
                $has = $this->db->raw("SHOW COLUMNS FROM prayer_requests LIKE '$col'")->fetch();
                if (!$has) $this->db->raw($sql);
            }
            $this->db->raw("CREATE TABLE IF NOT EXISTS prayer_prayers (
                prayer_id INT NOT NULL, user_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (prayer_id, user_id), KEY pp_user_idx (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (Throwable $e) { /* best effort */ }
    }

    /** Adds prayer_count, i_prayed, is_mine, is_anonymous to the rows. */
    private function decorate(array $rows, $userId, $isStaff)
    {
        if (!$rows) return $rows;
        $ids = array_map('intval', array_column($rows, 'id'));
        $in = implode(',', $ids);
        $counts = []; $mine = [];
        foreach ($this->db->raw("SELECT prayer_id, COUNT(*) c FROM prayer_prayers WHERE prayer_id IN ($in) GROUP BY prayer_id")->fetchAll(PDO::FETCH_ASSOC) as $r) $counts[(int)$r['prayer_id']] = (int)$r['c'];
        if ($userId) foreach ($this->db->raw("SELECT prayer_id FROM prayer_prayers WHERE user_id = ? AND prayer_id IN ($in)", [$userId])->fetchAll(PDO::FETCH_ASSOC) as $r) $mine[(int)$r['prayer_id']] = true;
        foreach ($rows as &$r) {
            $id = (int)$r['id'];
            $r['prayer_count'] = $counts[$id] ?? 0;
            $r['i_prayed'] = isset($mine[$id]);
            $r['is_mine'] = $userId && (int)$r['user_id'] === (int)$userId;
            $r['is_anonymous'] = ($r['member_name'] ?? '') === 'Anonymous';
            $r['category'] = $r['category'] ?? 'personal';
            if (!$isStaff && !$r['is_mine']) unset($r['user_id'], $r['email'], $r['username']);
        }
        return $rows;
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

        api_response($this->decorate($stmt->fetchAll(PDO::FETCH_ASSOC), $userId, $isAdmin));
    }

    public function submit()
    {
        $user = require_auth_user();
        $input = api_input();

        $title      = trim($input['title'] ?? '');
        $body       = trim($input['body'] ?? ($input['content'] ?? ''));
        $visibility = in_array($input['visibility'] ?? '', ['public', 'private']) ? $input['visibility'] : 'public';
        $category   = in_array($input['category'] ?? '', $this->categories, true) ? $input['category'] : 'personal';
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
            $cloudUrl = upload_to_imgbb($f['tmp_name'], $f['type'] ?? 'image/jpeg', $f['name'] ?? 'prayer.jpg');
            if ($cloudUrl) {
                $image = $cloudUrl;
            } else {
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
        }

        $memberName = $anonymous ? 'Anonymous' : ($user['full_name'] ?: $user['username']);

        $this->db->raw(
            "INSERT INTO prayer_requests (user_id, member_name, title, body, image, visibility, category, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())",
            [$user['id'], $memberName, $title, $body, $image, $visibility, $category]
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

        $testimony = trim((string) ($input['testimony'] ?? ''));
        if (mb_strlen($testimony) > 800) $testimony = mb_substr($testimony, 0, 800);
        $this->db->raw("UPDATE prayer_requests SET status = 'answered', testimony = ?, answered_at = COALESCE(answered_at, NOW()), updated_at = NOW() WHERE id = ?", [$testimony !== '' ? $testimony : ($req['testimony'] ?? null), $id]);
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

    /** POST /api/prayer/pray { id }: toggles "I prayed / praying for you". */
    public function pray()
    {
        $user = require_auth_user();
        $id = (int) (api_input()['id'] ?? 0);
        $req = $id > 0 ? $this->db->raw("SELECT id, visibility, user_id FROM prayer_requests WHERE id = ? LIMIT 1", [$id])->fetch() : null;
        if (!$req) api_response(['error' => 'Prayer request not found.'], 404);
        $staff = in_array($user['role'], ['admin', 'officer', 'moderator'], true);
        if ($req['visibility'] !== 'public' && !$staff && (int)$req['user_id'] !== (int)$user['id']) api_response(['error' => 'Not allowed.'], 403);
        $has = $this->db->raw("SELECT 1 FROM prayer_prayers WHERE prayer_id = ? AND user_id = ?", [$id, $user['id']])->fetch();
        if ($has) $this->db->raw("DELETE FROM prayer_prayers WHERE prayer_id = ? AND user_id = ?", [$id, $user['id']]);
        else $this->db->raw("INSERT IGNORE INTO prayer_prayers (prayer_id, user_id) VALUES (?, ?)", [$id, $user['id']]);
        $n = (int) $this->db->raw("SELECT COUNT(*) c FROM prayer_prayers WHERE prayer_id = ?", [$id])->fetch()['c'];
        api_response(['success' => true, 'on' => !$has, 'count' => $n]);
    }
}
