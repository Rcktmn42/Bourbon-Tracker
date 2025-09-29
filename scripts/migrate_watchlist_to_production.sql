-- Watchlist Production Migration Script
-- Run this on production databases after deploying the code

-- =====================================================
-- USER DATABASE MIGRATION (Run on production user DB)
-- =====================================================

-- Create user_watchlist table
CREATE TABLE IF NOT EXISTS user_watchlist (
    watch_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    plu           INTEGER NOT NULL,
    custom_name   TEXT,
    notify_email  BOOLEAN DEFAULT 1,
    notify_text   BOOLEAN DEFAULT 0,
    active        BOOLEAN DEFAULT 1,
    added_on      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, plu),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_plu_active
ON user_watchlist (user_id, plu, active);

-- =====================================================
-- INVENTORY DATABASE MIGRATION (Run on production inventory DB)
-- =====================================================

-- Create product_change_log table
CREATE TABLE IF NOT EXISTS product_change_log (
    change_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    plu           INTEGER NOT NULL,
    store_id      INTEGER,
    old_qty       INTEGER,
    new_qty       INTEGER,
    change_type   TEXT,
    check_time    DATETIME NOT NULL,
    FOREIGN KEY(store_id) REFERENCES stores(store_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_change_log_plu_time
ON product_change_log (plu, check_time);

CREATE INDEX IF NOT EXISTS idx_product_change_log_time
ON product_change_log (check_time);

-- Create user_last_notified table
CREATE TABLE IF NOT EXISTS user_last_notified (
    user_id       INTEGER NOT NULL,
    plu           INTEGER NOT NULL,
    last_notified DATETIME,
    PRIMARY KEY (user_id, plu)
);

-- Verify migration success
.print "Checking created tables..."
.tables user_watchlist
.tables product_change_log
.tables user_last_notified
.print "Migration complete!"