<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * "Where have you seen God today?" community wall.
 * Tables are created on first use. Reading is public, posting/reacting/commenting needs a login.
 */
class Sightings extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->ensure_schema();
    }

    private function ensure_schema()
    {
        static $done = false;
        if ($done) return;
        $done = true;
        try {
            $this->db->raw("CREATE TABLE IF NOT EXISTS sighting_posts (
                id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, author_name VARCHAR(120) NOT NULL,
                body TEXT NOT NULL, image VARCHAR(255) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY sp_user_idx (user_id), KEY sp_created_idx (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $this->db->raw("CREATE TABLE IF NOT EXISTS sighting_reactions (
                post_id INT NOT NULL, user_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (post_id, user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $this->db->raw("CREATE TABLE IF NOT EXISTS sighting_comments (
                id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, author_name VARCHAR(120) NOT NULL,
                body VARCHAR(500) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY sc_post_idx (post_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (Throwable $e) { /* best effort */ }
    }

    private function is_staff($u) { return $u && in_array($u['role'], ['admin', 'officer', 'moderator'], true); }

    /** GET /api/sightings?sort=recent|top */
    public function index()
    {
        $user = get_auth_user();
        $uid = (int) ($user['id'] ?? 0);
        $sort = ($_GET['sort'] ?? 'recent') === 'top' ? 'top' : 'recent';
        $order = $sort === 'top' ? 'amens DESC, p.created_at DESC' : 'p.created_at DESC';
        $rows = $this->db->raw(
            "SELECT p.id, p.user_id, p.author_name, p.body, p.image, p.created_at,
                    (SELECT COUNT(*) FROM sighting_reactions r WHERE r.post_id = p.id) AS amens,
                    (SELECT COUNT(*) FROM sighting_comments c WHERE c.post_id = p.id) AS comments
             FROM sighting_posts p ORDER BY $order LIMIT 200"
        )->fetchAll(PDO::FETCH_ASSOC);
        $mine = [];
        if ($uid && $rows) {
            $in = implode(',', array_map('intval', array_column($rows, 'id')));
            foreach ($this->db->raw("SELECT post_id FROM sighting_reactions WHERE user_id = ? AND post_id IN ($in)", [$uid])->fetchAll(PDO::FETCH_ASSOC) as $r) $mine[(int)$r['post_id']] = true;
        }
        foreach ($rows as &$r) {
            $r['amens'] = (int) $r['amens'];
            $r['comments'] = (int) $r['comments'];
            $r['i_amen'] = isset($mine[(int)$r['id']]);
            $r['is_mine'] = $uid && (int)$r['user_id'] === $uid;
            if (!$r['is_mine'] && !$this->is_staff($user)) unset($r['user_id']);
        }
        api_response($rows);
    }

    /** POST /api/sightings/submit (multipart or JSON): body, anonymous, image */
    public function submit()
    {
        $user = require_auth_user();
        $input = api_input();
        $body = trim((string) ($input['body'] ?? ''));
        if ($body === '') api_response(['error' => 'Write a few words about where you saw God today.'], 422);
        if (mb_strlen($body) > 400) $body = mb_substr($body, 0, 400);
        $anon = !empty($input['anonymous']) && $input['anonymous'] !== '0' && $input['anonymous'] !== 'false';

        $image = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $f = $_FILES['image'];
            if ($f['error'] !== UPLOAD_ERR_OK) api_response(['error' => 'The photo could not be uploaded. Please try again.'], 422);
            if ($f['size'] > 8 * 1024 * 1024) api_response(['error' => 'The photo is over 8 MB. Please choose a smaller one.'], 422);
            $info = @getimagesize($f['tmp_name']);
            $map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
            if (!$info || !isset($map[$info[2]])) api_response(['error' => 'Please attach a JPG, PNG or WEBP photo.'], 422);
            $dir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'sightings' . DIRECTORY_SEPARATOR;
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            $name = 'sight_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $map[$info[2]];
            if (!move_uploaded_file($f['tmp_name'], $dir . $name)) api_response(['error' => 'Failed to save the photo.'], 500);
            $image = 'uploads/sightings/' . $name;
        }

        $author = $anon ? 'Anonymous' : ($user['full_name'] ?: $user['username']);
        $this->db->raw("INSERT INTO sighting_posts (user_id, author_name, body, image) VALUES (?, ?, ?, ?)", [$user['id'], $author, $body, $image]);
        api_response(['success' => true, 'id' => $this->db->last_id(), 'message' => 'Your note is on the board. Thank you for sharing!'], 201);
    }

    /** POST /api/sightings/react { id } toggles "Amen" */
    public function react()
    {
        $user = require_auth_user();
        $id = (int) (api_input()['id'] ?? 0);
        if (!$this->db->raw("SELECT 1 FROM sighting_posts WHERE id = ?", [$id])->fetch()) api_response(['error' => 'Post not found.'], 404);
        $has = $this->db->raw("SELECT 1 FROM sighting_reactions WHERE post_id = ? AND user_id = ?", [$id, $user['id']])->fetch();
        if ($has) $this->db->raw("DELETE FROM sighting_reactions WHERE post_id = ? AND user_id = ?", [$id, $user['id']]);
        else $this->db->raw("INSERT IGNORE INTO sighting_reactions (post_id, user_id) VALUES (?, ?)", [$id, $user['id']]);
        $n = (int) $this->db->raw("SELECT COUNT(*) c FROM sighting_reactions WHERE post_id = ?", [$id])->fetch()['c'];
        api_response(['success' => true, 'on' => !$has, 'count' => $n]);
    }

    /** GET /api/sightings/{id}/comments */
    public function comments($id = 0)
    {
        $user = get_auth_user();
        $rows = $this->db->raw("SELECT id, user_id, author_name, body, created_at FROM sighting_comments WHERE post_id = ? ORDER BY created_at ASC LIMIT 200", [(int) $id])->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['is_mine'] = $user && (int)$r['user_id'] === (int)$user['id'];
            unset($r['user_id']);
        }
        api_response($rows);
    }

    /** POST /api/sightings/comment { id, body } */
    public function comment()
    {
        $user = require_auth_user();
        $in = api_input();
        $id = (int) ($in['id'] ?? 0);
        $body = trim((string) ($in['body'] ?? ''));
        if ($body === '') api_response(['error' => 'Write a short encouragement first.'], 422);
        if (mb_strlen($body) > 500) $body = mb_substr($body, 0, 500);
        if (!$this->db->raw("SELECT 1 FROM sighting_posts WHERE id = ?", [$id])->fetch()) api_response(['error' => 'Post not found.'], 404);
        $name = $user['full_name'] ?: $user['username'];
        $this->db->raw("INSERT INTO sighting_comments (post_id, user_id, author_name, body) VALUES (?, ?, ?, ?)", [$id, $user['id'], $name, $body]);
        api_response(['success' => true, 'id' => $this->db->last_id()], 201);
    }

    /** POST /api/sightings/delete { id } owner or staff */
    public function delete()
    {
        $user = require_auth_user();
        $id = (int) (api_input()['id'] ?? 0);
        $p = $this->db->raw("SELECT * FROM sighting_posts WHERE id = ?", [$id])->fetch();
        if (!$p) api_response(['error' => 'Post not found.'], 404);
        if (!$this->is_staff($user) && (int)$p['user_id'] !== (int)$user['id']) api_response(['error' => 'Not allowed.'], 403);
        $this->db->raw("DELETE FROM sighting_reactions WHERE post_id = ?", [$id]);
        $this->db->raw("DELETE FROM sighting_comments WHERE post_id = ?", [$id]);
        $this->db->raw("DELETE FROM sighting_posts WHERE id = ?", [$id]);
        if (!empty($p['image']) && strpos($p['image'], 'uploads/sightings/') === 0) {
            $path = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $p['image']);
            if (is_file($path)) @unlink($path);
        }
        api_response(['success' => true]);
    }
}
