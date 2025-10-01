# EC2 Production Update Plan: Main → Production-Readiness

## Overview
This document provides a comprehensive step-by-step plan to update your EC2 production environment from the main branch to the current production-readiness branch (6 commits ahead).

## Pre-Implementation Backup Checklist

### 1. Create EC2 Snapshot
- [ ] **EBS Volume Snapshot**: Create full disk-level snapshot in AWS Console
- [ ] **Document snapshot ID** for rollback reference

### 2. Manual Database Backups
Since you've already updated the databases manually, create additional backups:
```bash
# On EC2 Production Server
sudo mkdir -p /opt/bourbon-tracker/pre-update-backups

# Backup user database
sudo cp /opt/bourbon-tracker/data/database.sqlite3 /opt/bourbon-tracker/pre-update-backups/database.sqlite3.backup

# Backup inventory database
sudo cp /opt/BourbonDatabase/inventory.db /opt/bourbon-tracker/pre-update-backups/inventory.db.backup

# Backup current .env file
sudo cp /opt/bourbon-tracker/.env /opt/bourbon-tracker/pre-update-backups/.env.backup

# Backup PM2 ecosystem file (if exists)
sudo cp /opt/bourbon-tracker/ecosystem.config.js /opt/bourbon-tracker/pre-update-backups/ 2>/dev/null || echo "No ecosystem.config.js found"

# Backup nginx configuration
sudo cp /etc/nginx/sites-available/bourbon-tracker /opt/bourbon-tracker/pre-update-backups/nginx-site.conf.backup

# Backup current application files
sudo tar -czf /opt/bourbon-tracker/pre-update-backups/app-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='logs' \
  /opt/bourbon-tracker/
```

### 3. Service Status Documentation
```bash
# Document current running services
sudo systemctl status nginx > /opt/bourbon-tracker/pre-update-backups/nginx-status.txt
pm2 list > /opt/bourbon-tracker/pre-update-backups/pm2-status.txt
pm2 env 0 > /opt/bourbon-tracker/pre-update-backups/pm2-env.txt 2>/dev/null || echo "No PM2 process 0"
```

## Critical Changes Analysis

### Major Feature Additions:
1. **Watchlist System** - Complete user watchlist functionality
2. **Admin User Management** - Full admin dashboard for user management
3. **Enhanced Security** - Comprehensive security hardening
4. **Production Infrastructure** - PM2, nginx, backup systems
5. **Database Schema Changes** - New tables for watchlist and user preferences

### Database Migrations Required:
1. `create_user_watchlist` - New user watchlist table
2. `add_interest_type_to_user_watchlist` - Watchlist interest types
3. `add_notification_preferences_to_users` - User notification settings

### New Environment Variables:
- Enhanced `.env.example` with comprehensive production configuration
- New database configuration options
- Email configuration improvements

## Step-by-Step Update Process

### Phase 1: Stop Services (Estimated time: 2 minutes)
```bash
# Stop PM2 processes
pm2 stop all

# Note: Keep nginx running to show maintenance page
```

### Phase 2: Update Codebase (Estimated time: 5 minutes)
```bash
# Navigate to application directory
cd /opt/bourbon-tracker

# Stash any local changes (if any)
sudo git stash

# Fetch latest changes
sudo git fetch origin

# Switch to production-readiness branch
sudo git checkout production-readiness

# Pull latest changes
sudo git pull origin production-readiness

# Check current status
git log --oneline -5
```

### Phase 3: Update Dependencies (Estimated time: 3-5 minutes)
```bash
# Backend dependencies
cd /opt/bourbon-tracker/backend
sudo npm install

# Frontend dependencies
cd /opt/bourbon-tracker/frontend
sudo npm install

# Build frontend
sudo npm run build
```

### Phase 4: Database Migrations (Estimated time: 2-3 minutes)
```bash
cd /opt/bourbon-tracker/backend

# Run new migrations (only new ones will execute)
sudo npx knex migrate:latest

# Verify migration status
sudo npx knex migrate:status
```

### Phase 5: Environment Configuration (Estimated time: 5-10 minutes)
```bash
# Compare new .env.example with current .env
cd /opt/bourbon-tracker

# Review new environment variables needed
diff .env.example .env || echo "Creating comparison file..."

# MANUAL STEP: Update .env file with new variables
# Key additions needed:
# - Enhanced database configuration
# - New email configuration options
# - Production-specific settings
```

**Required .env Updates:**
```bash
# Add these new variables to your .env file:
EMAIL_FROM_ADDRESS=your_from_email@domain.com
ADMIN_EMAIL=your_admin@domain.com

# Enhanced database config (if using PostgreSQL in future)
DB_CLIENT=sqlite3
DATABASE_URL=/opt/bourbon-tracker/data/database.sqlite3
INVENTORY_DATABASE_URL=/opt/BourbonDatabase/inventory.db

# Images directory
IMAGES_DIR=/opt/Images/alcohol_images

# Rate limiting (production values)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined
```

### Phase 6: Infrastructure Updates (Estimated time: 5-10 minutes)

#### A. Update nginx Configuration
```bash
# Backup current nginx config
sudo cp /etc/nginx/sites-available/bourbon-tracker /etc/nginx/sites-available/bourbon-tracker.backup

# Copy new nginx configuration
sudo cp /opt/bourbon-tracker/nginx-site.conf /etc/nginx/sites-available/bourbon-tracker

# Test nginx configuration
sudo nginx -t

# Reload nginx if test passes
sudo systemctl reload nginx
```

#### B. Setup Log Rotation
```bash
# Install new logrotate configuration
sudo cp /opt/bourbon-tracker/logrotate.conf /etc/logrotate.d/bourbon-tracker

# Test logrotate configuration
sudo logrotate -d /etc/logrotate.d/bourbon-tracker
```

#### C. Update Backup Scripts
```bash
# Make backup script executable
sudo chmod +x /opt/bourbon-tracker/scripts/backup-database.sh

# Test backup script
sudo /opt/bourbon-tracker/scripts/backup-database.sh

# Update cron job for backups (if needed)
# Add to crontab: 0 2 * * * /opt/bourbon-tracker/scripts/backup-database.sh
```

### Phase 7: PM2 Process Management (Estimated time: 3-5 minutes)
```bash
cd /opt/bourbon-tracker

# Delete old PM2 processes
pm2 delete all

# Start with new configuration
pm2 start backend/server.js --name "bourbon-tracker" --instances 1

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the generated command instructions
```

### Phase 8: Verification (Estimated time: 5 minutes)
```bash
# Check PM2 status
pm2 status
pm2 logs --lines 20

# Check application health
curl -f http://localhost:3000/health || echo "Health check failed"

# Check nginx status
sudo systemctl status nginx

# Verify database connections
cd /opt/bourbon-tracker/backend
sudo npm run test 2>/dev/null || echo "No test script defined"

# Check frontend builds properly
cd /opt/bourbon-tracker/frontend
sudo npm run build
```

### Phase 9: Functional Testing (Estimated time: 10 minutes)
1. **[ ] Login/Registration** - Test user authentication
2. **[ ] Watchlist** - Test new watchlist functionality
3. **[ ] Admin Panel** - Test admin user management (if admin user)
4. **[ ] Mobile Cards** - Verify mobile responsive improvements
5. **[ ] Store Details** - Test store inventory displays
6. **[ ] Warehouse Inventory** - Verify warehouse reporting
7. **[ ] Database Integrity** - Spot check data consistency

## New Features Deployed

### 1. User Watchlist System
- **Location**: `/watchlist` route
- **Features**:
  - Add/remove products from personal watchlist
  - Custom product entries
  - Interest type tracking (allocation, limited, barrel)
  - Toggle notifications

### 2. Admin User Management
- **Location**: `/admin/users` route
- **Features**:
  - View all users
  - Update user roles (user, power_user, admin)
  - Update user status (active, inactive)
  - Enhanced role-based access control

### 3. Enhanced Security Features
- **Dual Authentication**: Bearer tokens + HTTP-only cookies
- **Enhanced Rate Limiting**: Multi-tier protection
- **CSRF Protection**: Custom headers for write operations
- **Input Validation**: Joi schemas on all endpoints

### 4. Mobile UI Improvements
- **Flexible Card Layouts**: Dynamic height cards that adapt to content
- **Progressive Breakpoints**: 768px, 480px, 360px optimizations
- **Unified Design**: Consistent styling across warehouse, watchlist, store pages
- **Better Image Handling**: Improved sizing and fallback mechanisms

## Rollback Plan (If Needed)

### Quick Rollback (5 minutes)
```bash
# Stop current PM2 processes
pm2 stop all

# Restore from backup
cd /opt/bourbon-tracker
sudo git checkout main
sudo git reset --hard origin/main

# Restore .env
sudo cp /opt/bourbon-tracker/pre-update-backups/.env.backup .env

# Restore databases (if database issues)
sudo cp /opt/bourbon-tracker/pre-update-backups/database.sqlite3.backup data/database.sqlite3
sudo cp /opt/bourbon-tracker/pre-update-backups/inventory.db.backup /opt/BourbonDatabase/inventory.db

# Reinstall dependencies
cd backend && sudo npm install
cd ../frontend && sudo npm install && sudo npm run build

# Restart services
pm2 start backend/server.js --name "bourbon-tracker"
```

### Full Rollback (Using EBS Snapshot)
1. Stop EC2 instance
2. Create new volume from snapshot
3. Attach volume to instance
4. Start instance

## Monitoring Post-Deployment

### Key Metrics to Watch:
1. **Application Response Time**: Check `/health` endpoint
2. **PM2 Process Status**: `pm2 monit`
3. **Database Performance**: Monitor query response times
4. **Error Logs**: `pm2 logs` and nginx error logs
5. **User Authentication**: Test login/registration flows
6. **New Features**: Watchlist and admin functionality

### Log Locations:
- **PM2 Logs**: `~/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **Application Logs**: `/opt/bourbon-tracker/logs/` (if configured)

## Estimated Total Downtime: 15-25 minutes

## Success Criteria:
- [ ] All services running (PM2, nginx)
- [ ] Health endpoint returns 200
- [ ] User authentication working
- [ ] Watchlist functionality accessible
- [ ] Admin panel functional (for admin users)
- [ ] Mobile responsive design improvements visible
- [ ] Database migrations completed successfully
- [ ] No critical errors in PM2 logs

---

**Created**: 2025-01-29
**Branch**: main → production-readiness (6 commits)
**Environment**: EC2 Production
**Estimated Duration**: 25-35 minutes total