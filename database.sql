-- ============================================================================
-- LIFE GENERATION COMPLETE DATABASE DUMP (database.sql)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `lgy_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `lgy_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `prayer_requests`;
DROP TABLE IF EXISTS `ministry_applications`;
DROP TABLE IF EXISTS `event_attendances`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `refresh_tokens`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `ministries`;
DROP TABLE IF EXISTS `dgroups`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `migrations`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. Migrations Tracker Table
-- ----------------------------------------------------------------------------
CREATE TABLE `migrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` INT NOT NULL,
  `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `migration_unique` (`migration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Dedicated Admins Table (SEPARATED FROM USERS)
-- ----------------------------------------------------------------------------
CREATE TABLE `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_username_unique` (`username`),
  UNIQUE KEY `admin_email_unique` (`email`),
  KEY `admin_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Users Table (Regular Members & Visitors)
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
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

-- ----------------------------------------------------------------------------
-- 4. Discipleship Groups Table
-- ----------------------------------------------------------------------------
CREATE TABLE `dgroups` (
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

-- ----------------------------------------------------------------------------
-- 5. Ministries Table
-- ----------------------------------------------------------------------------
CREATE TABLE `ministries` (
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

-- ----------------------------------------------------------------------------
-- 6. Members Profile Table
-- ----------------------------------------------------------------------------
CREATE TABLE `members` (
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

-- ----------------------------------------------------------------------------
-- 7. Refresh Tokens Table (JWT Session Management)
-- ----------------------------------------------------------------------------
CREATE TABLE `refresh_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token` TEXT NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `jti` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Events Table
-- ----------------------------------------------------------------------------
CREATE TABLE `events` (
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

-- ----------------------------------------------------------------------------
-- 9. Event Attendances Table (RSVP & QR Check-In)
-- ----------------------------------------------------------------------------
CREATE TABLE `event_attendances` (
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

-- ----------------------------------------------------------------------------
-- 10. Ministry Applications Table
-- ----------------------------------------------------------------------------
CREATE TABLE `ministry_applications` (
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

-- ----------------------------------------------------------------------------
-- 11. Prayer Requests Table
-- ----------------------------------------------------------------------------
CREATE TABLE `prayer_requests` (
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
-- Default password for all seed accounts: password123
-- ============================================================================

-- Seed Dedicated Admins Table
INSERT INTO `admins` (`id`, `username`, `full_name`, `email`, `password`, `role`, `is_active`) VALUES
(1, 'admin', 'Chief Master Administrator', 'admin@example.com', '$2y$10$w00K0/O6c7Fm2u0Ua7u.yutF7y/v0w2G4u6S0c8.d0U8U8bU0yO2q', 'admin', 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

-- Seed Users Table (Standard User)
INSERT INTO `users` (`id`, `username`, `full_name`, `email`, `password`, `role`, `is_active`) VALUES
(1, 'admin', 'Chief Master Administrator', 'admin@example.com', '$2y$10$w00K0/O6c7Fm2u0Ua7u.yutF7y/v0w2G4u6S0c8.d0U8U8bU0yO2q', 'admin', 1),
(2, 'danielle', 'Danielle Vitto', 'user@example.com', '$2y$10$w00K0/O6c7Fm2u0Ua7u.yutF7y/v0w2G4u6S0c8.d0U8U8bU0yO2q', 'user', 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

-- Seed Members Table
INSERT INTO `members` (`id`, `user_id`, `member_id`, `full_name`, `email`, `age`, `address`, `is_active`) VALUES
(1, 1, 'LG-2026-ADMIN', 'Chief Master Administrator', 'admin@example.com', 32, '100 Life Generation HQ, Metro Manila', 1),
(2, 2, 'LG-2026-DEMO1', 'Danielle Vitto', 'user@example.com', 24, '742 Evergreen Terrace, Sector 4', 1)
ON DUPLICATE KEY UPDATE `member_id`=VALUES(`member_id`);

-- Seed D-Groups
INSERT INTO `dgroups` (`id`, `name`, `leader_name`, `schedule`, `location`, `description`) VALUES
(1, 'LifeGen Young Professionals', 'Pastor Marcus Rivera', 'Saturdays 5:00 PM', 'Fellowship Room A & Zoom', 'A discipleship group for young working professionals navigating career, life, and faith.'),
(2, 'Youth Ignite', 'Danielle Vitto', 'Saturdays 1:30 PM', 'Youth Hall B', 'Unleashing the passion of high school and college students to make a difference for Christ.'),
(3, 'Couples Fellowship', 'Elder Thomas & Sarah Cruz', 'Fridays 7:30 PM', 'Main Sanctuary Room 3', 'Discipleship and fellowship for married couples focused on building Christ-centered families.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed Ministries
INSERT INTO `ministries` (`id`, `name`, `icon`, `description`, `is_active`) VALUES
(1, 'Worship Team', '🎵', 'Lead the congregation in musical worship through singing and instruments.', 1),
(2, 'Media & Tech', '📽️', 'Operate cameras, livestreaming, sound systems, and presentation software.', 1),
(3, 'Ushers & Greeters', '🤝', 'Welcome guests, guide seating, and maintain order every service.', 1),
(4, 'Outreach Team', '🌍', 'Community outreach, evangelism, and social impact projects in our city.', 1),
(5, 'Children\'s Ministry', '👶', 'Nurture the faith of the youngest members through age-appropriate teaching.', 1),
(6, 'Prayer Warriors', '🙏', 'Intercede for the congregation, city, and nation in dedicated prayer sessions.', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Seed Events
INSERT INTO `events` (`id`, `title`, `description`, `location`, `event_date`, `event_time`, `capacity`, `is_active`) VALUES
(1, 'Sunday Celebration & Encounter Service', 'Join us for our main weekly worship gathering with live praise, communion, and an uplifting message of hope.', 'LifeGen Main Sanctuary & Online', DATE_ADD(CURRENT_DATE(), INTERVAL 4 DAY), '10:00 AM - 12:00 PM', 350, 1),
(2, 'Youth & Young Adults Ignite Night', 'An energetic night of acoustic worship, real conversations, mentorship, and fellowship for students.', 'Youth Center Hall B', DATE_ADD(CURRENT_DATE(), INTERVAL 6 DAY), '6:30 PM - 9:00 PM', 120, 1),
(3, 'LifeGen Leadership & Ministry Summit', 'Equipping and alignment session for all ministry volunteers and D-Group leaders.', 'Conference Room 1 & Zoom', DATE_ADD(CURRENT_DATE(), INTERVAL 14 DAY), '1:00 PM - 4:00 PM', 80, 1)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);
