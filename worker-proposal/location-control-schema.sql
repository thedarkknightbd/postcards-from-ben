-- Run in a NEW dedicated D1 database, e.g. postcards-location-control.
-- Do NOT run this in LOCATION_HISTORY or ACCESS_DB.
CREATE TABLE IF NOT EXISTS location_control (
 id INTEGER PRIMARY KEY CHECK (id = 1),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
 enabled_at TEXT
);
INSERT OR IGNORE INTO location_control (id,enabled,enabled_at) VALUES (1,0,NULL);
SELECT id,enabled,enabled_at FROM location_control;
