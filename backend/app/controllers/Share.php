<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Share Controller
 *
 * Returns a server-rendered HTML page with Open Graph meta tags
 * for social sharing (Facebook, Twitter, etc.), then redirects
 * the user to the frontend SPA.
 *
 * Route: GET /share/event/{id}
 */
class Share extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    /**
     * Render OG-tag page for an event and redirect to frontend.
     *
     * @param int $id  Event ID
     */
    public function event($id)
    {
        $id = (int) $id;

        // ── 1. Fetch event ────────────────────────────────────────────
        $stmt  = $this->db->raw(
            "SELECT id, title, description, banner_image, event_date, event_time, location
             FROM events WHERE id = ? AND is_active = 1 LIMIT 1",
            [$id]
        );
        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        // ── 2. Resolve base URLs dynamically ──────────────────────────
        $proto = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
                 (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
                 ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $isLocalSubfolder = str_contains($scriptName, '/LIFEGEN/backend/public') || str_contains($scriptName, '/Lifegeneration/backend/public');

        if ($isLocalSubfolder) {
            $backendBase  = $proto . '://' . $host . (str_contains($scriptName, 'Lifegeneration') ? '/Lifegeneration/backend/public' : '/LIFEGEN/backend/public');
            $frontendBase = rtrim(getenv('FRONTEND_URL') ?: 'http://localhost:5173', '/');
        } else {
            // Production (Render, Docker root)
            $backendBase  = $proto . '://' . $host;
            $frontendBase = $proto . '://' . $host;
        }

        // If event not found, redirect to events list
        if (!$event) {
            header('Location: ' . $frontendBase . '/events');
            exit;
        }

        // ── 3. Build canonical (frontend) URL ────────────────────────
        $canonicalUrl = $frontendBase . '/events/' . $id;

        // ── 4. Resolve image URL ──────────────────────────────────────
        $img = trim($event['banner_image'] ?? '');
        if ($img === '') {
            // Fallback: app favicon / logo
            $img = $backendBase . '/favicon.ico';
        } elseif (!preg_match('#^https?://#i', $img)) {
            // Relative path → absolute backend URL
            $img = $backendBase . '/' . ltrim($img, '/');
        }

        // ── 5. Prepare text fields ────────────────────────────────────
        $title = htmlspecialchars($event['title'] ?? 'Life Generation Event', ENT_QUOTES, 'UTF-8');

        $dateStr = !empty($event['event_date']) ? date('M j, Y', strtotime($event['event_date'])) : '';
        $timeStr = !empty($event['event_time']) ? date('g:i A', strtotime($event['event_time'])) : '';
        $locStr  = !empty($event['location']) ? $event['location'] : '';

        $details = [];
        if ($dateStr) $details[] = "📅 {$dateStr}" . ($timeStr ? " at {$timeStr}" : '');
        if ($locStr)  $details[] = "📍 {$locStr}";
        $metaPrefix = $details ? implode(' • ', $details) . ' — ' : '';

        $rawDesc = strip_tags($event['description'] ?? '');
        if ($rawDesc === '') {
            $rawDesc = 'Join us at this Life Generation Calapan gathering!';
        }
        $fullDesc = $metaPrefix . $rawDesc;
        $desc = htmlspecialchars(mb_substr($fullDesc, 0, 240), ENT_QUOTES, 'UTF-8');

        $canonicalEsc = htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8');
        $imgEsc       = htmlspecialchars($img,          ENT_QUOTES, 'UTF-8');

        // ── 6. Output HTML with OG tags + instant JS redirect ─────────
        // We set no-cache headers so FB's crawler always gets fresh tags
        header('Content-Type: text/html; charset=UTF-8');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Pragma: no-cache');
        // Allow FB/crawlers (remove X-Frame-Options only for this endpoint)
        header_remove('X-Frame-Options');

        echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{$title} — Life Generation</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Life Generation Calapan" />
  <meta property="og:url"         content="{$canonicalEsc}" />
  <meta property="og:title"       content="{$title}" />
  <meta property="og:description" content="{$desc}" />
  <meta property="og:image"       content="{$imgEsc}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="{$title}" />
  <meta name="twitter:description" content="{$desc}" />
  <meta name="twitter:image"       content="{$imgEsc}" />

  <!-- Canonical + instant redirect for real browsers -->
  <link rel="canonical" href="{$canonicalEsc}" />
  <meta http-equiv="refresh" content="0;url={$canonicalEsc}" />
</head>
<body>
  <script>window.location.replace("{$canonicalUrl}");</script>
  <p>Redirecting to event… <a href="{$canonicalEsc}">Click here if not redirected</a>.</p>
</body>
</html>
HTML;
        exit;
    }
}

