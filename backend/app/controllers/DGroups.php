
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class DGroups extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    } 

    /**
     * List all D-Groups.
     */
    public function index()
    {
        $user = get_auth_user();
        $userId = (int) ($user['id'] ?? 0);

        $stmt = $this->db->raw(
            "SELECT
                d.id,
                d.name,
                d.leader_id,
                d.venue,
                d.venue AS location,
                d.schedule,
                d.cover_image,
                d.cover_image AS image,
                COALESCE(leader.full_name, 'No leader assigned') AS leader_name,
                COUNT(DISTINCT CASE
                    WHEN dm.status = 'active' THEN m.id
                    ELSE NULL
                END) AS member_count,
                MAX(CASE
                    WHEN dm.status = 'active' AND m.user_id = ?
                    THEN 1 ELSE 0
                END) AS is_joined
             FROM dgroups d
             LEFT JOIN members leader
                ON leader.id = d.leader_id
             LEFT JOIN dgroup_members dm
                ON dm.dgroup_id = d.id
             LEFT JOIN members m
                ON m.id = dm.member_id
             GROUP BY
                d.id, d.name, d.leader_id, d.venue,
                d.schedule, d.cover_image, leader.full_name
             ORDER BY d.id ASC",
            [$userId]
        );

        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($groups as &$group) {
            $group['member_count'] = (int) $group['member_count'];
            $group['is_joined'] = (bool) $group['is_joined'];

            // These fields are not present in the current dgroups table.
            $group['description'] = '';
        }
        unset($group);

        api_response($groups);
    }

    /**
     * Join a D-Group.
     */
    public function join()
    {
        $user = require_auth_user();
        $input = api_input();

        $userId = (int) ($user['id'] ?? 0);
        $dgroupId = (int) ($input['dgroup_id'] ?? $input['id'] ?? 0);

        if ($userId <= 0 || $dgroupId <= 0) {
            api_response([
                'success' => false,
                'error' => 'A valid user and D-Group ID are required.'
            ], 422);
        }

        $group = $this->db->raw(
            "SELECT id, name FROM dgroups WHERE id = ? LIMIT 1",
            [$dgroupId]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$group) {
            api_response([
                'success' => false,
                'error' => 'D-Group not found.'
            ], 404);
        }

        $member = $this->db->raw(
            "SELECT id FROM members WHERE user_id = ? LIMIT 1",
            [$userId]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            api_response([
                'success' => false,
                'error' => 'No member profile is linked to this account.'
            ], 404);
        }

        $memberId = (int) $member['id'];

        $existing = $this->db->raw(
            "SELECT id, dgroup_id, status
             FROM dgroup_members
             WHERE member_id = ?
             LIMIT 1",
            [$memberId]
        )->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            if (
                (int) $existing['dgroup_id'] === $dgroupId &&
                $existing['status'] === 'active'
            ) {
                api_response([
                    'success' => true,
                    'message' => 'You have already joined this D-Group.'
                ]);
            }

            // Keep one active D-Group membership per member.
            $this->db->raw(
                "UPDATE dgroup_members
                 SET dgroup_id = ?, status = 'active'
                 WHERE id = ?",
                [$dgroupId, $existing['id']]
            );
        } else {
            $this->db->raw(
                "INSERT INTO dgroup_members (dgroup_id, member_id, status)
                 VALUES (?, ?, 'active')",
                [$dgroupId, $memberId]
            );
        }

        api_response([
            'success' => true,
            'message' => "Successfully joined {$group['name']}!",
            'dgroup_id' => $dgroupId
        ]);
    }

    /**
     * Leave the current D-Group.
     */
    public function leave()
    {
        $user = require_auth_user();
        $userId = (int) ($user['id'] ?? 0);

        $member = $this->db->raw(
            "SELECT id FROM members WHERE user_id = ? LIMIT 1",
            [$userId]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            api_response([
                'success' => false,
                'error' => 'No member profile is linked to this account.'
            ], 404);
        }

        $this->db->raw(
            "UPDATE dgroup_members
             SET status = 'inactive'
             WHERE member_id = ? AND status = 'active'",
            [(int) $member['id']]
        );

        api_response([
            'success' => true,
            'message' => 'You have left your D-Group.'
        ]);
    }

    /**
     * Create a D-Group.
     * Accepts leader_id, or leader_name matching a member's full_name.
     */
    public function create()
    {
        require_admin_user();
        $input = api_input();

        $name = trim($input['name'] ?? '');
        $schedule = trim($input['schedule'] ?? '');
        $venue = trim($input['venue'] ?? $input['location'] ?? '');
        $coverImage = trim($input['cover_image'] ?? $input['image'] ?? '');
        $leaderId = (int) ($input['leader_id'] ?? 0);
        $leaderName = trim($input['leader_name'] ?? '');

        if ($name === '') {
            api_response([
                'success' => false,
                'error' => 'Group name is required.'
            ], 422);
        }

        if ($leaderId <= 0 && $leaderName !== '') {
            $leader = $this->db->raw(
                "SELECT id FROM members WHERE full_name = ? LIMIT 1",
                [$leaderName]
            )->fetch(PDO::FETCH_ASSOC);

            if ($leader) {
                $leaderId = (int) $leader['id'];
            }
        }

        if ($leaderId > 0) {
            $leaderExists = $this->db->raw(
                "SELECT id FROM members WHERE id = ? LIMIT 1",
                [$leaderId]
            )->fetch(PDO::FETCH_ASSOC);

            if (!$leaderExists) {
                api_response([
                    'success' => false,
                    'error' => 'Selected leader was not found in the members table.'
                ], 422);
            }
        } else {
            $leaderId = null;
        }

        $this->db->raw(
            "INSERT INTO dgroups (name, leader_id, venue, schedule, cover_image)
             VALUES (?, ?, ?, ?, ?)",
            [
                $name,
                $leaderId,
                $venue !== '' ? $venue : null,
                $schedule !== '' ? $schedule : null,
                $coverImage !== '' ? $coverImage : null
            ]
        );

        api_response([
            'success' => true,
            'message' => 'D-Group created successfully.',
            'id' => (int) $this->db->last_id()
        ], 201);
    }

    /**
     * Update a D-Group.
     */
    public function update()
    {
        require_admin_user();
        $input = api_input();

        $id = (int) ($input['id'] ?? 0);
        $name = trim($input['name'] ?? '');
        $schedule = trim($input['schedule'] ?? '');
        $venue = trim($input['venue'] ?? $input['location'] ?? '');
        $coverImage = trim($input['cover_image'] ?? $input['image'] ?? '');
        $leaderId = (int) ($input['leader_id'] ?? 0);
        $leaderName = trim($input['leader_name'] ?? '');

        if ($id <= 0 || $name === '') {
            api_response([
                'success' => false,
                'error' => 'A valid D-Group ID and group name are required.'
            ], 422);
        }

        $groupExists = $this->db->raw(
            "SELECT id FROM dgroups WHERE id = ? LIMIT 1",
            [$id]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$groupExists) {
            api_response([
                'success' => false,
                'error' => 'D-Group not found.'
            ], 404);
        }

        if ($leaderId <= 0 && $leaderName !== '') {
            $leader = $this->db->raw(
                "SELECT id FROM members WHERE full_name = ? LIMIT 1",
                [$leaderName]
            )->fetch(PDO::FETCH_ASSOC);

            if ($leader) {
                $leaderId = (int) $leader['id'];
            }
        }

        if ($leaderId > 0) {
            $leaderExists = $this->db->raw(
                "SELECT id FROM members WHERE id = ? LIMIT 1",
                [$leaderId]
            )->fetch(PDO::FETCH_ASSOC);

            if (!$leaderExists) {
                api_response([
                    'success' => false,
                    'error' => 'Selected leader was not found.'
                ], 422);
            }
        } else {
            $leaderId = null;
        }

        $this->db->raw(
            "UPDATE dgroups
             SET name = ?, leader_id = ?, venue = ?, schedule = ?, cover_image = ?
             WHERE id = ?",
            [
                $name,
                $leaderId,
                $venue !== '' ? $venue : null,
                $schedule !== '' ? $schedule : null,
                $coverImage !== '' ? $coverImage : null,
                $id
            ]
        );

        api_response([
            'success' => true,
            'message' => 'D-Group updated successfully.'
        ]);
    }

    /**
     * Delete a D-Group and its membership records.
     */
    public function delete()
    {
        require_admin_user();
        $input = api_input();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            api_response([
                'success' => false,
                'error' => 'D-Group ID is required.'
            ], 422);
        }

        $groupExists = $this->db->raw(
            "SELECT id FROM dgroups WHERE id = ? LIMIT 1",
            [$id]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$groupExists) {
            api_response([
                'success' => false,
                'error' => 'D-Group not found.'
            ], 404);
        }

        $this->db->raw(
            "DELETE FROM dgroup_members WHERE dgroup_id = ?",
            [$id]
        );

        $this->db->raw(
            "DELETE FROM dgroups WHERE id = ?",
            [$id]
        );

        api_response([
            'success' => true,
            'message' => 'D-Group deleted successfully.'
        ]);
    }
}
