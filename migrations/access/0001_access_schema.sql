-- Development-only migration. Apply to a separate ACCESS_DB D1 database, never PHOTO_DB or LOCATION_DB.
-- Permissions are cumulative: public < location < private.
CREATE TABLE IF NOT EXISTS access_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL DEFAULT '',
  permission TEXT NOT NULL DEFAULT 'public' CHECK(permission IN ('public','location','private')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','revoked')),
  email_verified_at TEXT,
  approved_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_access_users_state ON access_users(state,created_at);
CREATE TABLE IF NOT EXISTS access_email_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES access_users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_access_challenges_user ON access_email_challenges(user_id,expires_at);
CREATE TABLE IF NOT EXISTS access_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES access_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_access_sessions_user ON access_sessions(user_id,expires_at);
CREATE TABLE IF NOT EXISTS access_passkeys (
  credential_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES access_users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_access_passkeys_user ON access_passkeys(user_id);
CREATE TABLE IF NOT EXISTS access_privacy (
  id INTEGER PRIMARY KEY CHECK(id=1),
  live_location_enabled INTEGER NOT NULL DEFAULT 0 CHECK(live_location_enabled IN (0,1)),
  history_enabled INTEGER NOT NULL DEFAULT 0 CHECK(history_enabled IN (0,1)),
  live_location_expires_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO access_privacy(id,live_location_enabled,history_enabled) VALUES(1,0,0);
CREATE TABLE IF NOT EXISTS access_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  subject_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_access_audit_time ON access_audit(created_at);
