#!/usr/bin/env python3
"""
Warehouse Inventory Report Generator

This script generates JSON files containing warehouse inventory reports for different time periods.
Files are generated for consumption by the web application.

Time periods:
- current_month: Current calendar month
- last_30_days: Last 30 days from today
- last_90_days: Last 90 days from today  
- last_180_days: Last 180 days from today

Output: JSON files in /opt/warehouse-reports/ (production) or ./warehouse-reports/ (development)
"""

import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import logging

# Configuration
DEV_MODE = os.getenv('DEV_MODE', 'true').lower() == 'true'  # Default to production
DB_PATH = './BourbonDatabase/inventory.db' if DEV_MODE else '/opt/BourbonDatabase/inventory.db'
OUTPUT_DIR = './warehouse-reports' if DEV_MODE else '/opt/warehouse-reports'
LOG_DIR = './logs' if DEV_MODE else '/opt/logs'

# Ensure log directory exists
Path(LOG_DIR).mkdir(parents=True, exist_ok=True)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'{LOG_DIR}/warehouse_generator.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WarehouseInventoryGenerator:
    def __init__(self):
        self.db_path = DB_PATH
        self.output_dir = Path(OUTPUT_DIR)
        self.log_dir = Path(LOG_DIR)
        
        # Ensure directories exist with proper permissions
        try:
            self.output_dir.mkdir(parents=True, exist_ok=True)
            self.log_dir.mkdir(parents=True, exist_ok=True)
            
            # Set permissions for production
            if not DEV_MODE:
                os.chmod(self.output_dir, 0o755)
                os.chmod(self.log_dir, 0o755)
                
        except PermissionError as e:
            logger.error(f"Permission error creating directories: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Error creating directories: {e}")
            sys.exit(1)
        
        # Verify database exists and is accessible
        if not Path(self.db_path).exists():
            logger.error(f"Database not found at {self.db_path}")
            sys.exit(1)
            
        if not os.access(self.db_path, os.R_OK):
            logger.error(f"Database not readable at {self.db_path}")
            sys.exit(1)
            
        logger.info(f"Initialized generator - DB: {self.db_path}, Output: {self.output_dir}")
        
    def get_date_ranges(self):
        """Calculate date ranges for all time periods"""
        today = datetime.now().date()
        
        # Current calendar month
        current_month_start = today.replace(day=1)
        
        # Calculate first day of next month for end date
        if today.month == 12:
            current_month_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            current_month_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        
        return {
            'current_month': {
                'start': current_month_start,
                'end': min(current_month_end, today),  # Don't go past today
                'description': f"{current_month_start.strftime('%B %Y')}"
            },
            'last_30_days': {
                'start': today - timedelta(days=30),
                'end': today,
                'description': 'Last 30 days'
            },
            'last_90_days': {
                'start': today - timedelta(days=90),
                'end': today,
                'description': 'Last 90 days'
            },
            'last_180_days': {
                'start': today - timedelta(days=180),
                'end': today,
                'description': 'Last 180 days'
            }
        }

    def test_database_connection(self):
        """Test database connectivity before proceeding"""
        try:
            with sqlite3.connect(self.db_path, timeout=30) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM warehouse_inventory_history_v2")
                count = cursor.fetchone()[0]
                logger.info(f"Database connection successful - {count} inventory records found")
                return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False

    def execute_query(self, query, params=None):
        """Execute query and return results"""
        try:
            with sqlite3.connect(self.db_path, timeout=30) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(query, params or [])
                return [dict(row) for row in cursor.fetchall()]
        except sqlite3.OperationalError as e:
            logger.error(f"Database operational error: {e}")
            if "locked" in str(e).lower():
                logger.error("Database appears to be locked. Check if other processes are using it.")
            raise
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            raise

    def generate_warehouse_report(self, time_period, date_range):
        """Generate comprehensive warehouse inventory report for a time period"""
        logger.info(f"Generating warehouse report for {time_period} ({date_range['description']})")
        
        start_date = date_range['start'].strftime('%Y-%m-%d')
        end_date = date_range['end'].strftime('%Y-%m-%d')
        
        # Use proven query approach from working script - get raw data first
        raw_query = """
        SELECT
            h.nc_code,
            a.brand_name,
            a.size_ml,
            a.Listing_Type as listing_type,
            h.check_date,
            h.total_available,
            a.retail_price,
            a.supplier,
            a.broker_name as broker,
            CASE 
                WHEN a.image_path IS NOT NULL AND a.image_path != '' AND a.image_path != 'no image available' THEN 1
                ELSE 0
            END as has_image,
            CASE 
                WHEN a.image_path IS NOT NULL AND a.image_path != '' AND a.image_path != 'no image available'
                THEN a.image_path
                ELSE NULL
            END as image_path,
            CASE 
                WHEN a.image_path IS NOT NULL AND a.image_path != '' AND a.image_path != 'no image available'
                THEN '/api/images/' || REPLACE(REPLACE(a.image_path, 'alcohol_images\\', ''), 'alcohol_images/', '')
                ELSE NULL
            END as image_url
        FROM warehouse_inventory_history_v2 h
        JOIN alcohol a ON h.nc_code = a.nc_code
        WHERE h.check_date >= ?
        AND h.check_date <= ?
        ORDER BY a.brand_name, h.nc_code, h.check_date
        """
        
        try:
            # Get raw inventory data
            raw_data = self.execute_query(raw_query, [start_date, end_date])
            
            if not raw_data:
                logger.warning(f"No inventory data found for {time_period}")
                return self._create_empty_report(time_period, date_range)
            
            # Process raw data to calculate inventory statistics
            products = self._process_inventory_data(raw_data)
            
            logger.info(f"Processed {len(products)} products from {len(raw_data)} inventory records")
            
            # Calculate summary statistics
            total_products = len(products)
            products_with_inventory = len([p for p in products if p['current_inventory'] > 0])
            products_with_images = len([p for p in products if p['has_image']])
            total_inventory = sum(p['current_inventory'] for p in products)
            
            # Count by listing type
            listing_type_counts = {}
            for product in products:
                listing_type = product['listing_type']
                if listing_type not in listing_type_counts:
                    listing_type_counts[listing_type] = {'count': 0, 'inventory': 0}
                listing_type_counts[listing_type]['count'] += 1
                listing_type_counts[listing_type]['inventory'] += product['current_inventory']
            
            report = {
                'generated_at': datetime.now().isoformat(),
                'report_type': time_period,
                'time_period': {
                    'start': start_date,
                    'end': end_date,
                    'description': date_range['description']
                },
                'summary': {
                    'total_products': total_products,
                    'products_with_inventory': products_with_inventory,
                    'products_with_images': products_with_images,
                    'total_inventory_units': total_inventory,
                    'listing_type_breakdown': listing_type_counts
                },
                'products': products
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate report for {time_period}: {e}")
            raise

    def _process_inventory_data(self, raw_data):
        """Process raw inventory data to calculate statistics per product"""
        # Group by nc_code and calculate statistics
        products_dict = {}
        
        for record in raw_data:
            nc_code = record['nc_code']
            
            if nc_code not in products_dict:
                # Initialize product entry
                products_dict[nc_code] = {
                    'plu': nc_code,
                    'product_name': self._get_product_name(record),
                    'brand_name': record['brand_name'],
                    'listing_type': record['listing_type'] or 'Unknown',
                    'retail_price': record['retail_price'],
                    'supplier': record['supplier'],
                    'broker': record['broker'],
                    'has_image': record['has_image'],
                    'image_path': record['image_path'],
                    'image_url': record['image_url'],
                    'inventory_records': [],
                    'last_updated': None
                }
            
            # Add inventory record
            products_dict[nc_code]['inventory_records'].append({
                'check_date': record['check_date'],
                'total_available': record['total_available'] or 0
            })
            
            # Track latest date
            if (products_dict[nc_code]['last_updated'] is None or 
                record['check_date'] > products_dict[nc_code]['last_updated']):
                products_dict[nc_code]['last_updated'] = record['check_date']
        
        # Calculate statistics for each product
        products = []
        for nc_code, product_data in products_dict.items():
            inventory_values = [r['total_available'] for r in product_data['inventory_records']]
            
            if inventory_values:
                current_inventory = inventory_values[-1]  # Last value (most recent)
                peak_inventory = max(inventory_values)
                low_inventory = min(inventory_values)
            else:
                current_inventory = peak_inventory = low_inventory = 0
            
            # Build final product record
            product = {
                'plu': product_data['plu'],
                'product_name': product_data['product_name'],
                'brand_name': product_data['brand_name'],
                'listing_type': product_data['listing_type'],
                'retail_price': product_data['retail_price'],
                'supplier': product_data['supplier'],
                'broker': product_data['broker'],
                'current_inventory': current_inventory,
                'peak_inventory': peak_inventory,
                'low_inventory': low_inventory,
                'last_updated': product_data['last_updated'],
                'has_image': product_data['has_image'],
                'image_path': product_data['image_path'],
                'image_url': product_data['image_url']
            }
            
            products.append(product)
        
        # Sort products alphabetically by product name, then brand name
        products.sort(key=lambda p: (
            (p['product_name'] or p['brand_name'] or '').lower(),
            (p['brand_name'] or '').lower()
        ))
        
        return products

    def _get_product_name(self, record):
        """Get the best product name from bourbon name or brand name"""
        # Try to get bourbon name from bourbons table if available
        # For now, use brand_name - we could enhance this with a JOIN to bourbons table
        brand_name = record['brand_name'] or 'Unknown Product'
        size_ml = record.get('size_ml')
        
        if size_ml and size_ml > 0:
            if size_ml < 1000:
                return f"{brand_name} ({int(size_ml)}ml)"
            else:
                return f"{brand_name} ({size_ml/1000:.1f}L)"
        
        return brand_name

    def _create_empty_report(self, time_period, date_range):
        """Create an empty report when no data is found"""
        return {
            'generated_at': datetime.now().isoformat(),
            'report_type': time_period,
            'time_period': {
                'start': date_range['start'].strftime('%Y-%m-%d'),
                'end': date_range['end'].strftime('%Y-%m-%d'),
                'description': date_range['description']
            },
            'summary': {
                'total_products': 0,
                'products_with_inventory': 0,
                'products_with_images': 0,
                'total_inventory_units': 0,
                'listing_type_breakdown': {}
            },
            'products': []
        }

    def save_report(self, report, time_period):
        """Save report to JSON file"""
        filename = f"warehouse_inventory_{time_period}.json"
        filepath = self.output_dir / filename
        
        try:
            # Write to temporary file first, then move (atomic operation)
            temp_filepath = filepath.with_suffix('.tmp')
            
            with open(temp_filepath, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            # Atomic move
            temp_filepath.rename(filepath)
            
            # Set file permissions for production
            if not DEV_MODE:
                os.chmod(filepath, 0o644)
            
            logger.info(f"Saved report to {filepath}")
            
            # Also save a metadata file for quick access
            metadata = {
                'filename': filename,
                'generated_at': report['generated_at'],
                'time_period': report['time_period'],
                'summary': report['summary']
            }
            
            metadata_file = self.output_dir / f"{time_period}_metadata.json"
            temp_metadata_file = metadata_file.with_suffix('.tmp')
            
            with open(temp_metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2, default=str)
                
            temp_metadata_file.rename(metadata_file)
            
            if not DEV_MODE:
                os.chmod(metadata_file, 0o644)
                
        except Exception as e:
            logger.error(f"Failed to save report for {time_period}: {e}")
            # Clean up temp files
            for temp_file in [temp_filepath, temp_metadata_file]:
                if temp_file.exists():
                    temp_file.unlink()
            raise

    def generate_all_reports(self):
        """Generate reports for all time periods"""
        logger.info("Starting warehouse inventory report generation")
        
        # Test database connection first
        if not self.test_database_connection():
            logger.error("Database connection test failed - aborting report generation")
            sys.exit(1)
        
        try:
            date_ranges = self.get_date_ranges()
            reports_generated = 0
            
            for time_period, date_range in date_ranges.items():
                try:
                    report = self.generate_warehouse_report(time_period, date_range)
                    self.save_report(report, time_period)
                    reports_generated += 1
                    
                except Exception as e:
                    logger.error(f"Failed to generate report for {time_period}: {e}")
                    continue
            
            # Generate a master index file
            self.generate_index_file(date_ranges)
            
            logger.info(f"Successfully generated {reports_generated} warehouse inventory reports")
            
            if reports_generated == 0:
                logger.error("No reports were successfully generated")
                sys.exit(1)
            
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            sys.exit(1)

    def generate_index_file(self, date_ranges):
        """Generate an index file listing all available reports"""
        index = {
            'generated_at': datetime.now().isoformat(),
            'available_reports': {}
        }
        
        for time_period in date_ranges.keys():
            metadata_file = self.output_dir / f"{time_period}_metadata.json"
            if metadata_file.exists():
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                        index['available_reports'][time_period] = metadata
                except Exception as e:
                    logger.warning(f"Could not read metadata for {time_period}: {e}")
        
        index_file = self.output_dir / "reports_index.json"
        temp_index_file = index_file.with_suffix('.tmp')
        
        try:
            with open(temp_index_file, 'w') as f:
                json.dump(index, f, indent=2, default=str)
            
            temp_index_file.rename(index_file)
            
            if not DEV_MODE:
                os.chmod(index_file, 0o644)
                
            logger.info(f"Generated reports index at {index_file}")
            
        except Exception as e:
            logger.error(f"Failed to generate index file: {e}")
            if temp_index_file.exists():
                temp_index_file.unlink()

def main():
    """Main entry point"""
    try:
        if len(sys.argv) > 1:
            # Allow running specific time period
            time_periods = sys.argv[1:]
            valid_periods = ['current_month', 'last_30_days', 'last_90_days', 'last_180_days']
            
            for period in time_periods:
                if period not in valid_periods:
                    print(f"Invalid time period: {period}")
                    print(f"Valid periods: {', '.join(valid_periods)}")
                    sys.exit(1)
            
            generator = WarehouseInventoryGenerator()
            date_ranges = generator.get_date_ranges()
            
            for period in time_periods:
                report = generator.generate_warehouse_report(period, date_ranges[period])
                generator.save_report(report, period)
                
            # Generate index after specific reports
            generator.generate_index_file(date_ranges)
        else:
            # Generate all reports
            generator = WarehouseInventoryGenerator()
            generator.generate_all_reports()
            
    except KeyboardInterrupt:
        logger.info("Script interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()