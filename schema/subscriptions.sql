-- Run once in Cloudflare D1's Console for postcards-subscribers.
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  frequency TEXT NOT NULL CHECK (frequency IN ('instant','daily','weekly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','unsubscribed')),
  confirmation_hash TEXT UNIQUE,
  unsubscribe_hash TEXT NOT NULL UNIQUE,
  confirmation_sent_at TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_sent_at TEXT
);
CREATE INDEX IF NOT EXISTS subscribers_delivery ON subscribers(status, frequency);
CREATE TABLE IF NOT EXISTS subscription_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS subscription_requests_window ON subscription_requests(ip_hash, created_at);
-- Future scheduled delivery: track each postcard once per subscriber.
CREATE TABLE IF NOT EXISTS postcard_deliveries (
  email TEXT NOT NULL,
  postcard_id TEXT NOT NULL,
  delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (email, postcard_id)
);
