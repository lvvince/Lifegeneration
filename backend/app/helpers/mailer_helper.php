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
     * Parses .env safely
     */
    public static function loadEnv()
    {
        // Try multiple candidate paths for .env (works both under Apache and CLI)
        $candidates = [
            dirname(dirname(dirname(__FILE__))) . DIRECTORY_SEPARATOR . '.env',          // app/helpers -> backend/.env
            dirname(dirname(dirname(dirname(__FILE__)))) . DIRECTORY_SEPARATOR . '.env',  // one extra level up
        ];
        // Also try relative to document root if defined
        if (isset($_SERVER['DOCUMENT_ROOT']) && !empty($_SERVER['DOCUMENT_ROOT'])) {
            $candidates[] = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '.env';
        }

        $path = '';
        foreach ($candidates as $c) {
            $c = realpath($c) ?: $c;
            if (file_exists($c)) { $path = $c; break; }
        }
        if (empty($path)) return [];

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $env = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line[0] === '#') continue;
            $pos = strpos($line, '=');
            if ($pos !== false) {
                $key = trim(substr($line, 0, $pos));
                $val = trim(substr($line, $pos + 1));
                $val = trim($val, "\"'\r\n ");
                $env[$key] = $val;
            }
        }
        return $env;
    }

    /**
     * Sends an email via Gmail SMTP (or logs to file if credentials are not set)
     * @param string $to
     * @param string $subject
     * @param string $htmlBody
     * @return array [ 'success' => bool, 'message' => string, 'simulated' => bool ]
     */
    public function send($to, $subject, $htmlBody)
    {
        $to = trim($to);
        if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
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
            $this->readResponse($socket, '220');
            $this->sendCommand($socket, "EHLO " . gethostname(), '250');

            // STARTTLS for port 587
            if ($this->port === 587) {
                $this->sendCommand($socket, "STARTTLS", '220');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new Exception("STARTTLS negotiation failed");
                }
                $this->sendCommand($socket, "EHLO " . gethostname(), '250');
            }

            // AUTH LOGIN
            $this->sendCommand($socket, "AUTH LOGIN", '334');
            $this->sendCommand($socket, base64_encode($this->user), '334');
            $this->sendCommand($socket, base64_encode($this->pass), '235');

            // Envelope
            $this->sendCommand($socket, "MAIL FROM:<{$this->fromEmail}>", '250');
            $this->sendCommand($socket, "RCPT TO:<{$to}>", '250');
            $this->sendCommand($socket, "DATA", '354');

            // Build message headers + base64-encoded body
            $boundary  = md5(uniqid(time()));
            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

            $headers  = "From: =?UTF-8?B?" . base64_encode($this->fromName) . "?= <{$this->fromEmail}>\r\n";
            $headers .= "To: <{$to}>\r\n";
            $headers .= "Subject: {$encodedSubject}\r\n";
            $headers .= "Date: " . date('r') . "\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
            $headers .= "X-Mailer: LifeGen Calapan Mailer\r\n";
            $headers .= "X-Priority: 3\r\n";

            // Plain text fallback
            $plainText = wordwrap(strip_tags(preg_replace('/<br\s*\/?>/', "\n", $htmlBody)), 998, "\r\n", true);

            $body  = "--{$boundary}\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $body .= quoted_printable_encode($plainText) . "\r\n";

            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $body .= quoted_printable_encode($htmlBody) . "\r\n";

            $body .= "--{$boundary}--\r\n";

            // Dot-stuff lines starting with "." per RFC 5321
            $messageBody = preg_replace('/^\./', '..', $body, -1, $count);
            $messageBody = preg_replace('/\r\n\./', "\r\n..", $messageBody);

            // Send headers + blank line + body via raw fwrite (NOT through sendCommand)
            fwrite($socket, $headers . "\r\n" . $messageBody . "\r\n.\r\n");

            // Now read the 250 OK response for DATA
            $this->readResponse($socket, '250');

            // Quit cleanly — server may close connection before we read 221, so don't throw on error
            try {
                fwrite($socket, "QUIT\r\n");
                @fgets($socket, 512); // read (and ignore) whatever response comes back
            } catch (Exception $qe) {}

            if (is_resource($socket)) fclose($socket);
            self::logEmail($to, $subject, $htmlBody, 'SUCCESS: Sent via Gmail SMTP');
            return ['success' => true, 'message' => 'Email sent successfully via Gmail SMTP!', 'simulated' => false];

        } catch (Exception $e) {
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
        while ($line = fgets($socket, 512)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }

        $code = substr($response, 0, 3);
        if ($code !== (string)$expectedCode) {
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
                   . "Body Snippet:\n" . substr(strip_tags($htmlBody), 0, 300) . "...\n\n";

            @file_put_contents($logFile, $entry, FILE_APPEND);
        } catch (Exception $e) {}
    }
}

/* ══════════════════════════════════════════════════════════════════
   HIGH-LEVEL EMAIL HELPERS & HTML TEMPLATES
══════════════════════════════════════════════════════════════════ */

/**
 * Dispatches an automated RSVP confirmation email for an event
 */
function send_event_rsvp_email($user, $event)
{
    $to = $user['email'] ?? '';
    if (empty($to)) return false;

    $name     = htmlspecialchars($user['full_name'] ?: $user['username'] ?: 'Youth Member');
    $title    = htmlspecialchars($event['title'] ?? 'Life Generation Gathering');
    $date     = htmlspecialchars($event['event_date'] ?? 'Upcoming');
    $time     = htmlspecialchars($event['event_time'] ?? 'TBA');
    $location = htmlspecialchars($event['location'] ?? 'Life Generation Church, Calapan City');

    $subject = "🎟️ RSVP Confirmed: {$title} — Life Generation";

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px; font-size: 24px; color: #ffffff; }
    .header p { margin: 0; font-size: 14px; color: #94a3b8; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; margin-top: 12px; }
    .body { padding: 28px 24px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .meta-row { display: flex; margin-bottom: 10px; font-size: 14px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { width: 90px; font-weight: 700; color: #64748b; }
    .meta-val { font-weight: 600; color: #0f172a; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Life Generation Calapan</h1>
      <p>Youth Ministry Management System</p>
      <div class="badge">✓ RSVP Confirmed</div>
    </div>
    <div class="body">
      <p style="font-size: 16px; margin-top: 0;">Hi <b>{$name}</b>,</p>
      <p style="color: #475569; line-height: 1.6;">
        We've reserved your spot for <strong>{$title}</strong>! Here are the details for your schedule:
      </p>

      <div class="meta-box">
        <div class="meta-row">
          <div class="meta-label">📅 Date:</div>
          <div class="meta-val">{$date}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">⏰ Time:</div>
          <div class="meta-val">{$time}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">📍 Location:</div>
          <div class="meta-val">{$location}</div>
        </div>
      </div>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Upon arrival, simply present your <b>Digital Member ID QR Pass</b> from your portal dashboard for instant check-in at the entrance!
      </p>
    </div>
    <div class="footer">
      Life Generation Church • Calapan City, Oriental Mindoro<br>
      This is an automated confirmation sent via Gmail SMTP.
    </div>
  </div>
</body>
</html>
HTML;

    $mailer = new SmtpMailer();
    return $mailer->send($to, $subject, $html);
}

/**
 * Dispatches an automated email when an admin approves a youth's D-Group request
 */
function send_dgroup_accepted_email($applicantData)
{
    $to = $applicantData['email'] ?? '';
    if (empty($to)) return false;

    $name      = htmlspecialchars($applicantData['full_name'] ?: $applicantData['username'] ?: 'Youth Member');
    $groupName = htmlspecialchars($applicantData['dgroup_name'] ?? 'Discipleship Group');
    $leader    = htmlspecialchars($applicantData['leader_name'] ?? 'D-Group Leader');
    $schedule  = htmlspecialchars($applicantData['schedule'] ?? 'Weekly');
    $location  = htmlspecialchars($applicantData['location'] ?? 'Calapan City');
    $gcLink    = $applicantData['gc_link'] ?? '';

    $subject = "🎉 Request Approved: Welcome to {$groupName} — Life Generation";

    $gcButton = '';
    if (!empty($gcLink)) {
        $gcButton = <<<HTML
        <div style="text-align: center; margin: 26px 0;">
          <a href="{$gcLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0084ff 0%, #00c6ff 100%); color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(0, 132, 255, 0.35);">
            💬 Join Official Group Chat (GC)
          </a>
        </div>
HTML;
    }

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px; font-size: 24px; color: #ffffff; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; margin-top: 12px; }
    .body { padding: 28px 24px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .meta-row { display: flex; margin-bottom: 10px; font-size: 14px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { width: 90px; font-weight: 700; color: #64748b; }
    .meta-val { font-weight: 600; color: #0f172a; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Life Generation Calapan</h1>
      <p>Discipleship & Community</p>
      <div class="badge">🎉 Application Accepted</div>
    </div>
    <div class="body">
      <p style="font-size: 16px; margin-top: 0;">Hi <b>{$name}</b>,</p>
      <p style="color: #475569; line-height: 1.6;">
        Great news! Your request to join <strong>{$groupName}</strong> has been approved by your leaders. You are now an official member of this discipleship group.
      </p>

      {$gcButton}

      <div class="meta-box">
        <div class="meta-row">
          <div class="meta-label">👤 Leader:</div>
          <div class="meta-val">{$leader}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">📅 Schedule:</div>
          <div class="meta-val">{$schedule}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">📍 Location:</div>
          <div class="meta-val">{$location}</div>
        </div>
      </div>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        We're excited to do life, grow in faith, and build genuine friendships with you! You can also view your group details anytime in your LifeGen Member Portal.
      </p>
    </div>
    <div class="footer">
      Life Generation Church • Calapan City, Oriental Mindoro<br>
      Automated confirmation sent via Gmail SMTP.
    </div>
  </div>
</body>
</html>
HTML;

    $mailer = new SmtpMailer();
    return $mailer->send($to, $subject, $html);
}

/**
 * Dispatches an automated email when an admin approves a ministry application
 */
function send_ministry_accepted_email($applicantData)
{
    $to = $applicantData['email'] ?? '';
    if (empty($to)) return false;

    $name         = htmlspecialchars($applicantData['full_name'] ?: $applicantData['username'] ?: 'Youth Member');
    $ministryName = htmlspecialchars($applicantData['ministry_name'] ?? 'Ministry Team');
    $ministryIcon = htmlspecialchars($applicantData['ministry_icon'] ?? '✦');

    $subject = "🎉 Welcome to the {$ministryName} — Life Generation";

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #4a1942 0%, #1e0a2e 100%); padding: 36px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px; font-size: 24px; color: #ffffff; }
    .header p { margin: 0; font-size: 14px; color: #c4b5d4; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 99px; margin-top: 10px; }
    .body { padding: 28px 24px; }
    .welcome-box { background: linear-gradient(135deg, #faf5ff 0%, #f0e6ff 100%); border: 1px solid #d8b4fe; border-radius: 12px; padding: 20px 22px; margin: 20px 0; text-align: center; }
    .welcome-box h2 { margin: 0 0 8px; font-size: 20px; color: #6d28d9; }
    .welcome-box p { margin: 0; color: #7c3aed; font-size: 14px; }
    .step { display: flex; align-items: flex-start; margin-bottom: 14px; font-size: 14px; }
    .step-num { width: 28px; height: 28px; background: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 50%; text-align: center; line-height: 26px; font-size: 13px; font-weight: 700; color: #7c3aed; flex-shrink: 0; margin-right: 12px; }
    .step-text strong { display: block; color: #1e293b; margin-bottom: 2px; }
    .step-text span { color: #64748b; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size:52px;margin-bottom:10px;">{$ministryIcon}</div>
      <h1>Life Generation Calapan</h1>
      <p>Ministry &amp; Servant Leadership</p>
      <div class="badge">🎉 Application Accepted</div>
    </div>
    <div class="body">
      <p style="font-size: 16px; margin-top: 0;">Hi <b>{$name}</b>,</p>
      <p style="color: #475569; line-height: 1.6;">
        Congratulations! Your application to join the <strong>{$ministryName}</strong> has been officially <strong style="color: #15803d;">approved</strong> by our leadership team. We're so excited to serve alongside you!
      </p>

      <div class="welcome-box">
        <h2>Welcome to the {$ministryName}! 🙌</h2>
        <p>You are now an official member of this ministry team.</p>
      </div>

      <div style="margin: 24px 0;">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">
            <strong>Check your portal</strong>
            <span>Log in to your LifeGen Member Portal to see your ministry details and schedule.</span>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">
            <strong>Connect with your team</strong>
            <span>Your ministry leader will reach out soon with orientation details and schedules.</span>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">
            <strong>Serve with purpose</strong>
            <span>You were chosen for this ministry season for a reason — go make an impact!</span>
          </div>
        </div>
      </div>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        If you have questions, reach out to your ministry coordinator. We're proud of your commitment to serve! 🙏
      </p>
    </div>
    <div class="footer">
      Life Generation Church • Calapan City, Oriental Mindoro<br>
      Automated confirmation sent via Gmail SMTP.
    </div>
  </div>
</body>
</html>
HTML;

    $mailer = new SmtpMailer();
    return $mailer->send($to, $subject, $html);
}
