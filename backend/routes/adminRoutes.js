// backend/routes/adminRoutes.js

import express from 'express';
import { listUsers, updateUserRole } from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only power_users and admins can list and update
router.use(authenticate, requireRole('power_user'));

router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);

export default router;
