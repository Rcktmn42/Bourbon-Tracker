// backend/routes/authRoutes.js
import express from 'express';
import {
  register,
  login,
  logout,
  whoami,
  changePassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Authenticated routes
router.get('/whoami', authenticate, whoami);
router.post('/change-password', authenticate, changePassword);

// Removed PUT /update-profile - use /api/user/me instead

export default router;