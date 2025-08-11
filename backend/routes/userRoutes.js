// backend/routes/userRoutes.js
import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController.js';

const router = express.Router();

// GET /api/user/me - Get current user profile
router.get('/me', getProfile);

// PUT /api/user/me - Update current user profile  
router.put('/me', updateProfile);

// Removed POST /change-password - use /api/auth/change-password instead

export default router;