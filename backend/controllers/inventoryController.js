// backend/controllers/inventoryController.js
import { inventoryDb } from '../config/db.js';

// Test database connection and basic data
export async function testDatabase(req, res) {
  try {
    // Test basic connection
    const testQuery = `SELECT COUNT(*) as total FROM inventory_history`;
    const [result] = await inventoryDb.raw(testQuery);
    
    // Get recent records
    const recentQuery = `
      SELECT check_time, COUNT(*) as records 
      FROM inventory_history 
      WHERE check_time >= '2025-08-10'
      GROUP BY DATE(check_time)
      ORDER BY check_time DESC
      LIMIT 5
    `;
    const recentResults = await inventoryDb.raw(recentQuery);
    
    // Debug timezone info
    const now = new Date();
    const localDate = now.toLocaleDateString('en-US');
    const localTime = now.toLocaleTimeString('en-US');
    const isoDate = now.toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = now.getTimezoneOffset();
    
    // Get today's raw data using corrected date
    const todayQuery = `
      SELECT check_time, plu, store_id, quantity
      FROM inventory_history 
      WHERE check_time LIKE '2025-08-12%'
      ORDER BY check_time DESC
      LIMIT 10
    `;
    const todayResults = await inventoryDb.raw(todayQuery);
    
    res.json({
      database_connected: true,
      total_history_records: result.total,
      recent_days: recentResults,
      todays_sample: todayResults,
      
      // Debug timezone info
      timezone_info: {
        local_date: localDate,
        local_time: localTime,
        iso_string: isoDate,
        detected_timezone: timezone,
        offset_minutes: offset,
        env_tz: process.env.TZ || 'not set'
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      database_connected: false,
      error: error.message,
      stack: error.stack
    });
  }
}

// Get today's bourbon arrivals/deliveries
export async function getTodaysArrivals(req, res) {
  try {
    // Get today's date in local timezone (not UTC)
    const today = new Date().toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in local timezone
    const threeWeeksAgo = new Date(Date.now() - (21 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-CA');
    
    const query = `
      WITH todays_max AS (
        -- Max quantity per PLU/store today
        SELECT store_id, plu, MAX(quantity) as max_today, MAX(check_time) as latest_check
        FROM inventory_history 
        WHERE check_time LIKE ?
        GROUP BY store_id, plu
      ),
      previous_max AS (
        -- Max quantity per PLU/store in previous 3 weeks
        SELECT store_id, plu, MAX(quantity) as max_previous
        FROM inventory_history 
        WHERE check_time >= ?
          AND check_time < ?
        GROUP BY store_id, plu
      )
      SELECT 
        COALESCE(b.name, a.brand_name) as bourbon_name,
        t.plu,
        s.store_number,
        s.address, 
        s.nickname,
        t.max_today as new_quantity,
        COALESCE(p.max_previous, 0) as previous_quantity,
        a.retail_price,
        t.latest_check
      FROM todays_max t
      LEFT JOIN previous_max p ON t.store_id = p.store_id AND t.plu = p.plu
      JOIN stores s ON t.store_id = s.store_id
      LEFT JOIN bourbons b ON t.plu = b.plu
      LEFT JOIN alcohol a ON t.plu = a.nc_code
      WHERE t.max_today > COALESCE(p.max_previous, 0)
      ORDER BY bourbon_name, s.store_number;
    `;

    const results = await inventoryDb.raw(query, [
      `${today}%`,        // Today's records
      threeWeeksAgo,      // 3 weeks ago start
      `${today}%`         // Before today
    ]);

    // SQLite returns results in results[0]
    const arrivals = results.map(row => ({
      bourbon_name: row.bourbon_name,
      plu: row.plu,
      store_number: row.store_number,
      store_address: row.address,
      store_nickname: row.nickname,
      new_quantity: row.new_quantity,
      previous_quantity: row.previous_quantity,
      price: row.retail_price ? `${row.retail_price.toFixed(2)}` : 'Not Available',
      last_updated: row.latest_check
    }));

    res.json({
      date: today,
      total_arrivals: arrivals.length,
      arrivals: arrivals,
      debug: {
        query_date: today,
        three_weeks_ago: threeWeeksAgo
      }
    });

  } catch (error) {
    console.error('Error fetching today\'s arrivals:', error);
    res.status(500).json({ 
      error: 'Failed to fetch today\'s arrivals',
      details: error.message 
    });
  }
}

// Get inventory summary stats for dashboard
export async function getInventorySummary(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get basic stats
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT plu) as tracked_products,
        COUNT(DISTINCT store_id) as active_stores,
        SUM(quantity) as total_bottles,
        MAX(check_time) as last_update
      FROM current_inventory 
      WHERE quantity > 0;
    `;

    const todayArrivalsQuery = `
      SELECT COUNT(*) as todays_arrivals
      FROM inventory_history 
      WHERE check_time LIKE ?;
    `;

    const [stats] = await inventoryDb.raw(statsQuery);
    const [todayCount] = await inventoryDb.raw(todayArrivalsQuery, [`${today}%`]);

    res.json({
      tracked_products: stats.tracked_products || 0,
      active_stores: stats.active_stores || 0,
      total_bottles: stats.total_bottles || 0,
      todays_arrivals: todayCount.todays_arrivals || 0,
      last_update: stats.last_update
    });

  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory summary',
      details: error.message 
    });
  }
}