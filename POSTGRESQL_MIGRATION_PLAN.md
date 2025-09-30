# PostgreSQL Migration Plan: Inventory Database

## Overview

This document outlines the complete migration plan for moving the inventory database from SQLite to PostgreSQL to improve concurrency handling and production scalability.

## Current Architecture Analysis

### ✅ Good News: Already Well-Prepared!

Your application architecture is already designed for this migration:

- **Dual Database Design**: User DB (SQLite, manageable) + Inventory DB (SQLite → PostgreSQL)
- **Database Manager**: `backend/config/databaseSafety.js` already supports PostgreSQL via `DB_CLIENT=pg`
- **Knex Configuration**: PostgreSQL configs exist in `backend/knexfile.js`
- **Environment Variables**: `.env.example` has PostgreSQL connection examples
- **Migrations**: 16 Knex migrations define complete schema for PostgreSQL deployment

### Current Database Structure

**User Database (Keep SQLite)**:
- `users` - User accounts, authentication
- `user_watchlist` - User preferences
- Size: Small, manageable with SQLite

**Inventory Database (Migrate to PostgreSQL)**:
- `stores` - ABC store locations (171 stores)
- `alcohol` - Product catalog (~2,000+ products)
- `current_inventory` - Current stock levels
- `inventory_history` - Historical snapshots (large, high-write volume)
- `warehouse_inventory_history_v2` - Warehouse tracking
- `shipments_history` - Delivery records
- `boards` - Distribution boards
- `bourbons` - Bourbon-specific data

## Migration Components

### 1. Backend/Website Updates (MINIMAL EFFORT)

**Already Complete:**
- ✅ Database manager supports PostgreSQL
- ✅ Connection pooling configured
- ✅ Environment variable structure ready
- ✅ Knex migrations exist

**Required Changes:**
```bash
# Install PostgreSQL driver
cd backend
npm install pg

# Update environment variables
DB_CLIENT=pg
INVENTORY_DATABASE_URL=postgresql://username:password@localhost:5432/bourbon_inventory
```

### 2. Database Schema Migration

**Source Schema**: 16 Knex migration files in `backend/migrations/`
- `20250805013332_create_alcohol_table.js`
- `20250805013827_create_current_inventory_table.js`
- `20250805014216_create_inventory_history_table.js`
- `20250805014453_create_warehouse_inventory_history_v2_table.js`
- `20250805014727_create_shipments_history_table.js`
- And 11 others...

**Migration Steps:**
1. Create PostgreSQL database
2. Run Knex migrations: `npx knex migrate:latest`
3. Export SQLite data with schema-aware conversion
4. Import data to PostgreSQL with type conversions

### 3. Python Scripts Migration (5 Scripts to Update)

#### Scripts Requiring Updates:

**1. `warehouse_inventory_generator.py`**
- **Purpose**: Creates warehouse inventory JSON reports
- **Current**: Uses `sqlite3` with database safety measures
- **Changes**: Replace SQLite with PostgreSQL connector

**2. `warehouse_inventory_updater.py`**
- **Purpose**: Updates existing inventory entries with price/listing changes
- **Current**: Uses `sqlite3` with business rule protection
- **Changes**: PostgreSQL connector + transaction handling

**3. `shipment_data_updater.py`**
- **Purpose**: Processes ABC shipment data updates
- **Current**: Uses `sqlite3` with concurrent access protection
- **Changes**: PostgreSQL connector + connection pooling

**4. `wake_county_scanner.py`**
- **Purpose**: Scans Wake County ABC inventory
- **Current**: Uses `sqlite3` via database_safety module
- **Changes**: PostgreSQL connector integration

**5. `database_safety.py`**
- **Purpose**: Base utility for safe database operations
- **Current**: SQLite-specific safety pragmas and connection management
- **Changes**: PostgreSQL-specific connection pooling and safety measures

#### Required Changes Per Script:

```python
# BEFORE (SQLite)
import sqlite3
from database_safety import get_database_manager

# AFTER (PostgreSQL)
import psycopg2
from psycopg2.extras import RealDictCursor
# OR use SQLAlchemy for ORM approach
```

**Connection String Updates:**
```python
# BEFORE
DB_PATH = '/opt/BourbonDatabase/inventory.db'

# AFTER
DATABASE_URL = 'postgresql://username:password@localhost:5432/bourbon_inventory'
```

**SQL Syntax Differences:**
- Date handling: SQLite `date()` → PostgreSQL `DATE`
- Auto-increment: SQLite `INTEGER PRIMARY KEY` → PostgreSQL `SERIAL PRIMARY KEY`
- String comparison: Case sensitivity differences
- LIMIT/OFFSET syntax variations

### 4. Infrastructure/Deployment Updates

**PostgreSQL Installation:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Configure PostgreSQL
sudo -u postgres psql
CREATE DATABASE bourbon_inventory;
CREATE USER bourbon_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE bourbon_inventory TO bourbon_user;
```

**Performance Configuration:**
```sql
-- Optimize for concurrent access
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
SELECT pg_reload_conf();
```

**Backup Script Updates:**
- Update `scripts/backup-database.sh` for PostgreSQL
- Replace SQLite dumps with `pg_dump`
- Modify S3 backup procedures

### 5. Python Dependencies Update

**Current `requirements.txt`:**
```
requests>=2.31.0
beautifulsoup4>=4.12.0
pandas>=2.0.0
lxml>=4.9.0
html5lib>=1.1
```

**Updated `requirements.txt`:**
```
requests>=2.31.0
beautifulsoup4>=4.12.0
pandas>=2.0.0
lxml>=4.9.0
html5lib>=1.1
psycopg2-binary>=2.9.0  # PostgreSQL adapter
sqlalchemy>=2.0.0       # Optional: ORM approach
```

## Migration Timeline & Effort Estimates

### Phase 1: Infrastructure Setup (2-3 hours)
- [ ] Install PostgreSQL server
- [ ] Configure connection pooling
- [ ] Set up backup procedures
- [ ] Install Node.js `pg` package
- [ ] Update environment variables

### Phase 2: Schema Migration (2-4 hours)
- [ ] Create PostgreSQL database
- [ ] Run Knex migrations for schema creation
- [ ] Export SQLite data with type conversion
- [ ] Import data to PostgreSQL
- [ ] Validate data integrity

### Phase 3: Python Scripts Migration (6-8 hours)
- [ ] Update `database_safety.py` base class (2 hours)
- [ ] Migrate `warehouse_inventory_generator.py` (1.5 hours)
- [ ] Migrate `warehouse_inventory_updater.py` (1.5 hours)
- [ ] Migrate `shipment_data_updater.py` (1 hour)
- [ ] Migrate `wake_county_scanner.py` (1 hour)
- [ ] Update `requirements.txt` and test (1 hour)

### Phase 4: Testing & Validation (2-3 hours)
- [ ] Test all website functionality
- [ ] Validate Python script operations
- [ ] Performance testing
- [ ] Concurrent access testing

### Phase 5: Production Deployment (2-3 hours)
- [ ] Deploy PostgreSQL to production
- [ ] Migrate production data
- [ ] Update cron jobs and systemd services
- [ ] Monitor and validate

**Total Estimated Time: 14-21 hours**

## Benefits of Migration

### Immediate Benefits
- **Better Concurrency**: Eliminates SQLite file locking issues
- **ACID Compliance**: Stronger data consistency guarantees
- **Connection Pooling**: Efficient resource utilization
- **Transaction Management**: Better handling of complex operations

### Long-term Benefits
- **Scalability**: Handles larger datasets efficiently
- **Performance**: Advanced query optimization and indexing
- **Production Ready**: Industry standard for concurrent web applications
- **Monitoring**: Better tools for database performance analysis

## Rollback Plan

In case of issues during migration:

1. **Keep SQLite as backup** during transition period
2. **Environment variable switch**: Change `DB_CLIENT` back to `sqlite3`
3. **Data restore**: Restore from pre-migration SQLite backups
4. **Script rollback**: Git revert Python script changes

## Risk Assessment

**Low Risk:**
- Backend changes (already designed for PostgreSQL)
- Schema migration (Knex handles differences)

**Medium Risk:**
- Python script updates (SQL syntax differences)
- Data migration (type conversion issues)

**Mitigation Strategies:**
- Thorough testing in development environment
- Incremental script migration (one at a time)
- Maintain SQLite backup during transition
- Performance monitoring post-migration

## Post-Migration Monitoring

**Key Metrics to Monitor:**
- Database connection pool utilization
- Query performance (especially large inventory operations)
- Concurrent access patterns
- Backup success rates
- Python script execution times

**Tools:**
- PostgreSQL `pg_stat_activity` for connection monitoring
- Application logs for performance tracking
- Database query analysis with `EXPLAIN ANALYZE`

## Next Steps

When ready to proceed:
1. **Schedule maintenance window** for production migration
2. **Set up development PostgreSQL** for testing
3. **Begin with Phase 1** infrastructure setup
4. **Test thoroughly** before production deployment

---

**Document Version**: 1.0
**Created**: 2025-01-29
**Author**: Migration Planning Analysis
**Status**: Ready for Implementation