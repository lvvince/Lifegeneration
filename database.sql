-- ============================================================================
-- Life Generation Database Schema & Seed Data
-- Database: lifegenerationdb
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `lifegenerationdb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lifegenerationdb`;

-- 1. Migrations Table
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` INT NOT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration_unique` (`migration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table (Core Auth & Roles)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id` VARCHAR(50) DEFAULT NULL,
  `username` VARCHAR(100) NOT NULL,
  `full_name` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `age` INT UNSIGNED DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','moderator','user') NOT NULL DEFAULT 'user',
  `membership_tier` VARCHAR(50) NOT NULL DEFAULT 'Standard Member',
  `is_active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username_unique` (`username`),
  UNIQUE KEY `email_unique` (`email`),
  KEY `email_idx` (`email`),
  KEY `role_idx` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Discipleship Groups Table
CREATE TABLE IF NOT EXISTS `dgroups` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `leader_name` VARCHAR(150) NOT NULL,
  `schedule` VARCHAR(100) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Ministries Table
CREATE TABLE IF NOT EXISTS `ministries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(10) DEFAULT '✦',
  `image` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `slots_available` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Members Table (Profile linked to Users)
CREATE TABLE IF NOT EXISTS `members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `dgroup_id` INT UNSIGNED DEFAULT NULL,
  `ministry_id` INT UNSIGNED DEFAULT NULL,
  `member_id` VARCHAR(50) DEFAULT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `age` INT UNSIGNED DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `membership_tier` VARCHAR(50) NOT NULL DEFAULT 'Standard Member',
  `is_active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `members_user_id_unique` (`user_id`),
  UNIQUE KEY `members_member_id_unique` (`member_id`),
  KEY `members_email_idx` (`email`),
  CONSTRAINT `fk_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_members_dgroup` FOREIGN KEY (`dgroup_id`) REFERENCES `dgroups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_members_ministry` FOREIGN KEY (`ministry_id`) REFERENCES `ministries` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Refresh Tokens Table (JWT Refresh Rotation)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token` TEXT NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `jti` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id_idx` (`user_id`),
  CONSTRAINT `fk_refreshtok_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Events Table
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `banner_image` VARCHAR(255) DEFAULT NULL,
  `location` VARCHAR(255) NOT NULL,
  `event_date` DATE NOT NULL,
  `event_time` VARCHAR(50) NOT NULL,
  `capacity` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Event Attendances Table (RSVP & QR Check-in)
CREATE TABLE IF NOT EXISTS `event_attendances` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `member_id` VARCHAR(50) NOT NULL,
  `member_name` VARCHAR(150) NOT NULL,
  `rsvp_status` VARCHAR(20) NOT NULL DEFAULT 'attending',
  `checked_in` TINYINT(1) NOT NULL DEFAULT 0,
  `checked_in_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_eventattend_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_eventattend_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Ministry Applications Table
CREATE TABLE IF NOT EXISTS `ministry_applications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `ministry_id` INT UNSIGNED NOT NULL,
  `member_name` VARCHAR(150) NOT NULL,
  `message` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ministryapp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ministryapp_ministry` FOREIGN KEY (`ministry_id`) REFERENCES `ministries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Prayer Requests Table
CREATE TABLE IF NOT EXISTS `prayer_requests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `member_name` VARCHAR(150) NOT NULL DEFAULT 'Anonymous',
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT NOT NULL,
  `visibility` VARCHAR(20) NOT NULL DEFAULT 'public',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_prayerreq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INITIAL SEED DATA
-- Default password for accounts is: password123
-- ============================================================================

-- D-Groups
INSERT INTO `dgroups` (`id`, `name`, `leader_name`, `schedule`, `location`, `description`) VALUES
(1, 'LifeGen Young Professionals', 'Pastor Marcus Rivera', 'Saturdays 5:00 PM', 'Fellowship Room A & Zoom', 'A discipleship group for young working professionals navigating career, life, and faith.'),
(2, 'Youth Ignite', 'Danielle Vitto', 'Saturdays 1:30 PM', 'Youth Hall B', 'Unleashing the passion of high school and college students to make a difference for Christ.'),
(3, 'Couples Fellowship', 'Elder Thomas & Sarah Cruz', 'Fridays 7:30 PM', 'Main Sanctuary Room 3', 'Discipleship and fellowship for married couples focused on building Christ-centered families.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Ministries
INSERT INTO `ministries` (`id`, `name`, `icon`, `description`, `is_active`) VALUES
(1, 'Worship Team', '🎵', 'Lead the congregation in musical worship through singing and instruments. Serve in Sunday services and special events.', 1),
(2, 'Media & Tech', '📽️', 'Operate cameras, livestreaming, sound systems, and presentation software to support church services.', 1),
(3, 'Ushers & Greeters', '🤝', 'Welcome guests, guide seating, maintain order, and create a warm, hospitable environment every service.', 1),
(4, 'Outreach Team', '🌍', 'Organize and participate in community outreach, evangelism, and social impact projects in our city.', 1),
(5, 'Children\'s Ministry', '👶', 'Nurture the faith of the youngest members through age-appropriate teaching and creative activities.', 1),
(6, 'Prayer Warriors', '🙏', 'Intercede for the congregation, city, and nation. Lead and participate in dedicated prayer sessions.', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Events
INSERT INTO `events` (`id`, `title`, `description`, `location`, `event_date`, `event_time`, `capacity`, `is_active`) VALUES
(1, 'Sunday Celebration & Encounter Service', 'Join us for our main weekly worship gathering with live praise, communion, and an uplifting message of hope.', 'LifeGen Main Sanctuary & Online', DATE_ADD(CURRENT_DATE(), INTERVAL 4 DAY), '10:00 AM - 12:00 PM', 350, 1),
(2, 'Youth & Young Adults Ignite Night', 'An energetic night of acoustic worship, real conversations, mentorship, and fellowship for high school & college students.', 'Youth Center Hall B', DATE_ADD(CURRENT_DATE(), INTERVAL 6 DAY), '6:30 PM - 9:00 PM', 120, 1),
(3, 'LifeGen Leadership & Ministry Summit', 'Equipping and alignment session for all ministry volunteers, D-Group leaders, and ministry team coordinators.', 'Conference Room 1 & Zoom', DATE_ADD(CURRENT_DATE(), INTERVAL 14 DAY), '1:00 PM - 4:00 PM', 80, 1)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Users & Members: Admin (admin@example.com / password123)
INSERT INTO `users` (`id`, `member_id`, `username`, `full_name`, `email`, `password`, `role`, `is_active`) VALUES
(1, 'LG-2026-ADMIN', 'admin', 'Chief Master Administrator', 'admin@example.com', '$2y$10$78nhl4pa.BfufziyJ230ueK3ToyaOf/S5EOxihg7vbVYR6Jtear.2', 'admin', 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

INSERT INTO `members` (`id`, `user_id`, `member_id`, `full_name`, `email`, `age`, `address`, `is_active`) VALUES
(1, 1, 'LG-2026-ADMIN', 'Chief Master Administrator', 'admin@example.com', 32, '100 Life Generation HQ, Innovation Blvd, Metro Manila', 1)
ON DUPLICATE KEY UPDATE `member_id`=VALUES(`member_id`);

-- Users & Members: Demo User (user@example.com / password123)
INSERT INTO `users` (`id`, `member_id`, `username`, `full_name`, `email`, `password`, `role`, `is_active`) VALUES
(2, 'LG-2026-DEMO1', 'danielle', 'Danielle Vitto', 'user@example.com', '$2y$10$78nhl4pa.BfufziyJ230ueK3ToyaOf/S5EOxihg7vbVYR6Jtear.2', 'user', 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

INSERT INTO `members` (`id`, `user_id`, `member_id`, `full_name`, `email`, `age`, `address`, `is_active`) VALUES
(2, 2, 'LG-2026-DEMO1', 'Danielle Vitto', 'user@example.com', 24, '742 Evergreen Terrace, Sector 4, Calabarzon', 1)
ON DUPLICATE KEY UPDATE `member_id`=VALUES(`member_id`);
