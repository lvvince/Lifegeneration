<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SocialHub extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    private function is_staff($u)
    {
        return $u && in_array($u['role'], ['admin', 'officer', 'secretary', 'moderator'], true);
    }

    /**
     * GET /api/social/posts
     * Query params:
     *   category: all | event | verse | general
     *   sort: recent | top
     *   mine: 1 | 0
     *   q: search string
     */
    public function index()
    {
        $user = get_auth_user();
        $uid = (int) ($user['id'] ?? 0);

        $category = trim($_GET['category'] ?? 'all');
        $sort = ($_GET['sort'] ?? 'recent') === 'top' ? 'top' : 'recent';
        $mine = !empty($_GET['mine']) && $_GET['mine'] !== '0';
        $q = trim($_GET['q'] ?? '');

        $where = [];
        $params = [];

        if ($category !== '' && $category !== 'all') {
            $where[] = "p.category = ?";
            $params[] = $category;
        }

        if ($mine && $uid > 0) {
            $where[] = "p.user_id = ?";
            $params[] = $uid;
        }

        if ($q !== '') {
            $where[] = "(p.body LIKE ? OR p.event_title LIKE ? OR p.event_location LIKE ? OR p.verse_reference LIKE ? OR p.author_name LIKE ?)";
            $wild = '%' . $q . '%';
            $params[] = $wild;
            $params[] = $wild;
            $params[] = $wild;
            $params[] = $wild;
            $params[] = $wild;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $order = $sort === 'top' ? 'likes_count DESC, p.created_at DESC' : 'p.created_at DESC';

        $sql = "SELECT p.*,
                       (SELECT COUNT(*) FROM social_reactions r WHERE r.post_id = p.id) AS likes_count,
                       (SELECT COUNT(*) FROM social_comments c WHERE c.post_id = p.id) AS comments_count,
                       (SELECT COUNT(*) FROM social_rsvps sv WHERE sv.post_id = p.id AND sv.status = 'going') AS going_count,
                       (SELECT COUNT(*) FROM social_rsvps sv WHERE sv.post_id = p.id AND sv.status = 'interested') AS interested_count,
                       m.avatar AS member_avatar
                FROM social_posts p
                LEFT JOIN members m ON m.user_id = p.user_id
                {$whereClause}
                ORDER BY {$order}
                LIMIT 150";

        $rows = $this->db->raw($sql, $params)->fetchAll(PDO::FETCH_ASSOC);

        // Fetch user reactions and RSVPs in bulk
        $myLikes = [];
        $myRsvps = [];
        $postIds = array_map('intval', array_column($rows, 'id'));

        if ($uid > 0 && !empty($postIds)) {
            $in = implode(',', $postIds);

            $likes = $this->db->raw("SELECT post_id FROM social_reactions WHERE user_id = ? AND post_id IN ({$in})", [$uid])->fetchAll(PDO::FETCH_ASSOC);
            foreach ($likes as $l) {
                $myLikes[(int)$l['post_id']] = true;
            }

            $rsvps = $this->db->raw("SELECT post_id, status FROM social_rsvps WHERE user_id = ? AND post_id IN ({$in})", [$uid])->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rsvps as $rv) {
                $myRsvps[(int)$rv['post_id']] = $rv['status'];
            }
        }

        // Fetch top attendees for event posts
        $eventPostIds = [];
        foreach ($rows as $r) {
            if ($r['category'] === 'event') {
                $eventPostIds[] = (int) $r['id'];
            }
        }

        $attendeesByPost = [];
        if (!empty($eventPostIds)) {
            $inEvents = implode(',', $eventPostIds);
            $attRows = $this->db->raw(
                "SELECT r.post_id, r.user_id, r.user_name, r.status, m.avatar
                 FROM social_rsvps r
                 LEFT JOIN members m ON m.user_id = r.user_id
                 WHERE r.post_id IN ({$inEvents}) AND r.status = 'going'
                 ORDER BY r.created_at ASC",
                []
            )->fetchAll(PDO::FETCH_ASSOC);

            foreach ($attRows as $ar) {
                $pid = (int) $ar['post_id'];
                if (!isset($attendeesByPost[$pid])) {
                    $attendeesByPost[$pid] = [];
                }
                if (count($attendeesByPost[$pid]) < 8) {
                    $attendeesByPost[$pid][] = [
                        'user_id'   => (int) $ar['user_id'],
                        'user_name' => $ar['user_name'],
                        'avatar'    => $ar['avatar'] ?: null,
                    ];
                }
            }
        }

        foreach ($rows as &$r) {
            $pid = (int) $r['id'];
            $r['id']               = $pid;
            $r['user_id']          = (int) $r['user_id'];
            $r['likes_count']      = (int) $r['likes_count'];
            $r['comments_count']   = (int) $r['comments_count'];
            $r['going_count']      = (int) $r['going_count'];
            $r['interested_count'] = (int) $r['interested_count'];
            $r['i_liked']          = isset($myLikes[$pid]);
            $r['my_rsvp']          = $myRsvps[$pid] ?? null;
            $r['is_mine']          = ($uid > 0 && (int)$r['user_id'] === $uid);
            $r['author_avatar']    = $r['member_avatar'] ?: $r['author_avatar'] ?: null;
            $r['attendees']        = $attendeesByPost[$pid] ?? [];
            unset($r['member_avatar']);

            $imgs = [];
            if (!empty($r['images'])) {
                $dec = json_decode($r['images'], true);
                if (is_array($dec)) {
                    $imgs = $dec;
                }
            }
            if (empty($imgs) && !empty($r['image'])) {
                $imgs = [$r['image']];
            }
            $r['images'] = $imgs;
            $r['image']  = !empty($imgs) ? $imgs[0] : null;
        }

        api_response($rows);
    }

    /**
     * POST /api/social/posts
     * Create a new post (Event Invite, Verse, or General Fellowship)
     */
    public function submit()
    {
        $user = require_auth_user();
        $input = api_input();

        $category = trim($input['category'] ?? 'general');
        if (!in_array($category, ['event', 'verse', 'general'], true)) {
            $category = 'general';
        }

        $body = trim($input['body'] ?? '');
        $eventTitle    = trim($input['event_title'] ?? '');
        $eventType     = trim($input['event_type'] ?? '');
        $eventDate     = !empty($input['event_date']) ? trim($input['event_date']) : null;
        $eventLocation = trim($input['event_location'] ?? '');
        $eventLink     = trim($input['event_link'] ?? '');
        $verseRef      = trim($input['verse_reference'] ?? '');
        $verseText     = trim($input['verse_text'] ?? '');

        if ($category === 'event') {
            if ($eventTitle === '') {
                api_response(['error' => 'Please provide a title or name for your fellowship/event.'], 422);
            }
            if ($body === '') {
                $body = "Join us for " . $eventTitle . "!";
            }
        } elseif ($category === 'verse') {
            if ($verseRef === '') {
                api_response(['error' => 'Please provide the Scripture reference (e.g. Philippians 4:13).'], 422);
            }
            if ($body === '') {
                $body = "Sharing today's verse for encouragement and meditation.";
            }
        } else {
            if ($body === '') {
                api_response(['error' => 'Please write your message or testimony.'], 422);
            }
        }

        // Handle images (multi-image upload or single image or URL)
        $savedImages = [];
        $dir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'social' . DIRECTORY_SEPARATOR;
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        $map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];

        // 1. Check $_FILES['images'] (array of files from multi-upload)
        if (isset($_FILES['images']) && is_array($_FILES['images']['name'])) {
            $count = count($_FILES['images']['name']);
            $maxUploads = min($count, 10);
            for ($i = 0; $i < $maxUploads; $i++) {
                if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK && $_FILES['images']['size'][$i] <= 10 * 1024 * 1024) {
                    $tmp = $_FILES['images']['tmp_name'][$i];
                    $info = @getimagesize($tmp);
                    if ($info && isset($map[$info[2]])) {
                        $name = 'social_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $map[$info[2]];
                        $targetPath = $dir . $name;
                        if (@move_uploaded_file($tmp, $targetPath) || @copy($tmp, $targetPath)) {
                            $savedImages[] = 'uploads/social/' . $name;
                        }
                    }
                }
            }
        }

        // 2. Check $_FILES['image'] (single file upload)
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $f = $_FILES['image'];
            if ($f['size'] <= 10 * 1024 * 1024) {
                $info = @getimagesize($f['tmp_name']);
                if ($info && isset($map[$info[2]])) {
                    $name = 'social_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $map[$info[2]];
                    $targetPath = $dir . $name;
                    if (@move_uploaded_file($f['tmp_name'], $targetPath) || @copy($f['tmp_name'], $targetPath)) {
                        $savedImages[] = 'uploads/social/' . $name;
                    }
                }
            }
        }

        // 3. Fallback to image_url if provided
        if (empty($savedImages) && !empty($input['image_url'])) {
            $savedImages[] = trim($input['image_url']);
        }

        $primaryImage = !empty($savedImages) ? $savedImages[0] : null;
        $imagesJson = !empty($savedImages) ? json_encode($savedImages) : null;

        // Determine author avatar and name
        $mem = $this->db->raw("SELECT full_name, avatar FROM members WHERE user_id = ? LIMIT 1", [$user['id']])->fetch(PDO::FETCH_ASSOC);
        $authorName = $mem['full_name'] ?: ($user['full_name'] ?: $user['username']);
        $authorAvatar = $mem['avatar'] ?: null;

        $insertSql = "INSERT INTO social_posts
            (user_id, author_name, author_avatar, category, body, image, images, event_title, event_type, event_date, event_location, event_link, verse_reference, verse_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $this->db->raw($insertSql, [
            $user['id'],
            $authorName,
            $authorAvatar,
            $category,
            $body,
            $primaryImage,
            $imagesJson,
            $category === 'event' ? $eventTitle : null,
            $category === 'event' ? ($eventType ?: 'Fellowship Gathering') : null,
            $category === 'event' && $eventDate ? date('Y-m-d H:i:s', strtotime($eventDate)) : null,
            $category === 'event' ? $eventLocation : null,
            $category === 'event' ? $eventLink : null,
            $category === 'verse' ? $verseRef : null,
            $category === 'verse' ? $verseText : null,
        ]);

        $newId = (int) $this->db->last_id();

        // If it's an event, automatically mark author as going
        if ($category === 'event') {
            $this->db->raw("INSERT IGNORE INTO social_rsvps (post_id, user_id, user_name, status) VALUES (?, ?, ?, 'going')", [
                $newId,
                $user['id'],
                $authorName
            ]);
        }

        api_response([
            'success' => true,
            'id'      => $newId,
            'message' => 'Post published successfully!'
        ], 201);
    }

    /**
     * POST /api/social/react
     * Toggle like/amen on post: { id }
     */
    public function react()
    {
        $user = require_auth_user();
        $in = api_input();
        $id = (int) ($in['id'] ?? 0);

        if (!$this->db->raw("SELECT 1 FROM social_posts WHERE id = ?", [$id])->fetch()) {
            api_response(['error' => 'Post not found.'], 404);
        }

        $has = $this->db->raw("SELECT 1 FROM social_reactions WHERE post_id = ? AND user_id = ?", [$id, $user['id']])->fetch();
        if ($has) {
            $this->db->raw("DELETE FROM social_reactions WHERE post_id = ? AND user_id = ?", [$id, $user['id']]);
            $on = false;
        } else {
            $this->db->raw("INSERT IGNORE INTO social_reactions (post_id, user_id, reaction_type) VALUES (?, ?, 'like')", [$id, $user['id']]);
            $on = true;
        }

        $cnt = (int) $this->db->raw("SELECT COUNT(*) c FROM social_reactions WHERE post_id = ?", [$id])->fetch()['c'];
        api_response(['success' => true, 'on' => $on, 'count' => $cnt]);
    }

    /**
     * POST /api/social/rsvp
     * RSVP to an event post: { id, status: 'going' | 'interested' | 'none' }
     */
    public function rsvp()
    {
        $user = require_auth_user();
        $in = api_input();
        $id = (int) ($in['id'] ?? 0);
        $status = strtolower(trim($in['status'] ?? 'going'));

        $post = $this->db->raw("SELECT * FROM social_posts WHERE id = ?", [$id])->fetch();
        if (!$post) {
            api_response(['error' => 'Event post not found.'], 404);
        }
        if ($post['category'] !== 'event') {
            api_response(['error' => 'This post is not an event invitation.'], 422);
        }

        $mem = $this->db->raw("SELECT full_name FROM members WHERE user_id = ? LIMIT 1", [$user['id']])->fetch(PDO::FETCH_ASSOC);
        $name = $mem['full_name'] ?: ($user['full_name'] ?: $user['username']);

        if ($status === 'none' || $status === 'cancel') {
            $this->db->raw("DELETE FROM social_rsvps WHERE post_id = ? AND user_id = ?", [$id, $user['id']]);
            $currStatus = null;
        } else {
            if (!in_array($status, ['going', 'interested'], true)) {
                $status = 'going';
            }
            $this->db->raw(
                "INSERT INTO social_rsvps (post_id, user_id, user_name, status)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), user_name = VALUES(user_name)",
                [$id, $user['id'], $name, $status]
            );
            $currStatus = $status;
        }

        $going = (int) $this->db->raw("SELECT COUNT(*) c FROM social_rsvps WHERE post_id = ? AND status = 'going'", [$id])->fetch()['c'];
        $interested = (int) $this->db->raw("SELECT COUNT(*) c FROM social_rsvps WHERE post_id = ? AND status = 'interested'", [$id])->fetch()['c'];

        api_response([
            'success'          => true,
            'my_rsvp'          => $currStatus,
            'going_count'      => $going,
            'interested_count' => $interested,
        ]);
    }

    /**
     * GET /api/social/posts/{id}/comments
     */
    public function comments($id = 0)
    {
        $user = get_auth_user();
        $uid = (int) ($user['id'] ?? 0);
        $id = (int) $id;

        $rows = $this->db->raw(
            "SELECT c.id, c.post_id, c.user_id, c.author_name, c.body, c.created_at,
                    m.avatar AS member_avatar
             FROM social_comments c
             LEFT JOIN members m ON m.user_id = c.user_id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC
             LIMIT 150",
            [$id]
        )->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['id']            = (int) $r['id'];
            $r['post_id']       = (int) $r['post_id'];
            $r['user_id']       = (int) $r['user_id'];
            $r['author_avatar'] = $r['member_avatar'] ?: null;
            $r['is_mine']       = ($uid > 0 && (int)$r['user_id'] === $uid);
            unset($r['member_avatar']);
        }

        api_response($rows);
    }

    /**
     * POST /api/social/comment
     * Body: { id, body }
     */
    public function comment()
    {
        $user = require_auth_user();
        $in = api_input();
        $id = (int) ($in['id'] ?? 0);
        $body = trim($in['body'] ?? '');

        if ($body === '') {
            api_response(['error' => 'Please write a comment or encouragement.'], 422);
        }
        if (mb_strlen($body) > 600) {
            $body = mb_substr($body, 0, 600);
        }

        if (!$this->db->raw("SELECT 1 FROM social_posts WHERE id = ?", [$id])->fetch()) {
            api_response(['error' => 'Post not found.'], 404);
        }

        $mem = $this->db->raw("SELECT full_name, avatar FROM members WHERE user_id = ? LIMIT 1", [$user['id']])->fetch(PDO::FETCH_ASSOC);
        $name = $mem['full_name'] ?: ($user['full_name'] ?: $user['username']);
        $avatar = $mem['avatar'] ?: null;

        $this->db->raw(
            "INSERT INTO social_comments (post_id, user_id, author_name, author_avatar, body) VALUES (?, ?, ?, ?, ?)",
            [$id, $user['id'], $name, $avatar, $body]
        );

        $newId = (int) $this->db->last_id();
        $total = (int) $this->db->raw("SELECT COUNT(*) c FROM social_comments WHERE post_id = ?", [$id])->fetch()['c'];

        api_response([
            'success'        => true,
            'id'             => $newId,
            'author_name'    => $name,
            'author_avatar'  => $avatar,
            'body'           => $body,
            'created_at'     => date('Y-m-d H:i:s'),
            'comments_count' => $total,
        ], 201);
    }

    /**
     * POST /api/social/delete
     * Body: { id }
     */
    public function delete()
    {
        $user = require_auth_user();
        $in = api_input();
        $id = (int) ($in['id'] ?? 0);

        $p = $this->db->raw("SELECT * FROM social_posts WHERE id = ?", [$id])->fetch();
        if (!$p) {
            api_response(['error' => 'Post not found.'], 404);
        }

        if (!$this->is_staff($user) && (int)$p['user_id'] !== (int)$user['id']) {
            api_response(['error' => 'Not allowed to delete this post.'], 403);
        }

        $this->db->raw("DELETE FROM social_reactions WHERE post_id = ?", [$id]);
        $this->db->raw("DELETE FROM social_rsvps WHERE post_id = ?", [$id]);
        $this->db->raw("DELETE FROM social_comments WHERE post_id = ?", [$id]);
        $this->db->raw("DELETE FROM social_posts WHERE id = ?", [$id]);

        if (!empty($p['image']) && strpos($p['image'], 'uploads/social/') === 0) {
            $path = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $p['image']);
            if (is_file($path)) {
                @unlink($path);
            }
        }

        api_response(['success' => true]);
    }

    /**
     * POST /api/social/comments/delete
     * Body: { id }
     */
    public function delete_comment()
    {
        $user = require_auth_user();
        $in = api_input();
        $cid = (int) ($in['id'] ?? 0);

        $c = $this->db->raw("SELECT * FROM social_comments WHERE id = ?", [$cid])->fetch();
        if (!$c) {
            api_response(['error' => 'Comment not found.'], 404);
        }

        $post = $this->db->raw("SELECT user_id FROM social_posts WHERE id = ?", [$c['post_id']])->fetch();

        $canDelete = $this->is_staff($user)
            || ((int)$c['user_id'] === (int)$user['id'])
            || ($post && (int)$post['user_id'] === (int)$user['id']);

        if (!$canDelete) {
            api_response(['error' => 'Not allowed to delete this comment.'], 403);
        }

        $this->db->raw("DELETE FROM social_comments WHERE id = ?", [$cid]);
        $total = (int) $this->db->raw("SELECT COUNT(*) c FROM social_comments WHERE post_id = ?", [$c['post_id']])->fetch()['c'];

        api_response(['success' => true, 'comments_count' => $total]);
    }

    /**
     * GET /api/social/verses/quick
     * Curated uplifting Bible verses for quick posting
     */
    public function quick_verses()
    {
        $verses = [
            [
                'reference' => 'Philippians 4:13',
                'text'      => 'I can do all things through Christ who strengthens me.',
                'theme'     => 'Strength & Perseverance'
            ],
            [
                'reference' => 'Jeremiah 29:11',
                'text'      => '“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.”',
                'theme'     => 'Hope & Purpose'
            ],
            [
                'reference' => 'Romans 8:28',
                'text'      => 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
                'theme'     => 'Faith & Trust'
            ],
            [
                'reference' => 'Proverbs 3:5-6',
                'text'      => 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
                'theme'     => 'Guidance'
            ],
            [
                'reference' => 'Isaiah 40:31',
                'text'      => 'Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
                'theme'     => 'Renewal'
            ],
            [
                'reference' => 'Joshua 1:9',
                'text'      => 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
                'theme'     => 'Courage'
            ],
            [
                'reference' => 'Matthew 6:33',
                'text'      => 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.',
                'theme'     => 'Priority & Kingdom'
            ],
            [
                'reference' => 'Psalm 23:1-3',
                'text'      => 'The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.',
                'theme'     => 'Comfort & Rest'
            ],
            [
                'reference' => '1 Timothy 4:12',
                'text'      => 'Don’t let anyone look down on you because you are young, but set an example for the believers in speech, in conduct, in love, in faith and in purity.',
                'theme'     => 'Youth Leadership'
            ],
            [
                'reference' => 'Hebrews 10:24-25',
                'text'      => 'And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together, but encouraging one another.',
                'theme'     => 'Fellowship & Community'
            ]
        ];

        api_response($verses);
    }
}
