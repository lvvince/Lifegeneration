<?php
defined("PREVENT_DIRECT_ACCESS") OR exit("No direct script access allowed");

class Api_members extends Controller {

    private $api;

    public function __construct()
    {
        parent::__construct();
        $this->call->library("Api");
        $this->api = $this->Api;
        $this->call->model("User_model");
        $this->call->model("Member_model");
        $this->call->model("Dgroup_model");
        $this->call->model("Ministry_model");
        $this->call->model("Admin_model");
    }

    // GET /api/members/dashboard
    public function dashboard()
    {
        $this->api->require_method("GET");
        $payload = $this->api->require_jwt();
        $userId  = (int)$payload["sub"];
        $role    = $payload["role"] ?? "user";

        $user = $this->User_model->get_by_id($userId);

        if (!$user && $role === "admin") {
            $admin = $this->Admin_model->get_by_id($userId);
            if ($admin) {
                $user = [
                    "id"       => $admin["id"],
                    "username" => $admin["username"],
                    "email"    => $admin["email"],
                    "role"     => "admin",
                ];
                $member = [
                    "id"              => $admin["id"],
                    "user_id"         => $admin["id"],
                    "member_id"       => "LG-ADMIN",
                    "full_name"       => $admin["full_name"],
                    "email"           => $admin["email"],
                    "avatar"          => $admin["avatar"] ?? null,
                    "membership_tier" => "Administrator",
                    "is_active"       => 1,
                    "joined_at"       => $admin["created_at"] ?? null,
                ];
            }
        }

        if (!$user) $this->api->respond_error("User not found.", 404);

        if (!isset($member)) {
            $member = $this->Member_model->get_by_user_id($userId);
        }

        // If no member profile, create a stub
        if (empty($member)) {
            $member_id = $this->Member_model->generate_member_id();
            $this->Member_model->create_member([
                "user_id"   => $userId,
                "member_id" => $member_id,
                "full_name" => $user["username"],
                "age"       => null,
                "address"   => null,
                "email"     => $user["email"],
                "is_active" => 1,
            ]);
            $member = $this->Member_model->get_by_user_id($userId);
        }

        $current_dgroup = null;
        $all_dgroups    = [];
        if (!empty($member["dgroup_id"])) {
            $current_dgroup = $this->Dgroup_model->get_by_id($member["dgroup_id"]);
            if ($current_dgroup) {
                $current_dgroup["member_count"] = $this->Dgroup_model->count_members($current_dgroup["id"]);
            }
        } else {
            $all_dgroups = $this->Dgroup_model->get_all_with_counts();
        }

        $current_ministry = null;
        if (!empty($member["ministry_id"])) {
            $current_ministry = $this->Ministry_model->get_by_id($member["ministry_id"]);
        }

        $this->call->model("Event_model");
        $upcoming_events = $this->Event_model->get_upcoming_events();
        $user_rsvps      = $this->Event_model->get_user_rsvps($userId);

        $this->call->model("Prayer_request_model");
        $prayer_requests = $this->Prayer_request_model->get_wall($userId, $user["role"] === "admin");

        $ministries = $this->Ministry_model->get_active_with_status($userId);
        $user_apps  = $this->Ministry_model->get_user_applications($userId);

        $admin_data = [];
        if (($user["role"] ?? "user") === "admin") {
            $all_members = $this->Member_model->get_all_members();
            $admin_data = [
                "all_members"          => $all_members,
                "total_members"        => count($all_members),
                "active_members"       => count(array_filter($all_members, fn($m) => !empty($m["is_active"]))),
                "all_dgroups_admin"    => $this->Dgroup_model->get_all_admin(),
                "all_ministries_admin" => $this->Ministry_model->get_all_admin(),
                "all_events_admin"     => $this->Event_model->get_all_events_admin(),
                "all_ministry_apps"    => $this->Ministry_model->get_all_applications(),
            ];
        }

        $this->api->respond(array_merge([
            "user"             => [
                "id"         => $user["id"],
                "username"   => $user["username"],
                "email"      => $user["email"],
                "role"       => $user["role"] ?? "user",
            ],
            "member"           => $member,
            "current_dgroup"   => $current_dgroup,
            "all_dgroups"      => $all_dgroups,
            "current_ministry" => $current_ministry,
            "ministries"       => $ministries,
            "user_apps"        => $user_apps,
            "upcoming_events"  => $upcoming_events,
            "user_rsvps"       => array_values($user_rsvps),
            "prayer_requests"  => $prayer_requests,
        ], $admin_data));
    }

    // POST /api/members/update-profile
    public function update_profile()
    {
        $this->api->require_method("POST");
        $payload = $this->api->require_jwt();
        $userId  = (int)$payload["sub"];

        $body      = $this->api->body();
        $full_name = trim($body["full_name"] ?? "");
        $email     = trim($body["email"] ?? "");
        $address   = trim($body["address"] ?? "");
        $age_raw   = trim($body["age"] ?? "");

        if (empty($full_name) || empty($email) || empty($address))
            $this->api->respond_error("Full name, email, and address are required.", 422);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL))
            $this->api->respond_error("Valid email required.", 422);
        $age = filter_var($age_raw, FILTER_VALIDATE_INT);
        if ($age === false || $age < 1 || $age > 125)
            $this->api->respond_error("Valid age required (1-125).", 422);
        if ($this->User_model->email_exists($email, $userId))
            $this->api->respond_error("Email already in use.", 409);
        if ($this->Member_model->email_exists($email, $userId))
            $this->api->respond_error("Email already linked to another membership.", 409);

        $this->Member_model->update_member($userId, [
            "full_name" => $full_name,
            "age"       => (int)$age,
            "address"   => $address,
            "email"     => $email,
        ]);
        $this->User_model->update_user($userId, ["email" => $email]);

        $member = $this->Member_model->get_by_user_id($userId);
        $this->api->respond(["message" => "Profile updated.", "member" => $member]);
    }

    // POST /api/members/upload-avatar  (multipart/form-data)
    public function upload_avatar()
    {
        $payload = $this->api->require_jwt();
        $userId  = (int)$payload["sub"];

        if (!isset($_FILES["avatar"]) || $_FILES["avatar"]["error"] !== UPLOAD_ERR_OK)
            $this->api->respond_error("Valid image file required.", 422);

        $file    = $_FILES["avatar"];
        $maxSize = 5 * 1024 * 1024;
        $exts    = ["jpg","jpeg","png","webp","gif"];

        if ($file["size"] > $maxSize)
            $this->api->respond_error("Max file size is 5MB.", 422);
        $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
        if (!in_array($ext, $exts))
            $this->api->respond_error("Invalid file type.", 422);
        if (!@getimagesize($file["tmp_name"]))
            $this->api->respond_error("Not a valid image.", 422);

        $uploadDir = ROOT_DIR . "public" . DIRECTORY_SEPARATOR . "uploads" . DIRECTORY_SEPARATOR . "avatars" . DIRECTORY_SEPARATOR;
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        $member = $this->Member_model->get_by_user_id($userId);
        if (!empty($member["avatar"])) {
            $oldPath = ROOT_DIR . "public" . DIRECTORY_SEPARATOR . ltrim(str_replace("/", DIRECTORY_SEPARATOR, $member["avatar"]), DIRECTORY_SEPARATOR);
            if (file_exists($oldPath)) @unlink($oldPath);
        }

        $newFileName = "avatar_" . $userId . "_" . time() . "." . $ext;
        if (move_uploaded_file($file["tmp_name"], $uploadDir . $newFileName)) {
            $avatarUrl = "uploads/avatars/" . $newFileName;
            $this->Member_model->update_member($userId, ["avatar" => $avatarUrl]);
            $this->api->respond(["message" => "Avatar updated.", "avatar" => $avatarUrl]);
        }
        $this->api->respond_error("Failed to save image.", 500);
    }

    // POST /api/members/remove-avatar
    public function remove_avatar()
    {
        $this->api->require_method("POST");
        $payload = $this->api->require_jwt();
        $userId  = (int)$payload["sub"];
        $member  = $this->Member_model->get_by_user_id($userId);
        if ($member && !empty($member["avatar"])) {
            $oldPath = ROOT_DIR . "public" . DIRECTORY_SEPARATOR . ltrim(str_replace("/", DIRECTORY_SEPARATOR, $member["avatar"]), DIRECTORY_SEPARATOR);
            if (file_exists($oldPath)) @unlink($oldPath);
            $this->Member_model->update_member($userId, ["avatar" => null]);
        }
        $this->api->respond(["message" => "Avatar removed."]);
    }

    // Admin: POST /api/members/toggle-status
    public function toggle_status()
    {
        $this->api->require_method("POST");
        $payload = $this->api->require_jwt();
        if (($payload["role"] ?? "user") !== "admin") $this->api->respond_error("Unauthorized.", 403);

        $body          = $this->api->body();
        $member_row_id = (int)($body["member_row_id"] ?? 0);
        $target = $this->db->table("members")->where("id", $member_row_id)->get();
        if (!$target) $this->api->respond_error("Member not found.", 404);

        $new_status = empty($target["is_active"]) ? 1 : 0;
        $this->Member_model->toggle_active($member_row_id, $new_status);
        $this->api->respond(["message" => "Status updated.", "is_active" => $new_status]);
    }

    // Admin: POST /api/members/update-role
    public function update_role()
    {
        $this->api->require_method("POST");
        $payload = $this->api->require_jwt();
        if (($payload["role"] ?? "user") !== "admin") $this->api->respond_error("Unauthorized.", 403);

        $body           = $this->api->body();
        $target_user_id = (int)($body["user_id"] ?? 0);
        $new_role       = trim($body["role"] ?? "");
        $allowed_roles  = ["user","moderator","admin"];

        if (!in_array($new_role, $allowed_roles)) $this->api->respond_error("Invalid role.", 422);
        if ($target_user_id === (int)$payload["sub"] && $new_role !== "admin")
            $this->api->respond_error("Cannot demote your own admin account.", 403);

        $this->User_model->update_user($target_user_id, ["role" => $new_role]);
        $this->api->respond(["message" => "Role updated to " . $new_role . "."]);
    }
}
