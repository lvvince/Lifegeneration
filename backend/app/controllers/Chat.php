<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Fellowship Chat.
 * Tables are created on first use (CREATE TABLE IF NOT EXISTS), so no manual migration is needed.
 *
 * Roles: admin / officer / secretary / moderator = staff. Everyone else = member.
 *   - Staff: post announcements, pin, delete any message, mute members, see the staff channel and activity table.
 *   - Members: chat in open channels, edit/delete their own messages, react, reply, mention.
 */
class Chat extends Controller
{
    private $staffRoles = ['admin', 'officer', 'secretary', 'moderator'];
    private $reactionKinds = ['heart', 'pray', 'thumbs_up', 'praise'];

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->ensure_schema();
    }

    /* ------------------------------------------------------------------ */
    /* setup                                                               */
    /* ------------------------------------------------------------------ */

    private function ensure_schema()
    {
        // A leftover chat_messages from an older draft (no channel_id) is set aside, not overwritten.
        $hasMsg = $this->db->raw("SHOW TABLES LIKE 'chat_messages'")->fetch(PDO::FETCH_NUM);
        if ($hasMsg && !$this->db->raw("SHOW COLUMNS FROM chat_messages LIKE 'channel_id'")->fetch(PDO::FETCH_NUM)) {
            $this->db->raw("RENAME TABLE chat_messages TO chat_messages_old_" . date('YmdHis'));
        }
        // Create anything missing: runs only until all 8 chat tables exist.
        $need = ['chat_channels', 'chat_messages', 'chat_reactions', 'chat_mentions', 'chat_acks', 'chat_reads', 'chat_mutes', 'chat_presence', 'chat_sessions', 'chat_session_rsvps', 'chat_google'];
        $have = $this->db->raw("SHOW TABLES LIKE 'chat\\_%'")->fetchAll(PDO::FETCH_COLUMN);
        if (array_diff($need, $have)) {
            $sql = [
                "CREATE TABLE IF NOT EXISTS chat_channels (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    slug VARCHAR(80) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    description VARCHAR(255) NULL,
                    kind VARCHAR(20) NOT NULL DEFAULT 'general',
                    ref_id INT UNSIGNED NULL,
                    is_readonly TINYINT(1) NOT NULL DEFAULT 0,
                    staff_only TINYINT(1) NOT NULL DEFAULT 0,
                    sort_order INT NOT NULL DEFAULT 10,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), UNIQUE KEY chat_slug (slug)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_messages (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    channel_id INT UNSIGNED NOT NULL,
                    user_id INT UNSIGNED NOT NULL,
                    kind VARCHAR(20) NOT NULL DEFAULT 'message',
                    title VARCHAR(160) NULL,
                    body TEXT NULL,
                    image VARCHAR(255) NULL,
                    reply_to INT UNSIGNED NULL,
                    is_pinned TINYINT(1) NOT NULL DEFAULT 0,
                    is_important TINYINT(1) NOT NULL DEFAULT 0,
                    edited_at DATETIME NULL,
                    deleted_at DATETIME NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), KEY chat_ch (channel_id, id), KEY chat_user (user_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_reactions (
                    message_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL, reaction VARCHAR(20) NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (message_id, user_id, reaction)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_mentions (
                    message_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
                    PRIMARY KEY (message_id, user_id), KEY chat_men_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_acks (
                    message_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (message_id, user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_reads (
                    channel_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL, last_read_id INT UNSIGNED NOT NULL DEFAULT 0,
                    PRIMARY KEY (channel_id, user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_mutes (
                    user_id INT UNSIGNED NOT NULL, until_at DATETIME NOT NULL, reason VARCHAR(255) NULL, by_user INT UNSIGNED NULL,
                    PRIMARY KEY (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_sessions (
                    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    title VARCHAR(160) NOT NULL,
                    kind VARCHAR(20) NOT NULL DEFAULT 'fellowship',
                    description TEXT NULL,
                    meet_url VARCHAR(255) NOT NULL,
                    starts_at DATETIME NOT NULL,
                    ends_at DATETIME NOT NULL,
                    channel_id INT UNSIGNED NULL,
                    host_id INT UNSIGNED NOT NULL,
                    notes TEXT NULL,
                    event_id VARCHAR(255) NULL,
                    status VARCHAR(12) NOT NULL DEFAULT 'scheduled',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), KEY chat_sess_time (starts_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_session_rsvps (
                    session_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
                    rsvp VARCHAR(10) NOT NULL DEFAULT 'going',
                    joined_at DATETIME NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_google (
                    id TINYINT UNSIGNED NOT NULL, refresh_token TEXT NULL, email VARCHAR(190) NULL,
                    oauth_state VARCHAR(64) NULL, state_at DATETIME NULL, connected_by INT UNSIGNED NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
                "CREATE TABLE IF NOT EXISTS chat_presence (
                    user_id INT UNSIGNED NOT NULL, last_seen DATETIME NOT NULL,
                    PRIMARY KEY (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            ];
            foreach ($sql as $q) {
                $this->db->raw($q);
            }
        }

        if ($this->db->raw("SHOW TABLES LIKE 'chat_sessions'")->fetch(PDO::FETCH_NUM)
            && !$this->db->raw("SHOW COLUMNS FROM chat_sessions LIKE 'event_id'")->fetch(PDO::FETCH_NUM)) {
            $this->db->raw("ALTER TABLE chat_sessions ADD COLUMN event_id VARCHAR(255) NULL AFTER notes");
        }

        $count = (int) $this->db->raw("SELECT COUNT(*) FROM chat_channels")->fetchColumn();
        if ($count === 0) {
            $seed = [
                ['announcements', 'announcements', 'Important updates from admins and officers.', 'announcement', 1, 0, 1],
                ['general', 'general', 'Everyday fellowship. Say hi, ask, share.', 'general', 0, 0, 2],
                ['prayer-support', 'prayer-support', 'Encourage one another and pray together.', 'general', 0, 0, 3],
                ['staff-lounge', 'staff-lounge', 'Admins and officers only.', 'staff', 0, 1, 9],
            ];
            foreach ($seed as $s) {
                $this->db->raw(
                    "INSERT IGNORE INTO chat_channels (slug, name, description, kind, is_readonly, staff_only, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [$s[0], $s[1], $s[2], $s[3], $s[4], $s[5], $s[6]]
                );
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /* helpers                                                             */
    /* ------------------------------------------------------------------ */

    /** Chat identity. Admin accounts that live only in the `admins` table have no users row, so they can read but not post. */
    private function me()
    {
        $u = require_auth_user();
        $uid = (int) $u['id'];
        if (($u['member_id'] ?? '') === 'LG-ADMIN') {
            $row = $this->db->raw("SELECT id FROM users WHERE email = ? LIMIT 1", [$u['email'] ?? ''])->fetch(PDO::FETCH_ASSOC);
            $uid = $row ? (int) $row['id'] : 0;
        }
        $role = (string) ($u['role'] ?? 'user');
        $info = null;
        if ($uid > 0) {
            $info = $this->db->raw(
                "SELECT m.dgroup_id, m.ministry_id FROM members m WHERE m.user_id = ? LIMIT 1", [$uid]
            )->fetch(PDO::FETCH_ASSOC);
        }
        $mute = null;
        if ($uid > 0) {
            $mute = $this->db->raw("SELECT until_at, reason FROM chat_mutes WHERE user_id = ? AND until_at > NOW()", [$uid])->fetch(PDO::FETCH_ASSOC) ?: null;
        }
        return [
            'id' => $uid,
            'name' => $u['full_name'] ?: ($u['username'] ?? 'Member'),
            'role' => $role,
            'staff' => in_array($role, $this->staffRoles, true),
            'dgroup_id' => $info['dgroup_id'] ?? null,
            'ministry_id' => $info['ministry_id'] ?? null,
            'mute' => $mute,
        ];
    }

    private function can_see($me, $ch)
    {
        if ((int) $ch['staff_only'] === 1) return $me['staff'];
        if ($ch['kind'] === 'dgroup') return $me['staff'] || (int) $ch['ref_id'] === (int) $me['dgroup_id'];
        if ($ch['kind'] === 'ministry') return $me['staff'] || (int) $ch['ref_id'] === (int) $me['ministry_id'];
        return true;
    }

    private function channel($id, $me)
    {
        $ch = $this->db->raw("SELECT * FROM chat_channels WHERE id = ? LIMIT 1", [(int) $id])->fetch(PDO::FETCH_ASSOC);
        if (!$ch || !$this->can_see($me, $ch)) {
            api_response(['error' => 'Channel not found.'], 404);
        }
        return $ch;
    }

    private function ensure_group_channels($me)
    {
        // Every D-Group and Ministry gets its own room, created the first time someone needs it.
        $want = [];
        if ($me['dgroup_id']) $want[] = ['dgroup', (int) $me['dgroup_id']];
        if ($me['ministry_id']) $want[] = ['ministry', (int) $me['ministry_id']];
        if ($me['staff']) {
            foreach ($this->db->raw("SELECT id FROM dgroups")->fetchAll(PDO::FETCH_COLUMN) as $id) $want[] = ['dgroup', (int) $id];
            foreach ($this->db->raw("SELECT id FROM ministries WHERE is_active = 1")->fetchAll(PDO::FETCH_COLUMN) as $id) $want[] = ['ministry', (int) $id];
        }
        foreach ($want as $w) {
            $slug = $w[0] . '-' . $w[1];
            $exists = $this->db->raw("SELECT id FROM chat_channels WHERE slug = ?", [$slug])->fetch();
            if ($exists) continue;
            $tbl = $w[0] === 'dgroup' ? 'dgroups' : 'ministries';
            $row = $this->db->raw("SELECT name FROM {$tbl} WHERE id = ?", [$w[1]])->fetch(PDO::FETCH_ASSOC);
            if (!$row) continue;
            $label = $w[0] === 'dgroup' ? 'D-Group' : 'Ministry';
            $this->db->raw(
                "INSERT IGNORE INTO chat_channels (slug, name, description, kind, ref_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                [$slug, $row['name'], "Private room for the {$label}.", $w[0], $w[1], $w[0] === 'dgroup' ? 5 : 6]
            );
        }
    }

    private function must_post($me)
    {
        if ($me['id'] <= 0) {
            api_response(['error' => 'Your admin account has no member profile. Sign in with a member account (or Google) to chat.'], 403);
        }
        if ($me['mute']) {
            api_response(['error' => 'You are muted until ' . $me['mute']['until_at'] . '.'], 403);
        }
    }

    private function message_sql()
    {
        return "SELECT cm.*, COALESCE(m.full_name, u.full_name, u.username) AS name, u.role AS author_role, m.avatar,
                       d.name AS dgroup, mi.name AS ministry
                FROM chat_messages cm
                JOIN users u ON u.id = cm.user_id
                LEFT JOIN members m ON m.user_id = u.id
                LEFT JOIN dgroups d ON d.id = m.dgroup_id
                LEFT JOIN ministries mi ON mi.id = m.ministry_id";
    }

    private function hydrate($rows, $me)
    {
        if (!$rows) return [];
        $ids = array_map(fn($r) => (int) $r['id'], $rows);
        $in = implode(',', $ids);

        $react = [];
        foreach ($this->db->raw("SELECT message_id, reaction, COUNT(*) n, SUM(user_id = ?) mine FROM chat_reactions WHERE message_id IN ($in) GROUP BY message_id, reaction", [$me['id']])->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $react[$r['message_id']][$r['reaction']] = ['n' => (int) $r['n'], 'mine' => (int) $r['mine'] > 0];
        }
        $acks = [];
        foreach ($this->db->raw("SELECT message_id, COUNT(*) n, SUM(user_id = ?) mine FROM chat_acks WHERE message_id IN ($in) GROUP BY message_id", [$me['id']])->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $acks[$r['message_id']] = ['n' => (int) $r['n'], 'mine' => (int) $r['mine'] > 0];
        }
        $men = [];
        foreach ($this->db->raw("SELECT cm.message_id, cm.user_id, COALESCE(m.full_name, u.full_name, u.username) AS name FROM chat_mentions cm JOIN users u ON u.id = cm.user_id LEFT JOIN members m ON m.user_id = u.id WHERE cm.message_id IN ($in)")->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $men[$r['message_id']][] = ['id' => (int) $r['user_id'], 'name' => $r['name']];
        }
        $replyIds = array_values(array_unique(array_filter(array_map(fn($r) => (int) $r['reply_to'], $rows))));
        $replies = [];
        if ($replyIds) {
            $rin = implode(',', $replyIds);
            foreach ($this->db->raw("SELECT cm.id, cm.body, cm.image, cm.deleted_at, COALESCE(m.full_name, u.full_name, u.username) AS name FROM chat_messages cm JOIN users u ON u.id = cm.user_id LEFT JOIN members m ON m.user_id = u.id WHERE cm.id IN ($rin)")->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $gone = !empty($r['deleted_at']);
                $replies[$r['id']] = ['id' => (int) $r['id'], 'name' => $r['name'], 'snippet' => $gone ? 'Message deleted' : (mb_substr((string) $r['body'], 0, 90) ?: ($r['image'] ? 'Photo' : ''))];
            }
        }

        $out = [];
        foreach ($rows as $r) {
            $id = (int) $r['id'];
            $deleted = !empty($r['deleted_at']);
            $out[] = [
                'id' => $id,
                'channel_id' => (int) $r['channel_id'],
                'user_id' => (int) $r['user_id'],
                'name' => $r['name'],
                'avatar' => $r['avatar'],
                'role' => $r['author_role'],
                'dgroup' => $r['dgroup'],
                'ministry' => $r['ministry'],
                'kind' => $r['kind'],
                'title' => $deleted ? null : $r['title'],
                'body' => $deleted ? '' : (string) $r['body'],
                'image' => $deleted ? null : $r['image'],
                'important' => (int) $r['is_important'] === 1,
                'pinned' => (int) $r['is_pinned'] === 1,
                'edited' => !empty($r['edited_at']),
                'deleted' => $deleted,
                'reply' => $r['reply_to'] ? ($replies[$r['reply_to']] ?? null) : null,
                'reactions' => $deleted ? new stdClass() : ($react[$id] ?? new stdClass()),
                'mentions' => $men[$id] ?? [],
                'acks' => $r['kind'] === 'announcement' ? ($acks[$id] ?? ['n' => 0, 'mine' => false]) : null,
                'created_at' => $r['created_at'],
            ];
        }
        return $out;
    }

    private function touch_presence($me)
    {
        if ($me['id'] > 0) {
            $this->db->raw("INSERT INTO chat_presence (user_id, last_seen) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_seen = NOW()", [$me['id']]);
        }
    }

    /* ------------------------------------------------------------------ */
    /* endpoints                                                           */
    /* ------------------------------------------------------------------ */

    /** GET /api/chat/bootstrap */
    public function bootstrap()
    {
        $me = $this->me();
        $this->ensure_group_channels($me);
        $this->touch_presence($me);

        $unreadSql = "SELECT c.*,
                (SELECT COUNT(*) FROM chat_messages x WHERE x.channel_id = c.id AND x.deleted_at IS NULL AND x.user_id <> ?
                   AND x.id > COALESCE((SELECT r.last_read_id FROM chat_reads r WHERE r.channel_id = c.id AND r.user_id = ?), 0)) AS unread,
                (SELECT COUNT(*) FROM chat_mentions mm JOIN chat_messages x ON x.id = mm.message_id
                   WHERE mm.user_id = ? AND x.channel_id = c.id AND x.deleted_at IS NULL
                   AND x.id > COALESCE((SELECT r.last_read_id FROM chat_reads r WHERE r.channel_id = c.id AND r.user_id = ?), 0)) AS mentions,
                (SELECT MAX(x.created_at) FROM chat_messages x WHERE x.channel_id = c.id AND x.deleted_at IS NULL) AS last_at
                FROM chat_channels c ORDER BY c.sort_order, c.name";
        $uid = $me['id'];
        $channels = [];
        foreach ($this->db->raw($unreadSql, [$uid, $uid, $uid, $uid])->fetchAll(PDO::FETCH_ASSOC) as $c) {
            if (!$this->can_see($me, $c)) continue;
            $channels[] = [
                'id' => (int) $c['id'], 'slug' => $c['slug'], 'name' => $c['name'], 'description' => $c['description'],
                'kind' => $c['kind'], 'readonly' => (int) $c['is_readonly'] === 1, 'staff_only' => (int) $c['staff_only'] === 1,
                'unread' => (int) $c['unread'], 'mentions' => (int) $c['mentions'], 'last_at' => $c['last_at'],
            ];
        }

        api_response([
            'me' => [
                'id' => $me['id'], 'name' => $me['name'], 'role' => $me['role'], 'staff' => $me['staff'],
                'can_post' => $me['id'] > 0 && !$me['mute'],
                'muted_until' => $me['mute']['until_at'] ?? null,
                'reason' => $me['id'] <= 0 ? 'no_profile' : ($me['mute'] ? 'muted' : null),
            ],
            'channels' => $channels,
        ]);
    }

    /** GET /api/chat/channels/{id}/messages?after=&before=&q= */
    public function messages($channelId = 0)
    {
        $me = $this->me();
        $ch = $this->channel($channelId, $me);
        $this->touch_presence($me);

        $after = (int) ($_GET['after'] ?? 0);
        $before = (int) ($_GET['before'] ?? 0);
        $q = trim((string) ($_GET['q'] ?? ''));
        $limit = 40;

        $where = "WHERE cm.channel_id = ?";
        $params = [(int) $ch['id']];
        if ($after > 0) { $where .= " AND cm.id > ?"; $params[] = $after; }
        if ($before > 0) { $where .= " AND cm.id < ?"; $params[] = $before; }
        if ($q !== '') {
            $where .= " AND cm.deleted_at IS NULL AND (cm.body LIKE ? OR cm.title LIKE ?)";
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $params[] = $like; $params[] = $like;
        }

        if ($after > 0) {
            $rows = $this->db->raw($this->message_sql() . " $where ORDER BY cm.id ASC LIMIT 100", $params)->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $rows = $this->db->raw($this->message_sql() . " $where ORDER BY cm.id DESC LIMIT " . ($limit + 1), $params)->fetchAll(PDO::FETCH_ASSOC);
            $hasMore = count($rows) > $limit;
            $rows = array_reverse(array_slice($rows, 0, $limit));
        }

        $payload = ['messages' => $this->hydrate($rows, $me)];
        if ($after <= 0) {
            $payload['has_more'] = $hasMore ?? false;
            $read = $this->db->raw("SELECT last_read_id FROM chat_reads WHERE channel_id = ? AND user_id = ?", [(int) $ch['id'], $me['id']])->fetchColumn();
            $payload['last_read'] = (int) $read;
            if ($before <= 0 && $q === '') {
                $pins = $this->db->raw($this->message_sql() . " WHERE cm.channel_id = ? AND cm.is_pinned = 1 AND cm.deleted_at IS NULL ORDER BY cm.id DESC LIMIT 20", [(int) $ch['id']])->fetchAll(PDO::FETCH_ASSOC);
                $payload['pinned'] = $this->hydrate($pins, $me);
            }
        }
        api_response($payload);
    }

    /** POST /api/chat/channels/{id}/messages  (json or multipart) */
    public function send($channelId = 0)
    {
        $me = $this->me();
        $ch = $this->channel($channelId, $me);
        $this->must_post($me);
        $in = api_input();

        $body = trim((string) ($in['body'] ?? ''));
        $kind = ($in['kind'] ?? 'message') === 'announcement' ? 'announcement' : 'message';
        $title = trim((string) ($in['title'] ?? ''));
        $important = !empty($in['important']) && $in['important'] !== '0' && $in['important'] !== 'false';
        $replyTo = (int) ($in['reply_to'] ?? 0);

        if ((int) $ch['is_readonly'] === 1) {
            if (!$me['staff']) api_response(['error' => 'Only admins and officers can post here.'], 403);
            $kind = 'announcement';
        }
        if ($kind === 'announcement' && !$me['staff']) {
            api_response(['error' => 'Only admins and officers can post announcements.'], 403);
        }
        if ($kind === 'announcement' && $title === '') {
            api_response(['error' => 'Give the announcement a short title.'], 422);
        }
        if (mb_strlen($body) > 2000) api_response(['error' => 'Messages can be up to 2000 characters.'], 422);

        // slow-mode: 20 messages a minute is plenty for a youth group
        $recent = (int) $this->db->raw("SELECT COUNT(*) FROM chat_messages WHERE user_id = ? AND created_at > (NOW() - INTERVAL 1 MINUTE)", [$me['id']])->fetchColumn();
        if ($recent >= 20) api_response(['error' => 'Slow down a little. Try again in a moment.'], 429);

        $image = $this->save_image('image');
        if ($body === '' && !$image) api_response(['error' => 'Write a message or attach a photo.'], 422);

        if ($replyTo > 0) {
            $ok = $this->db->raw("SELECT id FROM chat_messages WHERE id = ? AND channel_id = ?", [$replyTo, (int) $ch['id']])->fetch();
            if (!$ok) $replyTo = 0;
        }

        $this->db->raw(
            "INSERT INTO chat_messages (channel_id, user_id, kind, title, body, image, reply_to, is_important, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [(int) $ch['id'], $me['id'], $kind, $title !== '' ? mb_substr($title, 0, 160) : null, $body, $image, $replyTo ?: null, $important ? 1 : 0]
        );
        $mid = (int) $this->db->last_id();

        // mentions: ids sent by the composer, re-checked against people who can actually see this channel
        $ids = $in['mentions'] ?? [];
        if (is_string($ids)) $ids = json_decode($ids, true) ?: [];
        foreach (array_slice(array_unique(array_map('intval', (array) $ids)), 0, 20) as $uid) {
            if ($uid <= 0 || $uid === $me['id']) continue;
            $u = $this->db->raw("SELECT u.id, u.role, m.dgroup_id, m.ministry_id FROM users u LEFT JOIN members m ON m.user_id = u.id WHERE u.id = ? AND u.is_active = 1", [$uid])->fetch(PDO::FETCH_ASSOC);
            if (!$u) continue;
            $probe = ['staff' => in_array($u['role'], $this->staffRoles, true), 'dgroup_id' => $u['dgroup_id'], 'ministry_id' => $u['ministry_id']];
            if (!$this->can_see($probe, $ch)) continue;
            $this->db->raw("INSERT IGNORE INTO chat_mentions (message_id, user_id) VALUES (?, ?)", [$mid, $uid]);
        }

        // your own message counts as read
        $this->db->raw("INSERT INTO chat_reads (channel_id, user_id, last_read_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id))", [(int) $ch['id'], $me['id'], $mid]);
        $this->touch_presence($me);

        $rows = $this->db->raw($this->message_sql() . " WHERE cm.id = ?", [$mid])->fetchAll(PDO::FETCH_ASSOC);
        api_response(['success' => true, 'message' => $this->hydrate($rows, $me)[0]], 201);
    }

    private function save_image($field)
    {
        if (!isset($_FILES[$field]) || $_FILES[$field]['error'] === UPLOAD_ERR_NO_FILE) return null;
        $f = $_FILES[$field];
        if ($f['error'] !== UPLOAD_ERR_OK) api_response(['error' => 'The photo could not be uploaded. Please try again.'], 422);
        if ($f['size'] > 8 * 1024 * 1024) api_response(['error' => 'The photo is over 8 MB.'], 422);
        $info = @getimagesize($f['tmp_name']);
        $map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
        if (!$info || !isset($map[$info[2]])) api_response(['error' => 'Please attach a JPG, PNG, WEBP or GIF photo.'], 422);
        $dir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'chat' . DIRECTORY_SEPARATOR;
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $name = 'chat_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $map[$info[2]];
        if (!move_uploaded_file($f['tmp_name'], $dir . $name)) api_response(['error' => 'Failed to save the photo.'], 500);
        return 'uploads/chat/' . $name;
    }

    private function load_message($id, $me)
    {
        $m = $this->db->raw("SELECT cm.*, c.staff_only, c.kind AS ch_kind, c.ref_id, c.is_readonly FROM chat_messages cm JOIN chat_channels c ON c.id = cm.channel_id WHERE cm.id = ?", [(int) $id])->fetch(PDO::FETCH_ASSOC);
        if (!$m) api_response(['error' => 'Message not found.'], 404);
        $probe = ['staff_only' => $m['staff_only'], 'kind' => $m['ch_kind'], 'ref_id' => $m['ref_id']];
        if (!$this->can_see($me, $probe)) api_response(['error' => 'Message not found.'], 404);
        return $m;
    }

    /** POST /api/chat/messages/{id}/edit */
    public function edit($id = 0)
    {
        $me = $this->me();
        $m = $this->load_message($id, $me);
        $this->must_post($me);
        if ((int) $m['user_id'] !== $me['id'] || $m['deleted_at']) api_response(['error' => 'You can only edit your own messages.'], 403);
        $body = trim((string) (api_input()['body'] ?? ''));
        if ($body === '' && !$m['image']) api_response(['error' => 'The message cannot be empty.'], 422);
        if (mb_strlen($body) > 2000) api_response(['error' => 'Messages can be up to 2000 characters.'], 422);
        $this->db->raw("UPDATE chat_messages SET body = ?, edited_at = NOW() WHERE id = ?", [$body, (int) $id]);
        api_response(['success' => true]);
    }

    /** POST /api/chat/messages/{id}/delete */
    public function delete($id = 0)
    {
        $me = $this->me();
        $m = $this->load_message($id, $me);
        $own = (int) $m['user_id'] === $me['id'];
        if (!$own) {
            if (!$me['staff']) api_response(['error' => 'You can only delete your own messages.'], 403);
            $owner = $this->db->raw("SELECT role FROM users WHERE id = ?", [(int) $m['user_id']])->fetchColumn();
            if ($owner === 'admin' && $me['role'] !== 'admin') api_response(['error' => 'Only an admin can remove an admin message.'], 403);
        }
        $this->db->raw("UPDATE chat_messages SET deleted_at = NOW(), is_pinned = 0 WHERE id = ?", [(int) $id]);
        api_response(['success' => true]);
    }

    /** POST /api/chat/messages/{id}/pin  (staff) */
    public function pin($id = 0)
    {
        $me = $this->me();
        $m = $this->load_message($id, $me);
        if (!$me['staff']) api_response(['error' => 'Only admins and officers can pin messages.'], 403);
        if ($m['deleted_at']) api_response(['error' => 'That message was deleted.'], 422);
        $new = (int) $m['is_pinned'] === 1 ? 0 : 1;
        $this->db->raw("UPDATE chat_messages SET is_pinned = ? WHERE id = ?", [$new, (int) $id]);
        api_response(['success' => true, 'pinned' => $new === 1]);
    }

    /** POST /api/chat/messages/{id}/react  { reaction } toggles */
    public function react($id = 0)
    {
        $me = $this->me();
        $m = $this->load_message($id, $me);
        $this->must_post($me);
        $r = (string) (api_input()['reaction'] ?? '');
        if (!in_array($r, $this->reactionKinds, true)) api_response(['error' => 'Unknown reaction.'], 422);
        if ($m['deleted_at']) api_response(['error' => 'That message was deleted.'], 422);
        $has = $this->db->raw("SELECT 1 FROM chat_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?", [(int) $id, $me['id'], $r])->fetch();
        if ($has) {
            $this->db->raw("DELETE FROM chat_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?", [(int) $id, $me['id'], $r]);
        } else {
            $this->db->raw("INSERT INTO chat_reactions (message_id, user_id, reaction) VALUES (?, ?, ?)", [(int) $id, $me['id'], $r]);
        }
        api_response(['success' => true, 'on' => !$has]);
    }

    /** POST /api/chat/messages/{id}/ack  announcement "Got it" */
    public function ack($id = 0)
    {
        $me = $this->me();
        $m = $this->load_message($id, $me);
        $this->must_post($me);
        if ($m['kind'] !== 'announcement') api_response(['error' => 'Only announcements can be acknowledged.'], 422);
        $this->db->raw("INSERT IGNORE INTO chat_acks (message_id, user_id) VALUES (?, ?)", [(int) $id, $me['id']]);
        api_response(['success' => true]);
    }

    /** GET /api/chat/messages/{id}/acks  (staff: who has read it) */
    public function ack_list($id = 0)
    {
        $me = $this->me();
        $this->load_message($id, $me);
        if (!$me['staff']) api_response(['error' => 'Staff only.'], 403);
        $rows = $this->db->raw("SELECT COALESCE(m.full_name, u.full_name, u.username) AS name, a.created_at FROM chat_acks a JOIN users u ON u.id = a.user_id LEFT JOIN members m ON m.user_id = u.id WHERE a.message_id = ? ORDER BY a.created_at", [(int) $id])->fetchAll(PDO::FETCH_ASSOC);
        api_response($rows);
    }

    /** POST /api/chat/channels/{id}/read  { last_id } */
    public function mark_read($channelId = 0)
    {
        $me = $this->me();
        $ch = $this->channel($channelId, $me);
        if ($me['id'] <= 0) api_response(['success' => true]);
        $last = (int) (api_input()['last_id'] ?? 0);
        if ($last > 0) {
            $this->db->raw("INSERT INTO chat_reads (channel_id, user_id, last_read_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id))", [(int) $ch['id'], $me['id'], $last]);
        }
        api_response(['success' => true]);
    }

    /** GET /api/chat/members?q=  people list with presence, ministry and D-Group */
    public function members()
    {
        $me = $this->me();
        $this->touch_presence($me);
        $q = trim((string) ($_GET['q'] ?? ''));
        $where = "WHERE u.is_active = 1";
        $params = [];
        if ($q !== '') {
            $where .= " AND (COALESCE(m.full_name, u.full_name, u.username) LIKE ?)";
            $params[] = '%' . $q . '%';
        }
        $rows = $this->db->raw(
            "SELECT u.id, COALESCE(m.full_name, u.full_name, u.username) AS name, u.role, m.avatar,
                    d.name AS dgroup, mi.name AS ministry, p.last_seen,
                    (p.last_seen IS NOT NULL AND p.last_seen > (NOW() - INTERVAL 2 MINUTE)) AS online
             FROM users u
             LEFT JOIN members m ON m.user_id = u.id
             LEFT JOIN dgroups d ON d.id = m.dgroup_id
             LEFT JOIN ministries mi ON mi.id = m.ministry_id
             LEFT JOIN chat_presence p ON p.user_id = u.id
             $where
             ORDER BY online DESC, (u.role IN ('admin','officer','secretary','moderator')) DESC, name ASC LIMIT 300",
            $params
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['id'] = (int) $r['id'];
            $r['online'] = (int) $r['online'] === 1;
            $r['staff'] = in_array($r['role'], $this->staffRoles, true);
        }
        api_response($rows);
    }

    /** GET /api/chat/profile/{id} */
    public function profile($userId = 0)
    {
        $me = $this->me();
        $u = $this->db->raw(
            "SELECT u.id, COALESCE(m.full_name, u.full_name, u.username) AS name, u.role, m.avatar, m.joined_at,
                    d.id AS dgroup_id, d.name AS dgroup, mi.id AS ministry_id, mi.name AS ministry, p.last_seen,
                    (p.last_seen IS NOT NULL AND p.last_seen > (NOW() - INTERVAL 2 MINUTE)) AS online
             FROM users u
             LEFT JOIN members m ON m.user_id = u.id
             LEFT JOIN dgroups d ON d.id = m.dgroup_id
             LEFT JOIN ministries mi ON mi.id = m.ministry_id
             LEFT JOIN chat_presence p ON p.user_id = u.id
             WHERE u.id = ? AND u.is_active = 1", [(int) $userId]
        )->fetch(PDO::FETCH_ASSOC);
        if (!$u) api_response(['error' => 'Profile not found.'], 404);

        $st = $this->stats_for((int) $userId);
        $mute = $this->db->raw("SELECT until_at FROM chat_mutes WHERE user_id = ? AND until_at > NOW()", [(int) $userId])->fetchColumn();
        api_response([
            'id' => (int) $u['id'], 'name' => $u['name'], 'role' => $u['role'], 'avatar' => $u['avatar'],
            'joined_at' => $u['joined_at'], 'dgroup' => $u['dgroup'], 'ministry' => $u['ministry'],
            'online' => (int) $u['online'] === 1, 'last_seen' => $u['last_seen'],
            'stats' => $st,
            'muted_until' => $me['staff'] && $mute ? $mute : null,
            'can_mute' => $me['staff'] && (int) $userId !== $me['id'] && ($u['role'] !== 'admin' || $me['role'] === 'admin') && !in_array($u['role'], ['admin'], true),
        ]);
    }

    private function stats_for($uid)
    {
        $r = $this->db->raw(
            "SELECT COUNT(*) AS msgs, COUNT(DISTINCT DATE(created_at)) AS days
             FROM chat_messages WHERE user_id = ? AND kind = 'message' AND deleted_at IS NULL AND created_at > (NOW() - INTERVAL 30 DAY)", [$uid]
        )->fetch(PDO::FETCH_ASSOC);
        $got = (int) $this->db->raw("SELECT COUNT(*) FROM chat_reactions r JOIN chat_messages cm ON cm.id = r.message_id WHERE cm.user_id = ? AND r.user_id <> ? AND r.created_at > (NOW() - INTERVAL 30 DAY)", [$uid, $uid])->fetchColumn();
        $msgs = (int) $r['msgs']; $days = (int) $r['days'];
        return ['messages' => $msgs, 'active_days' => $days, 'reactions_received' => $got, 'level' => $this->level($msgs, $days)];
    }

    private function level($msgs, $days)
    {
        if ($days >= 4 || $msgs >= 12) return 'active';
        if ($msgs >= 1) return 'casual';
        return 'quiet';
    }

    /** GET /api/chat/activity  top contributors for everyone, full table for staff */
    public function activity()
    {
        $me = $this->me();
        $rows = $this->db->raw(
            "SELECT u.id, COALESCE(m.full_name, u.full_name, u.username) AS name, u.role, m.avatar, d.name AS dgroup, mi.name AS ministry,
                    COALESCE(a.msgs, 0) AS msgs, COALESCE(a.days, 0) AS days, COALESCE(a.week_msgs, 0) AS week_msgs,
                    COALESCE(g.got, 0) AS got, a.last_msg
             FROM users u
             LEFT JOIN members m ON m.user_id = u.id
             LEFT JOIN dgroups d ON d.id = m.dgroup_id
             LEFT JOIN ministries mi ON mi.id = m.ministry_id
             LEFT JOIN (SELECT user_id, COUNT(*) msgs, COUNT(DISTINCT DATE(created_at)) days,
                               SUM(created_at > (NOW() - INTERVAL 7 DAY)) week_msgs, MAX(created_at) last_msg
                        FROM chat_messages WHERE kind = 'message' AND deleted_at IS NULL AND created_at > (NOW() - INTERVAL 30 DAY) GROUP BY user_id) a ON a.user_id = u.id
             LEFT JOIN (SELECT cm.user_id, COUNT(*) got FROM chat_reactions r JOIN chat_messages cm ON cm.id = r.message_id
                        WHERE r.user_id <> cm.user_id AND r.created_at > (NOW() - INTERVAL 30 DAY) GROUP BY cm.user_id) g ON g.user_id = u.id
             WHERE u.is_active = 1 LIMIT 500"
        )->fetchAll(PDO::FETCH_ASSOC);

        $list = [];
        foreach ($rows as $r) {
            $msgs = (int) $r['msgs']; $days = (int) $r['days']; $got = (int) $r['got'];
            $list[] = [
                'id' => (int) $r['id'], 'name' => $r['name'], 'role' => $r['role'], 'avatar' => $r['avatar'],
                'dgroup' => $r['dgroup'], 'ministry' => $r['ministry'],
                'messages' => $msgs, 'week' => (int) $r['week_msgs'], 'active_days' => $days, 'reactions_received' => $got,
                'score' => $msgs * 2 + $got + $days * 3, 'level' => $this->level($msgs, $days), 'last_message' => $r['last_msg'],
            ];
        }
        usort($list, fn($a, $b) => $b['score'] <=> $a['score']);

        $top = array_slice(array_values(array_filter($list, fn($x) => $x['score'] > 0)), 0, 5);
        $out = ['top' => $top];
        if ($me['staff']) {
            $out['everyone'] = $list;
            $out['summary'] = [
                'active' => count(array_filter($list, fn($x) => $x['level'] === 'active')),
                'casual' => count(array_filter($list, fn($x) => $x['level'] === 'casual')),
                'quiet' => count(array_filter($list, fn($x) => $x['level'] === 'quiet')),
            ];
        }
        api_response($out);
    }

    /** POST /api/chat/mute  { user_id, minutes, reason }  minutes = 0 lifts the mute (staff) */
    public function mute()
    {
        $me = $this->me();
        if (!$me['staff']) api_response(['error' => 'Only admins and officers can mute members.'], 403);
        $in = api_input();
        $uid = (int) ($in['user_id'] ?? 0);
        $min = max(0, min(60 * 24 * 30, (int) ($in['minutes'] ?? 0)));
        if ($uid <= 0 || $uid === $me['id']) api_response(['error' => 'Choose another member.'], 422);
        $role = $this->db->raw("SELECT role FROM users WHERE id = ?", [$uid])->fetchColumn();
        if (!$role) api_response(['error' => 'Member not found.'], 404);
        if ($role === 'admin') api_response(['error' => 'Admins cannot be muted.'], 403);
        if (in_array($role, $this->staffRoles, true) && $me['role'] !== 'admin') api_response(['error' => 'Only an admin can mute an officer.'], 403);

        if ($min === 0) {
            $this->db->raw("DELETE FROM chat_mutes WHERE user_id = ?", [$uid]);
            api_response(['success' => true, 'message' => 'Mute lifted.']);
        }
        $reason = mb_substr(trim((string) ($in['reason'] ?? '')), 0, 255);
        $this->db->raw(
            "INSERT INTO chat_mutes (user_id, until_at, reason, by_user) VALUES (?, NOW() + INTERVAL ? MINUTE, ?, ?)
             ON DUPLICATE KEY UPDATE until_at = VALUES(until_at), reason = VALUES(reason), by_user = VALUES(by_user)",
            [$uid, $min, $reason ?: null, $me['id']]
        );
        api_response(['success' => true, 'message' => 'Member muted.']);
    }

    /* ------------------------------------------------------------------ */
    /* Online sessions (Google Meet)                                       */
    /* ------------------------------------------------------------------ */

    private $sessionKinds = ['fellowship', 'bible_study', 'prayer', 'meeting'];
    private $joinEarlyMin = 15;

    private function valid_meet($url)
    {
        return (bool) preg_match('~^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?[A-Za-z0-9=&_%.-]*)?$~', $url);
    }

    /** Sessions the person is allowed to see, with live/countdown computed by the database clock. */
    private function visible_sessions($me, $where = '', $params = [])
    {
        $sql = "SELECT s.*, c.name AS channel_name, c.kind AS ch_kind, c.ref_id, c.staff_only,
                       COALESCE(m.full_name, u.full_name, u.username) AS host_name,
                       TIMESTAMPDIFF(MINUTE, NOW(), s.starts_at) AS starts_in,
                       (s.starts_at <= NOW() AND s.ends_at > NOW()) AS is_live,
                       (s.ends_at <= NOW()) AS is_over,
                       (SELECT COUNT(*) FROM chat_session_rsvps r WHERE r.session_id = s.id AND r.rsvp = 'going') AS going,
                       (SELECT COUNT(*) FROM chat_session_rsvps r WHERE r.session_id = s.id AND r.joined_at IS NOT NULL) AS joined,
                       (SELECT r.rsvp FROM chat_session_rsvps r WHERE r.session_id = s.id AND r.user_id = ?) AS my_rsvp,
                       (SELECT r.joined_at FROM chat_session_rsvps r WHERE r.session_id = s.id AND r.user_id = ?) AS my_joined
                FROM chat_sessions s
                LEFT JOIN chat_channels c ON c.id = s.channel_id
                LEFT JOIN users u ON u.id = s.host_id
                LEFT JOIN members m ON m.user_id = u.id
                WHERE 1=1 $where
                ORDER BY s.starts_at ASC LIMIT 60";
        $rows = $this->db->raw($sql, array_merge([$me['id'], $me['id']], $params))->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            if ($r['channel_id'] && !$this->can_see($me, $r)) continue;
            $cancelled = $r['status'] === 'cancelled';
            $canHost = $me['staff'] && ((int) $r['host_id'] === $me['id'] || $me['role'] === 'admin');
            $out[] = [
                'id' => (int) $r['id'],
                'title' => $r['title'],
                'kind' => $r['kind'],
                'description' => $r['description'],
                'notes' => $r['notes'],
                'starts_at' => $r['starts_at'],
                'ends_at' => $r['ends_at'],
                'channel_id' => $r['channel_id'] ? (int) $r['channel_id'] : null,
                'channel_name' => $r['channel_name'],
                'host_id' => (int) $r['host_id'],
                'host_name' => $r['host_name'],
                'cancelled' => $cancelled,
                'live' => !$cancelled && (int) $r['is_live'] === 1,
                'over' => (int) $r['is_over'] === 1,
                'starts_in' => (int) $r['starts_in'],
                'can_join' => !$cancelled && (int) $r['is_over'] === 0 && (int) $r['starts_in'] <= $this->joinEarlyMin,
                'going' => (int) $r['going'],
                'joined' => (int) $r['joined'],
                'my_rsvp' => $r['my_rsvp'],
                'my_joined' => $r['my_joined'],
                'can_manage' => $canHost,
                'meet_url' => $canHost ? $r['meet_url'] : null,
            ];
        }
        return $out;
    }

    // GET /api/chat/sessions
    public function sessions()
    {
        $me = $this->me();
        $rows = $this->visible_sessions($me, " AND s.ends_at > (NOW() - INTERVAL 14 DAY)");
        api_response([
            'upcoming' => array_values(array_filter($rows, function ($r) { return !$r['over'] && !$r['cancelled']; })),
            'past' => array_reverse(array_values(array_filter($rows, function ($r) { return $r['over'] || $r['cancelled']; }))),
        ]);
    }

    // POST /api/chat/sessions  (staff)
    public function create_session()
    {
        $me = $this->me();
        if (!$me['staff']) api_response(['error' => 'Only admins and officers can schedule online sessions.'], 403);
        $this->must_post($me);
        $in = api_input();

        $title = mb_substr(trim((string) ($in['title'] ?? '')), 0, 160);
        $kind = in_array($in['kind'] ?? '', $this->sessionKinds, true) ? $in['kind'] : 'fellowship';
        $desc = mb_substr(trim((string) ($in['description'] ?? '')), 0, 1500);
        $url = trim((string) ($in['meet_url'] ?? ''));
        $start = trim((string) ($in['starts_at'] ?? ''));
        $dur = max(15, min(360, (int) ($in['duration'] ?? 60)));
        $chId = (int) ($in['channel_id'] ?? 0);

        if ($title === '') api_response(['error' => 'Give the session a title.'], 422);
        $auto = !empty($in['auto_meet']) && $in['auto_meet'] !== 'false' && $in['auto_meet'] !== '0';
        if (!$auto && !$this->valid_meet($url)) api_response(['error' => 'Paste a Google Meet link, like https://meet.google.com/abc-defg-hij'], 422);
        $ts = strtotime($start);
        if (!$ts) api_response(['error' => 'Choose a date and time.'], 422);
        $startSql = date('Y-m-d H:i:s', $ts);
        $late = $this->db->raw("SELECT (? < (NOW() - INTERVAL 10 MINUTE))", [$startSql])->fetchColumn();
        if ((int) $late === 1) api_response(['error' => 'That start time has already passed.'], 422);

        $ch = null;
        if ($chId > 0) {
            $ch = $this->channel($chId, $me);
            if ($ch['kind'] === 'announcement') $ch = null;
        }
        $eventId = null;
        if ($auto) {
            $made = $this->google_create_event($title, $desc, $ts, $dur);
            $url = $made['url'];
            $eventId = $made['id'];
        }
        $dupe = $this->db->raw("SELECT id FROM chat_sessions WHERE meet_url = ? AND status = 'scheduled' AND ends_at > NOW() LIMIT 1", [$url])->fetch();
        if ($dupe) api_response(['error' => 'That Meet link is already used by another upcoming session.'], 422);

        $this->db->raw(
            "INSERT INTO chat_sessions (title, kind, description, meet_url, starts_at, ends_at, channel_id, host_id, event_id)
             VALUES (?, ?, ?, ?, ?, ? + INTERVAL ? MINUTE, ?, ?, ?)",
            [$title, $kind, $desc !== '' ? $desc : null, $url, $startSql, $startSql, $dur, $ch ? (int) $ch['id'] : null, $me['id'], $eventId]
        );
        $sid = (int) $this->db->last_id();
        $this->db->raw("INSERT IGNORE INTO chat_session_rsvps (session_id, user_id, rsvp) VALUES (?, ?, 'going')", [$sid, $me['id']]);

        if (!isset($in['announce']) || ($in['announce'] !== false && $in['announce'] !== 'false' && $in['announce'] !== '0' && $in['announce'] !== 0)) {
            $target = $ch;
            if (!$target) $target = $this->db->raw("SELECT * FROM chat_channels WHERE slug = 'announcements' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
            if ($target) {
                $label = ['fellowship' => 'Online fellowship', 'bible_study' => 'Online Bible study', 'prayer' => 'Online prayer', 'meeting' => 'Online meeting'][$kind];
                $when = date('D, M j \a\t g:i A', $ts);
                $body = "{$label} on {$when} ({$dur} min). Open Sessions in the chat toolbar to RSVP and join." . ($desc !== '' ? "\n\n" . $desc : '');
                $this->db->raw(
                    "INSERT INTO chat_messages (channel_id, user_id, kind, title, body, is_important, created_at) VALUES (?, ?, 'announcement', ?, ?, 1, NOW())",
                    [(int) $target['id'], $me['id'], mb_substr($title, 0, 160), $body]
                );
            }
        }
        $rows = $this->visible_sessions($me, " AND s.id = ?", [$sid]);
        api_response(['success' => true, 'session' => $rows[0] ?? null], 201);
    }

    private function load_session($id, $me)
    {
        $rows = $this->visible_sessions($me, " AND s.id = ?", [(int) $id]);
        if (!$rows) api_response(['error' => 'Session not found.'], 404);
        return $rows[0];
    }

    // POST /api/chat/sessions/{id}/rsvp  { rsvp: going | maybe | none }
    public function session_rsvp($id = 0)
    {
        $me = $this->me();
        $this->must_post($me);
        $s = $this->load_session($id, $me);
        if ($s['cancelled'] || $s['over']) api_response(['error' => 'This session is no longer open for RSVP.'], 422);
        $r = (string) (api_input()['rsvp'] ?? 'going');
        if ($r === 'none') {
            $this->db->raw("DELETE FROM chat_session_rsvps WHERE session_id = ? AND user_id = ? AND joined_at IS NULL", [(int) $id, $me['id']]);
        } elseif (in_array($r, ['going', 'maybe'], true)) {
            $this->db->raw(
                "INSERT INTO chat_session_rsvps (session_id, user_id, rsvp) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rsvp = VALUES(rsvp)",
                [(int) $id, $me['id'], $r]
            );
        } else {
            api_response(['error' => 'Unknown RSVP.'], 422);
        }
        api_response(['success' => true, 'session' => $this->load_session($id, $me)]);
    }

    // POST /api/chat/sessions/{id}/join  -> records attendance, returns the Meet link
    public function session_join($id = 0)
    {
        $me = $this->me();
        $this->must_post($me);
        $s = $this->load_session($id, $me);
        if ($s['cancelled']) api_response(['error' => 'This session was cancelled.'], 422);
        if ($s['over']) api_response(['error' => 'This session has ended.'], 422);
        if (!$s['can_join']) api_response(['error' => "The room opens {$this->joinEarlyMin} minutes before the start."], 422);
        $this->db->raw(
            "INSERT INTO chat_session_rsvps (session_id, user_id, rsvp, joined_at) VALUES (?, ?, 'going', NOW())
             ON DUPLICATE KEY UPDATE rsvp = 'going', joined_at = COALESCE(joined_at, NOW())",
            [(int) $id, $me['id']]
        );
        $url = $this->db->raw("SELECT meet_url FROM chat_sessions WHERE id = ?", [(int) $id])->fetchColumn();
        api_response(['success' => true, 'url' => $url]);
    }

    // POST /api/chat/sessions/{id}/cancel  (host or admin)
    public function session_cancel($id = 0)
    {
        $me = $this->me();
        $s = $this->load_session($id, $me);
        if (!$s['can_manage']) api_response(['error' => 'Only the host or an admin can cancel this session.'], 403);
        if ($s['over'] || $s['cancelled']) api_response(['error' => 'This session is already closed.'], 422);
        $this->db->raw("UPDATE chat_sessions SET status = 'cancelled' WHERE id = ?", [(int) $id]);
        $eid = $this->db->raw("SELECT event_id FROM chat_sessions WHERE id = ?", [(int) $id])->fetchColumn();
        if ($eid) $this->google_delete_event($eid);
        $target = $s['channel_id'] ? ['id' => $s['channel_id']] : $this->db->raw("SELECT id FROM chat_channels WHERE slug = 'announcements' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        if ($target) {
            $this->db->raw(
                "INSERT INTO chat_messages (channel_id, user_id, kind, title, body, is_important, created_at) VALUES (?, ?, 'announcement', ?, ?, 1, NOW())",
                [(int) $target['id'], $me['id'], mb_substr('Cancelled: ' . $s['title'], 0, 160), 'The online session scheduled for ' . date('D, M j \a\t g:i A', strtotime($s['starts_at'])) . ' has been cancelled.']
            );
        }
        api_response(['success' => true]);
    }

    // POST /api/chat/sessions/{id}/notes  (host or admin) - recap / passage / takeaways after the session
    public function session_notes($id = 0)
    {
        $me = $this->me();
        $s = $this->load_session($id, $me);
        if (!$s['can_manage']) api_response(['error' => 'Only the host or an admin can edit the notes.'], 403);
        $notes = mb_substr(trim((string) (api_input()['notes'] ?? '')), 0, 3000);
        $this->db->raw("UPDATE chat_sessions SET notes = ? WHERE id = ?", [$notes !== '' ? $notes : null, (int) $id]);
        api_response(['success' => true]);
    }

    // GET /api/chat/sessions/{id}/people  (staff) - who is going and who actually joined
    public function session_people($id = 0)
    {
        $me = $this->me();
        if (!$me['staff']) api_response(['error' => 'Staff only.'], 403);
        $this->load_session($id, $me);
        $rows = $this->db->raw(
            "SELECT r.user_id AS id, r.rsvp, r.joined_at, COALESCE(m.full_name, u.full_name, u.username) AS name, d.name AS dgroup
             FROM chat_session_rsvps r JOIN users u ON u.id = r.user_id
             LEFT JOIN members m ON m.user_id = u.id LEFT JOIN dgroups d ON d.id = m.dgroup_id
             WHERE r.session_id = ? ORDER BY r.joined_at IS NULL, r.joined_at, name",
            [(int) $id]
        )->fetchAll(PDO::FETCH_ASSOC);
        api_response($rows);
    }

    /* ------------------------------------------------------------------ */
    /* Google Calendar API: creates the Meet link automatically            */
    /* One Google account (the ministry's) is connected once by an admin;  */
    /* its refresh token is stored in chat_google.                         */
    /* ------------------------------------------------------------------ */

    private function g_conf()
    {
        // Separate OAuth client for Meet/Calendar (MEET_*), so Google Login (GOOGLE_CLIENT_ID) is never affected.
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
        $auto = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir . '/api/chat/google/callback';
        $origins = array_filter(array_map('trim', explode(',', (string) getenv('ALLOWED_ORIGINS'))));
        return [
            'id' => (string) getenv('MEET_CLIENT_ID'),
            'secret' => (string) getenv('MEET_CLIENT_SECRET'),
            'redirect' => (string) (getenv('MEET_REDIRECT_URI') ?: $auto),
            'front' => rtrim((string) (getenv('FRONTEND_URL') ?: (reset($origins) ?: 'http://localhost:5173')), '/'),
        ];
    }

    /** Windows/XAMPP PHP often ships without a CA bundle; find one so HTTPS to Google verifies properly. */
    private function ca_bundle()
    {
        $cands = [getenv('MEET_CA_BUNDLE'), ini_get('curl.cainfo'), ini_get('openssl.cafile')];
        $dir = rtrim(dirname(PHP_BINARY), '/\\');
        foreach (['/extras/ssl/cacert.pem', '/cacert.pem', '/curl-ca-bundle.crt'] as $f) $cands[] = $dir . $f;
        foreach (['C:/xampp/apache/bin/curl-ca-bundle.crt', 'C:/xampp/php/extras/ssl/cacert.pem', 'C:/laragon/etc/ssl/cacert.pem', 'C:/php/extras/ssl/cacert.pem', '/etc/ssl/certs/ca-certificates.crt'] as $f) $cands[] = $f;
        // a copy of Mozilla's bundle can be dropped next to this controller
        $cands[] = __DIR__ . '/../../storage/cacert.pem';
        foreach ($cands as $c) if ($c && @is_readable($c)) return $c;
        return null;
    }

    private function g_http($method, $url, $body = null, $headers = [])
    {
        $run = function ($verify, $bundle) use ($method, $url, $body, $headers) {
            $ch = curl_init($url);
            $opt = [
                CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_HTTPHEADER => $headers, CURLOPT_SSL_VERIFYPEER => $verify, CURLOPT_SSL_VERIFYHOST => $verify ? 2 : 0,
            ];
            if ($verify && $bundle) $opt[CURLOPT_CAINFO] = $bundle;
            curl_setopt_array($ch, $opt);
            if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            $raw = curl_exec($ch);
            $res = [$raw, (int) curl_getinfo($ch, CURLINFO_HTTP_CODE), curl_errno($ch), curl_error($ch)];
            curl_close($ch);
            return $res;
        };
        list($raw, $code, $no, $err) = $run(true, $this->ca_bundle());
        // cURL error 60/77 = no usable CA bundle. Allowed only on a developer machine, never in production.
        if ($raw === false && in_array($no, [60, 77], true) && strtolower((string) getenv('APP_ENV')) === 'development') {
            list($raw, $code, $no, $err) = $run(false, null);
        }
        if ($raw === false) {
            api_response(['error' => 'Could not reach Google: ' . $err . ($no === 60 ? ' (set curl.cainfo in php.ini to a cacert.pem file)' : '')], 502);
        }
        return [$code, json_decode($raw, true) ?: []];
    }

    private function g_row()
    {
        return $this->db->raw("SELECT * FROM chat_google WHERE id = 1")->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function g_access_token()
    {
        $c = $this->g_conf();
        $row = $this->g_row();
        if (!$row || empty($row['refresh_token'])) api_response(['error' => 'Google is not connected yet. An admin can connect it from Sessions.'], 422);
        list($code, $r) = $this->g_http('POST', 'https://oauth2.googleapis.com/token', http_build_query([
            'client_id' => $c['id'], 'client_secret' => $c['secret'], 'refresh_token' => $row['refresh_token'], 'grant_type' => 'refresh_token',
        ]), ['Content-Type: application/x-www-form-urlencoded']);
        if ($code !== 200 || empty($r['access_token'])) {
            api_response(['error' => 'Google rejected the saved connection. An admin needs to reconnect it. (' . ($r['error'] ?? $code) . ')'], 502);
        }
        return $r['access_token'];
    }

    private function google_create_event($title, $desc, $ts, $dur)
    {
        $tok = $this->g_access_token();
        $tz = new DateTimeZone('Asia/Manila');
        $a = (new DateTime('@' . $ts))->setTimezone($tz);
        $b = (clone $a)->modify("+{$dur} minutes");
        $payload = json_encode([
            'summary' => $title . ' (Life Generation)',
            'description' => $desc !== '' ? $desc : 'Online session from Life Generation Fellowship Chat.',
            'start' => ['dateTime' => $a->format('c'), 'timeZone' => 'Asia/Manila'],
            'end' => ['dateTime' => $b->format('c'), 'timeZone' => 'Asia/Manila'],
            'conferenceData' => ['createRequest' => ['requestId' => bin2hex(random_bytes(8)), 'conferenceSolutionKey' => ['type' => 'hangoutsMeet']]],
        ]);
        list($code, $r) = $this->g_http('POST', 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none', $payload, [
            'Authorization: Bearer ' . $tok, 'Content-Type: application/json',
        ]);
        if ($code >= 300 || empty($r['hangoutLink'])) {
            $why = $r['error']['message'] ?? ('HTTP ' . $code);
            api_response(['error' => 'Google could not create the Meet link: ' . $why], 502);
        }
        return ['url' => $r['hangoutLink'], 'id' => $r['id']];
    }

    private function google_delete_event($eventId)
    {
        try {
            $tok = $this->g_access_token();
            $this->g_http('DELETE', 'https://www.googleapis.com/calendar/v3/calendars/primary/events/' . rawurlencode($eventId) . '?sendUpdates=none', null, ['Authorization: Bearer ' . $tok]);
        } catch (\Throwable $e) {
            // the session is already cancelled in our database; a leftover calendar event is harmless
        }
    }

    // GET /api/chat/google/status
    public function google_status()
    {
        $me = $this->me();
        if (!$me['staff']) api_response(['error' => 'Staff only.'], 403);
        $c = $this->g_conf();
        $row = $this->g_row();
        $missing = [];
        if (!$c['id']) $missing[] = 'MEET_CLIENT_ID';
        if (!$c['secret']) $missing[] = 'MEET_CLIENT_SECRET';
        if (!$c['redirect']) $missing[] = 'MEET_REDIRECT_URI';
        api_response([
            'configured' => !$missing,
            'missing' => $missing,
            'connected' => (bool) ($row && !empty($row['refresh_token'])),
            'email' => $row['email'] ?? null,
            'redirect_uri' => $c['redirect'],
            'can_connect' => $me['role'] === 'admin',
        ]);
    }

    // GET /api/chat/google/connect  (admin) -> { url } to send the browser to Google's consent screen
    public function google_connect()
    {
        $me = $this->me();
        if ($me['role'] !== 'admin') api_response(['error' => 'Only an admin can connect Google.'], 403);
        $c = $this->g_conf();
        if (!$c['id'] || !$c['secret'] || !$c['redirect']) api_response(['error' => 'Google keys are not set on the server yet.'], 422);
        $state = bin2hex(random_bytes(16));
        $this->db->raw(
            "INSERT INTO chat_google (id, oauth_state, state_at, connected_by) VALUES (1, ?, NOW(), ?)
             ON DUPLICATE KEY UPDATE oauth_state = VALUES(oauth_state), state_at = VALUES(state_at), connected_by = VALUES(connected_by)",
            [$state, $me['id']]
        );
        $q = http_build_query([
            'client_id' => $c['id'], 'redirect_uri' => $c['redirect'], 'response_type' => 'code',
            'scope' => 'openid email https://www.googleapis.com/auth/calendar.events',
            'access_type' => 'offline', 'prompt' => 'consent', 'state' => $state,
        ]);
        api_response(['url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . $q]);
    }

    // GET /api/chat/google/callback  (Google redirects the browser here)
    public function google_callback()
    {
        $c = $this->g_conf();
        $back = $c['front'] . '/chat?google=';
        $state = (string) ($_GET['state'] ?? '');
        $code = (string) ($_GET['code'] ?? '');
        $row = $this->g_row();
        $fresh = $row && $row['oauth_state'] && hash_equals((string) $row['oauth_state'], $state)
            && $this->db->raw("SELECT (state_at > NOW() - INTERVAL 15 MINUTE) FROM chat_google WHERE id = 1")->fetchColumn();
        if (!empty($_GET['error']) || !$code || !$fresh) {
            header('Location: ' . $back . 'failed');
            exit;
        }
        list($status, $r) = $this->g_http('POST', 'https://oauth2.googleapis.com/token', http_build_query([
            'code' => $code, 'client_id' => $c['id'], 'client_secret' => $c['secret'],
            'redirect_uri' => $c['redirect'], 'grant_type' => 'authorization_code',
        ]), ['Content-Type: application/x-www-form-urlencoded']);
        if ($status !== 200 || empty($r['refresh_token'])) {
            header('Location: ' . $back . 'failed');
            exit;
        }
        $email = null;
        if (!empty($r['id_token'])) {
            $parts = explode('.', $r['id_token']);
            $claims = json_decode(base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true) ?: [];
            $email = $claims['email'] ?? null;
        }
        $this->db->raw("UPDATE chat_google SET refresh_token = ?, email = ?, oauth_state = NULL, updated_at = NOW() WHERE id = 1", [$r['refresh_token'], $email]);
        header('Location: ' . $back . 'connected');
        exit;
    }

    // POST /api/chat/google/disconnect  (admin)
    public function google_disconnect()
    {
        $me = $this->me();
        if ($me['role'] !== 'admin') api_response(['error' => 'Only an admin can disconnect Google.'], 403);
        $this->db->raw("UPDATE chat_google SET refresh_token = NULL, email = NULL WHERE id = 1");
        api_response(['success' => true]);
    }
}
