<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Prayers extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    private function member_id_of($user)
    {
        if (!$user) return 0;
        $row = $this->db->raw(
            "SELECT id FROM members WHERE user_id = ? LIMIT 1",
            [(int) $user['id']]
        )->fetch(PDO::FETCH_ASSOC);
        return $row ? (int) $row['id'] : 0;
    }

    private function find_prayer($id)
    {
        return $this->db->raw(
            "SELECT p.*, m.user_id
             FROM prayers p
             LEFT JOIN members m ON m.id = p.member_id
             WHERE p.id = ? LIMIT 1",
            [$id]
        )->fetch(PDO::FETCH_ASSOC);
    }

    public function index()
    {
        $user = get_auth_user();
        $userId = (int) ($user['id'] ?? 0);
        $isStaff = $user && in_array($user['role'], ['admin', 'moderator']);

        $sql = "SELECT p.id, p.member_id, p.title, p.content AS body, p.visibility,
                       p.is_answered, IF(p.is_answered = 1, 'answered', 'active') AS status,
                       p.is_anonymous, p.created_at, m.user_id,
                       IF(p.is_anonymous = 1, 'Anonymous', COALESCE(m.full_name, 'Member')) AS member_name,
                       (m.user_id = ?) AS is_mine
                FROM prayers p
                LEFT JOIN members m ON m.id = p.member_id";

        if ($isStaff) {
            $sql .= " ORDER BY p.is_answered ASC, p.created_at DESC";
            $params = [$userId];
        } else {
            $viewerMemberId = $this->member_id_of($user);
            $sql .= " WHERE p.visibility = 'public' OR m.user_id = ?
                      OR (p.visibility = 'dgroup' AND EXISTS (
                            SELECT 1 FROM dgroup_members a
                            JOIN dgroup_members b ON b.dgroup_id = a.dgroup_id AND b.status = 'active'
                            WHERE a.member_id = p.member_id AND a.status = 'active' AND b.member_id = ?))
                      ORDER BY p.is_answered ASC, p.created_at DESC";
            $params = [$userId, $userId, $viewerMemberId];
        }

        $rows = $this->db->raw($sql, $params)->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['is_mine'] = (int) $r['is_mine'];
            $r['is_answered'] = (int) $r['is_answered'];
            // Itago ang user_id ng iba para hindi ma-trace ang anonymous
            if (!$isStaff && !$r['is_mine']) {
                $r['user_id'] = null;
            }
        }
        unset($r);

        api_response($rows);
    }

    public function submit()
    {
        $user = require_auth_user();
        $input = api_input();

        $title      = trim($input['title'] ?? '');
        $body       = trim($input['body'] ?? '');
        $visibility = in_array($input['visibility'] ?? '', ['public', 'dgroup', 'private']) ? $input['visibility'] : 'public';
        $anonymous  = !empty($input['is_anonymous']) ? 1 : 0;

        if ($title === '' || $body === '') {
            api_response(['error' => 'Prayer title and description are required.'], 422);
        }

        $memberId = $this->member_id_of($user);
        if ($memberId <= 0) {
            api_response(['error' => 'No member profile is linked to this account.'], 404);
        }

        $this->db->raw(
            "INSERT INTO prayers (member_id, title, content, visibility, is_anonymous, is_answered, created_at)
             VALUES (?, ?, ?, ?, ?, 0, NOW())",
            [$memberId, $title, $body, $visibility, $anonymous]
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

        $req = $this->find_prayer($id);
        if (!$req) {
            api_response(['error' => 'Prayer request not found.'], 404);
        }

        if ($user['role'] !== 'admin' && (int) $req['user_id'] !== (int) $user['id']) {
            api_response(['error' => 'Not authorized to update this prayer request.'], 403);
        }

        $this->db->raw("UPDATE prayers SET is_answered = 1 WHERE id = ?", [$id]);
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

        $req = $this->find_prayer($id);
        if (!$req) {
            api_response(['error' => 'Prayer request not found.'], 404);
        }

        if ($user['role'] !== 'admin' && (int) $req['user_id'] !== (int) $user['id']) {
            api_response(['error' => 'Not authorized to delete this prayer request.'], 403);
        }

        $this->db->raw("DELETE FROM prayers WHERE id = ?", [$id]);
        api_response(['success' => true, 'message' => 'Prayer request deleted.']);
    }
}