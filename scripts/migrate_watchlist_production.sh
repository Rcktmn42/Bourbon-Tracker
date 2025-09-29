#!/bin/bash

# Watchlist Production Migration Script
# This script applies the watchlist database changes to production

set -e

echo "🚀 Starting Watchlist Production Migration..."

# Configuration
USER_DB_PATH="/opt/bourbon-tracker/data/database.sqlite3"
INVENTORY_DB_PATH="/opt/BourbonDatabase/inventory.db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if running on production server
if [ ! -f "$USER_DB_PATH" ] || [ ! -f "$INVENTORY_DB_PATH" ]; then
    echo "❌ Error: Production database files not found!"
    echo "Expected:"
    echo "  User DB: $USER_DB_PATH"
    echo "  Inventory DB: $INVENTORY_DB_PATH"
    exit 1
fi

# Backup databases before migration
echo "📦 Creating backups..."
cp "$USER_DB_PATH" "$USER_DB_PATH.backup.$(date +%Y%m%d_%H%M%S)"
cp "$INVENTORY_DB_PATH" "$INVENTORY_DB_PATH.backup.$(date +%Y%m%d_%H%M%S)"

echo "✅ Backups created"

# Apply user database migration
echo "🔄 Migrating user database..."
sqlite3 "$USER_DB_PATH" << 'EOF'
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

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_plu_active
ON user_watchlist (user_id, plu, active);

.print "User database migration complete"
EOF

echo "✅ User database migrated"

# Apply inventory database migration
echo "🔄 Migrating inventory database..."
sqlite3 "$INVENTORY_DB_PATH" << 'EOF'
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

-- Create indexes
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

.print "Inventory database migration complete"
EOF

echo "✅ Inventory database migrated"

# Verify migration
echo "🔍 Verifying migration..."

# Check user database tables
USER_TABLES=$(sqlite3 "$USER_DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='user_watchlist';")
if [ "$USER_TABLES" = "user_watchlist" ]; then
    echo "✅ user_watchlist table created successfully"
else
    echo "❌ user_watchlist table creation failed"
    exit 1
fi

# Check inventory database tables
INVENTORY_TABLES=$(sqlite3 "$INVENTORY_DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('product_change_log', 'user_last_notified');")
if [ "$INVENTORY_TABLES" = "2" ]; then
    echo "✅ product_change_log and user_last_notified tables created successfully"
else
    echo "❌ Inventory tables creation failed"
    exit 1
fi

echo "🎉 Watchlist migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy the updated application code"
echo "2. Restart the PM2 processes"
echo "3. Test the watchlist functionality"