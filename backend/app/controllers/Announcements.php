<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Announcements extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    /**
     * GET /api/announcements
     * Returns public active announcements (not expired, ordered by pinned first)
     */
    public function index()
    {
        $stmt = $this->db->raw(
            "SELECT * FROM `announcements` 
             WHERE `is_active` = 1 
               AND (`expires_at` IS NULL OR `expires_at` > NOW())
             ORDER BY `is_pinned` DESC, `id` DESC"
        );
        $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($announcements as &$a) {
            $a['id'] = (int) $a['id'];
            $a['is_pinned'] = (int) $a['is_pinned'];
            $a['is_active'] = (int) $a['is_active'];
        }

        api_response($announcements);
    }

    /**
     * GET /api/admin/announcements
     * Returns all announcements for admin management
     */
    public function admin_index()
    {
        require_admin_user();

        $stmt = $this->db->raw(
            "SELECT * FROM `announcements` ORDER BY `is_pinned` DESC, `id` DESC"
        );
        $announcements = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($announcements as &$a) {
            $a['id'] = (int) $a['id'];
            $a['is_pinned'] = (int) $a['is_pinned'];
            $a['is_active'] = (int) $a['is_active'];
        }

        api_response($announcements);
    }

    /**
     * POST /api/admin/announcements/create
     * Admin creates an announcement
     */
    public function create()
    {
        require_admin_user();
        $input = api_input();

        $title = trim($input['title'] ?? '');
        $content = trim($input['content'] ?? '');
        $category = trim($input['category'] ?? 'general');
        $badgeText = trim($input['badge_text'] ?? '');
        $linkUrl = trim($input['link_url'] ?? '');
        $linkText = trim($input['link_text'] ?? '');
        $isPinned = !empty($input['is_pinned']) ? 1 : 0;
        $isActive = isset($input['is_active']) ? (int)(bool)$input['is_active'] : 1;
        $expiresAt = !empty($input['expires_at']) ? $input['expires_at'] : null;

        $allowedCategories = ['urgent', 'event', 'ministry', 'general'];
        if (!in_array($category, $allowedCategories, true)) {
            $category = 'general';
        }

        if (empty($title)) {
            api_response(['error' => 'Announcement title is required.'], 422);
        }
        if (empty($content)) {
            api_response(['error' => 'Announcement content / message is required.'], 422);
        }

        $stmt = $this->db->raw(
            "INSERT INTO `announcements` 
             (`title`, `content`, `category`, `badge_text`, `link_url`, `link_text`, `is_pinned`, `is_active`, `expires_at`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $title,
                $content,
                $category,
                $badgeText ?: null,
                $linkUrl ?: null,
                $linkText ?: null,
                $isPinned,
                $isActive,
                $expiresAt
            ]
        );

        $newId = (int)$this->db->last_id();

        api_response([
            'success' => true,
            'message' => 'Announcement posted successfully!',
            'id' => $newId
        ], 201);
    }

    /**
     * POST /api/admin/announcements/update
     * Admin updates an announcement
     */
    public function update()
    {
        require_admin_user();
        $input = api_input();

        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) {
            api_response(['error' => 'Valid announcement ID is required.'], 422);
        }

        $existing = $this->db->raw("SELECT * FROM `announcements` WHERE `id` = ? LIMIT 1", [$id])->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            api_response(['error' => 'Announcement not found.'], 404);
        }

        $title = trim($input['title'] ?? $existing['title']);
        $content = trim($input['content'] ?? $existing['content']);
        $category = trim($input['category'] ?? $existing['category']);
        $badgeText = isset($input['badge_text']) ? trim($input['badge_text']) : $existing['badge_text'];
        $linkUrl = isset($input['link_url']) ? trim($input['link_url']) : $existing['link_url'];
        $linkText = isset($input['link_text']) ? trim($input['link_text']) : $existing['link_text'];
        $isPinned = isset($input['is_pinned']) ? (!empty($input['is_pinned']) ? 1 : 0) : (int)$existing['is_pinned'];
        $isActive = isset($input['is_active']) ? (int)(bool)$input['is_active'] : (int)$existing['is_active'];
        $expiresAt = array_key_exists('expires_at', $input) ? ($input['expires_at'] ?: null) : $existing['expires_at'];

        $allowedCategories = ['urgent', 'event', 'ministry', 'general'];
        if (!in_array($category, $allowedCategories, true)) {
            $category = 'general';
        }

        if (empty($title)) {
            api_response(['error' => 'Title cannot be empty.'], 422);
        }
        if (empty($content)) {
            api_response(['error' => 'Content cannot be empty.'], 422);
        }

        $this->db->raw(
            "UPDATE `announcements` SET 
             `title` = ?, 
             `content` = ?, 
             `category` = ?, 
             `badge_text` = ?, 
             `link_url` = ?, 
             `link_text` = ?, 
             `is_pinned` = ?, 
             `is_active` = ?, 
             `expires_at` = ?,
             `updated_at` = NOW()
             WHERE `id` = ?",
            [
                $title,
                $content,
                $category,
                $badgeText ?: null,
                $linkUrl ?: null,
                $linkText ?: null,
                $isPinned,
                $isActive,
                $expiresAt,
                $id
            ]
        );

        api_response([
            'success' => true,
            'message' => 'Announcement updated successfully!'
        ]);
    }

    /**
     * POST /api/admin/announcements/delete
     * Admin removes an announcement
     */
    public function delete()
    {
        require_admin_user();
        $input = api_input();

        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) {
            api_response(['error' => 'Valid announcement ID is required.'], 422);
        }

        $this->db->raw("DELETE FROM `announcements` WHERE `id` = ?", [$id]);

        api_response([
            'success' => true,
            'message' => 'Announcement deleted successfully.'
        ]);
    }
}
