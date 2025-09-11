// backend/routes/adminRoutes.js

import express from 'express';
import {
  listUsers,
  updateUserRole,
  updateUserStatus,
  initiatePasswordReset
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only power_users or admins can see these routes
router.use(authenticate);

// DEBUG: Add temporary logging to see what's happening
router.use((req, res, next) => {
  console.log('🔍 Admin Route Debug:', {
    hasUser: !!req.user,
    userKeys: req.user ? Object.keys(req.user) : 'no user',
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    roleType: typeof req.user?.role,
    roleComparison: {
      isAdmin: req.user?.role === 'admin',
      isPowerUser: req.user?.role === 'power_user',
      actualRole: req.user?.role,
      stringified: JSON.stringify(req.user?.role)
    },
    fullUser: req.user
  });
  
  if (req.user?.role === 'power_user' || req.user?.role === 'admin') {
    console.log('✅ Admin access granted for user:', req.user.email);
    return next();
  }
  
  console.log('❌ Admin access denied for user:', req.user?.email, 'with role:', req.user?.role);
  return res.status(403).json({ 
    error: 'Admin access required', 
    currentRole: req.user?.role,
    requiredRoles: ['admin', 'power_user']
  });
});
router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', updateUserStatus);
router.post('/users/:userId/reset-password', initiatePasswordReset);

export default router;
