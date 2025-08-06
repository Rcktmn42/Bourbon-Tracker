// backend/routes/adminRoutes.js

import express from 'express';
import {
  listUsers,
  updateUserRole,
  updateUserStatus
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only power_users or admins can see these routes
router.use(authenticate, requireRole('power_user'));

router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', updateUserStatus);

export default router;
