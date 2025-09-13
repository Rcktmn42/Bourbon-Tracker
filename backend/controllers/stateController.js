// backend/controllers/stateController.js
import { inventoryDb } from '../config/db.js';

// Get all shipments with filtering
export const getShipments = async (req, res) => {
  try {
    const {
      productType = 'all-allocated-limited-barrel',
      boardId = 'all',
      searchTerm = '',
      dateRange = 'current-month',
      startDate,
      endDate
    } = req.query;

    // Build base query
    let query = inventoryDb('shipments_history as sh')
      .select(
        'sh.ship_date',
        'sh.num_units',
        'sh.nc_code',
        'a.brand_name',
        'a.bottles_per_case',
        'a.Listing_Type',
        'a.retail_price',
        'b.board_name',
        'b.board_id'
      )
      .join('alcohol as a', 'sh.nc_code', 'a.nc_code')
      .join('boards as b', 'sh.board_id', 'b.board_id');

    // Apply product type filter (unless search overrides)
    if (!searchTerm) {
      if (productType === 'allocation') {
        query = query.where('a.Listing_Type', 'Allocation');
      } else if (productType === 'limited') {
        query = query.where('a.Listing_Type', 'Limited');
      } else if (productType === 'barrel') {
        query = query.where('a.Listing_Type', 'Barrel');
      } else if (productType === 'all-allocation-limited-barrel') {
        query = query.whereIn('a.Listing_Type', ['Allocation', 'Limited', 'Barrel']);
      }
    }
    // Note: When searching, no product type filter is applied - search returns all products

    // Apply search filter (overrides product type restrictions)
    if (searchTerm) {
      query = query.where(function() {
        this.where('a.brand_name', 'LIKE', `%${searchTerm}%`)
            .orWhere('a.nc_code', 'LIKE', `%${searchTerm}%`);
      });
    }


    // Apply board filter
    if (boardId !== 'all') {
      query = query.where('b.board_id', boardId);
    }

    // Apply date range filter
    if (startDate && endDate) {
      query = query.whereBetween('sh.ship_date', [startDate, endDate]);
    } else {
      // Calculate date range based on dateRange parameter
      const today = new Date();
      let rangeStartDate, rangeEndDate;

      switch (dateRange) {
        case 'current-month':
          rangeStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
          rangeEndDate = today;
          break;
        case 'last-16-days':
          rangeStartDate = new Date(today);
          rangeStartDate.setDate(today.getDate() - 15);
          rangeEndDate = today;
          break;
        case 'last-24-days':
          rangeStartDate = new Date(today);
          rangeStartDate.setDate(today.getDate() - 23);
          rangeEndDate = today;
          break;
        default:
          // For specific month selections like 'august-2024'
          if (dateRange.includes('-')) {
            const [month, year] = dateRange.split('-');
            const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
            rangeStartDate = new Date(parseInt(year), monthIndex, 1);
            rangeEndDate = new Date(parseInt(year), monthIndex + 1, 0);
          } else {
            // Default to current month
            rangeStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
            rangeEndDate = today;
          }
          break;
      }

      const formatDate = (date) => date.toISOString().split('T')[0];
      query = query.whereBetween('sh.ship_date', [formatDate(rangeStartDate), formatDate(rangeEndDate)]);
    }

    // Execute query
    const rawData = await query.orderBy('sh.ship_date', 'desc');

    // Transform data
    const transformedData = rawData.map(row => ({
      ...row,
      cases: Math.ceil(row.num_units / (row.bottles_per_case || 1)),
      board_name_clean: row.board_name.replace(/ ABC Board$/i, ''),
      ship_date_formatted: new Date(row.ship_date).toLocaleDateString()
    }));

    // Debug logging for first few records
    if (transformedData.length > 0) {
      console.log('Sample data:', transformedData.slice(0, 2).map(item => ({
        brand_name: item.brand_name,
        retail_price: item.retail_price,
        bottles_per_case: item.bottles_per_case
      })));
    }

    res.json({
      success: true,
      shipments: transformedData,
      count: transformedData.length
    });

  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipments data'
    });
  }
};

// Get all products for dropdown filtering
export const getProducts = async (req, res) => {
  try {
    // Get all products - no filtering by listing type
    // This supports universal search across all product types
    const products = await inventoryDb('alcohol')
      .select('nc_code', 'brand_name', 'Listing_Type')
      .orderBy('brand_name');

    res.json({
      success: true,
      products
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products data'
    });
  }
};

// Get all boards for dropdown filtering
export const getBoards = async (req, res) => {
  try {
    const boards = await inventoryDb('boards')
      .select('board_id', 'board_name')
      .orderBy('board_name');

    // Clean board names
    const cleanedBoards = boards.map(board => ({
      ...board,
      board_name_clean: board.board_name.replace(/ ABC Board$/i, '')
    }));

    res.json({
      success: true,
      boards: cleanedBoards
    });

  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch boards data'
    });
  }
};