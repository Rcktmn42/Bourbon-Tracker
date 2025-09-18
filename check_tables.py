#!/usr/bin/env python3
"""
Check what tables exist in the database
"""

import sys
import sqlite3

def check_tables():
    db_path = "BourbonDatabase/inventory.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        print("Tables in database:")
        for table in tables:
            print(f"  - {table}")
        
        # Check for warehouse tables specifically
        warehouse_tables = [t for t in tables if 'warehouse' in t.lower()]
        print(f"\nWarehouse-related tables: {warehouse_tables}")
        
        # Check for inventory tables
        inventory_tables = [t for t in tables if 'inventory' in t.lower()]
        print(f"Inventory-related tables: {inventory_tables}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_tables()