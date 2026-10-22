<?php
defined("PREVENT_DIRECT_ACCESS") OR exit("No direct script access allowed");

class Api_auth extends Controller {

    private $api;

    public function __construct()
    {
        parent::__construct();
        $this->call->library("Api");
        $this->api = $this->Api;
        $this->call->model("User_model");
        $this->call->model("Member_model");
        $this->call->model("Admin_model");
    }

    // POST /api/auth/login
    public function login()
    {
        $this->api->require_method("POST");
        $this->api->rate_limit("login", 10, 60);

        $body       = $this->api->body();
        $identifier = trim($body["identifier"] ?? "");
        $password   = $body["password"] ?? "";

        if (empty($identifier) || empty($password)) {
            $this->api->respond_error("Identifier and password are required.", 422);
        }

        // 1. Check dedicated admins table first
        $admin = $this->Admin_model->find_by_identifier($identifier);
        if ($admin && password_verify($password, $admin["password"] ?? "")) {
            if (isset($admin["is_active"]) && (int)$admin["is_active"] === 0) {
                $this->api->respond_error("Your administrator account is inactive. Contact support.", 403);
            }
            if (password_needs_rehash($admin["password"], PASSWORD_DEFAULT)) {
                $this->Admin_model->update_admin($admin["id"], [
                    "password" => password_hash($password, PASSWORD_DEFAULT)
                ]);
            }
            $tokens = $this->api->issue_tokens([
                "id"       => $admin["id"],
                "role"     => "admin",
                "is_admin" => true,
            ]);
            return $this->api->respond([
                "message" => "Admin login successful.",
                "user"    => [
                    "id"          => $admin["id"],
                    "username"    => $admin["username"],
                    "email"       => $admin["email"],
                    "role"        => "admin",
                    "member_id"   => "LG-ADMIN",
                    "full_name"   => $admin["full_name"],
                    "avatar"      => $admin["avatar"] ?? null,
                    "dgroup_id"   => null,
                    "ministry_id" => null,
                ],
                "tokens"  => $tokens,
            ]);
        }

        // 2. Check regular users table
        $user = $this->User_model->find_by_identifier($identifier);

        if (!$user || !password_verify($password, $user["password"] ?? "")) {
            $this->api->respond_error("Invalid credentials.", 401);
        }

        if (isset($user["is_active"]) && (int)$user["is_active"] === 0) {
            $this->api->respond_error("Your account is inactive. Contact support.", 403);
        }

        if (password_needs_rehash($user["password"], PASSWORD_DEFAULT)) {
            $this->User_model->update_user($user["id"], [
                "password" => password_hash($password, PASSWORD_DEFAULT)
            ]);
        }

        $member = $this->Member_model->get_by_user_id($user["id"]);

        if ($member && (int)($member["is_active"] ?? 1) === 0) {
            $this->api->respond_error("Your membership is inactive. Contact support.", 403);
        }

        $tokens = $this->api->issue_tokens([
            "id"   => $user["id"],
            "role" => $user["role"] ?? "user",
        ]);

        $this->api->respond([
            "message" => "Login successful.",
            "user"    => [
                "id"         => $user["id"],
                "username"   => $user["username"],
                "email"      => $user["email"],
                "role"       => $user["role"] ?? "user",
                "member_id"  => $member["member_id"] ?? null,
                "full_name"  => $member["full_name"] ?? $user["username"],
                "avatar"     => $member["avatar"] ?? null,
                "dgroup_id"  => $member["dgroup_id"] ?? null,
                "ministry_id"=> $member["ministry_id"] ?? null,
            ],
            "tokens"  => $tokens,
        ]);
    }

    // POST /api/auth/register
    public function register()
    {
        $this->api->require_method("POST");
        $this->api->rate_limit("register", 5, 60);

        $body      = $this->api->body();
        $full_name = trim($body["full_name"] ?? "");
        $email     = trim($body["email"] ?? "");
        $address   = trim($body["address"] ?? "");
        $age_raw   = trim($body["age"] ?? "");
        $password  = $body["password"] ?? "";
        $password_confirm = $body["password_confirm"] ?? "";

        if (empty($full_name)) $this->api->respond_error("Full name is required.", 422);
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL))
            $this->api->respond_error("A valid email is required.", 422);
        if (empty($address)) $this->api->respond_error("Address is required.", 422);

        $age = filter_var($age_raw, FILTER_VALIDATE_INT);
        if ($age === false || $age < 1 || $age > 125)
            $this->api->respond_error("Enter a valid age (1-125).", 422);

        if (strlen($password) < 6)
            $this->api->respond_error("Password must be at least 6 characters.", 422);
        if ($password !== $password_confirm)
            $this->api->respond_error("Passwords do not match.", 422);

        if ($this->User_model->email_exists($email))
            $this->api->respond_error("That email is already registered.", 409);
        if ($this->Member_model->email_exists($email))
            $this->api->respond_error("That email is already linked to a membership.", 409);

        $email_prefix = explode("@", $email)[0] ?? "";
        $username = preg_replace("/[^a-zA-Z0-9_]/", "", strtolower($email_prefix));
        if (empty($username)) $username = "member" . rand(1000, 9999);
        if ($this->User_model->username_exists($username)) {
            $username = $username . rand(10, 9999);
        }

        $user_created = $this->User_model->create_user([
            "username"  => $username,
            "email"     => $email,
            "password"  => $password,
            "role"      => "user",
            "is_active" => 1,
        ]);

        if (!$user_created) {
            $this->api->respond_error("Registration failed. Try again.", 500);
        }

        $new_user_id = is_numeric($user_created) && (int)$user_created > 0
            ? (int)$user_created
            : $this->db->last_id();

        $member_id = $this->Member_model->generate_member_id();

        $member_created = $this->Member_model->create_member([
            "user_id"   => $new_user_id,
            "member_id" => $member_id,
            "full_name" => $full_name,
            "age"       => (int)$age,
            "address"   => $address,
            "email"     => $email,
            "is_active" => 1,
        ]);

        if (!$member_created) {
            $this->db->table("users")->where("id", $new_user_id)->delete();
            $this->api->respond_error("Registration failed (profile). Try again.", 500);
        }

        $this->api->respond([
            "message"   => "Registration successful!",
            "member_id" => $member_id,
        ], 201);
    }

    // GET /api/auth/me
    public function me()
    {
        $this->api->require_method("GET");
        $payload = $this->api->require_jwt();

        $userId = (int)$payload["sub"];
        $role   = $payload["role"] ?? "user";

        // Admin account lookup
        if ($role === "admin") {
            $admin = $this->Admin_model->get_by_id($userId);
            if ($admin) {
                return $this->api->respond([
                    "user" => [
                        "id"          => $admin["id"],
                        "username"    => $admin["username"],
                        "email"       => $admin["email"],
                        "role"        => "admin",
                        "member_id"   => "LG-ADMIN",
                        "full_name"   => $admin["full_name"],
                        "avatar"      => $admin["avatar"] ?? null,
                        "age"         => null,
                        "address"     => null,
                        "dgroup_id"   => null,
                        "ministry_id" => null,
                        "joined_at"   => $admin["created_at"] ?? null,
                        "is_active"   => $admin["is_active"] ?? 1,
                    ]
                ]);
            }
        }

        $user = $this->User_model->get_by_id($userId);
        if (!$user) $this->api->respond_error("User not found.", 404);

        $member = $this->Member_model->get_by_user_id($userId);

        $this->api->respond([
            "user" => [
                "id"         => $user["id"],
                "username"   => $user["username"],
                "email"      => $user["email"],
                "role"       => $user["role"] ?? "user",
                "member_id"  => $member["member_id"] ?? null,
                "full_name"  => $member["full_name"] ?? $user["username"],
                "avatar"     => $member["avatar"] ?? null,
                "age"        => $member["age"] ?? null,
                "address"    => $member["address"] ?? null,
                "dgroup_id"  => $member["dgroup_id"] ?? null,
                "ministry_id"=> $member["ministry_id"] ?? null,
                "joined_at"  => $member["joined_at"] ?? null,
                "is_active"  => $member["is_active"] ?? 1,
            ]
        ]);
    }

    // POST /api/auth/refresh
    public function refresh()
    {
        $this->api->require_method("POST");
        $this->api->rate_limit("refresh", 30, 60);

        $body = $this->api->body();
        $refresh_token = $body["refresh_token"] ?? $_COOKIE["refresh_token"] ?? "";
        if (empty($refresh_token)) $this->api->respond_error("Refresh token required.", 422);
        $this->api->refresh_access_token($refresh_token);
    }

    // POST /api/auth/logout
    public function logout()
    {
        $this->api->require_method("POST");
        $body = $this->api->body();
        $refresh_token = $body["refresh_token"] ?? $_COOKIE["refresh_token"] ?? "";
        if (!empty($refresh_token)) {
            $this->api->revoke_refresh_token($refresh_token);
        }
        $this->api->respond(["message" => "Logged out successfully."]);
    }

    // POST /api/auth/google
    public function google()
    {
        $this->api->require_method("POST");
        $this->api->rate_limit("google_auth", 15, 60);

        $body = $this->api->body();
        $credential = trim($body["credential"] ?? "");

        if (empty($credential)) {
            $this->api->respond_error("Google credential token is required.", 422);
        }

        // Verify token with Google tokeninfo endpoint
        $google_url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $google_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        $resp = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200 || !$resp) {
            $this->api->respond_error("Failed to verify Google token with Google servers.", 401);
        }

        $payload = json_decode($resp, true);
        if (!$payload || empty($payload["email"])) {
            $this->api->respond_error("Invalid Google account data received.", 401);
        }

        // Validate Audience matches our Client ID
        $expected_client_id = getenv("GOOGLE_CLIENT_ID") ?: "464887399568-1fpv2kl0l9r37gb5mtpg2553k8dg0j9j.apps.googleusercontent.com";
        if (!empty($payload["aud"]) && $payload["aud"] !== $expected_client_id) {
            $this->api->respond_error("Google Client ID audience mismatch.", 401);
        }

        // Check email verified
        if (isset($payload["email_verified"]) && $payload["email_verified"] != "true" && $payload["email_verified"] !== true) {
            $this->api->respond_error("Your Google email is not verified.", 403);
        }

        $email   = strtolower(trim($payload["email"]));
        $name    = trim($payload["name"] ?? ($payload["given_name"] ?? explode("@", $email)[0]));
        $picture = $payload["picture"] ?? null;

        // 1. Check if email belongs to an Admin (dedicated admins table)
        $admin = $this->Admin_model->find_by_identifier($email);
        if ($admin) {
            if (isset($admin["is_active"]) && (int)$admin["is_active"] === 0) {
                $this->api->respond_error("Your administrator account is inactive. Contact support.", 403);
            }
            if (!empty($picture) && empty($admin["avatar"])) {
                $this->Admin_model->update_admin($admin["id"], ["avatar" => $picture]);
                $admin["avatar"] = $picture;
            }
            $tokens = $this->api->issue_tokens([
                "id"       => $admin["id"],
                "role"     => "admin",
                "is_admin" => true,
            ]);
            return $this->api->respond([
                "message" => "Admin Google login successful.",
                "user"    => [
                    "id"          => $admin["id"],
                    "username"    => $admin["username"],
                    "email"       => $admin["email"],
                    "role"        => "admin",
                    "member_id"   => "LG-ADMIN",
                    "full_name"   => $admin["full_name"],
                    "avatar"      => $admin["avatar"] ?? $picture,
                    "dgroup_id"   => null,
                    "ministry_id" => null,
                ],
                "tokens"  => $tokens,
            ]);
        }

        // 2. Check regular users table
        $user = $this->User_model->find_by_identifier($email);

        if (!$user) {
            // Auto-register new user
            $base_username = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '', explode("@", $email)[0]));
            if (empty($base_username)) $base_username = "member";

            // Ensure unique username
            $username = $base_username;
            $counter = 1;
            while ($this->User_model->username_exists($username)) {
                $username = $base_username . $counter;
                $counter++;
            }

            // Create user row with secure random password
            $random_password = bin2hex(random_bytes(16));
            $user_id = $this->User_model->create_user([
                "username"   => $username,
                "email"      => $email,
                "password"   => $random_password,
                "role"       => "user",
                "is_active"  => 1,
                "created_at" => date("Y-m-d H:i:s"),
            ]);

            if (!$user_id) {
                $user_id = $this->User_model->last_insert_id();
            }

            if (!$user_id) {
                $this->api->respond_error("Failed to create user account.", 500);
            }

            // Create Member profile
            $this->Member_model->create_member([
                "user_id"         => $user_id,
                "full_name"       => $name,
                "email"           => $email,
                "avatar"          => $picture,
                "membership_tier" => "Standard Member",
                "is_active"       => 1,
                "joined_at"       => date("Y-m-d H:i:s"),
            ]);

            $user = $this->User_model->get_by_id($user_id);
        }

        if (isset($user["is_active"]) && (int)$user["is_active"] === 0) {
            $this->api->respond_error("Your account has been deactivated. Contact an administrator.", 403);
        }

        $member = $this->Member_model->get_by_user_id($user["id"]);
        if ($member && (int)($member["is_active"] ?? 1) === 0) {
            $this->api->respond_error("Your membership is inactive. Contact support.", 403);
        }

        // If member doesn't have an avatar yet but Google provides one, update it
        if ($member && empty($member["avatar"]) && !empty($picture)) {
            $this->Member_model->update_member($user["id"], ["avatar" => $picture]);
            $member["avatar"] = $picture;
        }

        $tokens = $this->api->issue_tokens([
            "id"   => $user["id"],
            "role" => $user["role"] ?? "user",
        ]);

        $this->api->respond([
            "message" => "Google sign-in successful.",
            "user"    => [
                "id"          => $user["id"],
                "username"    => $user["username"],
                "email"       => $user["email"],
                "role"        => $user["role"] ?? "user",
                "member_id"   => $member["member_id"] ?? null,
                "full_name"   => $member["full_name"] ?? $name,
                "avatar"      => $member["avatar"] ?? $picture,
                "dgroup_id"   => $member["dgroup_id"] ?? null,
                "ministry_id" => $member["ministry_id"] ?? null,
            ],
            "tokens"  => $tokens,
        ]);
    }
}
