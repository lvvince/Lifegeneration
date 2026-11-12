<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Lightweight, robust SMTP client for Gmail SSL (Port 465) / TLS (Port 587)
 * Requires zero external composer packages.
 */
class SmtpMailer
{
    private $env;
    private $host;
    private $port;
    private $user;
    private $pass;
    private $fromEmail;
    private $fromName;
    private $timeout;

    public function __construct()
    {
        $this->env       = self::loadEnv();
        $this->host      = $this->env['SMTP_HOST'] ?? getenv('SMTP_HOST') ?: ($_ENV['SMTP_HOST'] ?? 'smtp.gmail.com');
        $this->port      = (int) ($this->env['SMTP_PORT'] ?? getenv('SMTP_PORT') ?: ($_ENV['SMTP_PORT'] ?? 587));
        $this->user      = $this->env['SMTP_USER'] ?? getenv('SMTP_USER') ?: ($_ENV['SMTP_USER'] ?? '');
        $this->pass      = $this->env['SMTP_PASS'] ?? getenv('SMTP_PASS') ?: ($_ENV['SMTP_PASS'] ?? '');
        $this->fromEmail = $this->env['SMTP_FROM_EMAIL'] ?? getenv('SMTP_FROM_EMAIL') ?: ($_ENV['SMTP_FROM_EMAIL'] ?? ($this->user ?: 'lifegenerationcalapan@gmail.com'));
        $this->fromName  = $this->env['SMTP_FROM_NAME'] ?? getenv('SMTP_FROM_NAME') ?: ($_ENV['SMTP_FROM_NAME'] ?? 'Life Generation Calapan');
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
     * Connects with automatic fallback between 465 (SSL) and 587 (STARTTLS).
     * Suppresses socket warnings so framework error handlers never crash the request.
     */
    private function openSocket()
    {
        $portsToTry = [$this->port];
        if ($this->port === 465) {
            $portsToTry[] = 587;
        } elseif ($this->port === 587) {
            $portsToTry[] = 465;
        }

        $lastErr = '';
        foreach ($portsToTry as $port) {
            $isSsl  = ($port === 465);
            $remote = ($isSsl ? "ssl://" : "tcp://") . "{$this->host}:{$port}";

            $ctx = stream_context_create([
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ]
            ]);

            // Temporarily suppress PHP warnings so LavaLust's _error_handler doesn't intercept
            $prev = set_error_handler(function() { return true; });
            $errno = 0;
            $errstr = '';
            // Connect with a 5s timeout so retries don't hang the request
            $socket = stream_socket_client($remote, $errno, $errstr, 5, STREAM_CLIENT_CONNECT, $ctx);
            if ($prev !== null) {
                set_error_handler($prev);
            } else {
                restore_error_handler();
            }

            if ($socket) {
                stream_set_timeout($socket, $this->timeout);
                return [$socket, $port];
            }

            $lastErr = "Port {$port}: {$errstr} ({$errno})";
        }

        return [null, $lastErr];
    }

    /**
     * Sends an email via Gmail SMTP or HTTPS Mail API (Brevo / Resend / Google Apps Script)
     * @return array [ 'success' => bool, 'message' => string, 'simulated' => bool ]
     */
    public function send($to, $subject, $htmlBody)
    {
        $to = trim($to);
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Invalid recipient email address.', 'simulated' => false];
        }

        // ── 1. Check HTTPS mail APIs first (Port 443 — 100% bypasses Render Free SMTP block) ──
        $brevoKey = $this->env['BREVO_API_KEY'] ?? getenv('BREVO_API_KEY') ?: ($_ENV['BREVO_API_KEY'] ?? '');
        if (!empty($brevoKey)) {
            return $this->sendViaBrevo($brevoKey, $to, $subject, $htmlBody);
        }

        $resendKey = $this->env['RESEND_API_KEY'] ?? getenv('RESEND_API_KEY') ?: ($_ENV['RESEND_API_KEY'] ?? '');
        if (!empty($resendKey)) {
            return $this->sendViaResend($resendKey, $to, $subject, $htmlBody);
        }

        $gmailWebhook = $this->env['GMAIL_WEBHOOK_URL'] ?? getenv('GMAIL_WEBHOOK_URL') ?: ($_ENV['GMAIL_WEBHOOK_URL'] ?? '');
        if (!empty($gmailWebhook)) {
            return $this->sendViaGmailWebhook($gmailWebhook, $to, $subject, $htmlBody);
        }

        // ── 2. Direct SMTP fallback ──
        // If no SMTP password configured, run in safe simulation mode
        if (empty($this->user) || empty($this->pass) || $this->pass === 'your-app-password') {
            self::logEmail($to, $subject, $htmlBody, 'SIMULATED (No Gmail App Password set in .env)');
            return [
                'success'   => true,
                'message'   => 'Email logged in simulation mode (Set SMTP_PASS in .env to send real emails).',
                'simulated' => true
            ];
        }

        list($socket, $connectedPortOrErr) = $this->openSocket();

        if (!$socket) {
            $err = "SMTP Connection failed: {$connectedPortOrErr}";
            self::logEmail($to, $subject, $htmlBody, "FAILED: {$err}");
            return ['success' => false, 'message' => $err, 'simulated' => false];
        }

        $connectedPort = $connectedPortOrErr;

        try {
            $ehloHost = gethostname() ?: 'localhost';

            $this->readResponse($socket, '220');
            $this->sendCommand($socket, "EHLO {$ehloHost}", '250');

            // STARTTLS for port 587
            if ($connectedPort === 587) {
                $this->sendCommand($socket, "STARTTLS", '220');
                $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
                if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
                if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;

                $prev = set_error_handler(function() { return true; });
                $cryptoOk = stream_socket_enable_crypto($socket, true, $cryptoMethod);
                if ($prev !== null) { set_error_handler($prev); } else { restore_error_handler(); }

                if (!$cryptoOk) {
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
            $headers .= "Reply-To: =?UTF-8?B?" . base64_encode($this->fromName) . "?= <{$this->fromEmail}>\r\n";
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

    /**
     * Send email via Brevo REST API (HTTPS port 443 — works on Render Free Tier)
     */
    private function sendViaBrevo($apiKey, $to, $subject, $htmlBody)
    {
        $payload = [
            'sender'      => ['name' => $this->fromName, 'email' => $this->fromEmail],
            'to'          => [['email' => $to]],
            'subject'     => $subject,
            'htmlContent' => $htmlBody,
            'textContent' => self::htmlToText($htmlBody),
        ];

        $res = $this->httpPost('https://api.brevo.com/v3/smtp/email', json_encode($payload), [
            'api-key: ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ]);

        if ($res['status'] >= 200 && $res['status'] < 300) {
            self::logEmail($to, $subject, $htmlBody, 'SUCCESS: Sent via Brevo HTTPS API');
            return ['success' => true, 'message' => 'Email sent successfully via Brevo API!', 'simulated' => false];
        }

        self::logEmail($to, $subject, $htmlBody, "FAILED (Brevo {$res['status']}): " . $res['body']);
        return ['success' => false, 'message' => "Brevo error ({$res['status']}): " . $res['body'], 'simulated' => false];
    }

    /**
     * Send email via Resend REST API (HTTPS port 443 — works on Render Free Tier)
     */
    private function sendViaResend($apiKey, $to, $subject, $htmlBody)
    {
        $payload = [
            'from'    => "{$this->fromName} <{$this->fromEmail}>",
            'to'      => [$to],
            'subject' => $subject,
            'html'    => $htmlBody,
            'text'    => self::htmlToText($htmlBody),
        ];

        $res = $this->httpPost('https://api.resend.com/emails', json_encode($payload), [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ]);

        if ($res['status'] >= 200 && $res['status'] < 300) {
            self::logEmail($to, $subject, $htmlBody, 'SUCCESS: Sent via Resend HTTPS API');
            return ['success' => true, 'message' => 'Email sent successfully via Resend API!', 'simulated' => false];
        }

        self::logEmail($to, $subject, $htmlBody, "FAILED (Resend {$res['status']}): " . $res['body']);
        return ['success' => false, 'message' => "Resend error ({$res['status']}): " . $res['body'], 'simulated' => false];
    }

    /**
     * Send email via Google Apps Script Web App Webhook (HTTPS port 443 — 100% Free, sends from official Gmail)
     */
    private function sendViaGmailWebhook($url, $to, $subject, $htmlBody)
    {
        $payload = [
            'to'        => $to,
            'subject'   => $subject,
            'htmlBody'  => $htmlBody,
            'plainBody' => self::htmlToText($htmlBody),
            'fromName'  => $this->fromName,
        ];

        $res = $this->httpPost($url, json_encode($payload), [
            'Content-Type: application/json',
        ]);

        if ($res['status'] >= 200 && $res['status'] < 400) {
            self::logEmail($to, $subject, $htmlBody, 'SUCCESS: Sent via Gmail Webhook');
            return ['success' => true, 'message' => 'Email sent successfully via Gmail Webhook!', 'simulated' => false];
        }

        self::logEmail($to, $subject, $htmlBody, "FAILED (Gmail Webhook {$res['status']}): " . $res['body']);
        return ['success' => false, 'message' => "Gmail Webhook error ({$res['status']}): " . $res['body'], 'simulated' => false];
    }

    /**
     * Reusable native HTTP POST helper using curl (or stream fallback)
     */
    private function httpPost($url, $jsonBody, array $headers)
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            $body = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            return ['status' => $status, 'body' => $body ?: $err];
        }

        // Stream context fallback if curl is not available
        $opts = [
            'http' => [
                'method'  => 'POST',
                'header'  => implode("\r\n", $headers),
                'content' => $jsonBody,
                'timeout' => 12,
                'ignore_errors' => true,
            ]
        ];
        $ctx = stream_context_create($opts);
        $prev = set_error_handler(function() { return true; });
        $body = file_get_contents($url, false, $ctx);
        if ($prev !== null) set_error_handler($prev); else restore_error_handler();

        $status = 0;
        if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
            if (preg_match('#HTTP/\S+\s+(\d{3})#', $http_response_header[0], $m)) {
                $status = (int) $m[1];
            }
        }
        return ['status' => $status, 'body' => (string) $body];
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
      Direct notification for members and leaders of Life Generation.
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

    $chatUrl  = mail_url('/chat');
    $gcButton = '<div style="text-align: center; margin: 26px 0;">'
              . '<a href="' . $chatUrl . '" target="_blank" style="display: inline-block; background: #0084ff; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 10px;">'
              . '💬 Open Fellowship Chat</a></div>';

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