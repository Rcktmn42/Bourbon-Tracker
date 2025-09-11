#!/usr/bin/env python3
"""
Warehouse Inventory Report Generator (schema-aware)

- Auto-detects alcohol table columns (brand/product/listing_type/retail_price/supplier/broker_name/image_path/plu)
- Computes "low" as the last occurrence of the minimum value AT/AFTER the most recent peak within the window
"""

import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import logging
import re

# ------------------ Config ------------------
DEV_MODE = os.getenv('DEV_MODE', 'false').lower() == 'true'  # default to production
DB_PATH = './BourbonDatabase/inventory.db' if DEV_MODE else '/opt/BourbonDatabase/inventory.db'
OUTPUT_DIR = './warehouse-reports' if DEV_MODE else '/opt/warehouse-reports'
LOG_DIR = './logs' if DEV_MODE else '/opt/logs'
FILE_MODE = 0o644  # prod file permissions

# ------------------ Logging ------------------
logger = logging.getLogger('warehouse_inventory_generator')
logger.setLevel(logging.INFO)
Path(LOG_DIR).mkdir(parents=True, exist_ok=True)
log_file = Path(LOG_DIR) / 'warehouse_generator.log'
fh = logging.FileHandler(log_file)
fh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
fh.setLevel(logging.INFO)
ch = logging.StreamHandler(sys.stdout)
ch.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
ch.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(fh)
    logger.addHandler(ch)

# ------------------ Helpers ------------------
def _safe_iso_parse(val: str) -> datetime:
    s = str(val)
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        try:
            return datetime.strptime(s[:10], '%Y-%m-%d')
        except Exception:
            return datetime.min

def _needs_quoting(identifier: str) -> bool:
    return not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', identifier or '')

def _quote_ident(identifier: str) -> str:
    if identifier is None:
        return ''
    return f'"{identifier}"' if _needs_quoting(identifier) else identifier

def _normalize(name: str) -> str:
    """normalize col name: lower + remove spaces/underscores"""
    return re.sub(r'[\s_]+', '', (name or '').lower())

class WarehouseInventoryGenerator:
    def __init__(self):
        self.db_path = DB_PATH
        self.output_dir = Path(OUTPUT_DIR)
        self.log_dir = Path(LOG_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        if not DEV_MODE:
            try:
                os.chmod(self.output_dir, 0o755)
                os.chmod(self.log_dir, 0o755)
            except PermissionError:
                logger.warning("Could not chmod output/log dirs (permissions).")

    # ---------- DB utilities ----------
    def _connect(self):
        return sqlite3.connect(self.db_path, timeout=30)

    def execute_query(self, query, params=None):
        try:
            with self._connect() as conn:
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute(query, params or [])
                return [dict(r) for r in cur.fetchall()]
        except sqlite3.OperationalError as e:
            logger.error(f"Database operational error: {e}")
            if "locked" in str(e).lower():
                logger.error("Database appears to be locked.")
            raise
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            raise

    def test_database_connection(self):
        try:
            rows = self.execute_query("SELECT COUNT(*) as c FROM warehouse_inventory_history_v2")
            logger.info(f"Database OK. warehouse_inventory_history_v2 rows: {rows[0]['c']}")
            return True
        except Exception as e:
            logger.error(f"DB test failed: {e}")
            return False

    def _get_table_columns(self, table: str):
        try:
            with self._connect() as conn:
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute(f"PRAGMA table_info({_quote_ident(table)})")
                cols = [r['name'] for r in cur.fetchall()]
                return cols
        except Exception as e:
            logger.error(f"Failed to read schema for {table}: {e}")
            return []

    def _pick(self, cols, candidates):
        """Pick first matching column name from candidates, case/format-insensitive."""
        norm_map = { _normalize(c): c for c in cols }
        for cand in candidates:
            key = _normalize(cand)
            if key in norm_map:
                return norm_map[key]
        return None

    def _build_raw_query(self, start_date: str, end_date: str):
        """
        Build a SELECT that only references columns that truly exist in `alcohol`.
        Fallbacks to NULL for any missing metadata columns.
        """
        a_cols = self._get_table_columns('alcohol')

        brand_col   = self._pick(a_cols, ['brand_name','Brand_Name','brand','Brand'])
        prod_col    = self._pick(a_cols, ['product_name','Product_Name','name','ProductName','Product'])
        list_col    = self._pick(a_cols, ['listing_type','Listing_Type','listing','type','Type'])
        retail_col  = self._pick(a_cols, ['retail_price','Retail_Price','price','Price'])
        supplier_col= self._pick(a_cols, ['supplier','Supplier','supplier_name','Supplier_Name'])
        broker_col  = self._pick(a_cols, ['broker_name','Broker_Name','broker','Broker'])
        image_col   = self._pick(a_cols, ['image_path','Image_Path','image','Image','ImagePath'])
        plu_col     = self._pick(a_cols, ['plu','PLU','Plu','product_number','Product_Number','item_number','Item_Number','sku','SKU'])

        # Helpers to inject columns or NULL safely
        def col_or_null(col, alias_as):
            return f'a.{_quote_ident(col)} AS {alias_as}' if col else f'NULL AS {alias_as}'

        # image helpers
        if image_col:
            image_expr = f"a.{_quote_ident(image_col)}"
            has_image = f"""CASE 
  WHEN {image_expr} IS NOT NULL AND {image_expr} != '' AND {image_expr} != 'no image available' THEN 1
  ELSE 0 END AS has_image"""
            image_path = f"""CASE 
  WHEN {image_expr} IS NOT NULL AND {image_expr} != '' AND {image_expr} != 'no image available' THEN {image_expr}
  ELSE NULL END AS image_path"""
            image_url = f"""CASE 
  WHEN {image_expr} IS NOT NULL AND {image_expr} != '' AND {image_expr} != 'no image available'
  THEN '/api/images/' || REPLACE(REPLACE({image_expr}, 'alcohol_images\\', ''), 'alcohol_images/', '')
  ELSE NULL END AS image_url"""
        else:
            has_image = "0 AS has_image"
            image_path = "NULL AS image_path"
            image_url = "NULL AS image_url"

        select_parts = [
            "h.nc_code",
            col_or_null(brand_col,   "brand_name"),
            col_or_null(prod_col,    "product_name"),
            col_or_null(list_col,    "listing_type"),
            "h.check_date",
            "h.total_available",
            col_or_null(retail_col,  "retail_price"),
            col_or_null(supplier_col,"supplier"),
            col_or_null(broker_col,  "broker"),
            col_or_null(plu_col,     "plu"),
            has_image,
            image_path,
            image_url,
        ]

        query = f"""
SELECT
  {", ".join(select_parts)}
FROM warehouse_inventory_history_v2 h
JOIN alcohol a ON h.nc_code = a.nc_code
WHERE h.check_date >= ? AND h.check_date <= ?
ORDER BY brand_name, h.nc_code, h.check_date
"""
        return query, [start_date, end_date]

    # ---------- Report generation ----------
    def _get_time_periods(self):
        today = datetime.now()
        start_of_month = today.replace(day=1)
        end_of_today = today.replace(hour=23, minute=59, second=59, microsecond=999999)
        return {
            'current_month': {'start': start_of_month,           'end': end_of_today, 'description': 'Current month'},
            'last_30_days':  {'start': today - timedelta(days=30),'end': end_of_today, 'description': 'Last 30 days'},
            'last_90_days':  {'start': today - timedelta(days=90),'end': end_of_today, 'description': 'Last 90 days'},
        }

    def _get_current_inventory_for_products(self, nc_codes):
        if not nc_codes:
            return {}
        placeholders = ','.join(['?'] * len(nc_codes))
        query = f"""
SELECT w1.nc_code, w1.total_available, w1.check_date
FROM warehouse_inventory_history_v2 w1
JOIN (
  SELECT nc_code, MAX(check_date) AS max_date
  FROM warehouse_inventory_history_v2
  WHERE nc_code IN ({placeholders})
  GROUP BY nc_code
) r ON r.nc_code = w1.nc_code AND r.max_date = w1.check_date
"""
        try:
            rows = self.execute_query(query, nc_codes)
            return {r['nc_code']: (r['total_available'] or 0) for r in rows}
        except Exception as e:
            logger.error(f"Error retrieving current inventory: {e}")
            return {code: 0 for code in nc_codes}

    def _process_inventory_data(self, raw_data):
        # Group rows by nc_code
        products = {}
        for r in raw_data:
            code = r['nc_code']
            p = products.setdefault(code, {
                'nc_code': code,
                'brand_name': r.get('brand_name'),
                'product_name': r.get('product_name'),
                'listing_type': r.get('listing_type') or 'Unknown',
                'retail_price': r.get('retail_price'),
                'supplier': r.get('supplier'),
                'broker': r.get('broker'),
                'plu': r.get('plu'),
                'has_image': bool(r.get('has_image')),
                'image_path': r.get('image_path'),
                'image_url': r.get('image_url'),
                'inventory_records': [],
                'last_updated': None,
            })
            p['inventory_records'].append({
                'check_date': r['check_date'],
                'total_available': r['total_available'] or 0
            })
            if p['last_updated'] is None or r['check_date'] > p['last_updated']:
                p['last_updated'] = r['check_date']

        # absolute current inventory (latest in DB, not window-bounded)
        current_map = self._get_current_inventory_for_products(list(products.keys()))

        out = []
        for code, pd in products.items():
            recs = sorted(pd['inventory_records'], key=lambda x: x['check_date'])
            current_inventory = current_map.get(code, 0)

            if recs:
                # Peak = most recent occurrence of the maximum value
                peak_inventory = max(rec['total_available'] for rec in recs)
                peak_candidates = [rec for rec in recs if rec['total_available'] == peak_inventory]
                peak_row = max(peak_candidates, key=lambda rec: _safe_iso_parse(rec['check_date']))
                peak_date = peak_row['check_date']

                # Low = last occurrence of the minimum at/after the chosen peak date
                after_peak = [rec for rec in recs if _safe_iso_parse(rec['check_date']) >= _safe_iso_parse(peak_date)]
                if after_peak:
                    low_inventory_val = min(rec['total_available'] for rec in after_peak)
                    low_candidates = [rec for rec in after_peak if rec['total_available'] == low_inventory_val]
                    low_row = max(low_candidates, key=lambda rec: _safe_iso_parse(rec['check_date']))
                    low_inventory = low_inventory_val
                    low_date = low_row['check_date']
                else:
                    # fallback to global last minimum
                    low_inventory_val = min(rec['total_available'] for rec in recs)
                    low_candidates = [rec for rec in recs if rec['total_available'] == low_inventory_val]
                    low_row = max(low_candidates, key=lambda rec: _safe_iso_parse(rec['check_date']))
                    low_inventory = low_inventory_val
                    low_date = low_row['check_date']
            else:
                peak_inventory = low_inventory = current_inventory = 0
                peak_date = low_date = None

            out.append({
                'plu': pd.get('plu'),
                'nc_code': code,
                'product_name': pd['product_name'] or pd['brand_name'] or 'Unknown Product',
                'brand_name': pd['brand_name'],
                'listing_type': pd['listing_type'],
                'retail_price': pd['retail_price'],
                'supplier': pd['supplier'],
                'broker': pd['broker'],
                'current_inventory': current_inventory,
                'peak_inventory': peak_inventory,
                'peak_inventory_date': peak_date,
                'low_inventory': low_inventory,
                'low_inventory_date': low_date,
                'last_updated': pd['last_updated'],
                'has_image': pd['has_image'],
                'image_path': pd['image_path'],
                'image_url': pd['image_url'],
            })

        # sort products by product_name then brand (null-safe)
        out.sort(key=lambda p: ((p.get('product_name') or p.get('brand_name') or '').lower(),
                                (p.get('brand_name') or '').lower()))
        return out

    def generate_warehouse_report(self, time_period, date_range):
        logger.info(f"Generating report for {time_period} ({date_range['description']})")
        start_date = date_range['start'].strftime('%Y-%m-%d')
        end_date = date_range['end'].strftime('%Y-%m-%d')

        query, params = self._build_raw_query(start_date, end_date)
        raw = self.execute_query(query, params)
        logger.info(f"Retrieved {len(raw)} rows from {start_date}..{end_date}")

        products = self._process_inventory_data(raw)
        logger.info(f"Processed {len(products)} products")

        meta = {
            'time_period': time_period,
            'description': date_range['description'],
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'start_date': start_date,
            'end_date': end_date,
            'total_products': len(products),
            'products_with_inventory': sum(1 for p in products if (p['current_inventory'] or 0) > 0),
            'products_with_images': sum(1 for p in products if p['has_image']),
            'total_inventory': sum(p['current_inventory'] or 0 for p in products),
            'listing_type_counts': self._count_by_listing_type(products),
            'file_modified': int(datetime.now().timestamp()),
        }
        return {'meta': meta, 'products': products}

    def _count_by_listing_type(self, products):
        out = {}
        for p in products:
            lt = p['listing_type'] or 'Unknown'
            d = out.setdefault(lt, {'count': 0, 'inventory': 0})
            d['count'] += 1
            d['inventory'] += p['current_inventory'] or 0
        return out

    # ---------- Writing ----------
    def write_report_files(self, report, time_period):
        try:
            self.output_dir.mkdir(parents=True, exist_ok=True)
            # main
            name = f"warehouse_inventory_{time_period}.json"
            tmp = self.output_dir / f"{name}.tmp"
            final = self.output_dir / name
            with open(tmp, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            os.replace(tmp, final)
            if not DEV_MODE:
                os.chmod(final, FILE_MODE)
            logger.info(f"Wrote {final}")
            # metadata
            meta_name = f"{time_period}_metadata.json"
            meta_tmp = self.output_dir / f"{meta_name}.tmp"
            meta_final = self.output_dir / meta_name
            with open(meta_tmp, 'w', encoding='utf-8') as f:
                json.dump(report['meta'], f, indent=2, ensure_ascii=False)
            os.replace(meta_tmp, meta_final)
            if not DEV_MODE:
                os.chmod(meta_final, FILE_MODE)
            logger.info(f"Wrote {meta_final}")
            return True
        except Exception as e:
            logger.error(f"Write failed for {time_period}: {e}")
            return False

    def generate_all_reports(self):
        if not self.test_database_connection():
            logger.error("Aborting due to DB failure.")
            return False

        periods = self._get_time_periods()
        results = {}
        ok_count = 0
        for tp, dr in periods.items():
            try:
                report = self.generate_warehouse_report(tp, dr)
                ok = self.write_report_files(report, tp)
                results[tp] = {'success': ok, 'meta': report['meta'] if ok else None, 'error': None if ok else 'Write failed'}
                if ok: ok_count += 1
            except Exception as e:
                logger.error(f"Failed for {tp}: {e}")
                results[tp] = {'success': False, 'meta': None, 'error': str(e)}

        # index
        try:
            idx = self.output_dir / 'reports_index.json'
            tmp = self.output_dir / 'reports_index.json.tmp'
            with open(tmp, 'w', encoding='utf-8') as f:
                json.dump({'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                           'dev_mode': DEV_MODE, 'reports': results}, f, indent=2, ensure_ascii=False)
            os.replace(tmp, idx)
            if not DEV_MODE:
                os.chmod(idx, FILE_MODE)
            logger.info(f"Wrote index {idx}")
        except Exception as e:
            logger.error(f"Index write failed: {e}")

        logger.info(f"Done: {ok_count}/{len(periods)} succeeded")
        return ok_count == len(periods)

# ------------------ Entrypoint ------------------
def main():
    logger.info("Starting Warehouse Inventory Report Generator")
    gen = WarehouseInventoryGenerator()
    ok = gen.generate_all_reports()
    if not ok:
        logger.error("One or more reports failed.")
        sys.exit(1)
    logger.info("All reports generated successfully.")

if __name__ == '__main__':
    main()
