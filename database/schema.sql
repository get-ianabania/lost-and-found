-- ============================================================
-- PLSP Lost & Found Management System
-- PostgreSQL Database Schema
-- ============================================================
-- NOTE: PostgreSQL differences from MySQL:
--   - Use SERIAL or GENERATED ALWAYS AS IDENTITY instead of AUTO_INCREMENT
--   - Use TEXT or VARCHAR instead of ENUM (or use custom TYPE)
--   - No backtick quoting; use double quotes if needed
--   - TIMESTAMP WITH TIME ZONE is preferred
-- ============================================================

-- Drop existing types if re-running (safe for dev)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS item_status CASCADE;
DROP TYPE IF EXISTS claim_status CASCADE;
DROP TYPE IF EXISTS approval_decision CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- Custom ENUM types (PostgreSQL way)
CREATE TYPE user_role       AS ENUM ('student', 'staff', 'finder', 'owner', 'admin');
CREATE TYPE item_status     AS ENUM ('lost', 'found', 'claimed', 'resolved', 'archived');
CREATE TYPE claim_status    AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE approval_decision AS ENUM ('approved', 'rejected', 'pending_info');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'in_app');

-- ============================================================
-- TABLE: users
-- Stores all users of the system (students, staff, admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id     SERIAL PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(100)        UNIQUE NOT NULL,
    password_hash VARCHAR(255)      NOT NULL,          -- bcrypt hash
    role        user_role           NOT NULL DEFAULT 'student',
    student_id  VARCHAR(50),                           -- school ID number
    department  VARCHAR(100),
    phone       VARCHAR(20),
    avatar_url  VARCHAR(255),
    is_active   BOOLEAN             DEFAULT TRUE,
    created_at  TIMESTAMPTZ         DEFAULT NOW(),
    updated_at  TIMESTAMPTZ         DEFAULT NOW()
);

-- Index for fast email lookups (login)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ============================================================
-- TABLE: items
-- Central table for all lost/found item reports
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
    item_id         SERIAL PRIMARY KEY,
    user_id         INTEGER             NOT NULL,       -- who reported it
    name            VARCHAR(100)        NOT NULL,
    description     TEXT,
    category        VARCHAR(50),                        -- e.g., Electronics, Clothing
    status          item_status         NOT NULL DEFAULT 'lost',
    location        VARCHAR(150),                       -- text description of location
    date_reported   DATE                NOT NULL DEFAULT CURRENT_DATE,
    date_lost_found DATE,                               -- when the item was actually lost/found
    is_archived     BOOLEAN             DEFAULT FALSE,
    auto_archive_at TIMESTAMPTZ,                        -- set 30 days from date_reported
    created_at      TIMESTAMPTZ         DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE NO ACTION
);

CREATE INDEX idx_items_status   ON items(status);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_user_id  ON items(user_id);
CREATE INDEX idx_items_location ON items(location);

-- ============================================================
-- TABLE: photos
-- Stores photo paths linked to items
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
    photo_id    SERIAL PRIMARY KEY,
    item_id     INTEGER         NOT NULL,
    file_path   VARCHAR(255)    NOT NULL,
    file_name   VARCHAR(255),
    uploaded_at TIMESTAMPTZ     DEFAULT NOW(),
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

CREATE INDEX idx_photos_item_id ON photos(item_id);

-- ============================================================
-- TABLE: status_tracker
-- Audit log of every status change on an item
-- ============================================================
CREATE TABLE IF NOT EXISTS status_tracker (
    status_id   SERIAL PRIMARY KEY,
    item_id     INTEGER         NOT NULL,
    old_status  VARCHAR(50),
    new_status  VARCHAR(50)     NOT NULL,
    changed_by  INTEGER,                    -- user_id of who changed it
    note        TEXT,                       -- optional reason/comment
    updated_at  TIMESTAMPTZ     DEFAULT NOW(),
    FOREIGN KEY (item_id)    REFERENCES items(item_id)  ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id)  ON DELETE SET NULL
);

CREATE INDEX idx_status_tracker_item_id ON status_tracker(item_id);

-- ============================================================
-- TABLE: claims
-- A user claims a found item belongs to them
-- ============================================================
CREATE TABLE IF NOT EXISTS claims (
    claim_id    SERIAL PRIMARY KEY,
    item_id     INTEGER         NOT NULL,
    user_id     INTEGER         NOT NULL,   -- claimant
    claim_date  DATE            NOT NULL DEFAULT CURRENT_DATE,
    status      claim_status    NOT NULL DEFAULT 'pending',
    note        TEXT,                       -- claimant's explanation
    created_at  TIMESTAMPTZ     DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     DEFAULT NOW(),
    FOREIGN KEY (item_id)  REFERENCES items(item_id)  ON DELETE NO ACTION,
    FOREIGN KEY (user_id)  REFERENCES users(user_id)  ON DELETE NO ACTION
);

CREATE INDEX idx_claims_item_id ON claims(item_id);
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status  ON claims(status);

-- ============================================================
-- TABLE: verification_quiz
-- Hidden questions set by finder/admin to verify ownership
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_quiz (
    quiz_id     SERIAL PRIMARY KEY,
    item_id     INTEGER         NOT NULL,
    question    VARCHAR(255)    NOT NULL,
    answer      VARCHAR(255)    NOT NULL,   -- stored as plain text (or hashed)
    created_by  INTEGER,                    -- user who created the question
    created_at  TIMESTAMPTZ     DEFAULT NOW(),
    FOREIGN KEY (item_id)    REFERENCES items(item_id)   ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id)   ON DELETE SET NULL
);

CREATE INDEX idx_quiz_item_id ON verification_quiz(item_id);

-- ============================================================
-- TABLE: quiz_attempts
-- Records each attempt at answering verification questions
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id  SERIAL PRIMARY KEY,
    quiz_id     INTEGER         NOT NULL,
    claim_id    INTEGER         NOT NULL,
    user_id     INTEGER         NOT NULL,
    answer_given VARCHAR(255)   NOT NULL,
    is_correct  BOOLEAN         NOT NULL,
    attempted_at TIMESTAMPTZ    DEFAULT NOW(),
    FOREIGN KEY (quiz_id)  REFERENCES verification_quiz(quiz_id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id)           ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(user_id)             ON DELETE NO ACTION
);

-- ============================================================
-- TABLE: admin_approvals
-- Admin reviews a claim and approves/rejects/requests more info
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_approvals (
    approval_id     SERIAL PRIMARY KEY,
    claim_id        INTEGER             NOT NULL,
    admin_id        INTEGER             NOT NULL,
    decision        approval_decision   NOT NULL,
    decision_note   TEXT,
    decision_date   TIMESTAMPTZ         DEFAULT NOW(),
    FOREIGN KEY (claim_id)  REFERENCES claims(claim_id)  ON DELETE NO ACTION,
    FOREIGN KEY (admin_id)  REFERENCES users(user_id)    ON DELETE NO ACTION
);

CREATE INDEX idx_approvals_claim_id ON admin_approvals(claim_id);
CREATE INDEX idx_approvals_admin_id ON admin_approvals(admin_id);

-- ============================================================
-- TABLE: messages
-- In-app messaging between users (linked to an item context)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    message_id  SERIAL PRIMARY KEY,
    sender_id   INTEGER     NOT NULL,
    receiver_id INTEGER     NOT NULL,
    item_id     INTEGER,                -- optional: conversation context
    content     TEXT        NOT NULL,
    is_read     BOOLEAN     DEFAULT FALSE,
    timestamp   TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (sender_id)   REFERENCES users(user_id) ON DELETE NO ACTION,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE NO ACTION,
    FOREIGN KEY (item_id)     REFERENCES items(item_id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_sender_id   ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);

-- ============================================================
-- TABLE: notifications
-- System notifications sent to users
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INTEGER             NOT NULL,
    type            notification_type   NOT NULL DEFAULT 'in_app',
    title           VARCHAR(150),
    message         TEXT                NOT NULL,
    is_read         BOOLEAN             DEFAULT FALSE,
    sent_at         TIMESTAMPTZ         DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE NO ACTION
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- TABLE: audit_trail
-- Logs every important action in the system for accountability
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_trail (
    log_id      SERIAL PRIMARY KEY,
    user_id     INTEGER         ,
    action      VARCHAR(255)    NOT NULL,   -- e.g., "CLAIM_SUBMITTED", "ITEM_REPORTED"
    entity_type VARCHAR(50),               -- e.g., "item", "claim", "user"
    entity_id   INTEGER,                   -- ID of the affected record
    ip_address  VARCHAR(45),
    metadata    JSONB,                     -- extra structured data
    timestamp   TIMESTAMPTZ     DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_user_id    ON audit_trail(user_id);
CREATE INDEX idx_audit_timestamp  ON audit_trail(timestamp);
CREATE INDEX idx_audit_entity     ON audit_trail(entity_type, entity_id);

-- ============================================================
-- TABLE: hotspot_analytics
-- Aggregated data about which locations have most lost items
-- ============================================================
CREATE TABLE IF NOT EXISTS hotspot_analytics (
    hotspot_id      SERIAL PRIMARY KEY,
    location        VARCHAR(150)    NOT NULL UNIQUE,
    report_count    INTEGER         DEFAULT 0,
    last_updated    TIMESTAMPTZ     DEFAULT NOW()
);

-- ============================================================
-- TABLE: campus_map
-- GPS coordinates for where items were lost/found
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_map (
    map_id      SERIAL PRIMARY KEY,
    item_id     INTEGER             NOT NULL UNIQUE,  -- one map entry per item
    latitude    DECIMAL(10, 7)      NOT NULL,
    longitude   DECIMAL(10, 7)      NOT NULL,
    label       VARCHAR(100),                         -- e.g., "Library Entrance"
    created_at  TIMESTAMPTZ         DEFAULT NOW(),
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

-- ============================================================
-- FUNCTION: auto-update updated_at on row changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: auto-update hotspot count when item is inserted
-- ============================================================
CREATE OR REPLACE FUNCTION update_hotspot_count()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO hotspot_analytics (location, report_count, last_updated)
    VALUES (NEW.location, 1, NOW())
    ON CONFLICT (location)
    DO UPDATE SET
        report_count = hotspot_analytics.report_count + 1,
        last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_items_hotspot
    AFTER INSERT ON items
    FOR EACH ROW
    WHEN (NEW.location IS NOT NULL)
    EXECUTE FUNCTION update_hotspot_count();

-- ============================================================
-- SEED: Default admin user (change password in production!)
-- Password: admin123 (bcrypt hash below is a placeholder)
-- ============================================================
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
    'PLSP Admin',
    'admin@plsp.edu.ph',
    '$2a$10$placeholder_change_this_hash_in_production',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;
