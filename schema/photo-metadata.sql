-- Postcards from Ben — Photo Library (Cloudflare D1)
-- Dedicated binding: PHOTO_DB (never LOCATION_DB).
-- Run once against the postcards-photo-metadata D1 database.
-- R2 remains the source of image bytes; D1 stores metadata only.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT,
  original_filename TEXT,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  taken_at TEXT,
  latitude REAL CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude REAL CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'draft', 'published')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  UNIQUE (country_code, name)
);

-- One photo can be shown in multiple countries/destinations if appropriate.
CREATE TABLE IF NOT EXISTS photo_destinations (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  PRIMARY KEY (photo_id, destination_id)
);

-- An image can be linked to multiple adventures/days without duplicating its R2 object.
CREATE TABLE IF NOT EXISTS photo_adventures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  adventure_slug TEXT NOT NULL,
  day_number INTEGER,
  journal_url TEXT,
  display_order INTEGER
);

CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_destinations_country ON destinations(country_code);
CREATE INDEX IF NOT EXISTS idx_photo_destinations_destination ON photo_destinations(destination_id);
CREATE INDEX IF NOT EXISTS idx_photo_adventures_day ON photo_adventures(adventure_slug, day_number);
