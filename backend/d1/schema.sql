-- =====================================================
-- GatePass Management System — Cloudflare D1 (SQLite) schema
-- =====================================================
-- Applied with:  wrangler d1 execute <DB_NAME> --remote --file=d1/schema.sql
-- Replaces the previous Supabase/Postgres migrations 001–004.
-- Notes:
--  * Auth is handled by the FastAPI backend (users.password_hash), not Supabase Auth.
--  * No RLS: all DB access goes through the backend service account.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee'
                CHECK (role IN ('employee', 'vendor', 'hr', 'admin', 'security')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS gatepass_requests (
  id                       TEXT PRIMARY KEY,
  type                     TEXT NOT NULL CHECK (type IN ('leave', 'visitor', 'vendor')),
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  requester_id             TEXT NOT NULL REFERENCES users(id),
  approver_id               TEXT REFERENCES users(id),
  decided_at               TEXT,
  rejection_reason         TEXT,

  -- Validity
  valid_from               TEXT,
  valid_until              TEXT,

  -- Leave
  leave_type               TEXT,
  leave_days               INTEGER,
  leave_reason             TEXT,

  -- Visitor
  visitor_name             TEXT,
  visitor_phone            TEXT,
  visitor_purpose          TEXT,

  -- Vendor
  vendor_item_direction    TEXT CHECK (vendor_item_direction IN ('in', 'out') OR vendor_item_direction IS NULL),
  vendor_item_description  TEXT,
  vendor_company           TEXT,

  -- Common
  notes                    TEXT,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON gatepass_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status    ON gatepass_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type     ON gatepass_requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_approver ON gatepass_requests(approver_id);

CREATE TABLE IF NOT EXISTS gate_logs (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES gatepass_requests(id) ON DELETE CASCADE,
  logged_by   TEXT NOT NULL REFERENCES users(id),
  direction   TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  notes       TEXT,
  logged_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_gate_logs_request_logged_at ON gate_logs(request_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_gate_logs_request_created   ON gate_logs(request_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL,
  related_id  TEXT,
  is_read     INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user        ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dedup       ON notifications(user_id, type, related_id, is_read);
