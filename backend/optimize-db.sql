-- Optimize inventory database
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=10000;
PRAGMA temp_store=memory;
PRAGMA mmap_size=268435456; -- 256MB

-- Create indexes for warehouse report queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_nc_code_date 
ON warehouse_inventory_history_v2(nc_code, check_date);

CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_date 
ON warehouse_inventory_history_v2(check_date);

CREATE INDEX IF NOT EXISTS idx_alcohol_nc_code 
ON alcohol(nc_code);

CREATE INDEX IF NOT EXISTS idx_alcohol_listing_type 
ON alcohol(Listing_Type);

-- Analyze tables for query optimization
ANALYZE;