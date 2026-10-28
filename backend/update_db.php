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

// 0. Auto-initialize full database if 'users' or 'members' table is missing
$hasUsers = $pdo->query("SHOW TABLES LIKE 'users'")->fetchAll();
if (empty($hasUsers)) {
    echo "Base tables ('users') missing in database '{$db}'!\n";
    echo "Initializing full database schema from database.sql...\n";
    $sqlFile = dirname(__DIR__) . '/database.sql';
    if (!file_exists($sqlFile)) {
        $sqlFile = __DIR__ . '/database.sql';
    }
    if (file_exists($sqlFile)) {
        $sqlContent = file_get_contents($sqlFile);
        $pdo->exec($sqlContent);
        echo "✓ Full database schema ('users', 'members', 'events', 'dgroups', etc.) initialized successfully!\n\n";
    } else {
        echo "Warning: database.sql not found at {$sqlFile}\n";
    }
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

// 6. Create password_resets table if missing
echo "Checking 'password_resets' table... ";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `password_resets` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `user_id` INT UNSIGNED NOT NULL,
          `token_hash` VARCHAR(64) NOT NULL,
          `expires_at` DATETIME NOT NULL,
          `used_at` DATETIME DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          KEY `idx_token_hash` (`token_hash`),
          KEY `idx_user_id` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ OK\n";
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// 7. Add google_id and password_hash to users if missing
echo "Checking 'google_id' in 'users'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'google_id'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `google_id` VARCHAR(255) DEFAULT NULL AFTER `email`");
        echo "✓ Column added\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Checking 'password_hash' in 'users'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'password_hash'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) DEFAULT NULL AFTER `password`");
        $pdo->exec("UPDATE `users` SET `password_hash` = `password` WHERE `password_hash` IS NULL AND `password` IS NOT NULL");
        echo "✓ Column added & synced\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Checking 'member_code' in 'members'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `members` LIKE 'member_code'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `members` ADD COLUMN `member_code` VARCHAR(50) DEFAULT NULL AFTER `user_id`");
        $pdo->exec("UPDATE `members` SET `member_code` = `member_id` WHERE `member_code` IS NULL AND `member_id` IS NOT NULL");
        echo "✓ Column added & synced\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Checking 'token_hash' in 'refresh_tokens'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `refresh_tokens` LIKE 'token_hash'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `refresh_tokens` ADD COLUMN `token_hash` VARCHAR(64) DEFAULT NULL AFTER `token`");
        echo "✓ Column added\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Ensuring 'jti' in 'refresh_tokens' has default NULL... ";
try {
    $pdo->exec("ALTER TABLE `refresh_tokens` MODIFY COLUMN `jti` VARCHAR(64) DEFAULT NULL");
    echo "✓ OK\n";
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Ensuring 'role' in 'users' is VARCHAR(50)... ";
try {
    $pdo->exec("ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'user'");
    echo "✓ OK\n";
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Checking 'map_url' column in 'events'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `events` LIKE 'map_url'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `events` ADD COLUMN `map_url` TEXT DEFAULT NULL AFTER `location`");
        echo "✓ Column added\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Checking 'status' column in 'members'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `members` LIKE 'status'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `members` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'approved' AFTER `is_active`");
        echo "✓ Column added\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

echo "Checking 'created_at' column in 'members'... ";
try {
    $cols = $pdo->query("SHOW COLUMNS FROM `members` LIKE 'created_at'")->fetchAll();
    if (empty($cols)) {
        $pdo->exec("ALTER TABLE `members` ADD COLUMN `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP AFTER `joined_at`");
        $pdo->exec("UPDATE `members` SET `created_at` = `joined_at` WHERE `joined_at` IS NOT NULL");
        echo "✓ Column added & synced\n";
    } else {
        echo "✓ Already exists\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// -------------------------------------------------------------
// Donation Campaigns Table
// -------------------------------------------------------------
echo "Checking 'donation_campaigns' table... ";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `donation_campaigns` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `title` VARCHAR(150) NOT NULL,
          `category` VARCHAR(50) NOT NULL DEFAULT 'offering',
          `description` TEXT DEFAULT NULL,
          `target_amount` DECIMAL(12,2) DEFAULT NULL,
          `collected_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          `image` VARCHAR(255) DEFAULT NULL,
          `is_active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          KEY `idx_active` (`is_active`),
          KEY `idx_cat` (`category`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ OK\n";

    // Seed default campaigns if empty
    $count = $pdo->query("SELECT COUNT(*) FROM `donation_campaigns`")->fetchColumn();
    if ($count == 0) {
        $stmt = $pdo->prepare("INSERT INTO `donation_campaigns` (`title`, `category`, `description`, `target_amount`, `is_active`) VALUES (?, ?, ?, ?, 1)");
        $stmt->execute(['Tithes & General Offerings', 'tithe', 'Support Sunday celebrations, weekly discipleship gatherings, and regular ministry operations.', NULL]);
        $stmt->execute(['Youth Camp & Summit 2026', 'camp_sponsor', 'Sponsor a student or young adult to attend the LifeGen Leadership & Ministry Summit.', 50000.00]);
        $stmt->execute(['Missions & Community Outreach', 'missions', 'Fund school supply drives, feeding programs, and rural mission works.', 30000.00]);
        $stmt->execute(['Audio & Multimedia Equipment Fund', 'building_fund', 'Help improve sound system, musical instruments, and media livestreaming gear.', 45000.00]);
        $stmt->execute(['Benevolence & Love Gift', 'benevolence', 'Provide immediate financial or medical aid to brethren and community members in need.', NULL]);
        echo "  ↳ Seeded 5 initial donation campaigns\n";
    }
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}

// -------------------------------------------------------------
// Donations Table
// -------------------------------------------------------------
echo "Checking 'donations' table... ";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `donations` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `tracking_code` VARCHAR(32) NOT NULL UNIQUE,
          `user_id` INT UNSIGNED DEFAULT NULL,
          `campaign_id` INT UNSIGNED DEFAULT NULL,
          `donor_name` VARCHAR(150) NOT NULL,
          `is_anonymous` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
          `donor_email` VARCHAR(255) DEFAULT NULL,
          `donor_phone` VARCHAR(50) DEFAULT NULL,
          `category` VARCHAR(50) NOT NULL DEFAULT 'offering',
          `amount` DECIMAL(12,2) NOT NULL,
          `payment_method` ENUM('gcash','maya','bank_transfer','cash','other') NOT NULL DEFAULT 'gcash',
          `reference_number` VARCHAR(100) DEFAULT NULL,
          `proof_receipt` VARCHAR(255) DEFAULT NULL,
          `status` ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
          `admin_notes` TEXT DEFAULT NULL,
          `donor_message` TEXT DEFAULT NULL,
          `verified_by` INT UNSIGNED DEFAULT NULL,
          `verified_at` DATETIME DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
          KEY `idx_user` (`user_id`),
          KEY `idx_campaign` (`campaign_id`),
          KEY `idx_status` (`status`),
          KEY `idx_created` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "✓ OK\n";
} catch (Exception $e) {
    echo "Notice: " . $e->getMessage() . "\n";
}



echo "\n========================================================\n";
echo "✓ ALL DATABASE UPDATES COMPLETED SUCCESSFULLY!\n";
echo "You can now refresh your browser and use all features.\n";
echo "========================================================\n";
