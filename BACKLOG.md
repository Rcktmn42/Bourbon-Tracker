# Bourbon Tracker - Issue Backlog

This file tracks known issues, bugs, and technical debt for the Bourbon Tracker project.

**Format**: Each issue has a status, priority, and detailed description with relevant context.

---

## Active Issues

### 🔴 HIGH PRIORITY

#### Issue #1: CSRF Protection Breaking Write Operations in Production
**Status**: ✅ Resolved
**Created**: 2025-01-30
**Resolved**: 2025-10-01
**Affects**: All POST/PATCH/PUT/DELETE operations
**Severity**: High - Blocking core features

**Description**:
Backend requires `X-Requested-With: XMLHttpRequest` header on all write operations in production, but most frontend fetch calls didn't include it. This caused `CSRF protection: Missing required headers for write operation` errors.

**Resolution**:
Systematically refactored all write operations (22 total) across 9 frontend files to use the `apiFetch` utility which automatically includes required CSRF headers.

**Files Updated**:
- ✅ `/frontend/src/pages/Register.jsx` - 1 POST operation
- ✅ `/frontend/src/pages/WatchlistPage.jsx` - 6 operations (POST, PATCH, DELETE)
- ✅ `/frontend/src/pages/EmailVerification.jsx` - 2 POST operations
- ✅ `/frontend/src/pages/Profile.jsx` - 2 operations (PUT, POST)
- ✅ `/frontend/src/pages/ResetPassword.jsx` - 1 POST operation
- ✅ `/frontend/src/pages/RequestPasswordReset.jsx` - 1 POST operation
- ✅ `/frontend/src/pages/AdminUsers.jsx` - 2 PATCH operations
- ✅ `/frontend/src/pages/Admin.jsx` - 3 operations (2 PATCH, 1 POST)
- ✅ `/frontend/src/contexts/AuthContext.jsx` - Login/Logout already fixed

**Additional Fixes**:
- Fixed Admin.jsx status update logic to properly handle database `status` column ('pending', 'active', 'disabled')
- Fixed backend validation schema to accept both `id` and `userId` parameters
- Updated backend controller to convert `isActive` boolean to status string for database

**Total Operations Fixed**: 22 write operations across 9 files

**Root Cause**:
`/backend/middleware/validationMiddleware.js` enforces CSRF headers in production, but frontend was developed/tested in dev mode where this check is disabled.

**Action Plan**: See `CSRF_FIX_ACTION_PLAN.md` (now completed)

---

### 🟡 MEDIUM PRIORITY

#### Issue #2: Nginx Configuration Documentation Mismatch
**Status**: ✅ Resolved
**Created**: 2025-01-30
**Resolved**: 2025-01-30

**Description**:
Documentation assumed Debian/Ubuntu nginx structure (`sites-available/sites-enabled`) but production EC2 uses RHEL/Amazon Linux structure (`nginx.conf` with `conf.d/`).

**Resolution**:
- Created `nginx.conf.production` for Amazon Linux
- Updated `EC2_PRODUCTION_UPDATE_PLAN.md` with actual deployment notes
- Documented in "ACTUAL DEPLOYMENT NOTES" section

**Lesson**: Always verify infrastructure assumptions against actual production environment.

---

#### Issue #3: Frontend Running Dev Server in Production
**Status**: ✅ Resolved
**Created**: 2025-01-30
**Resolved**: 2025-01-30

**Description**:
Production nginx was proxying to `localhost:5173` (Vite dev server) instead of serving built static files from `/opt/bourbon-tracker/frontend/dist`.

**Resolution**:
- Added frontend build step to deployment process
- Updated nginx config to serve from `dist` directory
- Updated documentation

---

#### Issue #4: Database Path Configuration Error
**Status**: ✅ Resolved
**Created**: 2025-01-30
**Resolved**: 2025-01-30

**Description**:
`.env` file had incorrect database path (`/opt/bourbon-tracker/data/`) but actual location is `/opt/bourbon-tracker/backend/data/`.

**Resolution**:
- Updated `.env` with correct path: `DATABASE_URL=/opt/bourbon-tracker/backend/data/database.sqlite3`
- Documented actual paths in deployment plan

---

#### Issue #5: ES Module require() Error
**Status**: ✅ Resolved
**Created**: 2025-01-30
**Resolved**: 2025-01-30

**Description**:
Backend used `require('crypto')` in ES module project, causing `ReferenceError: require is not defined`.

**Resolution**:
- Changed to ES module import: `import crypto from 'crypto'`
- Fixed in `/backend/server.js` line 11

---

### 🟢 LOW PRIORITY / TECHNICAL DEBT

#### Issue #6: Inconsistent Fetch Usage Across Frontend
**Status**: 🟡 Needs Refactoring
**Created**: 2025-01-30

**Description**:
Frontend uses mix of raw `fetch()` calls with inconsistent header patterns. Some files manually add headers, some use `apiFetch` utility, most do neither.

**Impact**:
- Hard to maintain
- Easy to miss required headers
- Inconsistent error handling

**Recommendation**:
After fixing CSRF issues (Issue #1), consider:
1. Standardize on `apiFetch` utility across all files
2. OR migrate to axios with global interceptors
3. Document standard patterns in `CLAUDE.md`

**Estimated Effort**: 3-4 hours

---

#### Issue #7: API Utility Not Used Consistently
**Status**: 🟡 Technical Debt
**Created**: 2025-01-30

**Description**:
Created `/frontend/src/utils/api.js` with `apiFetch()` wrapper but only 2 files currently use it. Most of codebase still uses raw fetch.

**Recommendation**:
Part of Issue #6 resolution - establish this as the standard and refactor existing code.

---

#### Issue #8: Create Automated Deployment Script
**Status**: 🟢 Enhancement
**Created**: 2025-01-30
**Priority**: Low (Quality of Life)

**Description**:
Currently deployment requires manually running multiple commands in sequence. Should create a single deployment script that handles all update steps with safety checks.

**Current Manual Process**:
```bash
cd /opt/bourbon-tracker
sudo git pull origin production-readiness
cd backend && sudo npm install
cd ../frontend && sudo npm install
cd ../backend && sudo npx knex migrate:latest
cd ../frontend && sudo npm run build
pm2 restart bourbon-tracker
```

**Proposed Solution**:
Create `/scripts/deploy.sh` that:
- Checks current branch and git status
- Prompts for database backup before migrations
- Runs all update steps in sequence
- Includes rollback capability
- Validates each step before proceeding
- Shows clear success/failure status
- Logs deployment for audit trail

**Benefits**:
- One-command deployments: `./scripts/deploy.sh`
- Reduces human error
- Consistent deployment process
- Built-in safety checks
- Easier for team members or AI assistants to execute

**Estimated Effort**: 2-3 hours

**Files to Create**:
- `/scripts/deploy.sh` - Main deployment script
- `/scripts/rollback.sh` - Quick rollback script
- Update `DEPLOYMENT.md` with new process

---

#### Issue #9: Document EC2 Production Environment Configuration
**Status**: 🔴 Critical Documentation Gap
**Created**: 2025-01-30
**Priority**: High (Knowledge Preservation)

**Description**:
Critical production environment details are scattered across multiple files or only known through manual discovery. Need centralized documentation of actual EC2 instance configuration so future work (by humans or AI) doesn't lose today's hard-earned knowledge.

**What We Learned Today** (that wasn't documented):
- RHEL/Amazon Linux uses `nginx.conf` + `conf.d/`, not `sites-available/sites-enabled`
- Frontend was running Vite dev server instead of production build
- Database actual path: `/opt/bourbon-tracker/backend/data/` not `/opt/bourbon-tracker/data/`
- PM2 caching requires delete+start, not just restart for code changes
- CSRF protection only enforced in production NODE_ENV

**Missing Documentation**:
- Exact EC2 instance type and specs
- OS version and distribution (Amazon Linux 2? AL2023?)
- Nginx version and installation method
- Node.js version
- PM2 version and installation method
- SSL certificate provider and renewal process
- Firewall/security group configuration
- File permissions and ownership
- System service configurations
- Cron jobs and scheduled tasks
- Log rotation setup
- Backup locations (local + S3?)

**Proposed Solution**:
Create `/docs/EC2_PRODUCTION_ENVIRONMENT.md` with:

1. **Instance Details**: Type, OS, region, networking
2. **Software Versions**: Node, npm, PM2, nginx, Python
3. **File Structure**: Exact paths for app, databases, images, logs, backups
4. **Service Configuration**: nginx, PM2, cron, SSL
5. **Environment Differences**: Dev vs Production behavioral differences
6. **Common Gotchas**: Known issues and their solutions
7. **Recovery Procedures**: Restart services, rollback, restore from backup
8. **Access & Credentials**: Where secrets live, how to rotate
9. **Monitoring**: How to check logs, health, performance

**Benefits**:
- Future AI sessions can read this file and understand the environment
- New team members can onboard faster
- Disaster recovery is documented
- Reduces "tribal knowledge" risk
- Debugging is faster with accurate environment info

**Estimated Effort**: 1-2 hours (document what we know + gather missing info from EC2)

**Action Items**:
1. SSH into EC2 and run audit commands (OS version, software versions, etc.)
2. Document actual configuration (not assumed/planned configuration)
3. Take screenshots of AWS console settings (security groups, etc.)
4. Create comprehensive markdown doc
5. Add to CLAUDE.md so AI always reads it

**Urgency**: High - Knowledge is fresh now, will be forgotten if not documented immediately

---

## Future Enhancements / Feature Backlog

### 🔵 ADMIN & USER MANAGEMENT

#### Issue #10: Admin Page Mobile Responsive Design
**Status**: 🟡 UI/UX Issue
**Created**: 2025-01-30
**Priority**: Medium

**Description**:
Admin page does not display properly on mobile devices. Need responsive design improvements.

**Estimated Effort**: 2-3 hours

---

#### Issue #11: Admin User Deletion with Cascade
**Status**: 🟢 Feature Request
**Created**: 2025-01-30
**Priority**: Low

**Description**:
Add ability for admin to delete users and their associated custom watchlist items.

**Requirements**:
- Delete user account
- Cascade delete all user's watchlist entries
- Confirmation dialog with warning
- Audit log of deletions
- Cannot delete self

**Database Changes**:
- Add cascading delete to watchlist foreign key
- Add soft delete option (mark inactive vs. hard delete)

**Estimated Effort**: 3-4 hours

**Files to Modify**:
- `/frontend/src/pages/AdminUsers.jsx`
- `/backend/routes/adminRoutes.js`
- `/backend/migrations/` (add cascade delete)

---

#### Issue #12: Power User Role Delegation
**Status**: 🟢 Feature Request
**Created**: 2025-01-30
**Priority**: Low

**Description**:
Allow power_user role to access certain admin functions without full admin privileges.

**Proposed Permissions**:
- View analytics/reports
- Edit store information
- Add/edit alcohol products
- Cannot manage users
- Cannot delete data

**Implementation**:
- Update middleware `requirePowerUser` checks
- Add role-based UI component visibility
- Document permission matrix

**Estimated Effort**: 2-3 hours

**Files to Modify**:
- `/backend/middleware/authMiddleware.js`
- Admin page components
- Routes that should allow power_user access

---

### 🔵 PRODUCT & INVENTORY MANAGEMENT

#### Issue #13: Admin Product Management Interface
**Status**: 🟢 Feature Request
**Created**: 2025-01-30
**Priority**: Medium

**Description**:
Create admin interface to manage alcohol product data directly from the website.

**Features Needed**:
1. **Add New Products**:
   - Form to add entirely new products to alcohol table
   - Fields: PLU, name, brand, size, price, allocation type, image URL
   - Validation and duplicate checking

2. **Edit Existing Products**:
   - Search/browse existing products
   - Edit missing values (price, size, description)
   - Update product metadata

3. **Update Allocation Types**:
   - Change allocation_type (allocated, limited, regular, barrel)
   - Bulk update capability
   - History tracking of changes

**Database Changes**:
- Add `products_audit_log` table for tracking admin changes
- Add `updated_by` and `updated_at` fields to alcohol table

**UI Components**:
- Admin > Products page
- Product search/filter
- Inline editing or modal forms
- Bulk actions interface

**Estimated Effort**: 8-12 hours (full CRUD interface)

**Files to Create**:
- `/frontend/src/pages/AdminProducts.jsx`
- `/backend/routes/productRoutes.js`
- `/backend/controllers/productController.js`
- `/backend/migrations/XXXXXX_add_product_audit.js`

---

#### Issue #14: Admin Store Management Interface
**Status**: 🟢 Feature Request
**Created**: 2025-01-30
**Priority**: Medium

**Description**:
Create admin interface to manage ABC store information from the website.

**Features Needed**:
1. **Edit Store Details**:
   - Add/update phone numbers
   - Update addresses
   - Change delivery days
   - Update mixed beverage status
   - Modify hours

2. **Add New Stores**:
   - Form to add new ABC store locations
   - Validation against duplicates

3. **Store Status**:
   - Mark stores as closed/relocated
   - Add notes/alerts

**Database Changes**:
- Add `phone`, `notes`, `status` columns to stores table
- Add stores audit log

**Estimated Effort**: 6-8 hours

**Files to Create**:
- `/frontend/src/pages/AdminStores.jsx`
- `/backend/routes/storeManagementRoutes.js`
- `/backend/migrations/XXXXXX_add_store_fields.js`

---

### 🔵 DATABASE MIGRATION & INFRASTRUCTURE

#### Issue #15: Migrate from SQLite to PostgreSQL
**Status**: 🟢 Major Infrastructure Change
**Created**: 2025-01-30
**Priority**: Low (Future Planning)

**Description**:
Migrate inventory database from SQLite to PostgreSQL for better performance, scalability, and concurrent access.

**Scope**:
1. **Database Migration**:
   - Export SQLite data
   - Create PostgreSQL schema
   - Import data with validation
   - Update connection strings

2. **Update Scripts**:
   - Modify Python warehouse report scripts
   - Update any direct database queries
   - Change backup scripts

3. **Deprecate Bourbon Table**:
   - Remove bourbon table from scripts
   - Consolidate into alcohol table
   - Clean up legacy code

4. **Environment Configuration**:
   - Add PostgreSQL credentials to .env
   - Update knexfile.js
   - Configure connection pooling

**Pre-requisites**:
- PostgreSQL installed on EC2 or RDS instance provisioned
- Backup of all SQLite data
- Testing environment to validate migration

**Risks**:
- Data loss if migration fails
- Downtime during cutover
- Script compatibility issues

**Estimated Effort**: 12-16 hours (full migration + testing)

**Migration Plan**:
1. Set up PostgreSQL instance
2. Create schema from SQLite
3. Test data import in staging
4. Update all scripts and queries
5. Final migration with downtime window
6. Validate data integrity
7. Monitor performance

**Files to Modify**:
- `/backend/config/database.js`
- All Python scripts in root directory
- Knex migrations
- Backup scripts

---

### 🔵 USER NOTIFICATIONS & WATCHLIST

#### Issue #16: Wake County Watchlist Integration
**Status**: 🟢 Feature Request
**Created**: 2025-01-30
**Priority**: Medium (User-Facing Feature)

**Description**:
Integrate custom user watchlists with Wake County data updates to enable notifications when watched products become available.

**Requirements**:

1. **Data Synchronization**:
   - Pull Wake County inventory data for watched products
   - Match user watchlist items to inventory updates
   - Track availability changes

2. **Notification System**:
   - Email notifications when watched items arrive
   - Configurable notification preferences (already in schema)
   - Interest type filtering (allocation, limited, barrel)
   - Digest vs. immediate notifications

3. **UI Updates**:
   - Show availability status on watchlist page
   - "In Stock at X stores" indicators
   - Link to stores with current inventory

4. **Backend Processing**:
   - Scheduled job to check watchlist against inventory
   - Queue system for sending notifications
   - Rate limiting to avoid spam
   - Opt-out functionality

**Technical Implementation**:
- Cron job or scheduled task
- Email template system
- Watchlist matching algorithm
- Notification delivery tracking

**Database Changes**:
- `notification_queue` table
- `notification_history` table
- Track last notification sent per user/product

**Estimated Effort**: 16-20 hours (complex feature)

**Phases**:
1. Phase 1: Data matching logic (4-6 hours)
2. Phase 2: Email notification system (6-8 hours)
3. Phase 3: UI updates for availability (4-6 hours)
4. Phase 4: User preferences and opt-out (2-4 hours)

**Files to Create**:
- `/backend/services/watchlistNotificationService.js`
- `/backend/jobs/checkWatchlistJob.js`
- `/backend/templates/watchlist-notification.html`
- `/backend/migrations/XXXXXX_notification_tables.js`

---

### 🔵 ANALYTICS & PREDICTIVE FEATURES

#### Issue #17: Predictive Delivery Analytics
**Status**: 🟢 Research & Development
**Created**: 2025-01-30
**Priority**: Low (Experimental)

**Description**:
Analyze historical delivery patterns to predict when specific products might be delivered to stores.

**Goals**:
- Predict delivery likelihood by store/product/timeframe
- Identify delivery patterns (seasonal, weekly, monthly)
- Surface insights to users ("likely to arrive in next 2 weeks")

**Challenges**:
- Limited historical data may reduce accuracy
- Highly variable delivery patterns
- Risk of user frustration if predictions are wrong
- Complex ML/statistical modeling required

**Approach**:
1. **Phase 1: Data Analysis** (Research)
   - Analyze existing delivery_history data
   - Identify patterns and trends
   - Determine if prediction is feasible
   - Document findings

2. **Phase 2: Simple Heuristics** (If feasible)
   - Calculate delivery frequency per product
   - Time since last delivery
   - Average days between deliveries
   - Confidence scores

3. **Phase 3: ML Model** (If warranted)
   - Train model on historical data
   - Features: product, store, time of year, previous deliveries
   - Validate accuracy before exposing to users

4. **Phase 4: UI Integration**
   - Show predictions with confidence levels
   - "Based on past data, X% chance of delivery in Y days"
   - Clear disclaimers about accuracy

**Estimated Effort**:
- Research: 4-6 hours
- Simple heuristics: 8-12 hours
- ML model: 20-40 hours (if pursued)

**Prerequisites**:
- Sufficient historical delivery data
- Statistical/ML expertise
- User expectation management

**Recommendation**: Start with Phase 1 research to determine feasibility before committing to implementation.

---

## Completed Issues

See resolved issues above (marked with ✅).

---

## How to Use This Backlog

### Adding a New Issue:
1. Add to appropriate priority section
2. Include: Status, Created Date, Description, Impact, Files Affected
3. Use emoji status indicators:
   - 🔴 Blocking/Broken
   - 🟡 In Progress
   - 🟢 Low Priority
   - ✅ Resolved

### Updating an Issue:
1. Change status emoji
2. Add resolution notes when fixed
3. Move to "Completed Issues" when resolved
4. Keep for historical reference

### Priority Levels:
- **🔴 HIGH**: Blocking features, security issues, data loss risk
- **🟡 MEDIUM**: Degraded functionality, documentation issues, deployment problems
- **🟢 LOW**: Technical debt, nice-to-haves, optimizations

---

## Integration with Claude Code

When starting a new session with Claude Code:

1. Reference this backlog: "Let's work on Issue #X from BACKLOG.md"
2. Claude can read context and jump right in
3. Update status as you work
4. Claude can help update the backlog at end of session

**Example**:
```
User: "Let's tackle Issue #1 from the backlog - the CSRF fix"
Claude: [reads BACKLOG.md and CSRF_FIX_ACTION_PLAN.md, starts Phase 1]
```

---

**Last Updated**: 2025-01-30
**Active Issues**: 2 High, 1 Medium, 3 Low
**Future Features**: 8 (Issues #10-17)
**Completed Issues**: 4

---

## Quick Priority Summary

### 🚨 IMMEDIATE (Tomorrow):
1. 🔴 **Issue #1** - Fix CSRF protection (blocking watchlist, admin page) - 2-3 hours
2. 🔴 **Issue #9** - Document EC2 environment (preserve today's knowledge) - 1-2 hours

### 📋 SHORT-TERM (This Week):
3. 🟢 **Issue #8** - Create deployment script - 2-3 hours
4. 🟡 **Issue #6 & #7** - Refactor fetch usage - 3-4 hours
5. 🟡 **Issue #10** - Fix admin page mobile responsive - 2-3 hours

### 🎯 MID-TERM (Next 2-4 Weeks):
6. **Issue #13** - Admin product management interface - 8-12 hours
7. **Issue #14** - Admin store management interface - 6-8 hours
8. **Issue #16** - Watchlist notifications system - 16-20 hours

### 🔮 LONG-TERM (Future Planning):
9. **Issue #15** - PostgreSQL migration - 12-16 hours (major undertaking)
10. **Issue #17** - Predictive analytics - Research phase first (4-6 hours)
11. **Issue #11** - User deletion with cascade - 3-4 hours
12. **Issue #12** - Power user delegation - 2-3 hours

---

## Feature Roadmap Overview

### Phase 1: Stabilization (Current)
- Fix CSRF issues
- Document environment
- Improve deployment process
- Code quality improvements

### Phase 2: Admin Tools Enhancement
- Mobile responsive admin page
- Product management interface
- Store management interface
- User deletion capability

### Phase 3: User Features
- Watchlist notifications
- Wake County integration
- Power user roles

### Phase 4: Infrastructure & Scale
- PostgreSQL migration
- Deprecate bourbon table
- Performance optimization

### Phase 5: Advanced Features (Experimental)
- Predictive delivery analytics
- ML-based recommendations
- Advanced reporting
