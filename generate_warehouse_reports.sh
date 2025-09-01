#!/bin/bash

# Warehouse Inventory Report Generation Script
# This script is designed to be run as a cron job

# Set up paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Production paths (adjust for EC2)
if [ "$NODE_ENV" = "production" ]; then
    PYTHON_SCRIPT="/opt/bourbon-scripts/warehouse_inventory_generator.py"
    LOG_DIR="/opt/warehouse-reports"
else
    # Development paths
    PYTHON_SCRIPT="${SCRIPT_DIR}/warehouse_inventory_generator.py"
    LOG_DIR="${SCRIPT_DIR}/warehouse-reports"
fi

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Set up logging
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="${LOG_DIR}/cron_generation.log"

echo "[$TIMESTAMP] Starting warehouse inventory report generation" >> "$LOG_FILE"

# Set environment variables
export DEV_MODE="${DEV_MODE:-$([ "$NODE_ENV" != "production" ] && echo "true" || echo "false")}"

# Run the Python script
if command -v python3 &> /dev/null; then
    python3 "$PYTHON_SCRIPT" "$@" >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?
else
    echo "[$TIMESTAMP] ERROR: python3 not found" >> "$LOG_FILE"
    EXIT_CODE=1
fi

# Log completion
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
if [ $EXIT_CODE -eq 0 ]; then
    echo "[$TIMESTAMP] Warehouse inventory report generation completed successfully" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] Warehouse inventory report generation failed with exit code: $EXIT_CODE" >> "$LOG_FILE"
fi

exit $EXIT_CODE