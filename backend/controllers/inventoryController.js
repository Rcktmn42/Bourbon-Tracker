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

// Get arrivals for a specific date (shows 'up' and 'first' change types)
export async function getTodaysArrivals(req, res) {
  try {
    // Get date from query parameter or default to today
    const requestedDate = req.query.date || new Date().toLocaleDateString('en-CA');
    
    const query = `
      SELECT 
        COALESCE(b.name, a.brand_name) as bourbon_name,
        ih.plu,
        s.store_number,
        s.store_id,
        s.address, 
        s.nickname,
        ih.quantity as new_quantity,
        COALESCE(prev.prev_quantity, 0) as previous_quantity,
        a.retail_price,
        a.Listing_Type,
        ih.check_time,
        ih.change_type,
        ih.delta
      FROM inventory_history ih
      JOIN stores s ON ih.store_id = s.store_id
      LEFT JOIN bourbons b ON ih.plu = b.plu
      LEFT JOIN alcohol a ON ih.plu = a.nc_code
      LEFT JOIN (
        -- Get the previous quantity before this change
        SELECT 
          store_id, 
          plu, 
          quantity as prev_quantity,
          ROW_NUMBER() OVER (PARTITION BY store_id, plu ORDER BY check_time DESC) as rn
        FROM inventory_history 
        WHERE DATE(check_time) < ?
      ) prev ON ih.store_id = prev.store_id 
        AND ih.plu = prev.plu 
        AND prev.rn = 1
      WHERE DATE(ih.check_time) = ?
        AND ih.change_type IN ('up', 'first')
        AND ih.quantity > 0
      ORDER BY bourbon_name, s.store_number;
    `;

    const results = await inventoryDb.raw(query, [requestedDate, requestedDate]);

    const arrivals = results.map(row => ({
      bourbon_name: row.bourbon_name,
      plu: row.plu,
      store_number: row.store_number,
      store_id: row.store_id,
      store_address: row.address,
      store_nickname: row.nickname,
      new_quantity: row.new_quantity,
      previous_quantity: row.previous_quantity,
      price: row.retail_price ? `$${row.retail_price.toFixed(2)}` : 'Not Available',
      listing_type: row.Listing_Type,
      last_updated: row.check_time,
      change_type: row.change_type,
      delta: row.delta
    }));

    res.json({
      date: requestedDate,
      total_arrivals: arrivals.length,
      arrivals: arrivals
    });

  } catch (error) {
    console.error('Error fetching arrivals:', error);
    res.status(500).json({ 
      error: 'Failed to fetch arrivals',
      details: error.message 
    });
  }
}

// Get available dates for navigation (dates that have inventory changes)
export async function getAvailableDates(req, res) {
  try {
    const { currentDate, direction = 'previous' } = req.query;
    
    if (!currentDate) {
      return res.status(400).json({ 
        error: 'currentDate parameter is required' 
      });
    }

    let query, params;
    
    if (direction === 'previous') {
      // Get previous date with data
      query = `
        SELECT DISTINCT DATE(check_time) as available_date
        FROM inventory_history 
        WHERE DATE(check_time) < ?
          AND change_type IN ('up', 'first')
          AND quantity > 0
        ORDER BY available_date DESC
        LIMIT 1
      `;
      params = [currentDate];
    } else {
      // Get next date with data
      query = `
        SELECT DISTINCT DATE(check_time) as available_date
        FROM inventory_history 
        WHERE DATE(check_time) > ?
          AND change_type IN ('up', 'first')
          AND quantity > 0
        ORDER BY available_date ASC
        LIMIT 1
      `;
      params = [currentDate];
    }

    const results = await inventoryDb.raw(query, params);
    const availableDate = results[0]?.available_date || null;

    // Also get all available dates for context
    const allDatesQuery = `
      SELECT DISTINCT DATE(check_time) as available_date
      FROM inventory_history 
      WHERE change_type IN ('up', 'first')
        AND quantity > 0
      ORDER BY available_date DESC
      LIMIT 30
    `;
    
    const allDates = await inventoryDb.raw(allDatesQuery);

    res.json({
      success: true,
      availableDate,
      allAvailableDates: allDates.map(row => row.available_date),
      direction,
      currentDate
    });

  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available dates',
      details: error.message 
    });
  }
}

// Get inventory summary stats for dashboard
export async function getInventorySummary(req, res) {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    
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

// ===== NEW FUNCTIONS FOR INVENTORY REPORTS =====

// Get current inventory (UPDATED to include all listing types)
export async function getCurrentAllocatedInventory(req, res) {
  try {
    const query = `
      SELECT 
        COALESCE(b.bourbon_id, a.alcohol_id) as product_id,
        COALESCE(b.name, a.brand_name) as product_name,
        COALESCE(b.plu, a.nc_code) as plu,
        a.retail_price,
        a.size_ml,
        a.bottles_per_case,
        a.image_path,
        a.Listing_Type,
        COALESCE(SUM(ci.quantity), 0) as total_bottles,
        COUNT(CASE WHEN ci.quantity > 0 THEN 1 END) as stores_with_stock
      FROM alcohol a
      LEFT JOIN bourbons b ON a.nc_code = b.plu
      LEFT JOIN current_inventory ci ON COALESCE(b.plu, a.nc_code) = ci.plu
      GROUP BY 
        COALESCE(b.bourbon_id, a.alcohol_id),
        COALESCE(b.name, a.brand_name),
        COALESCE(b.plu, a.nc_code),
        a.retail_price, a.size_ml, a.bottles_per_case, a.image_path, a.Listing_Type
      HAVING total_bottles > 0
      ORDER BY 
        -- Sort by listing type priority, then by name
        CASE a.Listing_Type 
          WHEN 'Allocation' THEN 1
          WHEN 'Limited' THEN 2  
          WHEN 'Barrel' THEN 3
          WHEN 'Listed' THEN 4
          ELSE 5
        END,
        product_name COLLATE NOCASE
    `;
    
    const products = await inventoryDb.raw(query);
    
    // Get unique store count across ALL products with inventory
    const uniqueStoreQuery = `
      SELECT COUNT(DISTINCT ci.store_id) as unique_stores
      FROM current_inventory ci
      WHERE ci.quantity > 0
    `;
    
    const uniqueStoreResult = await inventoryDb.raw(uniqueStoreQuery);
    const uniqueStoreCount = uniqueStoreResult[0]?.unique_stores || 0;
    
    // Calculate summary by listing type for insights
    const summaryByType = products.reduce((acc, product) => {
      const type = product.Listing_Type || 'Unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, bottles: 0 };
      }
      acc[type].count++;
      acc[type].bottles += product.total_bottles;
      return acc;
    }, {});
    
    res.json({ 
      success: true, 
      products,
      summary: {
        totalProducts: products.length,
        totalBottles: products.reduce((sum, p) => sum + p.total_bottles, 0),
        uniqueStores: uniqueStoreCount,
        byListingType: summaryByType
      }
    });
  } catch (error) {
    console.error('Error in getCurrentAllocatedInventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// DEBUG: Add endpoint to check data sync between tables
export async function debugDataSync(req, res) {
  try {
    // Check current_inventory table stats
    const currentInvQuery = `
      SELECT 
        'current_inventory' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as records_with_stock,
        MAX(last_updated) as latest_update
      FROM current_inventory
    `;
    const currentInvResult = await inventoryDb.raw(currentInvQuery);
    
    // Check inventory_history table stats for today
    const today = new Date().toLocaleDateString('en-CA');
    const historyQuery = `
      SELECT 
        'inventory_history' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as records_with_stock,
        MAX(check_time) as latest_update
      FROM inventory_history
      WHERE check_time LIKE ?
    `;
    const historyResult = await inventoryDb.raw(historyQuery, [`${today}%`]);
    
    // Check if any today's arrivals are missing from current_inventory
    const missingQuery = `
      SELECT 
        ih.plu,
        a.brand_name,
        a.Listing_Type,
        SUM(ih.quantity) as history_quantity,
        COALESCE(SUM(ci.quantity), 0) as current_quantity
      FROM inventory_history ih
      JOIN alcohol a ON ih.plu = a.nc_code
      LEFT JOIN current_inventory ci ON ih.plu = ci.plu
      WHERE ih.check_time LIKE ?
        AND ih.quantity > 0
      GROUP BY ih.plu, a.brand_name, a.Listing_Type
      HAVING history_quantity > current_quantity
      ORDER BY a.brand_name
      LIMIT 10
    `;
    const missingResult = await inventoryDb.raw(missingQuery, [`${today}%`]);
    
    // Check listing types in today's arrivals
    const listingTypesQuery = `
      SELECT 
        a.Listing_Type,
        COUNT(*) as count,
        COUNT(CASE WHEN ci.quantity > 0 THEN 1 END) as in_current_inventory
      FROM inventory_history ih
      JOIN alcohol a ON ih.plu = a.nc_code
      LEFT JOIN current_inventory ci ON ih.plu = ci.plu
      WHERE ih.check_time LIKE ?
        AND ih.quantity > 0
      GROUP BY a.Listing_Type
      ORDER BY count DESC
    `;
    const listingTypesResult = await inventoryDb.raw(listingTypesQuery, [`${today}%`]);
    
    res.json({
      success: true,
      debug_info: {
        date_checked: today,
        table_stats: [currentInvResult[0], historyResult[0]],
        missing_from_current_inventory: missingResult,
        listing_types_breakdown: listingTypesResult,
        explanation: {
          issue: "Current Inventory page uses 'current_inventory' table, Today's Arrivals uses 'inventory_history'",
          filter: "Current Inventory now shows ALL listing types",
          missing_items: `${missingResult.length} products from today found in history but not in current_inventory`
        }
      }
    });
  } catch (error) {
    console.error('Error in debugDataSync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get store inventory for a specific product (for expanding product details)
export async function getStoreInventoryForProduct(req, res) {
  try {
    const { plu } = req.params;
    
    const query = `
      SELECT 
        ci.store_id,
        s.store_number,
        s.nickname,
        s.address,
        s.region,
        s.mixed_beverage,
        ci.quantity,
        ci.last_updated
      FROM current_inventory ci
      JOIN stores s ON ci.store_id = s.store_id
      WHERE ci.plu = ? AND ci.quantity > 0
      ORDER BY s.nickname COLLATE NOCASE
    `;
    
    const stores = await inventoryDb.raw(query, [parseInt(plu)]);
    res.json({ success: true, stores });
  } catch (error) {
    console.error('Error in getStoreInventoryForProduct:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Search products (for autocomplete/search)
export async function searchAllocatedProducts(req, res) {
  try {
    const { term } = req.params;
    let query, params;
    
    if (/^\d+$/.test(term)) {
      // PLU search
      query = `
        SELECT DISTINCT 
          COALESCE(b.name, a.brand_name) as name,
          COALESCE(b.plu, a.nc_code) as plu,
          a.retail_price,
          a.Listing_Type
        FROM alcohol a
        LEFT JOIN bourbons b ON a.nc_code = b.plu
        WHERE COALESCE(b.plu, a.nc_code) = ?
      `;
      params = [parseInt(term)];
    } else {
      // Name search
      query = `
        SELECT DISTINCT 
          COALESCE(b.name, a.brand_name) as name,
          COALESCE(b.plu, a.nc_code) as plu,
          a.retail_price,
          a.Listing_Type
        FROM alcohol a
        LEFT JOIN bourbons b ON a.nc_code = b.plu
        WHERE COALESCE(b.name, a.brand_name) LIKE ? COLLATE NOCASE
        ORDER BY name
        LIMIT 10
      `;
      params = [`%${term}%`];
    }
    
    const products = await inventoryDb.raw(query, params);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error in searchAllocatedProducts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Generate delivery analysis (for delivery analysis page) - FIXED VERSION
export async function generateDeliveryAnalysis(req, res) {
  try {
    const { plu, weeksBack = 0, includeOtherDrops = true } = req.body;
    
    // Calculate date ranges
    const { startDate, endDate } = getWeekRange(weeksBack);
    const { monthStart, monthEnd } = getCurrentMonthRange();
    
    // Get product info
    const productQuery = `
      SELECT 
        COALESCE(b.name, a.brand_name) as name,
        CAST(a.nc_code AS INTEGER) as plu,
        a.bottles_per_case,
        a.retail_price,
        a.size_ml
      FROM alcohol a
      LEFT JOIN bourbons b ON a.nc_code = b.plu
      WHERE a.nc_code = ?
    `;
    const productResults = await inventoryDb.raw(productQuery, [plu]);
    const product = productResults[0];
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: `Product with PLU ${plu} not found` 
      });
    }
    
    const productInfo = {
      name: product.name || `PLU ${plu}`,
      plu: product.plu,
      bottles_per_case: product.bottles_per_case || 6,
      retail_price: product.retail_price,
      size_ml: product.size_ml
    };
    
    // Get deliveries - focus on 'first' and 'up' change types within date range
    const deliveryQuery = `
    SELECT 
      ih.history_id,
      ih.store_id,
      s.store_number,
      s.nickname,
      s.address,
      s.region,
      s.mixed_beverage,
      ih.quantity,
      ih.change_type,
      ih.delta,
      ih.check_time,
      DATE(ih.check_time) as delivery_date,
      strftime('%w', DATE(ih.check_time)) as day_of_week  -- 0=Sunday, 1=Monday, etc.
    FROM inventory_history ih
    JOIN stores s ON ih.store_id = s.store_id
    WHERE ih.plu = ?
      AND ih.change_type IN ('first', 'up')
      AND DATE(ih.check_time) BETWEEN ? AND ?
      AND ih.quantity > 0
    ORDER BY ih.check_time, s.nickname
    `;
    const deliveries = await inventoryDb.raw(deliveryQuery, [plu, startDate, endDate]);
    
    // FIXED: Get monthly shipments from state warehouse - ONLY the latest correction
    const shipmentQuery = `
      SELECT num_units as total_bottles
      FROM shipments_history 
      WHERE nc_code = ?
        AND board_id = 155
        AND DATE(ship_date) BETWEEN ? AND ?
      ORDER BY shipment_id DESC
      LIMIT 1
    `;
    const shipmentResults = await inventoryDb.raw(shipmentQuery, [plu.toString(), monthStart, monthEnd]);
    const totalShippedBottles = shipmentResults[0]?.total_bottles || 0;
    
    // Get other drop products if requested
    let storesWithOtherDrops = [];
    if (includeOtherDrops && deliveries.length >= 0) {
      // Find other allocated products that had deliveries in this time period
      const otherDropQuery = `
        SELECT DISTINCT ih.plu
        FROM inventory_history ih
        JOIN alcohol a ON ih.plu = a.nc_code
        WHERE ih.change_type IN ('first', 'up')
          AND DATE(ih.check_time) BETWEEN ? AND ?
          AND ih.plu != ?
          AND ih.quantity > 0
          AND a.Listing_Type IN ('Allocation', 'Limited', 'Barrel')
      `;
      const otherDropProducts = await inventoryDb.raw(otherDropQuery, [startDate, endDate, plu]);
      
      if (otherDropProducts.length > 0) {
        const deliveredStoreIds = deliveries.map(d => d.store_id);
        const otherProductPlus = otherDropProducts.map(p => p.plu);
        
        // Build dynamic query for stores that got other products but not this one
        const placeholders = otherProductPlus.map(() => '?').join(',');
        let excludePlaceholders = '';
        let excludeParams = [];
        
        if (deliveredStoreIds.length > 0) {
          excludePlaceholders = ` AND ih.store_id NOT IN (${deliveredStoreIds.map(() => '?').join(',')})`;
          excludeParams = deliveredStoreIds;
        }
        
        // FIXED: Filter to stores that received 2+ different products
        const otherDropStoreQuery = `
          SELECT 
            ih.store_id,
            s.store_number,
            s.nickname,
            s.address,
            s.region,
            s.mixed_beverage,
            GROUP_CONCAT(DISTINCT ih.plu) as received_plus,
            GROUP_CONCAT(DISTINCT COALESCE(b.name, a.brand_name)) as received_products,
            COUNT(DISTINCT ih.plu) as product_count
          FROM inventory_history ih
          JOIN stores s ON ih.store_id = s.store_id
          LEFT JOIN bourbons b ON ih.plu = b.plu
          LEFT JOIN alcohol a ON ih.plu = a.nc_code
          WHERE ih.change_type IN ('first', 'up')
            AND DATE(ih.check_time) BETWEEN ? AND ?
            AND ih.plu IN (${placeholders})
            AND ih.quantity > 0
            ${excludePlaceholders}
          GROUP BY ih.store_id, s.store_number, s.nickname, s.address, s.region, s.mixed_beverage
          HAVING COUNT(DISTINCT ih.plu) >= 2
          ORDER BY s.nickname
        `;
        
        const params = [startDate, endDate, ...otherProductPlus, ...excludeParams];
        storesWithOtherDrops = await inventoryDb.raw(otherDropStoreQuery, params);
      }
    }
    
    // Calculate summary statistics
    const summary = {
      totalDeliveries: deliveries.length,
      uniqueStores: [...new Set(deliveries.map(d => d.store_id))].length,
      totalBottlesDelivered: deliveries.reduce((sum, d) => sum + d.quantity, 0),
      totalCasesDelivered: deliveries.reduce((sum, d) => 
        sum + Math.ceil(d.quantity / productInfo.bottles_per_case), 0)
    };
    
    res.json({
      success: true,
      analysis: {
        product: productInfo,
        deliveries,
        shipmentInfo: {
          totalBottles: totalShippedBottles,
          totalCases: Math.ceil(totalShippedBottles / productInfo.bottles_per_case)
        },
        storesWithOtherDrops,
        dateRange: { startDate, endDate },
        monthRange: { monthStart, monthEnd },
        summary
      }
    });
    
  } catch (error) {
    console.error('Error in generateDeliveryAnalysis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate delivery analysis',
      details: error.message 
    });
  }
}

// FIXED: Get stores without deliveries with accurate count
export async function getStoresWithoutDeliveries(req, res) {
  try {
    const { deliveredStoreIds = [], otherDropStoreIds = [] } = req.body;
    
    // Combine all store IDs that should be excluded
    const excludedStoreIds = [...new Set([...deliveredStoreIds, ...otherDropStoreIds])];
    
    let query = `
      SELECT 
        store_id,
        store_number,
        nickname,
        address,
        region,
        mixed_beverage
      FROM stores
    `;
    
    let params = [];
    
    if (excludedStoreIds.length > 0) {
      const placeholders = excludedStoreIds.map(() => '?').join(',');
      query += ` WHERE store_id NOT IN (${placeholders})`;
      params = excludedStoreIds;
    }
    
    query += ` ORDER BY nickname COLLATE NOCASE`;
    
    const stores = await inventoryDb.raw(query, params);
    
    res.json({ 
      success: true, 
      stores,
      summary: {
        totalStores: stores.length,
        excludedStores: excludedStoreIds.length
      }
    });
  } catch (error) {
    console.error('Error in getStoresWithoutDeliveries:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Simplified warehouse inventory with better connection handling
export async function getWarehouseInventory(req, res) {
  try {
    const { 
      timePeriod = 'last_calendar_month',
      productTypes,
      hideZeroActivity = 'true',
      searchTerm
    } = req.query;

    console.log('Warehouse inventory request:', { timePeriod, productTypes, hideZeroActivity, searchTerm });

    // Calculate date ranges based on time period
    const now = new Date();
    let startDate, endDate;
    
    switch (timePeriod) {
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_180_days':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_calendar_month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
    }

    const formatDate = (date) => date.toISOString().split('T')[0];
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    console.log('Date range:', { startDateStr, endDateStr });

    // First, get basic warehouse data with a simple query
    let baseQuery = `
      SELECT DISTINCT
        wih.nc_code as plu,
        COALESCE(b.name, a.brand_name, 'Unknown Product') as product_name,
        a.retail_price,
        COALESCE(a.Listing_Type, 'Unknown') as listing_type,
        a.image_path,
        wih.total_available as current_inventory,
        wih.check_date as current_date,
        CASE 
          WHEN a.nc_code IS NOT NULL AND wih.nc_code IS NOT NULL THEN 'complete'
          WHEN a.nc_code IS NOT NULL AND wih.nc_code IS NULL THEN 'alcohol_only'  
          WHEN a.nc_code IS NULL AND wih.nc_code IS NOT NULL THEN 'warehouse_only'
          ELSE 'missing'
        END as data_source
      FROM warehouse_inventory_history_v2 wih
      LEFT JOIN alcohol a ON wih.nc_code = a.nc_code
      LEFT JOIN bourbons b ON wih.nc_code = b.plu  
      WHERE wih.check_date = (
        SELECT MAX(check_date) 
        FROM warehouse_inventory_history_v2 w2 
        WHERE w2.nc_code = wih.nc_code
      )
    `;

    // Add filters to the base query
    let queryParams = [];
    
    if (!searchTerm || !searchTerm.trim()) {
      // Only apply type filters if not searching
      if (productTypes) {
        const typesArray = productTypes.split(',');
        const placeholders = typesArray.map(() => '?').join(',');
        baseQuery += ` AND COALESCE(a.Listing_Type, 'Unknown') IN (${placeholders})`;
        queryParams.push(...typesArray);
      } else {
        // Default: exclude 'Listed' products
        baseQuery += ` AND COALESCE(a.Listing_Type, 'Unknown') IN (?, ?, ?)`;
        queryParams.push('Allocation', 'Limited', 'Barrel');
      }
    }

    baseQuery += ` ORDER BY COALESCE(b.name, a.brand_name) COLLATE NOCASE`;

    console.log('Executing base query...');
    const baseResults = await inventoryDb.raw(baseQuery, queryParams);
    console.log(`Base query returned ${baseResults.length} results`);

    // Now calculate analytics for each product in smaller batches to avoid connection issues
    const enhancedResults = [];
    const batchSize = 50; // Process in smaller batches
    
    for (let i = 0; i < baseResults.length; i += batchSize) {
      const batch = baseResults.slice(i, i + batchSize);
      const batchPlus = batch.map(item => item.plu);
      
      if (batchPlus.length === 0) continue;
      
      // Get analytics for this batch
      const placeholders = batchPlus.map(() => '?').join(',');
      const analyticsQuery = `
        SELECT 
          nc_code,
          MAX(total_available) as peak_inventory,
          MIN(total_available) as low_inventory,
          COUNT(*) as data_points
        FROM warehouse_inventory_history_v2 
        WHERE nc_code IN (${placeholders})
          AND check_date BETWEEN ? AND ?
        GROUP BY nc_code
      `;
      
      const analytics = await inventoryDb.raw(analyticsQuery, [...batchPlus, startDateStr, endDateStr]);
      
      // Create lookup map for analytics
      const analyticsMap = {};
      analytics.forEach(row => {
        analyticsMap[row.nc_code] = row;
      });
      
      // Enhance batch results
      for (const item of batch) {
        const analytic = analyticsMap[item.plu] || {};
        enhancedResults.push({
          ...item,
          peak_inventory: analytic.peak_inventory || item.current_inventory || 0,
          low_inventory: analytic.low_inventory || item.current_inventory || 0,
          data_points: analytic.data_points || 0,
          last_decrease_date: null, // Simplified - remove complex decrease tracking for now
          decrease_amount: null,
          image_url: getImagePath(item.image_path),
          has_image: !!(item.image_path)
        });
      }
    }

    console.log(`Enhanced ${enhancedResults.length} results with analytics`);

    // Apply client-side filtering
    let filteredResults = enhancedResults;
    
    if (searchTerm && searchTerm.trim()) {
      // Search mode: filter by search term
      const searchLower = searchTerm.toLowerCase();
      filteredResults = enhancedResults.filter(item => 
        item.product_name.toLowerCase().includes(searchLower) ||
        item.plu.toString().includes(searchTerm)
      );
    }

    if (hideZeroActivity === 'true') {
      filteredResults = filteredResults.filter(item => 
        item.data_points > 0 && 
        (item.peak_inventory > 0 || item.current_inventory > 0)
      );
    }

    console.log(`Final filtered results: ${filteredResults.length}`);

    res.json({ 
      success: true, 
      inventory: filteredResults,
      meta: {
        total_products: enhancedResults.length,
        filtered_products: filteredResults.length,
        products_with_images: enhancedResults.filter(i => i.has_image).length,
        time_period: {
          start: startDateStr,
          end: endDateStr,
          type: timePeriod
        }
      }
    });

  } catch (error) {
    console.error('Error in getWarehouseInventory:', error);
    
    // If we have a connection timeout, try a simplified fallback
    if (error.message.includes('Timeout') || error.message.includes('pool')) {
      console.log('Connection timeout detected, trying simplified query...');
      try {
        const fallbackResults = await getSimpleWarehouseInventory();
        res.json({ 
          success: true, 
          inventory: fallbackResults,
          meta: {
            total_products: fallbackResults.length,
            filtered_products: fallbackResults.length,
            products_with_images: 0,
            fallback: true
          }
        });
        return;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
      }
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
}

// NEW: Get shipments
export async function getShipments(req, res) {
  try {
    const { startDate, endDate, boardId } = req.query;
    
    let query = `
      SELECT 
        sh.shipment_id,
        sh.nc_code as plu,
        COALESCE(b.name, a.brand_name) as product_name,
        sh.ship_date,
        sh.num_units,
        b.board_name,
        a.retail_price
      FROM shipments_history sh
      LEFT JOIN boards b ON sh.board_id = b.board_id
      LEFT JOIN alcohol a ON sh.nc_code = a.nc_code
      LEFT JOIN bourbons bour ON sh.nc_code = bour.plu
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ` AND DATE(sh.ship_date) >= ?`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND DATE(sh.ship_date) <= ?`;
      params.push(endDate);
    }
    
    if (boardId) {
      query += ` AND sh.board_id = ?`;
      params.push(parseInt(boardId));
    }
    
    query += ` ORDER BY sh.ship_date DESC, product_name COLLATE NOCASE`;
    
    const shipments = await inventoryDb.raw(query, params);
    res.json({ success: true, shipments });
  } catch (error) {
    console.error('Error in getShipments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// NEW: Get store inventory
export async function getStoreInventory(req, res) {
  try {
    const { storeId } = req.params;
    
    const query = `
      SELECT 
        ci.plu,
        COALESCE(b.name, a.brand_name) as product_name,
        ci.quantity,
        ci.last_updated,
        a.retail_price,
        a.size_ml,
        a.Listing_Type,
        s.store_number,
        s.nickname,
        s.address
      FROM current_inventory ci
      LEFT JOIN bourbons b ON ci.plu = b.plu
      LEFT JOIN alcohol a ON ci.plu = a.nc_code
      JOIN stores s ON ci.store_id = s.store_id
      WHERE ci.store_id = ? AND ci.quantity > 0
      ORDER BY product_name COLLATE NOCASE
    `;
    
    const inventory = await inventoryDb.raw(query, [parseInt(storeId)]);
    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Error in getStoreInventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// NEW: Get product history
export async function getProductHistory(req, res) {
  try {
    const { plu } = req.params;
    const { limit = 100 } = req.query;
    
    const query = `
      SELECT 
        ih.history_id,
        ih.store_id,
        s.store_number,
        s.nickname,
        ih.quantity,
        ih.change_type,
        ih.delta,
        ih.check_time
      FROM inventory_history ih
      JOIN stores s ON ih.store_id = s.store_id
      WHERE ih.plu = ?
      ORDER BY ih.check_time DESC
      LIMIT ?
    `;
    
    const history = await inventoryDb.raw(query, [parseInt(plu), parseInt(limit)]);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error in getProductHistory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// NEW: Get store inventory changes history (for Previous Drops section)
export async function getStoreInventoryHistory(req, res) {
  try {
    const { storeId } = req.params;
    const { days = 30 } = req.query;
    
    // Validate days parameter
    const validDays = [30, 60, 90];
    const daysPeriod = validDays.includes(parseInt(days)) ? parseInt(days) : 30;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysPeriod);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Fetching store ${storeId} inventory changes for ${daysPeriod} days (${startDateStr} to ${endDateStr})`);
    
    const query = `
      SELECT 
        ih.history_id,
        ih.plu,
        ih.quantity,
        ih.change_type,
        ih.delta,
        DATE(ih.check_time) as change_date,
        ih.check_time,
        COALESCE(b.name, a.brand_name, 'Unknown Product') as product_name,
        a.retail_price,
        a.Listing_Type,
        a.image_path,
        a.nc_code
      FROM inventory_history ih
      LEFT JOIN alcohol a ON ih.plu = a.nc_code
      LEFT JOIN bourbons b ON ih.plu = b.plu
      WHERE ih.store_id = ?
        AND DATE(ih.check_time) BETWEEN ? AND ?
        AND ih.change_type IN ('up', 'first')
        AND ih.quantity > 0
      ORDER BY 
        DATE(ih.check_time) DESC,
        product_name ASC
    `;
    
    const changes = await inventoryDb.raw(query, [parseInt(storeId), startDateStr, endDateStr]);
    
    // Group changes by date
    const groupedChanges = changes.reduce((groups, change) => {
      const date = change.change_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push({
        history_id: change.history_id,
        plu: change.plu,
        nc_code: change.nc_code,
        product_name: change.product_name,
        quantity: change.quantity,
        change_type: change.change_type,
        delta: change.delta,
        check_time: change.check_time,
        retail_price: change.retail_price,
        listing_type: change.Listing_Type,
        image_path: change.image_path,
        image_url: getImagePath(change.image_path),
        has_image: !!(change.image_path && change.image_path !== 'no image available')
      });
      return groups;
    }, {});
    
    // Convert to array format with metadata
    const formattedData = Object.entries(groupedChanges).map(([date, items]) => {
      const dateObj = new Date(date + 'T00:00:00');
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      
      return {
        date,
        day_of_week: dayOfWeek,
        formatted_date: dateObj.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        item_count: items.length,
        items: items.sort((a, b) => a.product_name.localeCompare(b.product_name))
      };
    });
    
    // Calculate summary statistics
    const totalChanges = changes.length;
    const uniqueProducts = [...new Set(changes.map(c => c.plu))].length;
    const totalInventoryAdded = changes.reduce((sum, c) => sum + (c.delta || 0), 0);
    
    res.json({
      success: true,
      storeId: parseInt(storeId),
      daysPeriod,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      },
      summary: {
        totalChanges,
        uniqueProducts,
        totalInventoryAdded,
        daysWithChanges: formattedData.length
      },
      changes: formattedData
    });
    
  } catch (error) {
    console.error('Error in getStoreInventoryHistory:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch store inventory history',
      details: error.message 
    });
  }
}

// Helper functions for date calculations
function getWeekRange(weeksBack = 0) {
  // Always compute calendar dates in America/New_York
  const TZ = 'America/New_York';
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short', // Sun, Mon, ...
  });

  const partsOf = (d) => {
    const parts = fmt.formatToParts(d).reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    // Map Sun..Sat -> 0..6
    const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      dow: dowMap[parts.weekday],
    };
  };

  const pad2 = (n) => String(n).padStart(2, '0');
  const ymd = ({ year, month, day }) => `${year}-${pad2(month)}-${pad2(day)}`;

  const now = new Date();
  const nowET = partsOf(now);

  // Monday index = 1. "Days since Monday" in ET (0..6)
  const daysSinceMonday = (nowET.dow + 6) % 7;

  // Total days to walk back to the Monday N weeks ago
  const totalDaysBack = daysSinceMonday + (Number(weeksBack) || 0) * 7;

  // Step back in whole days; DST won't break day-of-week correctness here
  const startMoment = new Date(now.getTime() - totalDaysBack * 24 * 60 * 60 * 1000);

  const startET = partsOf(startMoment);

  // Per requirement: end date is ALWAYS "today" (ET)
  return {
    startDate: ymd(startET),
    endDate: ymd(nowET),
  };
}

function getCurrentMonthRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  return {
    monthStart: firstDay.toISOString().split('T')[0],
    monthEnd: lastDay.toISOString().split('T')[0]
  };
}

// Image path configuration - Easy production switching
const IMAGE_CONFIG = {
  development: {
    basePath: 'BourbonDatabase/alcohol_images/',
    urlPrefix: '/api/images/'
  },
  production: {
    // PRODUCTION CONFIG: Uncomment and modify for production deployment
    // basePath: '/opt/alcohol_images/',
    // urlPrefix: '/images/',
    basePath: 'BourbonDatabase/alcohol_images/', // Using dev config for now
    urlPrefix: '/api/images/'
  }
};

const getImagePath = (imagePath) => {
  if (!imagePath) return null;
  
  const config = IMAGE_CONFIG[process.env.NODE_ENV] || IMAGE_CONFIG.development;
  
  // Convert database path: "alcohol_images\filename" to proper URL
  const cleanPath = imagePath.replace(/alcohol_images[\\\/]/, '');
  return `${config.urlPrefix}${cleanPath}`;
};

const fileExists = (imagePath) => {
  if (!imagePath) return false;
  
  try {
    const config = IMAGE_CONFIG[process.env.NODE_ENV] || IMAGE_CONFIG.development;
    const cleanPath = imagePath.replace(/alcohol_images[\\\/]/, '');
    const fullPath = `${config.basePath}${cleanPath}`;
    
    // For now, assume file exists if path is provided
    // In production, you might want to actually check file existence
    return true;
  } catch (error) {
    return false;
  }
};

const logDataQualityIssues = (results, startDate, endDate) => {
  const issues = {
    warehouse_only: [],
    alcohol_only: [],
    missing_images: [],
    missing_prices: []
  };
  
  results.forEach(item => {
    if (item.data_source === 'warehouse_only') {
      issues.warehouse_only.push(item.plu);
      console.error(`ERROR: Product ${item.plu} exists in warehouse but missing from alcohol table`);
    }
    if (item.data_source === 'alcohol_only') {
      issues.alcohol_only.push(item.plu);
    }
    if (item.image_path && !item.has_image) {
      issues.missing_images.push(item.plu);
    }
    if (!item.retail_price && item.data_source !== 'warehouse_only') {
      issues.missing_prices.push(item.plu);
    }
  });
  
  console.info(`Warehouse Inventory Query (${startDate} to ${endDate}):`);
  console.info(`- Total products: ${results.length}`);
  console.info(`- Products with images: ${results.filter(i => i.has_image).length}`);
  console.info(`- Missing from alcohol table: ${issues.warehouse_only.length}`);
  console.info(`- Missing warehouse data: ${issues.alcohol_only.length}`);
  console.info(`- Missing image files: ${issues.missing_images.length}`);
};

// Simple fallback warehouse inventory function for connection issues
const getSimpleWarehouseInventory = async () => {
  const query = `
    SELECT 
      wih.nc_code as plu,
      COALESCE(b.name, a.brand_name, 'Unknown Product') as product_name,
      a.retail_price,
      COALESCE(a.Listing_Type, 'Unknown') as listing_type,
      wih.total_available as current_inventory,
      wih.total_available as peak_inventory,
      wih.total_available as low_inventory,
      1 as data_points,
      'complete' as data_source,
      null as last_decrease_date,
      null as decrease_amount,
      null as image_url,
      0 as has_image
    FROM warehouse_inventory_history_v2 wih
    LEFT JOIN alcohol a ON wih.nc_code = a.nc_code
    LEFT JOIN bourbons b ON wih.nc_code = b.plu  
    WHERE wih.check_date = (
      SELECT MAX(check_date) 
      FROM warehouse_inventory_history_v2 w2 
      WHERE w2.nc_code = wih.nc_code
    )
    AND COALESCE(a.Listing_Type, 'Unknown') IN ('Allocation', 'Limited', 'Barrel')
    AND wih.total_available > 0
    ORDER BY COALESCE(b.name, a.brand_name) COLLATE NOCASE
    LIMIT 100
  `;
  
  return await inventoryDb.raw(query);
};