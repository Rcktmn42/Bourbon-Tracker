#!/bin/bash
# Email Log Monitor - Save as monitor_email_logs.sh

LOG_DIR="/opt/bourbon-tracker/backend/logs"

echo "=== Email System Log Monitor ==="
echo "Monitoring logs in: $LOG_DIR"
echo "Press Ctrl+C to stop"
echo ""

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo "❌ Log directory not found: $LOG_DIR"
    echo "Creating directory..."
    mkdir -p "$LOG_DIR"
    echo "✅ Directory created"
fi

# Function to show recent email activity
show_recent_activity() {
    echo "=== Recent Email Activity (last 50 entries) ==="
    if [ -f "$LOG_DIR/email.log" ]; then
        tail -50 "$LOG_DIR/email.log" | while IFS= read -r line; do
            # Pretty print JSON log entries
            echo "$line" | python3 -m json.tool 2>/dev/null || echo "$line"
            echo "---"
        done
    else
        echo "No email.log found yet"
    fi
    echo ""
}

# Function to show recent errors
show_recent_errors() {
    echo "=== Recent Email Errors (last 20 entries) ==="
    if [ -f "$LOG_DIR/error.log" ]; then
        tail -20 "$LOG_DIR/error.log" | grep -i email | while IFS= read -r line; do
            echo "$line" | python3 -m json.tool 2>/dev/null || echo "$line"
            echo "---"
        done
    else
        echo "No error.log found yet"
    fi
    echo ""
}

# Show initial state
show_recent_activity
show_recent_errors

echo "=== Live Monitoring (all email-related activity) ==="

# Monitor all log files for email activity
tail -f "$LOG_DIR"/*.log 2>/dev/null | while IFS= read -r line; do
    # Check if line contains email-related keywords
    if echo "$line" | grep -qi "email\|smtp\|nodemailer\|password.*reset\|verification"; then
        timestamp=$(date '+%H:%M:%S')
        echo "[$timestamp] $line"
        
        # Try to pretty print if it's JSON
        if echo "$line" | grep -q '^{.*}; then
            echo "$line" | python3 -m json.tool 2>/dev/null | sed 's/^/    /'
        fi
        echo ""
    fi
done