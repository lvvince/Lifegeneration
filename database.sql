-- =====================================================================
--  LIFE GENERATION (LifeGen) - COMPLETE DATABASE
--  Database name : lifegenerationdb   (dapat pareho sa DB_NAME ng backend/.env)
--  Engine        : MySQL 5.7+ / 8.x / MariaDB 10.3+ (XAMPP, Laragon, WAMP OK)
--
--  PAANO I-IMPORT (phpMyAdmin):
--    1. Buksan ang phpMyAdmin > tab na "Import"
--    2. Piliin ang file na ito > Go
--    (Kusa nitong gagawin ang database kung wala pa.)
--  O sa terminal:  mysql -u root -p < lifegenerationdb.sql
--
--  Safe i-run ulit: puro CREATE TABLE IF NOT EXISTS at hindi nag-du-drop ng data.
--  Hindi na kailangan i-run ang migrations o update_db.php kapag ito ang na-import.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS lifegenerationdb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lifegenerationdb;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. ACCOUNTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id       VARCHAR(50)  NULL,
  username        VARCHAR(100) NOT NULL,
  full_name       VARCHAR(150) NULL,
  gender          ENUM('Male','Female') NULL,
  email           VARCHAR(255) NOT NULL,
  google_id       VARCHAR(255) NULL,
  address         TEXT NULL,
  age             INT UNSIGNED NULL,
  password        VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NULL,
  role            VARCHAR(50)  NOT NULL DEFAULT 'user',          -- user | officer | moderator | admin
  membership_tier VARCHAR(50)  NOT NULL DEFAULT 'Standard Member',
  is_active       TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY username_unique (username),
  UNIQUE KEY email_unique (email),
  KEY role_idx (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username   VARCHAR(100) NOT NULL,
  full_name  VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50)  NOT NULL DEFAULT 'admin',
  avatar     VARCHAR(255) NULL,
  is_active  TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY admin_username_unique (username),
  UNIQUE KEY admin_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token      TEXT NOT NULL,
  token_hash VARCHAR(64) NULL,
  jti        VARCHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY refresh_user_idx (user_id),
  KEY refresh_hash_idx (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_token_hash (token_hash),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. GROUPS & MINISTRIES & MEMBERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dgroups (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  leader_name VARCHAR(150) NOT NULL,
  schedule    VARCHAR(100) NOT NULL DEFAULT '',
  location    VARCHAR(255) NOT NULL DEFAULT '',
  gc_link     VARCHAR(255) NULL,
  description TEXT NULL,
  image       VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ministries (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(100) NOT NULL,
  description     TEXT NULL,
  icon            VARCHAR(10)  NULL DEFAULT '✦',
  image           VARCHAR(255) NULL,
  slots_available INT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS members (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  dgroup_id       INT UNSIGNED NULL,
  ministry_id     INT UNSIGNED NULL,
  member_id       VARCHAR(50)  NULL,
  member_code     VARCHAR(50)  NULL,
  full_name       VARCHAR(150) NOT NULL,
  gender          ENUM('Male','Female') NULL,
  avatar          VARCHAR(255) NULL,
  age             INT UNSIGNED NULL,
  address         TEXT NULL,
  email           VARCHAR(255) NOT NULL,
  membership_tier VARCHAR(50)  NOT NULL DEFAULT 'Standard Member',
  is_active       TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  status          VARCHAR(20)  NOT NULL DEFAULT 'approved',      -- pending | approved | rejected
  joined_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY members_user_id_unique (user_id),
  UNIQUE KEY members_member_id_unique (member_id),
  KEY members_email_idx (email),
  KEY members_dgroup_idx (dgroup_id),
  KEY members_ministry_idx (ministry_id),
  CONSTRAINT fk_members_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_members_dgroup   FOREIGN KEY (dgroup_id)   REFERENCES dgroups(id)    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_members_ministry FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dgroup_requests (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dgroup_id    INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  request_note TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_dgroup_user (dgroup_id, user_id),
  KEY idx_status (status),
  KEY idx_user (user_id),
  KEY idx_dgroup (dgroup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ministry_applications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  ministry_id INT UNSIGNED NOT NULL,
  member_name VARCHAR(150) NOT NULL,
  message     TEXT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',            -- pending | approved | rejected
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NULL,
  PRIMARY KEY (id),
  KEY app_user_idx (user_id),
  KEY app_ministry_idx (ministry_id),
  CONSTRAINT fk_ministryapp_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ministryapp_ministry FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. EVENTS & ATTENDANCE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(150) NOT NULL,
  description  TEXT NULL,
  banner_image VARCHAR(255) NULL,
  location     VARCHAR(255) NOT NULL DEFAULT '',
  map_url      TEXT NULL,
  event_date   DATE NOT NULL,
  event_time   VARCHAR(50) NOT NULL DEFAULT '',
  capacity     INT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NULL,
  PRIMARY KEY (id),
  KEY event_date_idx (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_attendances (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id      INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  member_id     VARCHAR(50)  NOT NULL,
  member_name   VARCHAR(150) NOT NULL,
  rsvp_status   VARCHAR(20)  NOT NULL DEFAULT 'attending',       -- attending | cancelled
  checked_in    TINYINT(1)   NOT NULL DEFAULT 0,
  checked_in_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY event_user_unique (event_id, user_id),
  KEY att_user_idx (user_id),
  CONSTRAINT fk_eventattend_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_eventattend_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. ANNOUNCEMENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(200) NOT NULL,
  content    TEXT NOT NULL,
  category   ENUM('urgent','event','ministry','general') NOT NULL DEFAULT 'general',
  badge_text VARCHAR(50)  NULL,
  link_url   VARCHAR(255) NULL,
  link_text  VARCHAR(100) NULL,
  is_pinned  TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  is_active  TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_active_pinned (is_active, is_pinned, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. PRAYER WALL & "WHERE HAVE YOU SEEN GOD TODAY?"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_requests (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  member_name VARCHAR(150) NOT NULL DEFAULT 'Anonymous',
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  image       VARCHAR(255) NULL,
  visibility  VARCHAR(20)  NOT NULL DEFAULT 'public',            -- public | private (leaders only)
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',            -- active | answered
  category    VARCHAR(20)  NOT NULL DEFAULT 'personal',          -- personal | family | healing | guidance | gratitude | others
  testimony   TEXT NULL,
  answered_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NULL,
  PRIMARY KEY (id),
  KEY prayer_user_idx (user_id),
  CONSTRAINT fk_prayerreq_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prayer_prayers (
  prayer_id  INT NOT NULL,
  user_id    INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (prayer_id, user_id),
  KEY pp_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sighting_posts (
  id          INT NOT NULL AUTO_INCREMENT,
  user_id     INT NOT NULL,
  author_name VARCHAR(120) NOT NULL,
  body        TEXT NOT NULL,
  image       VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY sp_user_idx (user_id),
  KEY sp_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sighting_reactions (
  post_id    INT NOT NULL,
  user_id    INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sighting_comments (
  id          INT NOT NULL AUTO_INCREMENT,
  post_id     INT NOT NULL,
  user_id     INT NOT NULL,
  author_name VARCHAR(120) NOT NULL,
  body        VARCHAR(500) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY sc_post_idx (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 6. DONATIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donation_campaigns (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title            VARCHAR(150) NOT NULL,
  category         VARCHAR(50)  NOT NULL DEFAULT 'offering',
  description      TEXT NULL,
  target_amount    DECIMAL(12,2) NULL,
  collected_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  image            VARCHAR(255) NULL,
  is_active        TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_active (is_active),
  KEY idx_cat (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS donations (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tracking_code    VARCHAR(32)  NOT NULL,
  user_id          INT UNSIGNED NULL,
  campaign_id      INT UNSIGNED NULL,
  donor_name       VARCHAR(150) NOT NULL,
  is_anonymous     TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  donor_email      VARCHAR(255) NULL,
  donor_phone      VARCHAR(50)  NULL,
  category         VARCHAR(50)  NOT NULL DEFAULT 'offering',
  amount           DECIMAL(12,2) NOT NULL,
  payment_method   ENUM('gcash','maya','bank_transfer','cash','other') NOT NULL DEFAULT 'gcash',
  reference_number VARCHAR(100) NULL,
  proof_receipt    VARCHAR(255) NULL,
  status           ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  admin_notes      TEXT NULL,
  donor_message    TEXT NULL,
  verified_by      INT UNSIGNED NULL,
  verified_at      DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY tracking_code_unique (tracking_code),
  KEY idx_user (user_id),
  KEY idx_campaign (campaign_id),
  KEY idx_status (status),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. FELLOWSHIP CHAT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_channels (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(80)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  kind        VARCHAR(20)  NOT NULL DEFAULT 'general',
  ref_id      INT UNSIGNED NULL,
  is_readonly TINYINT(1) NOT NULL DEFAULT 0,
  staff_only  TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 10,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY chat_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel_id   INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  kind         VARCHAR(20)  NOT NULL DEFAULT 'message',
  title        VARCHAR(160) NULL,
  body         TEXT NULL,
  image        VARCHAR(255) NULL,
  reply_to     INT UNSIGNED NULL,
  is_pinned    TINYINT(1) NOT NULL DEFAULT 0,
  is_important TINYINT(1) NOT NULL DEFAULT 0,
  edited_at    DATETIME NULL,
  deleted_at   DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY chat_ch (channel_id, id),
  KEY chat_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_reactions (
  message_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  reaction   VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id, reaction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_mentions (
  message_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  PRIMARY KEY (message_id, user_id),
  KEY chat_men_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_acks (
  message_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_reads (
  channel_id   INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  last_read_id INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (channel_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_mutes (
  user_id  INT UNSIGNED NOT NULL,
  until_at DATETIME NOT NULL,
  reason   VARCHAR(255) NULL,
  by_user  INT UNSIGNED NULL,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(160) NOT NULL,
  kind        VARCHAR(20)  NOT NULL DEFAULT 'fellowship',
  description TEXT NULL,
  meet_url    VARCHAR(255) NOT NULL,
  starts_at   DATETIME NOT NULL,
  ends_at     DATETIME NOT NULL,
  channel_id  INT UNSIGNED NULL,
  host_id     INT UNSIGNED NOT NULL,
  notes       TEXT NULL,
  event_id    VARCHAR(255) NULL,
  status      VARCHAR(12)  NOT NULL DEFAULT 'scheduled',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY chat_sess_time (starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_session_rsvps (
  session_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  rsvp       VARCHAR(10) NOT NULL DEFAULT 'going',
  joined_at  DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_google (
  id            TINYINT UNSIGNED NOT NULL,
  refresh_token TEXT NULL,
  email         VARCHAR(190) NULL,
  oauth_state   VARCHAR(64) NULL,
  state_at      DATETIME NULL,
  connected_by  INT UNSIGNED NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_presence (
  user_id   INT UNSIGNED NOT NULL,
  last_seen DATETIME NOT NULL,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
--  STARTER DATA (walang ma-du-duplicate kapag inulit ang import)
--  Ang chat channels ay kusang nagagawa ng app pagbukas ng Fellowship Chat.
-- =====================================================================

INSERT INTO announcements (title, content, category, badge_text, is_pinned, is_active)
SELECT 'Welcome to Life Generation Calapan!',
       'Join us this week for youth gatherings, discipleship groups, and fellowship. Check our events tab to register.',
       'general', 'Welcome', 1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM announcements);

INSERT INTO donation_campaigns (title, category, description, target_amount, is_active)
SELECT * FROM (
  SELECT 'Tithes & General Offerings' AS title, 'tithe' AS category, 'Support Sunday celebrations, weekly discipleship gatherings, and regular ministry operations.' AS description, NULL AS target_amount, 1 AS is_active
  UNION ALL SELECT 'Youth Camp & Summit 2026', 'camp_sponsor', 'Sponsor a student or young adult to attend the LifeGen Leadership & Ministry Summit.', 50000.00, 1
  UNION ALL SELECT 'Missions & Community Outreach', 'missions', 'Fund school supply drives, feeding programs, and rural mission works.', 30000.00, 1
  UNION ALL SELECT 'Audio & Multimedia Equipment Fund', 'building_fund', 'Help improve sound system, musical instruments, and media livestreaming gear.', 45000.00, 1
  UNION ALL SELECT 'Benevolence & Love Gift', 'benevolence', 'Provide immediate financial or medical aid to brethren and community members in need.', NULL, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM donation_campaigns);

-- Default ADMIN account para may mapasukan agad ang mga kaklase:
--   Username : admin        Password : Admin@12345
-- PALITAN o i-delete ito bago i-deploy sa totoong server.
INSERT INTO admins (username, full_name, email, password, role, is_active)
SELECT 'admin', 'LifeGen Administrator', 'admin@lifegen.local', '$2y$10$7Cg6knckonIc2nltyKKvUuA.iObKDAPeV3zKcQJWM9q82.J8pH/ay', 'admin', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');