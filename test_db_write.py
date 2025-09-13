#!/usr/bin/env python3
"""
Test script to verify database write operations
"""

import sys
import os
sys.path.append('Project_files/Scripts')

from database_safety import get_database_manager
import sqlite3
from datetime import datetime

def test_database_writes():
    db_path = "BourbonDatabase/inventory.db"
    
    print(f"Testing database writes to: {db_path}")
    
    try:
        # Initialize database manager
        db_manager = get_database_manager(db_path)
        
        # Test 1: Simple read
        print("\n=== Test 1: Reading data ===")
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM alcohol LIMIT 1")
            count = cursor.fetchone()[0]
            print(f"Found {count} records in alcohol table")
        
        # Test 2: Test table creation (temporary)
        print("\n=== Test 2: Creating test table ===")
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS test_writes (
                    id INTEGER PRIMARY KEY,
                    test_data TEXT,
                    created_at TEXT
                )
            """)
            conn.commit()
            print("Test table created successfully")
        
        # Test 3: Insert test data
        print("\n=== Test 3: Inserting test data ===")
        test_data = f"Test write at {datetime.now().isoformat()}"
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO test_writes (test_data, created_at) 
                VALUES (?, ?)
            """, (test_data, datetime.now().isoformat()))
            conn.commit()
            row_id = cursor.lastrowid
            print(f"Inserted test record with ID: {row_id}")
        
        # Test 4: Verify the write
        print("\n=== Test 4: Verifying write ===")
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM test_writes WHERE id = ?", (row_id,))
            result = cursor.fetchone()
            if result:
                print(f"Successfully verified write: ID={result[0]}, Data='{result[1]}', Created={result[2]}")
            else:
                print("ERROR: Could not find inserted record!")
        
        # Test 5: Update test
        print("\n=== Test 5: Testing update ===")
        updated_data = f"Updated at {datetime.now().isoformat()}"
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE test_writes 
                SET test_data = ? 
                WHERE id = ?
            """, (updated_data, row_id))
            conn.commit()
            rows_affected = cursor.rowcount
            print(f"Updated {rows_affected} rows")
        
        # Test 6: Verify update
        print("\n=== Test 6: Verifying update ===")
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT test_data FROM test_writes WHERE id = ?", (row_id,))
            result = cursor.fetchone()
            if result and result[0] == updated_data:
                print(f"Update verified: '{result[0]}'")
            else:
                print(f"ERROR: Update not found or incorrect. Got: {result}")
        
        # Test 7: Transaction test
        print("\n=== Test 7: Testing transaction rollback ===")
        try:
            with db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO test_writes (test_data, created_at) VALUES (?, ?)", 
                             ("Transaction test", datetime.now().isoformat()))
                # Force an error
                cursor.execute("INSERT INTO non_existent_table (col) VALUES (?)", ("test",))
                conn.commit()
        except sqlite3.Error as e:
            print(f"Expected transaction error: {e}")
            print("Transaction rollback should have occurred")
        
        # Test 8: Cleanup
        print("\n=== Test 8: Cleanup ===")
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DROP TABLE test_writes")
            conn.commit()
            print("Test table dropped successfully")
        
        print("\n=== All tests completed successfully ===")
        return True
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup connections
        try:
            db_manager.close_all_connections()
        except:
            pass

if __name__ == "__main__":
    success = test_database_writes()
    sys.exit(0 if success else 1)