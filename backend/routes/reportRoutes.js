// backend/routes/reportRoutes.js
import express from 'express';
import { 
  getWarehouseInventoryReport,
  getReportStatus,
  triggerReportGeneration
} from '../controllers/warehouseReportController.js';

const router = express.Router();

// Public route (authenticated users): Get warehouse inventory reports from pre-generated JSON
router.get('/warehouse-inventory', getWarehouseInventoryReport);

// Admin routes: Report management and monitoring
router.get('/status', getReportStatus);
router.post('/generate', triggerReportGeneration);

export default router;