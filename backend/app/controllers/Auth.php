<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Unified Auth Controller for Life Generation (lgy_db)
 * Supports both dedicated admins table and regular users/members.
 */
class Auth extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    /* ---------- Helpers ---------- */

    private function make_member_code()
    {
        $year = date('Y');
        for ($i = 0; $i < 20; $i++) {
            $code = 'LG-' . $year . '-' . str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
            $exists = $this->db->raw(
                "SELECT id FROM members WHERE member_id = ? OR member_code = ? LIMIT 1",
                [$code, $code]
            )->fetch(PDO::FETCH_ASSOC);
            if (!$exists) return $code;
        }
        return 'LG-' . $year . '-' . strtoupper(bin2hex(random_bytes(3)));
    }

    private function find_member($userId)
    {
        try {
            $m = $this->db->raw(
                "SELECT m.*,
                        d.name AS dgroup_name,
                        min.name AS ministry_name
                 FROM members m
                 LEFT JOIN dgroups d ON d.id = m.dgroup_id
                 LEFT JOIN ministries min ON min.id = m.ministry_id
                 WHERE m.user_id = ? LIMIT 1",
                [(int) $userId]
            )->fetch(PDO::FETCH_ASSOC);

            if ($m) {
                $code = $m['member_id'] ?? ($m['member_code'] ?? null);
                $m['member_id']   = $code;
                $m['member_code'] = $code;
            }
            return $m ?: null;
        } catch (Exception $e) {
            return null;
        }
    }

    private function user_payload($user, $member)
    {
        unset($user['password'], $user['password_hash']);
        $isAdmin = ($user['role'] ?? 'user') === 'admin';
        $code = $member['member_id'] ?? ($member['member_code'] ?? ($isAdmin ? 'LG-ADMIN' : null));

        $user['member_id']   = $code;
        $user['full_name']   = $member['full_name'] ?? ($user['full_name'] ?? $user['username']);
        $user['avatar']      = $member['avatar'] ?? ($user['avatar'] ?? null);
        $user['age']         = $member['age'] ?? ($user['age'] ?? null);
        $user['gender']      = $member['gender'] ?? ($user['gender'] ?? null);
        $user['address']     = $member['address'] ?? ($user['address'] ?? null);
        $user['dgroup_id']   = $member['dgroup_id'] ?? null;
        $user['ministry_id'] = $member['ministry_id'] ?? null;
        $user['joined_at']   = $member['joined_at'] ?? ($member['created_at'] ?? ($user['created_at'] ?? null));
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
        $hash    = hash('sha256', $refresh);
        $jti     = bin2hex(random_bytes(16));
        $expires = date('Y-m-d H:i:s', time() + 7 * 86400);

        try {
            $this->db->raw(
                "INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at, jti) VALUES (?, ?, ?, ?, ?)",
                [(int) $user['id'], $refresh, $hash, $expires, $jti]
            );
        } catch (Exception $e) {
            try {
                $this->db->raw(
                    "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
                    [(int) $user['id'], $refresh, $expires, $jti]
                );
            } catch (Exception $e2) {
                try {
                    $this->db->raw(
                        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
                        [(int) $user['id'], $hash, $expires]
                    );
                } catch (Exception $e3) {}
            }
        }

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

    private function create_account($username, $email, $passwordHash, $fullName, $age, $address, $avatar = null, $googleId = null, $gender = null)
    {
        $now = date('Y-m-d H:i:s');
        $code = $this->make_member_code();

        $this->db->raw(
            "INSERT INTO users (member_id, username, full_name, gender, email, password, password_hash, google_id, role, membership_tier, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', 'Standard Member', 1, ?)",
            [$code, $username, $fullName, $gender, $email, $passwordHash, $passwordHash, $googleId, $now]
        );
        $userId = (int) $this->db->last_id();

        try {
            $this->db->raw(
                "INSERT INTO members (user_id, member_id, member_code, full_name, gender, email, age, address, avatar, membership_tier, is_active, joined_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Standard Member', 1, ?)",
                [$userId, $code, $code, $fullName, $gender, $email, $age, $address, $avatar, $now]
            );
        } catch (Exception $e) {
            $this->db->raw("DELETE FROM users WHERE id = ?", [$userId]);
            throw $e;
        }

        return $userId;
    }

    /* ---------- Endpoints ---------- */

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

        // 1. Check dedicated admins table first
        try {
            $admin = $this->db->raw(
                "SELECT * FROM admins WHERE (username = ? OR email = ?) LIMIT 1",
                [$identity, $identity]
            )->fetch(PDO::FETCH_ASSOC);

            if ($admin && password_verify($password, $admin['password'] ?? '')) {
                if (isset($admin['is_active']) && (int) $admin['is_active'] === 0) {
                    api_response(['error' => 'Your administrator account is inactive. Please contact support.'], 403);
                }

                unset($admin['password']);
                $admin['role'] = 'admin';
                $admin['member_id'] = 'LG-ADMIN';
                $admin['member'] = null;

                $tokens = $this->issue_tokens($admin, 'LG-ADMIN');

                // Keep users table admin in sync if exists
                try {
                    $uAdmin = $this->db->raw("SELECT id FROM users WHERE email = ? LIMIT 1", [$admin['email']])->fetch(PDO::FETCH_ASSOC);
                    if ($uAdmin) {
                        $newHash = password_hash($password, PASSWORD_DEFAULT);
                        $this->db->raw("UPDATE users SET password = ?, password_hash = ? WHERE id = ?", [$newHash, $newHash, $uAdmin['id']]);
                    }
                } catch (Exception $e) {}

                api_response([
                    'success' => true,
                    'message' => 'Admin login successful.',
                    'user'    => $admin,
                    'tokens'  => $tokens,
                ]);
            }
        } catch (Exception $e) {}

        // 2. Check regular users table
        $user = $this->db->raw(
            "SELECT * FROM users WHERE (username = ? OR email = ?) LIMIT 1",
            [$identity, $identity]
        )->fetch(PDO::FETCH_ASSOC);

        $storedHash = $user['password'] ?? ($user['password_hash'] ?? '');
        if (!$user || $storedHash === '' || !password_verify($password, $storedHash)) {
            api_response(['error' => 'Invalid username/email or password.'], 401);
        }

        if ((int) ($user['is_active'] ?? 1) === 0) {
            api_response(['error' => 'Your account is inactive. Please contact support.'], 403);
        }

        $member = $this->find_member($user['id']);
        if ($member && (int) ($member['is_active'] ?? 1) === 0) {
            api_response(['error' => 'Your membership is inactive. Please contact support.'], 403);
        }

        if (password_needs_rehash($storedHash, PASSWORD_DEFAULT)) {
            $newH = password_hash($password, PASSWORD_DEFAULT);
            $this->db->raw("UPDATE users SET password = ?, password_hash = ? WHERE id = ?", [$newH, $newH, $user['id']]);
        }

        $code = $member['member_id'] ?? ($member['member_code'] ?? ($user['member_id'] ?? null));
        $tokens = $this->issue_tokens($user, $code);

        api_response([
            'success' => true,
            'message' => (($user['role'] ?? '') === 'admin') ? 'Admin login successful.' : 'Login successful.',
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

        // Gender validation
        $rawGender = trim($input['gender'] ?? '');
        $gender    = null;
        if (!empty($rawGender)) {
            $norm = ucfirst(strtolower($rawGender));
            if (in_array($norm, ['Male', 'Female'], true)) {
                $gender = $norm;
            }
        }

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
                $fullName, $age, $address, null, null, $gender
            );
        } catch (Exception $e) {
            api_response(['error' => 'Registration failed: ' . $e->getMessage()], 500);
        }

        $user   = $this->db->raw("SELECT * FROM users WHERE id = ?", [$userId])->fetch(PDO::FETCH_ASSOC);
        $member = $this->find_member($userId);
        $code   = $member['member_id'] ?? ($member['member_code'] ?? null);
        $tokens = $this->issue_tokens($user, $code);

        api_response([
            'success'   => true,
            'message'   => 'Account created successfully! Welcome to Life Generation.',
            'member_id' => $code,
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

        if (isset($g['email_verified']) && !in_array($g['email_verified'], [true, 'true', 1, '1'], true)) {
            api_response(['error' => 'Your Google email is not verified.'], 401);
        }

        // 1. Admin email? Do NOT sign in as the bare `admins` row: its id lives in a different
        //    table and collides with users.id, which made the account "self" for another member
        //    and blocked role changes. Instead, sign in through the linked member account and
        //    let users.role (the single source of truth) decide the permissions.
        $isAdminEmail = false;
        try {
            $admin = $this->db->raw("SELECT id, is_active FROM admins WHERE email = ? LIMIT 1", [$email])->fetch(PDO::FETCH_ASSOC);
            if ($admin) {
                if (isset($admin['is_active']) && (int) $admin['is_active'] === 0) {
                    api_response(['error' => 'Your administrator account is inactive.'], 403);
                }
                $isAdminEmail = true;
            }
        } catch (Exception $e) {}

        // 2. Regular users
        $user = $this->db->raw("SELECT * FROM users WHERE email = ? LIMIT 1", [$email])->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            try {
                $userId = $this->create_account(
                    $this->unique_username(explode('@', $email)[0]), $email,
                    password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                    $name, null, '', $picture, $googleId
                );
            } catch (Exception $e) {
                api_response(['error' => 'Failed to create user account: ' . $e->getMessage()], 500);
            }
            if ($isAdminEmail) {
                // First Google sign-in of a registered admin: grant admin once.
                // Later role changes are made in Members and are never overwritten here.
                $this->db->raw("UPDATE users SET role = 'admin' WHERE id = ?", [$userId]);
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

        $code = $member['member_id'] ?? ($member['member_code'] ?? ($user['member_id'] ?? null));
        $tokens = $this->issue_tokens($user, $code);

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

        // Check admins table
        if (($auth['role'] ?? '') === 'admin') {
            try {
                $admin = $this->db->raw("SELECT id, username, full_name, email, role, avatar, is_active FROM admins WHERE id = ? LIMIT 1", [(int) $auth['id']])->fetch(PDO::FETCH_ASSOC);
                if ($admin) {
                    $admin['member_id'] = 'LG-ADMIN';
                    $admin['member'] = null;
                    api_response(['user' => $admin]);
                }
            } catch (Exception $e) {}
        }

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

        $now  = date('Y-m-d H:i:s');
        $hash = hash('sha256', $token);

        // Check regular user tokens
        $record = $this->db->raw(
            "SELECT rt.id AS rt_id, u.*
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE (rt.token_hash = ? OR rt.token = ?) AND rt.expires_at > ? AND u.is_active = 1
             LIMIT 1",
            [$hash, $token, $now]
        )->fetch(PDO::FETCH_ASSOC);

        // Check admin tokens if not found in users
        if (!$record) {
            try {
                $aRecord = $this->db->raw(
                    "SELECT rt.id AS rt_id, a.id, a.username, a.email, 'admin' AS role, 'LG-ADMIN' AS member_id
                     FROM refresh_tokens rt
                     JOIN admins a ON a.id = rt.user_id
                     WHERE (rt.token_hash = ? OR rt.token = ?) AND rt.expires_at > ? AND a.is_active = 1
                     LIMIT 1",
                    [$hash, $token, $now]
                )->fetch(PDO::FETCH_ASSOC);
                if ($aRecord) $record = $aRecord;
            } catch (Exception $e) {}
        }

        if (!$record) {
            api_response(['error' => 'Invalid or expired refresh token.'], 401);
        }

        $member = $this->find_member($record['id']);
        $code = $record['member_id'] ?? ($member['member_id'] ?? ($member['member_code'] ?? null));

        $payload = [
            'sub'       => (int) $record['id'],
            'username'  => $record['username'],
            'email'     => $record['email'],
            'role'      => $record['role'],
            'member_id' => $code,
        ];
        if ($record['role'] === 'admin') $payload['is_admin'] = true;

        $newRefresh = bin2hex(random_bytes(32));
        $newHash    = hash('sha256', $newRefresh);
        $newExpires = date('Y-m-d H:i:s', time() + 7 * 86400);

        try {
            $this->db->raw(
                "UPDATE refresh_tokens SET token = ?, token_hash = ?, expires_at = ? WHERE id = ?",
                [$newRefresh, $newHash, $newExpires, $record['rt_id']]
            );
        } catch (Exception $e) {
            $this->db->raw(
                "UPDATE refresh_tokens SET token = ?, expires_at = ? WHERE id = ?",
                [$newRefresh, $newExpires, $record['rt_id']]
            );
        }

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
            $hash = hash('sha256', $token);
            $this->db->raw("DELETE FROM refresh_tokens WHERE token_hash = ? OR token = ?", [$hash, $token]);
        }
        api_response(['success' => true, 'message' => 'Logged out successfully.']);
    }
}