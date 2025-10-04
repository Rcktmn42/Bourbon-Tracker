// backend/routes/watchlist.js

import { Router } from 'express';
import watchlistController from '../controllers/watchlistController.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiters
const customPluLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 10 : 1000, // 10 in production, 1000 in development
  message: { error: 'Too many custom items added. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip
});

const watchlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 200,
  message: { error: 'Too many watchlist requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 in production, 100 in development
  message: { error: 'Too many bulk operations. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip
});

// Core watchlist endpoints
router.get('/', 
  authenticate, 
  watchlistLimiter, 
  watchlistController.getUserWatchlist
);

router.get('/catalog', 
  authenticate, 
  watchlistLimiter, 
  watchlistController.getCatalog
);

router.post('/', 
  authenticate, 
  customPluLimiter, 
  watchlistController.addToWatchlist
);

router.patch('/:watchId', 
  authenticate, 
  watchlistLimiter, 
  watchlistController.updateWatchlistItem
);

router.delete('/:watchId', 
  authenticate, 
  watchlistLimiter, 
  watchlistController.removeFromWatchlist
);

// Bulk operations
router.post('/bulk/toggle', 
  authenticate, 
  bulkOperationLimiter, 
  watchlistController.bulkToggleWatchlist
);

router.get('/export', 
  authenticate, 
  watchlistLimiter, 
  watchlistController.exportWatchlist
);

router.post('/import',
  authenticate,
  bulkOperationLimiter,
  watchlistController.importWatchlist
);

router.post('/reset-to-defaults',
  authenticate,
  bulkOperationLimiter,
  watchlistController.resetToDefaults
);

// Admin endpoints (to be implemented)
// router.get('/admin/pending-review', requireAdmin, adminController.getPendingReview);
// router.post('/admin/reconcile/:plu', requireAdmin, adminController.reconcilePLU);
// router.post('/admin/bulk-reconcile', requireAdmin, adminController.bulkReconcile);

export default router;
