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
        $identity = trim($input['identity'] ?? $input['username'] ?? $input['email'] ?? '');
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

        $this->db->raw(
            "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
            [$user['id'], $refreshToken, $expiresAt, $jti]
        );

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

        // Check if email or username already taken
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

        $this->db->raw(
            "INSERT INTO refresh_tokens (user_id, token, expires_at, jti) VALUES (?, ?, ?, ?)",
            [$userId, $refreshToken, $expiresAt, $jti]
        );

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

    public function me()
    {
        $user = require_auth_user();
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