<?php
/**
 * Life Generation - Safe Database Updater
 * Run via terminal: php update_db.php
 * Or via browser: http://localhost/.../backend/update_db.php
 */

echo "========================================================\n";
echo "Life Generation Database Auto-Updater\n";
echo "========================================================\n\n";

$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    die("Error: .env file not found at {$envFile}\n");
}

$env = [];
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if (empty($line) || $line[0] === '#') continue;
    $pos = strpos($line, '=');
    if ($pos !== false) {
        $key = trim(substr($line, 0, $pos));
        $val = trim(trim(substr($line, $pos + 1)), " \"'");
        $env[$key] = $val;
    }
}

$host = $env['DB_HOST'] ?? '127.0.0.1';
$port = $env['DB_PORT'] ?? 3306;
$user = $env['DB_USER'] ?? 'root';
$pass = $env['DB_PASSWORD'] ?? '';
$db   = $env['DB_NAME'] ?? 'lifegenerationdb';

echo "Connecting to MySQL ({$host}:{$port}, Database: {$db})...\n";

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "✓ Connected successfully!\n\n";
} catch (Exception $e) {
    die("Database connection failed: " . $e->getMessage() . "\nCheck DB credentials in backend/.env\n");
}

// 1. Create announcements table if missing
echo "Checking 'announcements' table... ";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `announcements` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `title` VARCHAR(200) NOT NULL,
          `content` TEXT NOT NULL,
          `category` ENUM('urgent', 'event', 'ministry', 'general') NOT NULL DEFAULT 'general',
          `badge_text` VARCHAR(50) DEFAULT NULL,
          `link_url` VARCHAR(255) DEFAULT NULL,
          `link_text` VARCHAR(100) DEFAULT NULL,
          `is_pinned` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
          `is_active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
          `expires_at` DATETIME DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          KEY `idx_active_pinned` (`is_active`, `is_pinned`, `created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ OK\n";
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// 2. Create dgroup_requests table if missing
echo "Checking 'dgroup_requests' table... ";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `dgroup_requests` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `dgroup_id` INT UNSIGNED NOT NULL,
          `user_id` INT UNSIGNED NOT NULL,
          `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
          `request_note` TEXT DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY `unique_dgroup_user` (`dgroup_id`,`user_id`),
          KEY `idx_status` (`status`),
          KEY `idx_user` (`user_id`),
          KEY `idx_dgroup` (`dgroup_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ OK\n";
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// 3. Add gc_link column to dgroups if missing
echo "Checking 'gc_link' column in 'dgroups'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `dgroups` LIKE 'gc_link'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `dgroups` ADD COLUMN `gc_link` VARCHAR(255) DEFAULT NULL AFTER `location`");
        echo "✓ Column added\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// 4. Seed initial announcement if empty
echo "Checking initial seed data... ";
try {
    $count = $pdo->query("SELECT COUNT(*) FROM `announcements`")->fetchColumn();
    if ($count == 0) {
        $pdo->exec("
            INSERT INTO `announcements` (`id`, `title`, `content`, `category`, `badge_text`, `link_url`, `link_text`, `is_pinned`, `is_active`)
            VALUES (1, 'Welcome to Life Generation Calapan!', 'Join us this week for youth gatherings, discipleship groups, and fellowship. Check our events tab to register!', 'general', 'WELCOME', '/events', 'View Gatherings', 1, 1)
        ");
        echo "✓ Seeded welcome announcement\n";
    } else {
        echo "✓ Already seeded\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// 5. Add gender column to members and users if missing
echo "Checking 'gender' column in 'members'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `members` LIKE 'gender'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `members` ADD COLUMN `gender` ENUM('Male','Female') DEFAULT NULL AFTER `full_name`");
        echo "✓ Column added\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Checking 'gender' column in 'users'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'gender'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `gender` ENUM('Male','Female') DEFAULT NULL AFTER `full_name`");
        echo "✓ Column added\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "\n========================================================\n";
echo "✓ ALL DATABASE UPDATES COMPLETED SUCCESSFULLY!\n";
echo "You can now refresh your browser and use all features.\n";
echo "========================================================\n";
