<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Chat extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    /**
     * GET /api/chat/rooms
     * List all chat rooms with unread count, last message, and online user counts.
     */
    public function rooms()
    {
        $user = get_auth_user();
        $userId = $user['id'] ?? 0;

        $stmt = $this->db->raw("
            SELECT r.*,
                   (SELECT COUNT(*) FROM chat_room_members crm WHERE crm.room_id = r.id) AS member_count,
                   (
                       SELECT m.content 
                       FROM chat_messages m 
                       WHERE m.room_id = r.id AND m.is_deleted = 0 
                       ORDER BY m.id DESC LIMIT 1
                   ) AS last_message,
                   (
                       SELECT m.image_url 
                       FROM chat_messages m 
                       WHERE m.room_id = r.id AND m.is_deleted = 0 
                       ORDER BY m.id DESC LIMIT 1
                   ) AS last_message_image,
                   (
                       SELECT m.created_at 
                       FROM chat_messages m 
                       WHERE m.room_id = r.id AND m.is_deleted = 0 
                       ORDER BY m.id DESC LIMIT 1
                   ) AS last_message_time,
                   (
                       SELECT u.username 
                       FROM chat_messages m 
                       JOIN users u ON u.id = m.sender_id
                       WHERE m.room_id = r.id AND m.is_deleted = 0 
                       ORDER BY m.id DESC LIMIT 1
                   ) AS last_sender_name,
                   (
                       SELECT COUNT(*) 
                       FROM chat_messages m 
                       LEFT JOIN chat_room_members crm ON crm.room_id = r.id AND crm.user_id = ?
                       WHERE m.room_id = r.id 
                         AND m.is_deleted = 0 
                         AND m.id > COALESCE(crm.last_read_message_id, 0)
                   ) AS unread_count,
                   (
                       SELECT COUNT(*)
                       FROM chat_room_members crm
                       JOIN chat_presence cp ON cp.user_id = crm.user_id
                       WHERE crm.room_id = r.id 
                         AND cp.last_active >= (NOW() - INTERVAL 2 MINUTE)
                   ) AS online_count
            FROM chat_rooms r
            WHERE r.is_active = 1
            ORDER BY 
                (r.type = 'announcement') DESC,
                COALESCE(last_message_time, r.created_at) DESC
        ", [$userId]);

        $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Auto-join user to general and announcement rooms if logged in
        if ($userId > 0) {
            foreach ($rooms as $room) {
                if (in_array($room['type'], ['announcement', 'general'])) {
                    $this->db->raw("
                        INSERT IGNORE INTO chat_room_members (room_id, user_id) 
                        VALUES (?, ?)
                    ", [$room['id'], $userId]);
                }
            }
        }

        api_response($rooms);
    }

    /**
     * GET /api/chat/rooms/{id}/messages
     * Fetch messages with reply previews, reactions, and pinned items.
     * Query params: limit (default 40), before_id (for cursor pagination upwards)
     */
    public function messages($roomId)
    {
        $roomId = (int) $roomId;
        $user = get_auth_user();
        $userId = $user['id'] ?? 0;

        $limit = isset($_GET['limit']) ? min(100, max(10, (int)$_GET['limit'])) : 40;
        $beforeId = isset($_GET['before_id']) ? (int)$_GET['before_id'] : 0;

        // Verify room
        $stmtRoom = $this->db->raw("SELECT * FROM chat_rooms WHERE id = ? AND is_active = 1", [$roomId]);
        $room = $stmtRoom->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            api_response(['error' => 'Chat room not found.'], 404);
        }

        // Query messages
        $params = [$roomId];
        $whereBefore = "";
        if ($beforeId > 0) {
            $whereBefore = "AND m.id < ?";
            $params[] = $beforeId;
        }
        $params[] = $limit;

        $stmt = $this->db->raw("
            SELECT m.*,
                   u.username AS sender_name,
                   u.email AS sender_email,
                   u.role AS sender_role,
                   mem.full_name AS sender_full_name,
                   mem.avatar_url AS sender_avatar,
                   -- Parent reply preview
                   rm.content AS reply_content,
                   rm.image_url AS reply_image,
                   ru.username AS reply_sender_name,
                   -- Reactions aggregated
                   (
                       SELECT JSON_ARRAYAGG(
                           JSON_OBJECT(
                               'reaction', cr.reaction,
                               'user_id', cr.user_id,
                               'username', cru.username
                           )
                       )
                       FROM chat_reactions cr
                       JOIN users cru ON cru.id = cr.user_id
                       WHERE cr.message_id = m.id
                   ) AS reactions_json
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_id
            LEFT JOIN members mem ON mem.user_id = u.id
            LEFT JOIN chat_messages rm ON rm.id = m.reply_to_id
            LEFT JOIN users ru ON ru.id = rm.sender_id
            WHERE m.room_id = ?
              {$whereBefore}
            ORDER BY m.id DESC
            LIMIT ?
        ", $params);

        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Reverse so frontend gets chronological order (oldest to newest)
        $messages = array_reverse($messages);

        // Parse reactions JSON & format
        foreach ($messages as &$msg) {
            $msg['reactions'] = !empty($msg['reactions_json']) ? json_decode($msg['reactions_json'], true) : [];
            unset($msg['reactions_json']);

            // Group reactions by emoji/type with count and has_reacted flag
            $grouped = [];
            foreach ($msg['reactions'] as $r) {
                $code = $r['reaction'];
                if (!isset($grouped[$code])) {
                    $grouped[$code] = ['reaction' => $code, 'count' => 0, 'users' => [], 'has_reacted' => false];
                }
                $grouped[$code]['count']++;
                $grouped[$code]['users'][] = $r['username'];
                if ($userId > 0 && (int)$r['user_id'] === $userId) {
                    $grouped[$code]['has_reacted'] = true;
                }
            }
            $msg['grouped_reactions'] = array_values($grouped);
        }

        // Fetch pinned messages for this room
        $stmtPinned = $this->db->raw("
            SELECT m.*, u.username AS sender_name, mem.full_name AS sender_full_name
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_id
            LEFT JOIN members mem ON mem.user_id = u.id
            WHERE m.room_id = ? AND m.is_pinned = 1 AND m.is_deleted = 0
            ORDER BY m.id DESC LIMIT 5
        ", [$roomId]);
        $pinned = $stmtPinned->fetchAll(PDO::FETCH_ASSOC);

        // Update last_read_message_id if user is logged in
        if ($userId > 0 && !empty($messages)) {
            $latestMsgId = end($messages)['id'];
            $this->db->raw("
                INSERT INTO chat_room_members (room_id, user_id, last_read_message_id)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE last_read_message_id = GREATEST(last_read_message_id, VALUES(last_read_message_id))
            ", [$roomId, $userId, $latestMsgId]);
        }

        // Fetch typing status for this room (users active typing in last 6 seconds)
        $stmtTyping = $this->db->raw("
            SELECT u.id, u.username, mem.full_name
            FROM chat_presence cp
            JOIN users u ON u.id = cp.user_id
            LEFT JOIN members mem ON mem.user_id = u.id
            WHERE cp.typing_room_id = ?
              AND cp.typing_at >= (NOW() - INTERVAL 6 SECOND)
              AND cp.user_id != ?
        ", [$roomId, $userId]);
        $typingUsers = $stmtTyping->fetchAll(PDO::FETCH_ASSOC);

        api_response([
            'room' => $room,
            'messages' => $messages,
            'pinned' => $pinned,
            'typing' => $typingUsers
        ]);
    }

    /**
     * POST /api/chat/messages
     * Send a new message with optional photo, reply_to, mentions.
     */
    public function send()
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];
        $role = $user['role'] ?? 'user';

        $roomId = isset($_POST['room_id']) ? (int)$_POST['room_id'] : 0;
        $content = isset($_POST['content']) ? trim($_POST['content']) : '';
        $replyToId = isset($_POST['reply_to_id']) && (int)$_POST['reply_to_id'] > 0 ? (int)$_POST['reply_to_id'] : null;

        if (!$roomId) {
            $input = api_input();
            $roomId = (int)($input['room_id'] ?? 0);
            $content = trim($input['content'] ?? '');
            $replyToId = !empty($input['reply_to_id']) ? (int)$input['reply_to_id'] : null;
        }

        // Verify room
        $stmtRoom = $this->db->raw("SELECT * FROM chat_rooms WHERE id = ? AND is_active = 1", [$roomId]);
        $room = $stmtRoom->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            api_response(['error' => 'Chat room not found.'], 404);
        }

        // Announcement channel restriction: only admin/officer/moderator can post
        if ($room['type'] === 'announcement' && !in_array($role, ['admin', 'officer', 'moderator'])) {
            api_response(['error' => 'Only Pastors, Admins, and Officers can post in the Church Announcements room.'], 403);
        }

        // Handle Image upload (JPG, PNG, WEBP, max 5MB)
        $imageUrl = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
            $f = $_FILES['image'];
            if ($f['error'] !== UPLOAD_ERR_OK) {
                api_response(['error' => 'Image upload failed. Please try again.'], 422);
            }
            if ($f['size'] > 5 * 1024 * 1024) {
                api_response(['error' => 'Image must not exceed 5MB.'], 422);
            }
            $imgInfo = @getimagesize($f['tmp_name']);
            if (!$imgInfo) {
                api_response(['error' => 'File is not a valid image.'], 422);
            }
            $allowedTypes = [
                IMAGETYPE_JPEG => 'jpg',
                IMAGETYPE_PNG  => 'png',
                IMAGETYPE_WEBP => 'webp'
            ];
            if (!isset($allowedTypes[$imgInfo[2]])) {
                api_response(['error' => 'Only JPG, PNG, and WEBP images are allowed.'], 422);
            }
            $ext = $allowedTypes[$imgInfo[2]];
            $filename = 'chat_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            $uploadDir = ROOT_DIR . 'public/uploads/chat/';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0755, true);
            }
            if (!move_uploaded_file($f['tmp_name'], $uploadDir . $filename)) {
                api_response(['error' => 'Could not save the image.'], 500);
            }
            $imageUrl = '/uploads/chat/' . $filename;
        }

        if (empty($content) && empty($imageUrl)) {
            api_response(['error' => 'Message or image is required.'], 422);
        }

        // Insert message
        $this->db->raw("
            INSERT INTO chat_messages (room_id, sender_id, content, image_url, reply_to_id)
            VALUES (?, ?, ?, ?, ?)
        ", [$roomId, $userId, $content, $imageUrl, $replyToId]);

        $messageId = $this->db->last_id();

        // Update user read pointer
        $this->db->raw("
            INSERT INTO chat_room_members (room_id, user_id, last_read_message_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE last_read_message_id = VALUES(last_read_message_id)
        ", [$roomId, $userId, $messageId]);

        // Clear typing indicator for this user
        $this->db->raw("
            INSERT INTO chat_presence (user_id, last_active, typing_room_id, typing_at)
            VALUES (?, NOW(), NULL, NULL)
            ON DUPLICATE KEY UPDATE last_active = NOW(), typing_room_id = NULL, typing_at = NULL
        ", [$userId]);

        // Fetch inserted message with profile details
        $stmtMsg = $this->db->raw("
            SELECT m.*,
                   u.username AS sender_name,
                   u.email AS sender_email,
                   u.role AS sender_role,
                   mem.full_name AS sender_full_name,
                   mem.avatar_url AS sender_avatar,
                   rm.content AS reply_content,
                   rm.image_url AS reply_image,
                   ru.username AS reply_sender_name
            FROM chat_messages m
            JOIN users u ON u.id = m.sender_id
            LEFT JOIN members mem ON mem.user_id = u.id
            LEFT JOIN chat_messages rm ON rm.id = m.reply_to_id
            LEFT JOIN users ru ON ru.id = rm.sender_id
            WHERE m.id = ?
        ", [$messageId]);
        $newMsg = $stmtMsg->fetch(PDO::FETCH_ASSOC);
        $newMsg['grouped_reactions'] = [];

        api_response(['message' => 'Sent successfully.', 'data' => $newMsg]);
    }

    /**
     * POST /api/chat/messages/{id}/edit
     * Edit user's own message content.
     */
    public function edit($messageId)
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];
        $input = api_input();
        $content = trim($input['content'] ?? '');

        if (empty($content)) {
            api_response(['error' => 'Message content cannot be empty.'], 422);
        }

        $stmt = $this->db->raw("SELECT * FROM chat_messages WHERE id = ?", [$messageId]);
        $msg = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$msg) {
            api_response(['error' => 'Message not found.'], 404);
        }
        if ((int)$msg['sender_id'] !== $userId && !in_array($user['role'], ['admin', 'officer'])) {
            api_response(['error' => 'You can only edit your own messages.'], 403);
        }
        if ($msg['is_deleted']) {
            api_response(['error' => 'Cannot edit a deleted message.'], 422);
        }

        $this->db->raw("
            UPDATE chat_messages 
            SET content = ?, is_edited = 1, updated_at = NOW() 
            WHERE id = ?
        ", [$content, $messageId]);

        api_response(['message' => 'Message updated successfully.', 'content' => $content]);
    }

    /**
     * POST /api/chat/messages/{id}/delete
     * Soft delete user's own message or admin moderation.
     */
    public function delete($messageId)
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];

        $stmt = $this->db->raw("SELECT * FROM chat_messages WHERE id = ?", [$messageId]);
        $msg = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$msg) {
            api_response(['error' => 'Message not found.'], 404);
        }
        if ((int)$msg['sender_id'] !== $userId && !in_array($user['role'], ['admin', 'officer', 'moderator'])) {
            api_response(['error' => 'You do not have permission to delete this message.'], 403);
        }

        $this->db->raw("
            UPDATE chat_messages 
            SET is_deleted = 1, content = 'This message was deleted.', image_url = NULL, updated_at = NOW() 
            WHERE id = ?
        ", [$messageId]);

        api_response(['message' => 'Message deleted.']);
    }

    /**
     * POST /api/chat/messages/{id}/pin
     * Toggle pin message (Admin or Officer only).
     */
    public function pin($messageId)
    {
        $user = require_auth_user();
        if (!in_array($user['role'], ['admin', 'officer', 'moderator'])) {
            api_response(['error' => 'Only Pastors, Admins, and Officers can pin messages.'], 403);
        }

        $stmt = $this->db->raw("SELECT is_pinned, room_id FROM chat_messages WHERE id = ?", [$messageId]);
        $msg = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$msg) {
            api_response(['error' => 'Message not found.'], 404);
        }

        $newPin = $msg['is_pinned'] ? 0 : 1;
        $this->db->raw("UPDATE chat_messages SET is_pinned = ? WHERE id = ?", [$newPin, $messageId]);

        api_response([
            'message' => $newPin ? 'Message pinned.' : 'Message unpinned.',
            'is_pinned' => $newPin
        ]);
    }

    /**
     * POST /api/chat/messages/{id}/react
     * Add or remove a reaction (toggle).
     */
    public function react($messageId)
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];
        $input = api_input();
        $reaction = trim($input['reaction'] ?? '');

        $allowedReactions = ['heart', 'pray', 'thumbs_up', 'praise', 'smile', 'amen'];
        if (!in_array($reaction, $allowedReactions)) {
            $reaction = 'heart';
        }

        $stmt = $this->db->raw("
            SELECT id FROM chat_reactions 
            WHERE message_id = ? AND user_id = ? AND reaction = ?
        ", [$messageId, $userId, $reaction]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Remove reaction
            $this->db->raw("DELETE FROM chat_reactions WHERE id = ?", [$existing['id']]);
            $action = 'removed';
        } else {
            // Add reaction
            $this->db->raw("
                INSERT INTO chat_reactions (message_id, user_id, reaction)
                VALUES (?, ?, ?)
            ", [$messageId, $userId, $reaction]);
            $action = 'added';
        }

        api_response(['message' => 'Reaction ' . $action, 'reaction' => $reaction, 'action' => $action]);
    }

    /**
     * POST /api/chat/presence/ping
     * Heartbeat to mark user online and report typing status.
     */
    public function presence()
    {
        $user = require_auth_user();
        $userId = (int) $user['id'];
        $input = api_input();

        $typingRoomId = !empty($input['typing_room_id']) ? (int)$input['typing_room_id'] : null;
        $isTyping = !empty($input['is_typing']);

        if ($isTyping && $typingRoomId) {
            $this->db->raw("
                INSERT INTO chat_presence (user_id, last_active, typing_room_id, typing_at)
                VALUES (?, NOW(), ?, NOW())
                ON DUPLICATE KEY UPDATE last_active = NOW(), typing_room_id = VALUES(typing_room_id), typing_at = NOW()
            ", [$userId, $typingRoomId]);
        } else {
            $this->db->raw("
                INSERT INTO chat_presence (user_id, last_active, typing_room_id, typing_at)
                VALUES (?, NOW(), NULL, NULL)
                ON DUPLICATE KEY UPDATE last_active = NOW(), typing_room_id = NULL, typing_at = NULL
            ", [$userId]);
        }

        api_response(['status' => 'online']);
    }

    /**
     * GET /api/chat/members
     * Get member list for @mentions in chat rooms.
     */
    public function members()
    {
        $stmt = $this->db->raw("
            SELECT u.id, u.username, u.role, mem.full_name, mem.avatar_url
            FROM users u
            LEFT JOIN members mem ON mem.user_id = u.id
            WHERE u.is_active = 1
            ORDER BY mem.full_name ASC, u.username ASC
            LIMIT 100
        ");
        api_response($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}
