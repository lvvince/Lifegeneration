<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

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
 * Get authenticated user from Bearer token (lgy_db schema)
 * Walang hiwalay na admins table: ang admin ay user na role = 'admin'.
 */
function get_auth_user() {
    $token = get_bearer_token();
    if (!$token) {
        return null;
    }

    $payload = jwt_verify($token, get_jwt_secret());
    if (!$payload || empty($payload['sub'])) {
        return null;
    }

    $lava = lava_instance();

    $stmt = $lava->db->raw(
        "SELECT u.id, m.member_code AS member_id, u.username,
                COALESCE(m.full_name, u.username) AS full_name,
                u.email, u.role, u.is_active,
                m.id AS member_record_id, m.age, m.address, m.avatar,
                (SELECT dm.dgroup_id FROM dgroup_members dm
                 WHERE dm.member_id = m.id AND dm.status = 'active' LIMIT 1) AS dgroup_id,
                (SELECT ma.ministry_id FROM ministry_applications ma
                 WHERE ma.member_id = m.id AND ma.status = 'approved' LIMIT 1) AS ministry_id
         FROM users u
         LEFT JOIN members m ON m.user_id = u.id
         WHERE u.id = ? AND u.is_active = 1
         LIMIT 1",
        [$payload['sub']]
    );

    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    return $user ?: null;
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

    if ($user['role'] !== 'admin') {
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

        if (!in_array($user['role'], ['admin', 'officer', 'secretary'], true)) {
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
    if (!in_array($user['role'], ['admin', 'officer'], true)) {
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