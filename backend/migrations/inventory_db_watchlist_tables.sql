-- Inventory Database Tables for Watchlist Redesign
-- Run this manually on the inventory database (SQLite)
-- Location: /opt/BourbonDatabase/inventory.db (production)
--           backend/data/inventory.db (development - if separate)

-- ========================================
-- 1. custom_alcohol table
-- ========================================
-- Stores user-proposed PLUs not yet in official alcohol table
CREATE TABLE IF NOT EXISTS custom_alcohol (
  plu                   INTEGER PRIMARY KEY,
  proposed_name         TEXT NOT NULL,
  proposed_by_user_id   INTEGER NOT NULL,
  notes                 TEXT,
  status                TEXT CHECK(status IN ('pending','promoted','rejected','conflict')) DEFAULT 'pending',
  conflict_detected     INTEGER DEFAULT 0,
  conflict_reason       TEXT,
  official_name         TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now')),
  created_by_ip         TEXT,
  created_by_user_agent TEXT
);

CREATE INDEX IF NOT EXISTS ix_custom_alcohol_status ON custom_alcohol(status);
CREATE INDEX IF NOT EXISTS ix_custom_alcohol_user ON custom_alcohol(proposed_by_user_id);

-- ========================================
-- 2. product_change_log table
-- ========================================
-- Tracks inventory changes for notification system
CREATE TABLE IF NOT EXISTS product_change_log (
  change_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  plu          INTEGER NOT NULL,
  store_id     INTEGER NOT NULL,
  old_qty      INTEGER NOT NULL DEFAULT 0,
  new_qty      INTEGER NOT NULL DEFAULT 0,
  change_type  TEXT CHECK(change_type IN ('up','down','first','zero')) NOT NULL,
  check_time   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

CREATE INDEX IF NOT EXISTS ix_product_change_log_plu ON product_change_log(plu);
CREATE INDEX IF NOT EXISTS ix_product_change_log_store ON product_change_log(store_id);
CREATE INDEX IF NOT EXISTS ix_product_change_log_time ON product_change_log(check_time);
CREATE INDEX IF NOT EXISTS ix_product_change_log_plu_time ON product_change_log(plu, check_time);

-- ========================================
-- Verification Queries
-- ========================================
-- Run these to verify tables were created:
-- SELECT name FROM sqlite_master WHERE type='table' AND name IN ('custom_alcohol', 'product_change_log');
-- PRAGMA table_info(custom_alcohol);
-- PRAGMA table_info(product_change_log);
