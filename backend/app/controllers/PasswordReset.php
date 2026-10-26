<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PasswordReset extends Controller
{
    const MIN_PASSWORD = 6; // dapat pareho sa Register.jsx at ResetPassword.jsx

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    /**
     * POST /api/auth/forgot-password
     * Always returns the same message so nobody can probe which emails exist.
     */
    public function forgot()
    {
        $input = api_input();
        $email = strtolower(trim($input['email'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            api_response(['error' => 'Enter a valid email address.'], 422);
        }

        $generic = [
            'success' => true,
            'message' => 'If an account exists for that email, a reset link has been sent.'
        ];

        $user = $this->db->raw(
            "SELECT u.id, u.email, u.username, m.full_name
             FROM users u
             LEFT JOIN members m ON m.user_id = u.id
             WHERE u.email = ? AND u.is_active = 1
             LIMIT 1",
            [$email]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            api_response($generic);
        }

        // Throttle: one link per minute per account
        $recent = $this->db->raw(
            "SELECT id FROM password_resets WHERE user_id = ? AND created_at > (NOW() - INTERVAL 60 SECOND) LIMIT 1",
            [$user['id']]
        )->fetch(PDO::FETCH_ASSOC);

        if ($recent) {
            api_response($generic);
        }

        // Invalidate older unused links, then create a fresh one (valid for 1 hour)
        $this->db->raw("DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL", [$user['id']]);

        $token = bin2hex(random_bytes(32));
        $this->db->raw(
            "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL 1 HOUR)",
            [$user['id'], hash('sha256', $token)]
        );

        // Build the link using FRONTEND_URL from backend/.env (falls back to Vite default)
        require_once dirname(dirname(__FILE__)) . '/helpers/mailer_helper.php';
        $env = SmtpMailer::loadEnv();
        $frontend = rtrim($env['FRONTEND_URL'] ?? 'http://localhost:5173', '/');
        $link = $frontend . '/reset-password?token=' . $token;

        try {
            $result = send_password_reset_email($user, $link);

            // Simulation mode (no SMTP_PASS yet): the email log can't hold the full link,
            // so write it to the PHP error log for local testing.
            if (is_array($result) && !empty($result['simulated'])) {
                error_log("[PasswordReset] SIMULATED email for {$email}: {$link}");
            }
        } catch (Throwable $e) {
            error_log('[PasswordReset] mail failed: ' . $e->getMessage());
        }

        api_response($generic);
    }

    /**
     * POST /api/auth/reset-password
     */
    public function reset()
    {
        $input = api_input();
        $token = trim($input['token'] ?? '');
        $password = (string) ($input['password'] ?? '');

        if ($token === '') {
            api_response(['error' => 'This reset link is invalid or has expired.'], 400);
        }
        if (strlen($password) < self::MIN_PASSWORD) {
            api_response(['error' => 'Password must be at least ' . self::MIN_PASSWORD . ' characters.'], 422);
        }

        $row = $this->db->raw(
            "SELECT id, user_id FROM password_resets
             WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
             LIMIT 1",
            [hash('sha256', $token)]
        )->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            api_response(['error' => 'This reset link is invalid or has expired. Please request a new one.'], 400);
        }

        $this->db->raw(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [password_hash($password, PASSWORD_DEFAULT), $row['user_id']]
        );

        $this->db->raw("UPDATE password_resets SET used_at = NOW() WHERE id = ?", [$row['id']]);

        // Sign the user out everywhere
        try {
            $this->db->raw("DELETE FROM refresh_tokens WHERE user_id = ?", [$row['user_id']]);
        } catch (Throwable $e) {}

        api_response(['success' => true, 'message' => 'Password updated. You can now log in.']);
    }
}