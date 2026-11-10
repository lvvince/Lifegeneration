<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Debug log: isinusulat diretso sa backend/runtime/auth-trace.txt
 * (hindi umaasa sa PHP error_log settings). Burahin ang laman ng file kapag ayos na.
 */
function auth_log($message) {
    @file_put_contents(
        dirname(__DIR__, 2) . '/runtime/auth-trace.txt',
        date('Y-m-d H:i:s') . ' ' . $message . PHP_EOL,
        FILE_APPEND
    );
}

/**
 * Send JSON response and terminate
 */
function api_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Parse input body whether sent as JSON or Form Data or URLSearchParams
 */
function api_input() {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
        // If form-encoded query string in raw input
        parse_str($raw, $parsed);
        if (!empty($parsed) && is_array($parsed)) {
            return array_merge($_POST, $parsed);
        }
    }
    return $_POST ?: [];
}

/**
 * Base64 URL safe encoding
 */
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Base64 URL safe decoding
 */
function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Generate JWT token
 */
function jwt_create($payload, $secret, $expiry_seconds = 3600) {
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + $expiry_seconds;

    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $b64Header = base64url_encode($header);
    $b64Payload = base64url_encode(json_encode($payload));

    $signature = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", $secret, true);
    $b64Signature = base64url_encode($signature);

    return "{$b64Header}.{$b64Payload}.{$b64Signature}";
}

/**
 * Verify and decode JWT token
 */
function jwt_verify($token, $secret) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    list($b64Header, $b64Payload, $b64Signature) = $parts;

    $expectedSig = base64url_encode(hash_hmac('sha256', "{$b64Header}.{$b64Payload}", $secret, true));
    if (!hash_equals($expectedSig, $b64Signature)) {
        return false;
    }

    $payload = json_decode(base64url_decode($b64Payload), true);
    if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
        return false;
    }

    return $payload;
}

/**
 * Get JWT Secret from environment or fallback
 * TODO: palitan ang fallback ng sarili mong random string bago i-deploy
 */
function get_jwt_secret() {
    return getenv('JWT_SECRET') ?: 'b734e59586efb98d7f37bcfd88d194675ae1b74466cce8f324b2b5ac446a6581';
}

/**
 * Get Bearer token from headers
 */
function get_bearer_token() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (empty($header) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (preg_match('/Bearer\s(\S+)/i', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

/**
 * Normalize a role string (lowercase, trimmed) so 'Admin ' still equals 'admin'
 */
function normalize_role($role) {
    return strtolower(trim((string) $role));
}

/**
 * Get authenticated user from Bearer token.
 * May hiwalay na `admins` table: admin token -> admins table (by id, then email/username),
 * fallback sa users table (users.role = 'admin' para sa admin na nasa users).
 */
function get_auth_user() {
    $token = get_bearer_token();
    if (!$token) {
        auth_log('get_auth_user: walang bearer token (hindi umaabot ang Authorization header)');
        return null;
    }

    $payload = jwt_verify($token, get_jwt_secret());
    if (!$payload || empty($payload['sub'])) {
        auth_log('get_auth_user: invalid/expired token o walang sub');
        return null;
    }

    $lava = lava_instance();
    $claimRole = normalize_role($payload['role'] ?? '');
    $isAdminToken = ($claimRole === 'admin') || !empty($payload['is_admin']);

    auth_log('get_auth_user: sub=' . $payload['sub']
        . ' role_claim=' . ($payload['role'] ?? 'none')
        . ' is_admin=' . (!empty($payload['is_admin']) ? 'yes' : 'no')
        . ' email=' . ($payload['email'] ?? 'none'));

    $adminSelect = "SELECT id, 'LG-ADMIN' AS member_id, username, full_name, email, role, is_active,
                           NULL AS member_record_id, NULL AS dgroup_id, NULL AS ministry_id,
                           NULL AS age, NULL AS address, avatar
                    FROM admins";

    // 1. Admin token -> admins table
    if ($isAdminToken) {
        try {
            // 1a. by id (sub)
            $aStmt = $lava->db->raw(
                $adminSelect . " WHERE id = ? AND is_active = 1 LIMIT 1",
                [$payload['sub']]
            );
            $admin = $aStmt->fetch(PDO::FETCH_ASSOC);

            // 1b. fallback: by email/username from the token (kapag nagbanggaan ang id)
            if (!$admin && (!empty($payload['email']) || !empty($payload['username']))) {
                $aStmt = $lava->db->raw(
                    $adminSelect . " WHERE (email = ? OR username = ?) AND is_active = 1 LIMIT 1",
                    [$payload['email'] ?? '', $payload['username'] ?? '']
                );
                $admin = $aStmt->fetch(PDO::FETCH_ASSOC);
            }

            if ($admin) {
                $admin['role'] = 'admin';
                auth_log('get_auth_user: admins row found id=' . $admin['id']);
                return $admin;
            }

            auth_log('get_auth_user: admin token pero walang active admins row para sa sub='
                . $payload['sub'] . ' email=' . ($payload['email'] ?? 'none'));

            // 1c. fallback: admin na nasa users table (users.role = 'admin') gamit ang email
            if (!empty($payload['email'])) {
                $uStmt = $lava->db->raw(
                    "SELECT u.id,
                            COALESCE(m.member_id, m.member_code) AS member_id,
                            u.username,
                            COALESCE(m.full_name, u.username) AS full_name,
                            u.email, u.role, u.is_active,
                            m.id AS member_record_id, m.age, m.address, m.avatar,
                            m.dgroup_id, m.ministry_id
                     FROM users u
                     LEFT JOIN members m ON m.user_id = u.id
                     WHERE u.email = ? AND u.role = 'admin' AND u.is_active = 1
                     LIMIT 1",
                    [$payload['email']]
                );
                $uAdmin = $uStmt->fetch(PDO::FETCH_ASSOC);
                if ($uAdmin) {
                    $uAdmin['role'] = 'admin';
                    auth_log('get_auth_user: admin found sa users table id=' . $uAdmin['id']);
                    return $uAdmin;
                }
            }
        } catch (Throwable $e) {
            auth_log('get_auth_user: admins lookup failed: ' . $e->getMessage());
        }
    }

    // 2. Regular user (users table)
    try {
        $stmt = $lava->db->raw(
            "SELECT u.id,
                    COALESCE(m.member_id, m.member_code) AS member_id,
                    u.username,
                    COALESCE(m.full_name, u.username) AS full_name,
                    u.email, u.role, u.is_active,
                    m.id AS member_record_id, m.age, m.address, m.avatar,
                    m.dgroup_id,
                    m.ministry_id
             FROM users u
             LEFT JOIN members m ON m.user_id = u.id
             WHERE u.id = ? AND u.is_active = 1
             LIMIT 1",
            [$payload['sub']]
        );
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            auth_log('get_auth_user: walang active users row para sa sub=' . $payload['sub']
                . ' role_claim=' . ($payload['role'] ?? 'none'));
            return null;
        }

        $user['role'] = normalize_role($user['role'] ?? 'user');
        auth_log('get_auth_user: users row found id=' . $user['id']
            . ' username=' . ($user['username'] ?? '?') . ' role=' . $user['role']);
        return $user;
    } catch (Throwable $e) {
        auth_log('get_auth_user: users lookup failed: ' . $e->getMessage());
        return null;
    }
}

/**
 * Require authenticated user, else respond 401
 */
function require_auth_user() {
    $user = get_auth_user();
    if (!$user) {
        api_response(['error' => 'Authentication required. Please log in.'], 401);
    }
    return $user;
}

/**
 * Require admin user, else respond 403 (admin lang; officers ay gumagamit ng require_staff_user)
 */
function require_admin_user() {
    $user = require_auth_user();

    if (normalize_role($user['role'] ?? '') !== 'admin') {
        auth_log('require_admin_user: DENIED id=' . ($user['id'] ?? '?')
            . ' username=' . ($user['username'] ?? '?')
            . ' role=' . ($user['role'] ?? '?'));
        api_response([
            'error' => 'Forbidden. Administrator privileges required.'
        ], 403);
    }

    return $user;
}

if (!function_exists('require_staff')) {
    function require_staff()
    {
        $user = require_auth_user();

        if (!in_array(normalize_role($user['role'] ?? ''), ['admin', 'officer', 'secretary'], true)) {
            auth_log('require_staff: DENIED id=' . ($user['id'] ?? '?') . ' role=' . ($user['role'] ?? '?'));
            api_response([
                'error' => 'Forbidden. Staff privileges required.'
            ], 403);
        }

        return $user;
    }
}


/**
 * Require staff (officer o admin), else respond 403
 * Para sa approve/reject at QR check-in na pwede sa officers.
 */
function require_staff_user() {
    $user = require_auth_user();
    if (!in_array(normalize_role($user['role'] ?? ''), ['admin', 'officer'], true)) {
        auth_log('require_staff_user: DENIED id=' . ($user['id'] ?? '?')
            . ' username=' . ($user['username'] ?? '?')
            . ' role=' . ($user['role'] ?? '?'));
        api_response(['error' => 'Forbidden. Officer or administrator privileges required.'], 403);
    }
    return $user;
}

/**
 * Generate unique Life Generation Member ID: LG-YYYY-XXXXX
 */
function generate_member_code($lava) {
    do {
        $year = date('Y');
        $rand = strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
        $code = "LG-{$year}-{$rand}";

        $check = $lava->db->raw("SELECT id FROM members WHERE member_code = ? LIMIT 1", [$code]);
    } while ($check->fetch());

    return $code;
}

/**
 * Upload an image to ImgBB cloud storage if IMGBB_API_KEY is configured.
 * Ideal for free cloud hosts with ephemeral filesystems (e.g., Render, Railway, Heroku).
 *
 * @param string $tmpPath Path to the local temporary file
 * @param string $mimeType Optional MIME type
 * @param string $origName Optional original file name
 * @return string|null Permanent image URL on success, null on failure or if not configured
 */
function upload_to_imgbb($tmpPath, $mimeType = 'image/jpeg', $origName = 'image.jpg') {
    $imgbbKey = getenv('IMGBB_API_KEY') ?: ($_ENV['IMGBB_API_KEY'] ?? null);
    if (!$imgbbKey || !function_exists('curl_init') || empty($tmpPath) || !file_exists($tmpPath)) {
        return null;
    }

    try {
        $ch = curl_init('https://api.imgbb.com/1/upload?key=' . urlencode($imgbbKey));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        if (class_exists('CURLFile')) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, [
                'image' => new CURLFile($tmpPath, $mimeType ?: 'image/jpeg', $origName ?: 'image.jpg')
            ]);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, [
                'image' => base64_encode(file_get_contents($tmpPath))
            ]);
        }
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        $res = curl_exec($ch);
        curl_close($ch);

        $json = json_decode((string) $res, true);
        if (!empty($json['data']['url'])) {
            return $json['data']['url'];
        }
    } catch (\Throwable $e) {
        // Fallback to local storage on any error
    }

    return null;
}
