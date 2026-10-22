<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Auth extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function login()
    {
        $input = api_input();
        $identity = trim($input['identity'] ?? $input['username'] ?? $input['email'] ?? $input['identifier'] ?? '');
        $password = $input['password'] ?? '';

        $errors = [];
        if (empty($identity)) {
            $errors['identity'] = 'Username or email is required.';
        }
        if (empty($password)) {
            $errors['password'] = 'Password is required.';
        }

        if (!empty($errors)) {
            api_response(['error' => 'Please fill in all required fields.', 'fields' => $errors], 422);
        }

        // 1. Check dedicated admins table first
        $aStmt = $this->db->raw(
            "SELECT * FROM admins WHERE (username = ? OR email = ?) LIMIT 1",
            [$identity, $identity]
        );
        $admin = $aStmt->fetch(PDO::FETCH_ASSOC);

        if ($admin && password_verify($password, $admin['password'] ?? '')) {
            if (isset($admin['is_active']) && (int)$admin['is_active'] === 0) {
                api_response(['error' => 'Your administrator account is inactive. Please contact support.'], 403);
            }

            unset($admin['password']);
            $admin['role'] = 'admin';
            $admin['member_id'] = 'LG-ADMIN';
            $admin['member'] = null;

            $secret = get_jwt_secret();
            $payload = [
                'sub'       => (int) $admin['id'],
                'username'  => $admin['username'],
                'email'     => $admin['email'],
                'role'      => 'admin',
                'is_admin'  => true,
                'member_id' => 'LG-ADMIN'
            ];

            $accessToken = jwt_create($payload, $secret, 86400);
            $refreshToken = bin2hex(random_bytes(32));

            try {
                $expiresAt = date('Y-m-d H:i:s', time() + (7 * 86400));
                $jti = bin2hex(random_bytes(16));
                $this->db->raw(
                    "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
                    [$admin['id'], $refreshToken, $expiresAt, $jti]
                );
            } catch (Exception $e) {}

            api_response([
                'success' => true,
                'message' => 'Admin login successful.',
                'user'    => $admin,
                'tokens'  => [
                    'access_token'  => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_type'    => 'Bearer'
                ]
            ]);
        }

        // 2. Check regular users table
        $stmt = $this->db->raw(
            "SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1",
            [$identity, $identity]
        );
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $storedHash = $user['password'] ?? $user['password_hash'] ?? '';
        if (!$user || empty($storedHash) || !password_verify($password, $storedHash)) {
            api_response(['error' => 'Invalid username/email or password.'], 401);
        }

        // Fetch member profile
        $mStmt = $this->db->raw("SELECT * FROM members WHERE user_id = ? LIMIT 1", [$user['id']]);
        $member = $mStmt->fetch(PDO::FETCH_ASSOC) ?: null;

        // Build tokens
        $secret = get_jwt_secret();
        $payload = [
            'sub'       => (int) $user['id'],
            'username'  => $user['username'],
            'email'     => $user['email'],
            'role'      => $user['role'],
            'member_id' => $user['member_id'] ?? ($member['member_id'] ?? null)
        ];

        $accessToken = jwt_create($payload, $secret, 86400); // 24 hours
        $refreshToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + (7 * 86400));
        $jti = bin2hex(random_bytes(16));

        try {
            $this->db->raw(
                "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
                [$user['id'], $refreshToken, $expiresAt, $jti]
            );
        } catch (Exception $e) {}

        unset($user['password'], $user['password_hash']);
        $user['member'] = $member;

        api_response([
            'success' => true,
            'message' => 'Login successful.',
            'user'    => $user,
            'tokens'  => [
                'access_token'  => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type'    => 'Bearer'
            ]
        ]);
    }

    public function register()
    {
        $input = api_input();
        $fullName = trim($input['full_name'] ?? '');
        $email    = strtolower(trim($input['email'] ?? ''));
        $password = $input['password'] ?? '';
        $address  = trim($input['address'] ?? '');
        $age      = !empty($input['age']) ? (int) $input['age'] : null;
        $username = trim($input['username'] ?? '');

        // Auto-generate username from email if not provided
        if (empty($username) && !empty($email)) {
            $parts = explode('@', $email);
            $username = preg_replace('/[^a-zA-Z0-9_]/', '', $parts[0]);
        }

        $errors = [];
        if (empty($fullName)) {
            $errors['full_name'] = 'Full name is required.';
        }
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email address is required.';
        }
        if (empty($password) || strlen($password) < 6) {
            $errors['password'] = 'Password must be at least 6 characters.';
        }
        if (empty($username)) {
            $errors['username'] = 'Username is required.';
        }

        if (!empty($errors)) {
            api_response(['error' => 'Validation error.', 'fields' => $errors], 422);
        }

        // Check if email or username already taken in users or admins
        $dupStmt = $this->db->raw(
            "SELECT id, email, username FROM users WHERE email = ? OR username = ? LIMIT 1",
            [$email, $username]
        );
        $existing = $dupStmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            if (strtolower($existing['email']) === $email) {
                api_response(['error' => 'Email address is already registered.', 'fields' => ['email' => 'Email is already taken.']], 409);
            }
            if (strtolower($existing['username']) === strtolower($username)) {
                $username = $username . '_' . rand(100, 999);
            }
        }

        // Generate unique member code format LG-YYYY-XXXXX
        $memberId = generate_member_code($this);
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $now = date('Y-m-d H:i:s');

        // Insert into users
        $this->db->raw(
            "INSERT INTO users (member_id, username, full_name, email, address, age, password, role, membership_tier, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 'Standard Member', 1, ?)",
            [$memberId, $username, $fullName, $email, $address, $age, $passwordHash, $now]
        );
        $userId = (int) $this->db->last_id();

        // Insert linked record in members
        $this->db->raw(
            "INSERT INTO members (user_id, member_id, full_name, email, age, address, membership_tier, is_active, joined_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Standard Member', 1, ?)",
            [$userId, $memberId, $fullName, $email, $age, $address, $now]
        );
        $memberRecordId = (int) $this->db->last_id();

        // Fetch created user & member
        $userStmt = $this->db->raw("SELECT id, member_id, username, full_name, email, address, age, role, membership_tier, is_active, created_at FROM users WHERE id = ?", [$userId]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        $memStmt = $this->db->raw("SELECT * FROM members WHERE id = ?", [$memberRecordId]);
        $member = $memStmt->fetch(PDO::FETCH_ASSOC);
        $user['member'] = $member;

        // Create JWT tokens
        $secret = get_jwt_secret();
        $payload = [
            'sub'       => $userId,
            'username'  => $username,
            'email'     => $email,
            'role'      => 'user',
            'member_id' => $memberId
        ];
        $accessToken = jwt_create($payload, $secret, 86400);
        $refreshToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + (7 * 86400));
        $jti = bin2hex(random_bytes(16));

        try {
            $this->db->raw(
                "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
                [$userId, $refreshToken, $expiresAt, $jti]
            );
        } catch (Exception $e) {}

        api_response([
            'success' => true,
            'message' => 'Account created successfully! Welcome to Life Generation.',
            'user'    => $user,
            'tokens'  => [
                'access_token'  => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type'    => 'Bearer'
            ]
        ], 201);
    }

    public function google()
    {
        $input = api_input();
        $credential = trim($input['credential'] ?? '');

        if (empty($credential)) {
            api_response(['error' => 'Google credential token is required.'], 422);
        }

        // Verify token with Google tokeninfo endpoint
        $google_url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $google_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $resp = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200 || !$resp) {
            api_response(['error' => 'Failed to verify Google token with Google servers.'], 401);
        }

        $payload = json_decode($resp, true);
        if (!$payload || empty($payload['email'])) {
            api_response(['error' => 'Invalid Google account data received.'], 401);
        }

        $email   = strtolower(trim($payload['email']));
        $name    = trim($payload['name'] ?? ($payload['given_name'] ?? explode('@', $email)[0]));
        $picture = $payload['picture'] ?? null;

        // 1. Check dedicated admins table first
        $aStmt = $this->db->raw("SELECT * FROM admins WHERE email = ? LIMIT 1", [$email]);
        $admin = $aStmt->fetch(PDO::FETCH_ASSOC);

        if ($admin) {
            if (isset($admin['is_active']) && (int)$admin['is_active'] === 0) {
                api_response(['error' => 'Your administrator account is inactive. Please contact support.'], 403);
            }
            if (!empty($picture) && empty($admin['avatar'])) {
                $this->db->raw("UPDATE admins SET avatar = ? WHERE id = ?", [$picture, $admin['id']]);
                $admin['avatar'] = $picture;
            }

            unset($admin['password']);
            $admin['role'] = 'admin';
            $admin['member_id'] = 'LG-ADMIN';
            $admin['member'] = null;

            $secret = get_jwt_secret();
            $jwtPayload = [
                'sub'       => (int) $admin['id'],
                'username'  => $admin['username'],
                'email'     => $admin['email'],
                'role'      => 'admin',
                'is_admin'  => true,
                'member_id' => 'LG-ADMIN'
            ];
            $accessToken = jwt_create($jwtPayload, $secret, 86400);
            $refreshToken = bin2hex(random_bytes(32));

            try {
                $expiresAt = date('Y-m-d H:i:s', time() + (7 * 86400));
                $jti = bin2hex(random_bytes(16));
                $this->db->raw(
                    "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
                    [$admin['id'], $refreshToken, $expiresAt, $jti]
                );
            } catch (Exception $e) {}

            api_response([
                'success' => true,
                'message' => 'Admin Google login successful.',
                'user'    => $admin,
                'tokens'  => [
                    'access_token'  => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_type'    => 'Bearer'
                ]
            ]);
        }

        // 2. Check regular users table
        $uStmt = $this->db->raw("SELECT * FROM users WHERE email = ? LIMIT 1", [$email]);
        $user = $uStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Auto-register new user
            $base_username = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '', explode('@', $email)[0]));
            if (empty($base_username)) $base_username = 'user';

            $username = $base_username;
            $counter = 1;
            while ($this->db->raw("SELECT id FROM users WHERE username = ? LIMIT 1", [$username])->fetch()) {
                $username = $base_username . $counter;
                $counter++;
            }

            $memberId = generate_member_code($this);
            $randomPass = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
            $now = date('Y-m-d H:i:s');

            $this->db->raw(
                "INSERT INTO users (member_id, username, full_name, email, password, role, membership_tier, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, 'user', 'Standard Member', 1, ?)",
                [$memberId, $username, $name, $email, $randomPass, $now]
            );
            $userId = (int) $this->db->last_id();

            $this->db->raw(
                "INSERT INTO members (user_id, member_id, full_name, email, avatar, membership_tier, is_active, joined_at)
                 VALUES (?, ?, ?, ?, ?, 'Standard Member', 1, ?)",
                [$userId, $memberId, $name, $email, $picture, $now]
            );

            $uStmt = $this->db->raw("SELECT * FROM users WHERE id = ?", [$userId]);
            $user = $uStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (isset($user['is_active']) && (int)$user['is_active'] === 0) {
            api_response(['error' => 'Your account has been deactivated. Contact an administrator.'], 403);
        }

        // Fetch or update member profile
        $mStmt = $this->db->raw("SELECT * FROM members WHERE user_id = ? LIMIT 1", [$user['id']]);
        $member = $mStmt->fetch(PDO::FETCH_ASSOC) ?: null;

        if ($member && empty($member['avatar']) && !empty($picture)) {
            $this->db->raw("UPDATE members SET avatar = ? WHERE id = ?", [$picture, $member['id']]);
            $member['avatar'] = $picture;
        }

        unset($user['password'], $user['password_hash']);
        $user['member'] = $member;

        $secret = get_jwt_secret();
        $jwtPayload = [
            'sub'       => (int) $user['id'],
            'username'  => $user['username'],
            'email'     => $user['email'],
            'role'      => $user['role'] ?? 'user',
            'member_id' => $user['member_id'] ?? ($member['member_id'] ?? null)
        ];

        $accessToken = jwt_create($jwtPayload, $secret, 86400);
        $refreshToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + (7 * 86400));
        $jti = bin2hex(random_bytes(16));

        try {
            $this->db->raw(
                "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
                [$user['id'], $refreshToken, $expiresAt, $jti]
            );
        } catch (Exception $e) {}

        api_response([
            'success' => true,
            'message' => 'Google sign-in successful.',
            'user'    => $user,
            'tokens'  => [
                'access_token'  => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type'    => 'Bearer'
            ]
        ]);
    }

    public function me()
    {
        $user = require_auth_user();
        if (!empty($user['role']) && $user['role'] === 'admin') {
            $user['member'] = null;
            api_response(['user' => $user]);
        }

        $mStmt = $this->db->raw(
            "SELECT m.*, d.name AS dgroup_name, min.name AS ministry_name
             FROM members m
             LEFT JOIN dgroups d ON d.id = m.dgroup_id
             LEFT JOIN ministries min ON min.id = m.ministry_id
             WHERE m.user_id = ?
             LIMIT 1",
            [$user['id']]
        );
        $member = $mStmt->fetch(PDO::FETCH_ASSOC);
        $user['member'] = $member;

        api_response(['user' => $user]);
    }

    public function refresh()
    {
        $input = api_input();
        $token = trim($input['refresh_token'] ?? '');
        if (empty($token)) {
            api_response(['error' => 'Refresh token required.'], 400);
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $this->db->raw(
            "SELECT rt.*, u.id AS uid, u.username, u.email, u.role, u.member_id
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token = ? AND rt.expires_at > ? AND u.is_active = 1
             LIMIT 1",
            [$token, $now]
        );
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$record) {
            $aStmt = $this->db->raw(
                "SELECT rt.*, a.id AS uid, a.username, a.email, a.role, 'LG-ADMIN' AS member_id
                 FROM refresh_tokens rt
                 JOIN admins a ON a.id = rt.user_id
                 WHERE rt.token = ? AND rt.expires_at > ? AND a.is_active = 1
                 LIMIT 1",
                [$token, $now]
            );
            $record = $aStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$record) {
            api_response(['error' => 'Invalid or expired refresh token.'], 401);
        }

        // Rotate token
        $secret = get_jwt_secret();
        $payload = [
            'sub'       => (int) $record['uid'],
            'username'  => $record['username'],
            'email'     => $record['email'],
            'role'      => $record['role'],
            'member_id' => $record['member_id']
        ];
        $newAccessToken = jwt_create($payload, $secret, 86400);
        $newRefreshToken = bin2hex(random_bytes(32));
        $newExpiresAt = date('Y-m-d H:i:s', time() + (7 * 86400));

        $this->db->raw(
            "UPDATE refresh_tokens SET token = ?, expires_at = ? WHERE id = ?",
            [$newRefreshToken, $newExpiresAt, $record['id']]
        );

        api_response([
            'tokens' => [
                'access_token'  => $newAccessToken,
                'refresh_token' => $newRefreshToken,
                'token_type'    => 'Bearer'
            ]
        ]);
    }

    public function logout()
    {
        $input = api_input();
        $token = trim($input['refresh_token'] ?? '');
        if (!empty($token)) {
            $this->db->raw("DELETE FROM refresh_tokens WHERE token = ?", [$token]);
        }
        api_response(['success' => true, 'message' => 'Logged out successfully.']);
    }
}