#!/bin/bash
# Database backup script for NC Bourbon Tracker
# Place this in /opt/bourbon-tracker/scripts/backup-database.sh
# Make executable with: chmod +x backup-database.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/bourbon-tracker/backups"
USER_DB="/opt/bourbon-tracker/data/database.sqlite3"
INVENTORY_DB="/opt/BourbonDatabase/inventory.db"
S3_BUCKET="bourbon-tracker-backups" # Change to your S3 bucket
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="bourbon_tracker_backup_$TIMESTAMP"

echo "Starting database backup: $BACKUP_NAME"

# Create backup directory for this backup
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$BACKUP_PATH"

# Backup user database (if exists)
if [ -f "$USER_DB" ]; then
    echo "Backing up user database..."
    cp "$USER_DB" "$BACKUP_PATH/user_database.sqlite3"
    
    # Create SQL dump as well
    sqlite3 "$USER_DB" .dump > "$BACKUP_PATH/user_database.sql"
    echo "User database backed up successfully"
else
    echo "Warning: User database not found at $USER_DB"
fi

# Backup inventory database (if exists)
if [ -f "$INVENTORY_DB" ]; then
    echo "Backing up inventory database..."
    cp "$INVENTORY_DB" "$BACKUP_PATH/inventory_database.db"
    
    # Create SQL dump as well (but compress due to size)
    sqlite3 "$INVENTORY_DB" .dump | gzip > "$BACKUP_PATH/inventory_database.sql.gz"
    echo "Inventory database backed up successfully"
else
    echo "Warning: Inventory database not found at $INVENTORY_DB"
fi

# Add metadata
cat > "$BACKUP_PATH/backup_info.txt" << EOF
Backup Created: $(date)
Server: $(hostname)
User DB Size: $([ -f "$USER_DB" ] && stat -c%s "$USER_DB" || echo "N/A") bytes
Inventory DB Size: $([ -f "$INVENTORY_DB" ] && stat -c%s "$INVENTORY_DB" || echo "N/A") bytes
PM2 Status: $(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "Unknown")
EOF

# Compress the entire backup
echo "Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

# Remove uncompressed backup
rm -rf "$BACKUP_PATH"

echo "Backup compressed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Upload to S3 (optional - requires AWS CLI configured)
if command -v aws &> /dev/null && [ -n "${S3_BUCKET:-}" ]; then
    echo "Uploading to S3..."
    aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://$S3_BUCKET/database-backups/"
    echo "Backup uploaded to S3"
fi

# Clean up old local backups
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "bourbon_tracker_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Clean up old S3 backups (optional)
if command -v aws &> /dev/null && [ -n "${S3_BUCKET:-}" ]; then
    # List and delete old S3 backups
    OLD_DATE=$(date -d "$RETENTION_DAYS days ago" +"%Y%m%d")
    aws s3 ls "s3://$S3_BUCKET/database-backups/" | \
    awk '{print $4}' | \
    grep "bourbon_tracker_backup_" | \
    while read backup; do
        BACKUP_DATE=$(echo "$backup" | sed 's/bourbon_tracker_backup_\([0-9]\{8\}\).*/\1/')
        if [ "$BACKUP_DATE" -lt "$OLD_DATE" ]; then
            echo "Deleting old S3 backup: $backup"
            aws s3 rm "s3://$S3_BUCKET/database-backups/$backup"
        fi
    done
fi

echo "Database backup completed successfully: $BACKUP_NAME"

# Optional: Send notification (requires mail command or curl for webhooks)
# echo "Database backup completed on $(hostname)" | mail -s "Bourbon Tracker Backup" admin@example.com