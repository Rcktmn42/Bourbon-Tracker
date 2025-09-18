// backend/routes/storesRoutes.js
import express from 'express';
import { 
  getAllStores,
  getStoresByRegion,
  getStoreById,
  searchStores,
  getStoresByMixedBeverage,
  getStoresByDeliveryDay,
  getStoreInventory
} from '../controllers/storesController.js';

const router = express.Router();

// GET /api/stores - Get all stores
router.get('/', getAllStores);

// GET /api/stores/search?q=term - Search stores by name, number, or address
router.get('/search', searchStores);

// GET /api/stores/mixed-beverage?status=true/false - Filter by mixed beverage status
router.get('/mixed-beverage', getStoresByMixedBeverage);

// GET /api/stores/region/:region - Get stores by region (North, South, East, West)
router.get('/region/:region', getStoresByRegion);

// GET /api/stores/delivery-day/:day - Get stores by delivery day (Monday, Tuesday, etc.)
router.get('/delivery-day/:day', getStoresByDeliveryDay);

// GET /api/stores/:id/inventory - Get store inventory
router.get('/:id/inventory', getStoreInventory);

// GET /api/stores/:id - Get individual store by ID
router.get('/:id', getStoreById);

export default router;