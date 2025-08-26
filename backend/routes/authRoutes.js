// backend/routes/authRoutes.js
import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { 
  register, 
  login, 
  logout, 
  whoami, 
  changePassword,
  verifyEmail,
  resendVerification
} from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Email verification routes (public)
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected routes
router.get('/whoami', authenticate, whoami);
router.post('/change-password', authenticate, changePassword);

export default router;