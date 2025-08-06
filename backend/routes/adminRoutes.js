// backend/routes/adminRoutes.js

import express from 'express';
import {
  listUsers,
  updateUserRole,
  updateUserStatus
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only power_users or admins can see these routes
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.role === 'power_user' || req.user.role === 'admin') {
    return next();
  }
  return res.sendStatus(403);
});
router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', updateUserStatus);

export default router;
