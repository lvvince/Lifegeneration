<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Auth controller para sa lgy_db:
 *  users:          id, username, email, password_hash, google_id, role('user','admin'), is_active, created_at
 *  members:        id, user_id, member_code, full_name, age, address, avatar, status, created_at, is_active
 *  refresh_tokens: id, user_id, token_hash, expires_at
 * Walang hiwalay na admins table: role = 'admin' sa users ang admin.
 */
class Auth extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    /* ---------- helpers ---------- */

    private function make_member_code()
    {
        $year = date('Y');
        for ($i = 0; $i < 20; $i++) {
            $code = 'LG-' . $year . '-' . str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
            $exists = $this->db->raw(
                "SELECT id FROM members WHERE member_code = ? LIMIT 1", [$code]
            )->fetch(PDO::FETCH_ASSOC);
            if (!$exists) return $code;
        }
        return 'LG-' . $year . '-' . strtoupper(bin2hex(random_bytes(3)));
    }

    private function find_member($userId)
    {
        $m = $this->db->raw(
            "SELECT m.*, m.member_code AS member_id,
                    (SELECT dm.dgroup_id FROM dgroup_members dm
                     WHERE dm.member_id = m.id AND dm.status = 'active' LIMIT 1) AS dgroup_id,
                    (SELECT ma.ministry_id FROM ministry_applications ma
                     WHERE ma.member_id = m.id AND ma.status = 'approved' LIMIT 1) AS ministry_id
             FROM members m WHERE m.user_id = ? LIMIT 1",
            [(int) $userId]
        )->fetch(PDO::FETCH_ASSOC);
        return $m ?: null;
    }

    private function user_payload($user, $member)
    {
        unset($user['password_hash']);
        $isAdmin = ($user['role'] ?? 'user') === 'admin';
        $user['member_id']   = $member['member_code'] ?? ($isAdmin ? 'LG-ADMIN' : null);
        $user['full_name']   = $member['full_name'] ?? $user['username'];
        $user['avatar']      = $member['avatar'] ?? null;
        $user['age']         = $member['age'] ?? null;
        $user['address']     = $member['address'] ?? null;
        $user['dgroup_id']   = $member['dgroup_id'] ?? null;
        $user['ministry_id'] = $member['ministry_id'] ?? null;
        $user['joined_at']   = $member['created_at'] ?? ($user['created_at'] ?? null);
        $user['member']      = $member;
        return $user;
    }

    private function issue_tokens($user, $memberCode)
    {
        $payload = [
            'sub'       => (int) $user['id'],
            'username'  => $user['username'],
            'email'     => $user['email'],
            'role'      => $user['role'] ?? 'user',
            'member_id' => $memberCode,
        ];
        if (($user['role'] ?? 'user') === 'admin') {
            $payload['is_admin'] = true;
        }

        $access  = jwt_create($payload, get_jwt_secret(), 86400);
        $refresh = bin2hex(random_bytes(32));

        $this->db->raw(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
            [(int) $user['id'], hash('sha256', $refresh), date('Y-m-d H:i:s', time() + 7 * 86400)]
        );

        return [
            'access_token'  => $access,
            'refresh_token' => $refresh,
            'token_type'    => 'Bearer',
        ];
    }

    private function unique_username($base)
    {
        $base = preg_replace('/[^a-zA-Z0-9_]/', '', strtolower($base));
        if ($base === '') $base = 'member';
        $username = $base;
        $n = 1;
        while ($this->db->raw("SELECT id FROM users WHERE username = ? LIMIT 1", [$username])->fetch()) {
            $username = $base . $n++;
        }
        return $username;
    }

    private function create_account($username, $email, $passwordHash, $fullName, $age, $address, $avatar = null, $googleId = null)
    {
        $now = date('Y-m-d H:i:s');

        $this->db->raw(
            "INSERT INTO users (username, email, password_hash, google_id, role, is_active, created_at)
             VALUES (?, ?, ?, ?, 'user', 1, ?)",
            [$username, $email, $passwordHash, $googleId, $now]
        );
        $userId = (int) $this->db->last_id();

        try {
            $code = $this->make_member_code();
            $this->db->raw(
                "INSERT INTO members (user_id, member_code, full_name, age, address, avatar, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
                [$userId, $code, $fullName, $age, $address, $avatar, $now]
            );
        } catch (Exception $e) {
            $this->db->raw("DELETE FROM users WHERE id = ?", [$userId]);
            throw $e;
        }

        return $userId;
    }

    /* ---------- endpoints ---------- */

    public function login()
    {
        $input = api_input();
        $identity = trim($input['identity'] ?? $input['username'] ?? $input['email'] ?? $input['identifier'] ?? '');
        $password = $input['password'] ?? '';

        $errors = [];
        if ($identity === '') $errors['identity'] = 'Username or email is required.';
        if ($password === '') $errors['password'] = 'Password is required.';
        if ($errors) {
            api_response(['error' => 'Please fill in all required fields.', 'fields' => $errors], 422);
        }

        $user = $this->db->raw(
            "SELECT * FROM users WHERE (username = ? OR email = ?) LIMIT 1",
            [$identity, $identity]
        )->fetch(PDO::FETCH_ASSOC);

        $hash = $user['password_hash'] ?? '';
        if (!$user || $hash === '' || !password_verify($password, $hash)) {
            api_response(['error' => 'Invalid username/email or password.'], 401);
        }

        if ((int) ($user['is_active'] ?? 1) === 0) {
            api_response(['error' => 'Your account is inactive. Please contact support.'], 403);
        }

        $member = $this->find_member($user['id']);
        if ($member && (int) ($member['is_active'] ?? 1) === 0) {
            api_response(['error' => 'Your membership is inactive. Please contact support.'], 403);
        }

        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            $this->db->raw("UPDATE users SET password_hash = ? WHERE id = ?",
                [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }

        $tokens = $this->issue_tokens($user, $member['member_code'] ?? null);

        api_response([
            'success' => true,
            'message' => ($user['role'] === 'admin') ? 'Admin login successful.' : 'Login successful.',
            'user'    => $this->user_payload($user, $member),
            'tokens'  => $tokens,
        ]);
    }

    public function register()
    {
        $input    = api_input();
        $fullName = trim($input['full_name'] ?? '');
        $email    = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $confirm  = $input['password_confirm'] ?? null;
        $address  = trim($input['address'] ?? '');
        $age      = (isset($input['age']) && $input['age'] !== '') ? (int) $input['age'] : null;
        $username = trim($input['username'] ?? '');

        if ($username === '' && $email !== '') {
            $username = explode('@', $email)[0];
        }

        $errors = [];
        if ($fullName === '') $errors['full_name'] = 'Full name is required.';
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'A valid email address is required.';
        if (strlen($password) < 6) $errors['password'] = 'Password must be at least 6 characters.';
        if ($confirm !== null && $confirm !== $password) $errors['password_confirm'] = 'Passwords do not match.';
        if ($age !== null && ($age < 1 || $age > 125)) $errors['age'] = 'Enter a valid age (1-125).';
        if ($errors) {
            api_response(['error' => 'Validation error.', 'fields' => $errors], 422);
        }

        $dup = $this->db->raw("SELECT id FROM users WHERE email = ? LIMIT 1", [$email])->fetch();
        if ($dup) {
            api_response(['error' => 'Email address is already registered.',
                          'fields' => ['email' => 'Email is already taken.']], 409);
        }

        $username = $this->unique_username($username);

        try {
            $userId = $this->create_account(
                $username, $email, password_hash($password, PASSWORD_DEFAULT),
                $fullName, $age, $address
            );
        } catch (Exception $e) {
            api_response(['error' => 'Registration failed. Please try again.'], 500);
        }

        $user   = $this->db->raw("SELECT * FROM users WHERE id = ?", [$userId])->fetch(PDO::FETCH_ASSOC);
        $member = $this->find_member($userId);
        $tokens = $this->issue_tokens($user, $member['member_code'] ?? null);

        api_response([
            'success'   => true,
            'message'   => 'Account created successfully! Welcome to Life Generation.',
            'member_id' => $member['member_code'] ?? null,
            'user'      => $this->user_payload($user, $member),
            'tokens'    => $tokens,
        ], 201);
    }

    public function google()
    {
        $input = api_input();
        $credential = trim($input['credential'] ?? '');

        if ($credential === '') {
            api_response(['error' => 'Google credential token is required.'], 422);
        }

        $ch = curl_init("https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code !== 200 || !$resp) {
            api_response(['error' => 'Failed to verify Google token with Google servers.'], 401);
        }

        $g = json_decode($resp, true);
        if (!$g || empty($g['email'])) {
            api_response(['error' => 'Invalid Google account data received.'], 401);
        }

        $clientId = getenv('GOOGLE_CLIENT_ID');
        if ($clientId && !empty($g['aud']) && $g['aud'] !== $clientId) {
            api_response(['error' => 'Google Client ID audience mismatch.'], 401);
        }

        $email    = strtolower(trim($g['email']));
        $name     = trim($g['name'] ?? ($g['given_name'] ?? explode('@', $email)[0]));
        $picture  = $g['picture'] ?? null;
        $googleId = $g['sub'] ?? null;

        $user = $this->db->raw("SELECT * FROM users WHERE email = ? LIMIT 1", [$email])->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            try {
                $userId = $this->create_account(
                    $this->unique_username(explode('@', $email)[0]), $email,
                    password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                    $name, null, '', $picture, $googleId
                );
            } catch (Exception $e) {
                api_response(['error' => 'Failed to create user account.'], 500);
            }
            $user = $this->db->raw("SELECT * FROM users WHERE id = ?", [$userId])->fetch(PDO::FETCH_ASSOC);
        } elseif (empty($user['google_id']) && $googleId) {
            $this->db->raw("UPDATE users SET google_id = ? WHERE id = ?", [$googleId, $user['id']]);
        }

        if ((int) ($user['is_active'] ?? 1) === 0) {
            api_response(['error' => 'Your account has been deactivated. Contact an administrator.'], 403);
        }

        $member = $this->find_member($user['id']);
        if ($member && (int) ($member['is_active'] ?? 1) === 0) {
            api_response(['error' => 'Your membership is inactive. Please contact support.'], 403);
        }

        if ($member && empty($member['avatar']) && $picture) {
            $this->db->raw("UPDATE members SET avatar = ? WHERE id = ?", [$picture, $member['id']]);
            $member['avatar'] = $picture;
        }

        $tokens = $this->issue_tokens($user, $member['member_code'] ?? null);

        api_response([
            'success' => true,
            'message' => 'Google sign-in successful.',
            'user'    => $this->user_payload($user, $member),
            'tokens'  => $tokens,
        ]);
    }

    public function me()
    {
        $auth = require_auth_user();
        $user = $this->db->raw("SELECT * FROM users WHERE id = ? LIMIT 1", [(int) $auth['id']])->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            api_response(['error' => 'User not found.'], 404);
        }
        $member = $this->find_member($user['id']);
        api_response(['user' => $this->user_payload($user, $member)]);
    }

    public function refresh()
    {
        $input = api_input();
        $token = trim($input['refresh_token'] ?? '');
        if ($token === '') {
            api_response(['error' => 'Refresh token required.'], 400);
        }

        $record = $this->db->raw(
            "SELECT rt.id AS rt_id, u.*
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = ? AND rt.expires_at > ? AND u.is_active = 1
             LIMIT 1",
            [hash('sha256', $token), date('Y-m-d H:i:s')]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            api_response(['error' => 'Invalid or expired refresh token.'], 401);
        }

        $member = $this->find_member($record['id']);

        $payload = [
            'sub'       => (int) $record['id'],
            'username'  => $record['username'],
            'email'     => $record['email'],
            'role'      => $record['role'],
            'member_id' => $member['member_code'] ?? null,
        ];
        if ($record['role'] === 'admin') $payload['is_admin'] = true;

        $newRefresh = bin2hex(random_bytes(32));
        $this->db->raw(
            "UPDATE refresh_tokens SET token_hash = ?, expires_at = ? WHERE id = ?",
            [hash('sha256', $newRefresh), date('Y-m-d H:i:s', time() + 7 * 86400), $record['rt_id']]
        );

        api_response([
            'tokens' => [
                'access_token'  => jwt_create($payload, get_jwt_secret(), 86400),
                'refresh_token' => $newRefresh,
                'token_type'    => 'Bearer',
            ]
        ]);
    }

    public function logout()
    {
        $input = api_input();
        $token = trim($input['refresh_token'] ?? '');
        if ($token !== '') {
            $this->db->raw("DELETE FROM refresh_tokens WHERE token_hash = ?", [hash('sha256', $token)]);
        }
        api_response(['success' => true, 'message' => 'Logged out successfully.']);
    }
}