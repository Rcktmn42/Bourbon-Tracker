// backend/routes/inventoryRoutes.js
import express from 'express';
import { 
    // Your existing imports
    getTodaysArrivals, 
    getInventorySummary, 
    testDatabase,
    // New imports for inventory reports
    getCurrentAllocatedInventory,
    getStoreInventoryForProduct,
    searchAllocatedProducts,
    generateDeliveryAnalysis,
    getStoresWithoutDeliveries,
    getWarehouseInventory,
    debugDataSync,
    getAvailableDates
} from '../controllers/inventoryController.js';

const router = express.Router();

// Your existing routes
router.get('/test', testDatabase);
router.get('/todays-arrivals', getTodaysArrivals);
router.get('/available-dates', getAvailableDates);
router.get('/summary', getInventorySummary);

// NEW ROUTES for inventory reports
router.get('/allocated-current', getCurrentAllocatedInventory);
router.get('/product/:plu/stores', getStoreInventoryForProduct);
router.get('/search/:term', searchAllocatedProducts);
router.post('/delivery-analysis', generateDeliveryAnalysis);
router.post('/stores-without-deliveries', getStoresWithoutDeliveries); 

// Warehouse inventory route - ENABLED
router.get('/warehouse-inventory', getWarehouseInventory);

// Debug route for data sync investigation
router.get('/debug-data-sync', debugDataSync);

// Future routes for other reports:
// router.get('/shipments', getShipments);  
// router.get('/store-inventory/:storeId', getStoreInventory);
// router.get('/product-history/:plu', getProductHistory);

export default router;