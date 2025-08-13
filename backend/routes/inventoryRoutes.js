// backend/routes/inventoryRoutes.js
import express from 'express';
import { getTodaysArrivals, getInventorySummary, testDatabase } from '../controllers/inventoryController.js';

const router = express.Router();

// GET /api/inventory/test - Test database connection
router.get('/test', testDatabase);

// GET /api/inventory/todays-arrivals - Today's bourbon deliveries
router.get('/todays-arrivals', getTodaysArrivals);

// GET /api/inventory/summary - Basic inventory stats  
router.get('/summary', getInventorySummary);

// Future routes for other reports:
// router.get('/warehouse-inventory', getWarehouseInventory);
// router.get('/shipments', getShipments);  
// router.get('/store-inventory/:storeId', getStoreInventory);
// router.get('/product-history/:plu', getProductHistory);

export default router;