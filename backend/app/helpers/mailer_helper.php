<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Lightweight, robust SMTP client for Gmail SSL (Port 465) / TLS (Port 587)
 * Requires zero external composer packages.
 */
class SmtpMailer
{
    private $host;
    private $port;
    private $user;
    private $pass;
    private $fromEmail;
    private $fromName;
    private $timeout;

    public function __construct()
    {
        $env = self::loadEnv();
        $this->host      = $env['SMTP_HOST'] ?? 'smtp.gmail.com';
        $this->port      = (int) ($env['SMTP_PORT'] ?? 465);
        $this->user      = $env['SMTP_USER'] ?? '';
        $this->pass      = $env['SMTP_PASS'] ?? '';
        $this->fromEmail = $env['SMTP_FROM_EMAIL'] ?? ($this->user ?: 'lifegencalapan@gmail.com');
        $this->fromName  = $env['SMTP_FROM_NAME'] ?? 'Life Generation Calapan';
        $this->timeout   = 10;
    }

    /**
     * Parses backend/.env safely (cached per request)
     */
    public static function loadEnv()
    {
        static $cache = null;
        if ($cache !== null) return $cache;

        // Try multiple candidate paths for .env (works both under Apache and CLI)
        $candidates = [
            dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . '.env',          // app/helpers -> backend/.env
            dirname(dirname(dirname(dirname(__FILE__)))) . DIRECTORY_SEPARATOR . '.env',  // one extra level up
        ];
        if (!empty($_SERVER['DOCUMENT_ROOT'])) {
            $candidates[] = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '.env';
        }

        $path = '';
        foreach ($candidates as $c) {
            $c = realpath($c) ?: $c;
            if (file_exists($c)) { $path = $c; break; }
        }
        if ($path === '') return $cache = [];

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $env = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            $pos = strpos($line, '=');
            if ($pos !== false) {
                $key = trim(substr($line, 0, $pos));
                $val = trim(substr($line, $pos + 1));
                $val = trim($val, "\"'\r\n ");
                $env[$key] = $val;
            }
        }
        return $cache = $env;
    }

    /**
     * Converts an HTML email into readable plain text
     * (drops <style>/<head>, keeps link URLs, so the text part never shows CSS)
     */
    public static function htmlToText($html)
    {
        $t = preg_replace('#<(head|style|script)\b[^>]*>.*?</\1>#is', '', (string) $html);
        $t = preg_replace('#<br\s*/?>#i', "\n", $t);
        $t = preg_replace('#</(p|div|tr|h[1-6]|li)>#i', "\n", $t);
        $t = preg_replace_callback(
            '#<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>#is',
            function ($m) {
                $url   = html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');
                $label = trim(strip_tags($m[2]));
                return ($label !== '' && $label !== $url) ? "{$label}: {$url}" : $url;
            },
            $t
        );
        $t = html_entity_decode(strip_tags($t), ENT_QUOTES, 'UTF-8');
        $t = preg_replace('/[ \t]+/', ' ', $t);
        $t = preg_replace('/ *\n */', "\n", $t);
        $t = preg_replace('/\n{3,}/', "\n\n", $t);
        return trim($t);
    }

    private static function crlf($s)
    {
        return preg_replace('/\r\n|\r|\n/', "\r\n", (string) $s);
    }

    /**
     * Sends an email via Gmail SMTP (or logs to file if credentials are not set)
     * @return array [ 'success' => bool, 'message' => string, 'simulated' => bool ]
     */
    public function send($to, $subject, $htmlBody)
    {
        $to = trim($to);
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Invalid recipient email address.', 'simulated' => false];
        }

        // If no SMTP password configured, run in safe simulation mode
        if (empty($this->user) || empty($this->pass) || $this->pass === 'your-app-password') {
            self::logEmail($to, $subject, $htmlBody, 'SIMULATED (No Gmail App Password set in .env)');
            return [
                'success'   => true,
                'message'   => 'Email logged in simulation mode (Set SMTP_PASS in .env to send real emails).',
                'simulated' => true
            ];
        }

        $socketHost = ($this->port === 465) ? "ssl://{$this->host}" : $this->host;
        $socket = @fsockopen($socketHost, $this->port, $errno, $errstr, $this->timeout);

        if (!$socket) {
            $err = "SMTP Connection failed: {$errstr} ({$errno})";
            self::logEmail($to, $subject, $htmlBody, "FAILED: {$err}");
            return ['success' => false, 'message' => $err, 'simulated' => false];
        }

        stream_set_timeout($socket, $this->timeout);

        try {
            $ehloHost = gethostname() ?: 'localhost';

            $this->readResponse($socket, '220');
            $this->sendCommand($socket, "EHLO {$ehloHost}", '250');

            // STARTTLS for port 587
            if ($this->port === 587) {
                $this->sendCommand($socket, "STARTTLS", '220');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new Exception("STARTTLS negotiation failed");
                }
                $this->sendCommand($socket, "EHLO {$ehloHost}", '250');
            }

            // AUTH LOGIN
            $this->sendCommand($socket, "AUTH LOGIN", '334');
            $this->sendCommand($socket, base64_encode($this->user), '334');
            $this->sendCommand($socket, base64_encode($this->pass), '235');

            // Envelope
            $this->sendCommand($socket, "MAIL FROM:<{$this->fromEmail}>", '250');
            $this->sendCommand($socket, "RCPT TO:<{$to}>", '250');
            $this->sendCommand($socket, "DATA", '354');

            // Headers
            $boundary       = '=_lg_' . bin2hex(random_bytes(12));
            $domain         = substr(strrchr($this->fromEmail, '@') ?: '@localhost', 1);
            $messageId      = '<' . bin2hex(random_bytes(12)) . '@' . $domain . '>';
            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

            $headers  = "From: =?UTF-8?B?" . base64_encode($this->fromName) . "?= <{$this->fromEmail}>\r\n";
            $headers .= "To: <{$to}>\r\n";
            $headers .= "Subject: {$encodedSubject}\r\n";
            $headers .= "Date: " . date('r') . "\r\n";
            $headers .= "Message-ID: {$messageId}\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
            $headers .= "X-Mailer: LifeGen Calapan Mailer\r\n";

            // Body: plain-text part + HTML part (CRLF line endings required for quoted-printable)
            $html  = self::crlf($htmlBody);
            $plain = self::crlf(self::htmlToText($htmlBody));

            $body  = "--{$boundary}\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $body .= quoted_printable_encode($plain) . "\r\n";

            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $body .= quoted_printable_encode($html) . "\r\n";

            $body .= "--{$boundary}--\r\n";

            // Dot-stuffing: a line that starts with "." must be doubled (RFC 5321)
            $body = str_replace("\r\n.", "\r\n..", $body);

            // Send headers + blank line + body, then the end-of-data marker
            fwrite($socket, $headers . "\r\n" . $body . ".\r\n");
            $this->readResponse($socket, '250');

            // Quit cleanly. The server may close first, so never throw here
            try {
                fwrite($socket, "QUIT\r\n");
                @fgets($socket, 512);
            } catch (Throwable $qe) {}

            if (is_resource($socket)) fclose($socket);
            self::logEmail($to, $subject, $htmlBody, 'SUCCESS: Sent via Gmail SMTP');
            return ['success' => true, 'message' => 'Email sent successfully via Gmail SMTP!', 'simulated' => false];

        } catch (Throwable $e) {
            if (is_resource($socket)) fclose($socket);
            self::logEmail($to, $subject, $htmlBody, "FAILED: " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage(), 'simulated' => false];
        }
    }

    private function sendCommand($socket, $cmd, $expectedCode)
    {
        fwrite($socket, $cmd . "\r\n");
        return $this->readResponse($socket, $expectedCode);
    }

    private function readResponse($socket, $expectedCode)
    {
        $response = '';
        while (($line = fgets($socket, 512)) !== false) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }

        $code = substr($response, 0, 3);
        if ($code !== (string) $expectedCode) {
            throw new Exception("SMTP Error: Expected {$expectedCode}, got: " . trim($response));
        }
        return $response;
    }

    private static function logEmail($to, $subject, $htmlBody, $status)
    {
        try {
            $logDir = dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'logs';
            if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
            $logFile = $logDir . DIRECTORY_SEPARATOR . 'email.log';

            $entry = "=================================================================\n"
                   . "Timestamp: " . date('Y-m-d H:i:s') . "\n"
                   . "To:        {$to}\n"
                   . "Subject:   {$subject}\n"
                   . "Status:    {$status}\n"
                   . "Body Snippet:\n" . substr(self::htmlToText($htmlBody), 0, 400) . "...\n";

            // Local testing only: in simulation mode keep the links (e.g. password reset)
            // so they can be opened without a real SMTP account.
            if (strpos($status, 'SIMULATED') === 0 && preg_match_all('#href="([^"]+)"#i', $htmlBody, $m)) {
                $links = array_unique(array_map('html_entity_decode', $m[1]));
                $entry .= "Links:\n" . implode("\n", $links) . "\n";
            }

            @file_put_contents($logFile, $entry . "\n", FILE_APPEND);
        } catch (Throwable $e) {}
    }
}

/* ══════════════════════════════════════════════════════════════════
   SHARED HELPERS FOR EMAIL TEMPLATES
══════════════════════════════════════════════════════════════════ */

function mail_h($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

/** Escaped display name: full_name -> username -> fallback (no undefined-key warnings) */
function mail_name($data, $fallback = 'Member')
{
    $n = trim((string) ($data['full_name'] ?? ''));
    if ($n === '') $n = trim((string) ($data['username'] ?? ''));
    return mail_h($n !== '' ? $n : $fallback);
}

/** Returns an escaped http(s) URL, or '' if the value isn't a safe web link */
function mail_url($url)
{
    $url = trim((string) $url);
    return preg_match('#^https?://#i', $url) ? mail_h($url) : '';
}

function mail_fail($message)
{
    return ['success' => false, 'message' => $message, 'simulated' => false];
}

/** Label/value box. Table-based so it renders in Gmail/Outlook. Values are escaped here. */
function mail_meta_box(array $rows)
{
    $out = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:20px 0;">';
    foreach ($rows as $label => $value) {
        $out .= '<tr>'
              . '<td valign="top" style="padding:10px 16px;width:110px;font-size:14px;font-weight:700;color:#64748b;">' . $label . '</td>'
              . '<td valign="top" style="padding:10px 16px;font-size:14px;font-weight:600;color:#0f172a;">' . mail_h($value) . '</td>'
              . '</tr>';
    }
    return $out . '</table>';
}

/** Common card layout. $bodyHtml must already be escaped/safe HTML. */
function mail_layout($from, $to, $subtitle, $badge, $bodyHtml, $headerTop = '')
{
    $badgeHtml = $badge !== '' ? '<div class="badge">' . $badge . '</div>' : '';

    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px; font-size: 24px; color: #ffffff; }
    .header p { margin: 0; font-size: 14px; color: #e2e8f0; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 99px; margin-top: 12px; }
    .body { padding: 28px 24px; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header" style="background-color: {$from}; background-image: linear-gradient(135deg, {$from} 0%, {$to} 100%);">
      {$headerTop}
      <h1>Life Generation Calapan</h1>
      <p>{$subtitle}</p>
      {$badgeHtml}
    </div>
    <div class="body">
      {$bodyHtml}
    </div>
    <div class="footer">
      Life Generation Church • Calapan City, Oriental Mindoro<br>
      Automated message sent via Gmail SMTP.
    </div>
  </div>
</body>
</html>
HTML;
}

/* ══════════════════════════════════════════════════════════════════
   HIGH-LEVEL EMAIL HELPERS
   (all return the SmtpMailer result array: success / message / simulated)
══════════════════════════════════════════════════════════════════ */

/**
 * Event RSVP confirmation
 */
function send_event_rsvp_email($user, $event)
{
    $to = $user['email'] ?? '';
    if ($to === '') return mail_fail('No recipient email.');

    $name     = mail_name($user, 'Youth Member');
    $rawTitle = $event['title'] ?? 'Life Generation Gathering';
    $title    = mail_h($rawTitle);

    $subject = "🎟️ RSVP Confirmed: {$rawTitle} — Life Generation";

    $meta = mail_meta_box([
        '📅 Date'     => $event['event_date'] ?? 'Upcoming',
        '⏰ Time'     => $event['event_time'] ?? 'TBA',
        '📍 Location' => $event['location'] ?? 'Life Generation Church, Calapan City',
    ]);

    $body = <<<HTML
<p style="font-size: 16px; margin-top: 0;">Hi <b>{$name}</b>,</p>
<p style="color: #475569; line-height: 1.6;">
  We've reserved your spot for <strong>{$title}</strong>! Here are the details for your schedule:
</p>
{$meta}
<p style="color: #475569; font-size: 14px; line-height: 1.6;">
  Upon arrival, simply present your <b>Digital Member ID QR Pass</b> from your portal dashboard for instant check-in at the entrance!
</p>
HTML;

    $html = mail_layout('#0f172a', '#1e293b', 'Youth Ministry Management System', '✓ RSVP Confirmed', $body);

    $mailer = new SmtpMailer();
    return $mailer->send($to, $subject, $html);
}

/**
 * Sent when an admin approves a D-Group join request
 */
function send_dgroup_accepted_email($applicantData)
{
    $to = $applicantData['email'] ?? '';
    if ($to === '') return mail_fail('No recipient email.');

    $name         = mail_name($applicantData, 'Youth Member');
    $rawGroupName = $applicantData['dgroup_name'] ?? 'Discipleship Group';
    $groupName    = mail_h($rawGroupName);
    $gcLink       = mail_url($applicantData['gc_link'] ?? '');

    $subject = "🎉 Request Approved: Welcome to {$rawGroupName} — Life Generation";

    $gcButton = '';
    if ($gcLink !== '') {
        $gcButton = '<div style="text-align: center; margin: 26px 0;">'
                  . '<a href="' . $gcLink . '" target="_blank" style="display: inline-block; background: #0084ff; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 10px;">'
                  . '💬 Join Official Group Chat (GC)</a></div>';
    }

    $meta = mail_meta_box([
        '👤 Leader'   => $applicantData['leader_name'] ?? 'D-Group Leader',
        '📅 Schedule' => $applicantData['schedule'] ?? 'Weekly',
        '📍 Location' => $applicantData['location'] ?? 'Calapan City',
    ]);

    $body = <<<HTML
<p style="font-size: 16px; margin-top: 0;">Hi <b>{$name}</b>,</p>
<p style="color: #475569; line-height: 1.6;">
  Great news! Your request to join <strong>{$groupName}</strong> has been approved by your leaders. You are now an official member of this discipleship group.
</p>
{$gcButton}
{$meta}
<p style="color: #475569; font-size: 14px; line-height: 1.6;">
  We're excited to do life, grow in faith, and build genuine friendships with you! You can also view your group details anytime in your LifeGen Member Portal.
</p>
HTML;

    $html = mail_layout('#1e3a8a', '#0f172a', 'Discipleship &amp; Community', '🎉 Application Accepted', $body);

    $mailer = new SmtpMailer();
    return $mailer->send($to, $subject, $html);
}

/**
 * Sent when an admin approves a ministry application
 */
function send_ministry_accepted_email($applicantData)
{
    $to = $applicantData['email'] ?? '';
    if ($to === '') return mail_fail('No recipient email.');

    $name            = mail_name($applicantData, 'Youth Member');
    $rawMinistryName = $applicantData['ministry_name'] ?? 'Ministry Team';
    $ministryName    = mail_h($rawMinistryName);

    // The DB stores icon *names* (e.g. "camera"). Emails can't render those, so use the
    // value only if it's an emoji/symbol; otherwise fall back to a star.
    $rawIcon = trim((string) ($applicantData['ministry_icon'] ?? ''));
    if ($rawIcon === '' || preg_match('/^[a-z0-9_\-]+$/i', $rawIcon)) $rawIcon = '✦';
    $headerTop = '<div style="font-size: 52px; margin-bottom: 10px;">' . mail_h($rawIcon) . '</div>';

    $subject = "🎉 Welcome to the {$rawMinistryName} — Life Generation";

    $steps = [
        ['Check your portal',        'Log in to your LifeGen Member Portal to see your ministry details and schedule.'],
        ['Connect with your team',   'Your ministry leader will reach out soon with orientation details and schedules.'],
        ['Serve with purpose',       'You were chosen for this ministry season for a reason — go make an impact!'],
    ];
    $stepsHtml = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">';
    foreach ($steps as $i => $s) {
        $n = $i + 1;
        $stepsHtml .= '<tr>'
            . '<td valign="top" style="width: 40px; padding-bottom: 14px;">'
            . '<div style="width: 28px; height: 28px; line-height: 26px; text-align: center; background: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 50%; font-size: 13px; font-weight: 700; color: #7c3aed;">' . $n . '</div>'
            . '</td>'
            . '<td valign="top" style="padding-bottom: 14px; font-size: 14px;">'
            . '<strong style="display: block; color: #1e293b; margin-bottom: 2px;">' . mail_h($s[0]) . '</strong>'
            . '<span style="color: #64748b;">' . mail_h($s[1]) . '</span>'
            . '</td></tr>';
    }
    $stepsHtml .= '</table>';

    $body = <<<HTML
<p style="font-size: 16px; margin-top: 0;">Hi <b>{$name}</b>,</p>
<p style="color: #475569; line-height: 1.6;">
  Congratulations! Your application to join the <strong>{$ministryName}</strong> has been officially <strong style="color: #15803d;">approved</strong> by our leadership team. We're so excited to serve alongside you!
</p>
<div style="background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 12px; padding: 20px 22px; margin: 20px 0; text-align: center;">
  <h2 style="margin: 0 0 8px; font-size: 20px; color: #6d28d9;">Welcome to the {$ministryName}! 🙌</h2>
  <p style="margin: 0; color: #7c3aed; font-size: 14px;">You are now an official member of this ministry team.</p>
</div>
{$stepsHtml}
<p style="color: #475569; font-size: 14px; line-height: 1.6;">
  If you have questions, reach out to your ministry coordinator. We're proud of your commitment to serve! 🙏
</p>
HTML;

    $html = mail_layout('#4a1942', '#1e0a2e', 'Ministry &amp; Servant Leadership', '🎉 Application Accepted', $body, $headerTop);

    $mailer = new SmtpMailer();
    return $mailer->send($to, $subject, $html);
}

/**
 * Password reset link
 * $user: ['email', 'username', 'full_name'(optional)]
 * $link: full reset URL (contains the one-time token)
 */
function send_password_reset_email($user, $link)
{
    $to = $user['email'] ?? '';
    if ($to === '') return mail_fail('No recipient email.');

    $name     = mail_name($user, 'Member');
    $safeLink = mail_url($link);
    if ($safeLink === '') return mail_fail('Invalid reset link.');

    $subject = "🔑 Reset your password — Life Generation";

    $body = <<<HTML
<p style="font-size: 16px; margin-top: 0;">Hi <b>{$name}</b>,</p>
<p style="color: #475569; line-height: 1.6;">
  We received a request to reset the password for your Life Generation account. Click the button below to choose a new one.
</p>
<div style="text-align: center; margin: 26px 0;">
  <a href="{$safeLink}" target="_blank" style="display: inline-block; background: #ea580c; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 10px;">
    Set a new password
  </a>
</div>
<div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #9a3412; line-height: 1.6;">
  This link expires in <b>1 hour</b> and can only be used once.
  If you didn't ask for this, you can safely ignore this email. Your password won't change.
</div>
<p style="color: #64748b; font-size: 12px; line-height: 1.6; word-break: break-all;">
  Button not working? Copy and paste this link into your browser:<br>{$safeLink}
</p>
HTML;

    $html = mail_layout('#ea580c', '#9a3412', 'Password reset request', '', $body);

    $mailer = new SmtpMailer();
    return $mailer->send($to, $subject, $html);
}