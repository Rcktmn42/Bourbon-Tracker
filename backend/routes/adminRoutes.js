// backend/routes/adminRoutes.js

import express from 'express';
import {
  listUsers,
  updateUserRole,
  updateUserStatus,
  initiatePasswordReset
} from '../controllers/adminController.js';
import { authenticate, requirePowerUser } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Enhanced admin routes with proper authentication and validation
router.use(authenticate); // First authenticate
router.use(requirePowerUser); // Then check for admin/power_user role

// User management routes with input validation
router.get('/users', listUsers);
router.patch('/users/:userId/role', 
  validate(schemas.idParam, 'params'),
  validate(schemas.updateUserRole, 'body'),
  updateUserRole
);
router.patch('/users/:userId/status', 
  validate(schemas.idParam, 'params'),
  validate(schemas.updateUserStatus, 'body'),
  updateUserStatus
);
router.post('/users/:userId/reset-password', 
  validate(schemas.idParam, 'params'),
  initiatePasswordReset
);

export default router;
