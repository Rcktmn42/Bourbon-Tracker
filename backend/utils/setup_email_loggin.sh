#!/bin/bash
# Setup Email Logging - Save as setup_email_logging.sh

APP_DIR="/opt/bourbon-tracker"
LOG_DIR="$APP_DIR/backend/logs"
BACKEND_DIR="$APP_DIR/backend"

echo "=== Setting up Email Logging System ==="

# 1. Create logs directory
echo "1. Creating logs directory..."
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"
echo "✅ Log directory created: $LOG_DIR"

# 2. Create utils directory if it doesn't exist
echo "2. Creating utils directory..."
mkdir -p "$BACKEND_DIR/utils"
chmod 755 "$BACKEND_DIR/utils"
echo "✅ Utils directory ready: $BACKEND_DIR/utils"

# 3. Set permissions
echo "3. Setting permissions..."
# Make sure your app user can write to logs (adjust user as needed)
chown -R $USER:$USER "$LOG_DIR"
chown -R $USER:$USER "$BACKEND_DIR/utils"
echo "✅ Permissions set"

# 4. Create initial log files
echo "4. Creating initial log files..."
touch "$LOG_DIR/email.log"
touch "$LOG_DIR/auth.log"
touch "$LOG_DIR/error.log"
touch "$LOG_DIR/app.log"
touch "$LOG_DIR/debug.log"
chmod 644 "$LOG_DIR"/*.log
echo "✅ Log files created"

# 5. Create log rotation config (optional)
echo "5. Setting up log rotation..."
cat > "/etc/logrotate.d/bourbon-tracker" << EOF
$LOG_DIR/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    create 644 $USER $USER
}
EOF
echo "✅ Log rotation configured"

# 6. Test log writing
echo "6. Testing log writing..."
echo "$(date): Email logging system initialized" >> "$LOG_DIR/app.log"
if [ $? -eq 0 ]; then
    echo "✅ Log writing test successful"
else
    echo "❌ Log writing test failed"
fi

echo ""
echo "=== Setup Complete ==="
echo "Log directory: $LOG_DIR"
echo "Files created:"
ls -la "$LOG_DIR"
echo ""
echo "Next steps:"
echo "1. Copy the logger.js file to $BACKEND_DIR/utils/logger.js"
echo "2. Update your emailService.js with the enhanced version"
echo "3. Add logging to your authController.js"
echo "4. Restart your Node.js application"
echo "5. Test with: curl http://localhost:3000/api/auth/test-email-system"
echo ""
echo "Monitor logs with: tail -f $LOG_DIR/email.log"