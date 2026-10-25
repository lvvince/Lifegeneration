<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Admin extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    private function count($sql)
    {
        $row = $this->db->raw($sql)->fetch(PDO::FETCH_ASSOC);
        return (int) ($row['total'] ?? 0);
    }

    public function stats()
    {
        require_admin_user();

        api_response([
            'members'              => $this->count("SELECT COUNT(*) AS total FROM members WHERE is_active = 1"),
            'events'               => $this->count("SELECT COUNT(*) AS total FROM events"),
            'dgroups'              => $this->count("SELECT COUNT(*) AS total FROM dgroups"),
            'ministries'           => $this->count("SELECT COUNT(*) AS total FROM ministries"),
            'pending_applications' => $this->count("SELECT COUNT(*) AS total FROM ministry_applications WHERE status = 'pending'"),
            'active_prayers'       => $this->count("SELECT COUNT(*) AS total FROM prayers WHERE is_answered = 0"),
            'checked_in_attendees' => $this->count("SELECT COUNT(*) AS total FROM attendance"),
        ]);
    }

    public function test_email()
    {
        require_admin_user();
        $input = api_input();
        $to = trim($input['to'] ?? $input['email'] ?? '');

        if (empty($to)) {
            api_response(['error' => 'Recipient email address is required.'], 422);
        }

        require_once dirname(dirname(__FILE__)) . '/helpers/mailer_helper.php';
        $mailer = new SmtpMailer();
        $res = $mailer->send(
            $to,
            "🧪 LifeGen Gmail SMTP Test Notification",
            "<div style='font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:500px;margin:20px auto;padding:24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.06);'><h2 style='color:#15803d;margin-top:0;'>Gmail SMTP Working! 🎉</h2><p style='color:#334155;line-height:1.6;'>This test email confirms that Gmail SMTP is successfully connected and transmitting emails on <b>Life Generation Calapan</b>.</p><p style='font-size:12px;color:#94a3b8;margin-bottom:0;'>Sent via port 465 (SSL).</p></div>"
        );

        api_response($res);
    }
}