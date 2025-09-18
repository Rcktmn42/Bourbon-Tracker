// backend/routes/authRoutes.js
import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validationMiddleware.js';
import { 
  register, 
  login, 
  logout, 
  whoami, 
  changePassword,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  verifyResetToken
} from '../controllers/authController.js';
import userDb from '../config/db.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Public routes with input validation
router.post('/register', 
  validate(schemas.register, 'body'),
  register
);
router.post('/login', 
  validate(schemas.login, 'body'),
  login
);
router.post('/logout', logout);

// Email verification routes (public)
router.post('/verify-email', 
  validate(schemas.emailVerification, 'body'),
  verifyEmail
);
router.post('/resend-verification', resendVerification);

// Password reset routes (public)
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', 
  validate(schemas.passwordReset, 'body'),
  resetPassword
);
router.get('/verify-reset-token/:token', verifyResetToken);

// Protected routes
router.get('/whoami', authenticate, whoami);
router.post('/change-password', authenticate, changePassword);

export default router;