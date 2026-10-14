<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Auth Controller
 * ---------------
 * Handles user registration, login, logout and token refresh.
 *
 * Routes:
 *   POST /api/auth/register   → Create a new account
 *   POST /api/auth/login      → Login and receive JWT + refresh token
 *   POST /api/auth/logout     → Invalidate refresh token
 *   POST /api/auth/refresh    → Exchange refresh token for new JWT
 *   GET  /api/auth/me         → Get authenticated user profile (requires JWT)
 */
class Auth extends Controller {

    public function __construct()
    {
        parent::__construct();
        $this->call->model('User', 'user');
        $this->call->library('api');

        // All responses are JSON
        header('Content-Type: application/json; charset=utf-8');
    }

    // ── POST /api/auth/register ───────────────────────────────────────────────

    public function register()
    {
        $this->_only_post();

        $body = $this->_json_body();

        $username = trim($body['username'] ?? '');
        $email    = trim($body['email']    ?? '');
        $password = trim($body['password'] ?? '');

        // ── Validation ──
        $errors = [];

        if (empty($username)) {
            $errors[] = 'Username is required.';
        } elseif (strlen($username) < 3) {
            $errors[] = 'Username must be at least 3 characters.';
        }

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'A valid email address is required.';
        }

        if (empty($password)) {
            $errors[] = 'Password is required.';
        } elseif (strlen($password) < 6) {
            $errors[] = 'Password must be at least 6 characters.';
        }

        if (!empty($errors)) {
            return $this->respond(['status' => 'error', 'errors' => $errors], 422);
        }

        // ── Uniqueness checks ──
        if ($this->user->username_exists($username)) {
            return $this->respond(['status' => 'error', 'message' => 'Username is already taken.'], 409);
        }

        if ($this->user->email_exists($email)) {
            return $this->respond(['status' => 'error', 'message' => 'Email is already registered.'], 409);
        }

        // ── Create user ──
        $id = $this->user->register($username, $email, $password, 'user');

        if (!$id) {
            return $this->respond(['status' => 'error', 'message' => 'Registration failed. Please try again.'], 500);
        }

        return $this->respond([
            'status'  => 'success',
            'message' => 'Account created successfully. You can now log in.',
            'user'    => [
                'id'       => $id,
                'username' => $username,
                'email'    => $email,
                'role'     => 'user',
            ],
        ], 201);
    }

    // ── POST /api/auth/login ─────────────────────────────────────────────────

    public function login()
    {
        $this->_only_post();

        $body     = $this->_json_body();
        $email    = trim($body['email']    ?? '');
        $password = trim($body['password'] ?? '');

        if (empty($email) || empty($password)) {
            return $this->respond(['status' => 'error', 'message' => 'Email and password are required.'], 422);
        }

        // ── Find user ──
        $user = $this->user->find_by_email($email);

        if (!$user || !$this->user->verify_password($password, $user->password)) {
            return $this->respond(['status' => 'error', 'message' => 'Invalid email or password.'], 401);
        }

        if (!$user->is_active) {
            return $this->respond(['status' => 'error', 'message' => 'Your account is inactive. Please contact support.'], 403);
        }

        // ── Issue tokens using Api library ──
        $tokens = $this->api->issue_tokens([
            'id'     => $user->id,
            'role'   => $user->role,
            'scopes' => ['read'],
        ]);

        return $this->respond([
            'status'        => 'success',
            'message'       => 'Login successful.',
            'access_token'  => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'token_type'    => 'Bearer',
            'user'          => [
                'id'       => $user->id,
                'username' => $user->username,
                'email'    => $user->email,
                'role'     => $user->role,
            ],
        ]);
    }

    // ── POST /api/auth/logout ─────────────────────────────────────────────────

    public function logout()
    {
        $this->_only_post();

        $body         = $this->_json_body();
        $refreshToken = trim($body['refresh_token'] ?? '');

        if (!empty($refreshToken)) {
            $this->api->revoke_refresh_token($refreshToken);
        }

        return $this->respond([
            'status'  => 'success',
            'message' => 'Logged out successfully.',
        ]);
    }

    // ── POST /api/auth/refresh ────────────────────────────────────────────────

    public function refresh()
    {
        $this->_only_post();

        $body         = $this->_json_body();
        $refreshToken = trim($body['refresh_token'] ?? '');

        if (empty($refreshToken)) {
            return $this->respond(['status' => 'error', 'message' => 'Refresh token is required.'], 422);
        }

        // refresh_access_token echoes and exits internally
        $this->api->refresh_access_token($refreshToken);
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────────

    public function me()
    {
        $jwt = $this->api->require_jwt();

        $user = $this->user->find_by_id((int) $jwt['sub']);

        if (!$user) {
            return $this->respond(['status' => 'error', 'message' => 'User not found.'], 404);
        }

        return $this->respond([
            'status' => 'success',
            'user'   => [
                'id'         => $user->id,
                'username'   => $user->username,
                'email'      => $user->email,
                'role'       => $user->role,
                'is_active'  => (bool) $user->is_active,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function _only_post(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->respond(['status' => 'error', 'message' => 'Method not allowed.'], 405);
        }
    }

    private function _json_body(): array
    {
        $raw = file_get_contents('php://input');
        return json_decode($raw, true) ?? [];
    }

    private function respond(array $data, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}
?>
