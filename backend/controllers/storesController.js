// backend/controllers/storesController.js
import { inventoryDb } from '../config/db.js';

// Get all stores with basic information
export async function getAllStores(req, res) {
  try {
    const query = `
      SELECT 
        store_id,
        store_number,
        nickname,
        address,
        region,
        mixed_beverage,
        delivery_interval_days,
        last_delivery_date,
        delivery_day
      FROM stores
      ORDER BY 
        CASE region 
          WHEN 'North' THEN 1
          WHEN 'South' THEN 2
          WHEN 'East' THEN 3
          WHEN 'West' THEN 4
          ELSE 5
        END,
        CAST(store_number AS INTEGER)
    `;

    const stores = await inventoryDb.raw(query);
    
    res.json({
      success: true,
      stores: stores,
      total: stores.length
    });
  } catch (error) {
    console.error('Error in getAllStores:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stores',
      details: error.message 
    });
  }
}

// Get stores by region
export async function getStoresByRegion(req, res) {
  try {
    const { region } = req.params;
    
    // Validate region parameter
    const validRegions = ['North', 'South', 'East', 'West'];
    if (!validRegions.includes(region)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid region. Valid regions: North, South, East, West'
      });
    }

    const query = `
      SELECT 
        store_id,
        store_number,
        nickname,
        address,
        region,
        mixed_beverage,
        delivery_interval_days,
        last_delivery_date,
        delivery_day
      FROM stores
      WHERE region = ?
      ORDER BY CAST(store_number AS INTEGER)
    `;

    const stores = await inventoryDb.raw(query, [region]);
    
    res.json({
      success: true,
      stores: stores,
      region: region,
      total: stores.length
    });
  } catch (error) {
    console.error('Error in getStoresByRegion:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stores by region',
      details: error.message 
    });
  }
}

// Get individual store by ID
export async function getStoreById(req, res) {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    const query = `
      SELECT 
        store_id,
        store_number,
        nickname,
        address,
        region,
        mixed_beverage,
        delivery_interval_days,
        last_delivery_date,
        delivery_day
      FROM stores
      WHERE store_id = ?
    `;

    const stores = await inventoryDb.raw(query, [parseInt(id)]);
    
    if (stores.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    res.json({
      success: true,
      store: stores[0]
    });
  } catch (error) {
    console.error('Error in getStoreById:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch store',
      details: error.message 
    });
  }
}

// Search stores by term (name, number, or address)
export async function searchStores(req, res) {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required'
      });
    }

    const searchTerm = q.trim();
    
    let query, params;
    
    // Check if search term is numeric (store number search)
    if (/^\d+$/.test(searchTerm)) {
      query = `
        SELECT 
          store_id,
          store_number,
          nickname,
          address,
          region,
          mixed_beverage,
          delivery_interval_days,
          last_delivery_date
        FROM stores
        WHERE store_number = ?
        ORDER BY CAST(store_number AS INTEGER)
      `;
      params = [searchTerm];
    } else {
      // Text search across nickname and address
      query = `
        SELECT 
          store_id,
          store_number,
          nickname,
          address,
          region,
          mixed_beverage,
          delivery_interval_days,
          last_delivery_date
        FROM stores
        WHERE nickname LIKE ? COLLATE NOCASE
           OR address LIKE ? COLLATE NOCASE
        ORDER BY 
          CASE 
            WHEN nickname LIKE ? COLLATE NOCASE THEN 1
            WHEN address LIKE ? COLLATE NOCASE THEN 2
            ELSE 3
          END,
          CAST(store_number AS INTEGER)
      `;
      const likePattern = `%${searchTerm}%`;
      params = [likePattern, likePattern, likePattern, likePattern];
    }

    const stores = await inventoryDb.raw(query, params);
    
    res.json({
      success: true,
      stores: stores,
      search_term: searchTerm,
      total: stores.length
    });
  } catch (error) {
    console.error('Error in searchStores:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search stores',
      details: error.message 
    });
  }
}

// Get stores by mixed beverage status
export async function getStoresByMixedBeverage(req, res) {
  try {
    const { status } = req.query;
    
    // Convert status to boolean
    let mixedBeverageStatus;
    if (status === 'true' || status === '1') {
      mixedBeverageStatus = true;
    } else if (status === 'false' || status === '0') {
      mixedBeverageStatus = false;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Use true/false or 1/0'
      });
    }

    const query = `
      SELECT 
        store_id,
        store_number,
        nickname,
        address,
        region,
        mixed_beverage,
        delivery_interval_days,
        last_delivery_date,
        delivery_day
      FROM stores
      WHERE mixed_beverage = ?
      ORDER BY 
        CASE region 
          WHEN 'North' THEN 1
          WHEN 'South' THEN 2
          WHEN 'East' THEN 3
          WHEN 'West' THEN 4
          ELSE 5
        END,
        CAST(store_number AS INTEGER)
    `;

    const stores = await inventoryDb.raw(query, [mixedBeverageStatus ? 1 : 0]);
    
    res.json({
      success: true,
      stores: stores,
      mixed_beverage: mixedBeverageStatus,
      total: stores.length
    });
  } catch (error) {
    console.error('Error in getStoresByMixedBeverage:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stores by mixed beverage status',
      details: error.message 
    });
  }
}

// Get stores by delivery day
export async function getStoresByDeliveryDay(req, res) {
  try {
    const { day } = req.params;
    
    // Validate delivery day parameter
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Random'];
    if (!validDays.includes(day)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid delivery day. Valid days: Monday, Tuesday, Wednesday, Thursday, Friday, Random'
      });
    }

    const query = `
      SELECT 
        store_id,
        store_number,
        nickname,
        address,
        region,
        mixed_beverage,
        delivery_interval_days,
        last_delivery_date,
        delivery_day
      FROM stores
      WHERE delivery_day = ?
      ORDER BY 
        CASE region 
          WHEN 'North' THEN 1
          WHEN 'South' THEN 2
          WHEN 'East' THEN 3
          WHEN 'West' THEN 4
          ELSE 5
        END,
        CAST(store_number AS INTEGER)
    `;

    const stores = await inventoryDb.raw(query, [day]);
    
    res.json({
      success: true,
      stores: stores,
      delivery_day: day,
      total: stores.length
    });
  } catch (error) {
    console.error('Error in getStoresByDeliveryDay:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stores by delivery day',
      details: error.message 
    });
  }
}

// Get current inventory for a specific store
export async function getStoreInventory(req, res) {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    const storeId = parseInt(id);

    // Query to get current inventory for the store with product details
    // Join current_inventory -> bourbons for product names and then to alcohol for additional details if available
    const query = `
      SELECT 
        ci.store_id,
        ci.plu,
        ci.quantity,
        b.name as brand_name,
        COALESCE(a.retail_price, 0) as retail_price,
        COALESCE(a.Listing_Type, 'Allocation') as Listing_Type,
        a.image_path,
        a.nc_code
      FROM current_inventory ci
      INNER JOIN bourbons b ON ci.plu = b.plu
      LEFT JOIN alcohol a ON b.plu = a.nc_code
      WHERE ci.store_id = ? 
        AND ci.quantity > 0
      ORDER BY b.name
    `;

    const inventory = await inventoryDb.raw(query, [storeId]);
    
    res.json({
      success: true,
      store_id: storeId,
      inventory: inventory,
      total: inventory.length
    });
  } catch (error) {
    console.error('Error in getStoreInventory:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch store inventory',
      details: error.message 
    });
  }
}