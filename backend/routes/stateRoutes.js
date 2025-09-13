// backend/routes/stateRoutes.js
import express from 'express';
import { getShipments, getProducts, getBoards } from '../controllers/stateController.js';

const router = express.Router();

// Get all shipments with filtering
router.get('/shipments', getShipments);

// Get all products for dropdown filtering
router.get('/products', getProducts);

// Get all boards for dropdown filtering
router.get('/boards', getBoards);

export default router;