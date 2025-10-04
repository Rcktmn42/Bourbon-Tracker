// backend/routes/watchlist.js
import express from 'express';
import watchlistController from '../controllers/watchlistController.js';

const router = express.Router();

const callController = (method) => async (req, res, next) => {
  try {
    await method.call(watchlistController, req, res, next);
  } catch (error) {
    if (typeof next === 'function') {
      next(error);
    } else {
      throw error;
    }
  }
};

// User watchlist routes
router.get('/', callController(watchlistController.getUserWatchlist));
router.post('/', callController(watchlistController.addToWatchlist));
router.patch('/:watchId', callController(watchlistController.updateWatchlistItem));
router.delete('/:watchId', callController(watchlistController.removeFromWatchlist));

// Get default premium products for watchlist
router.get('/default-products', callController(watchlistController.getDefaultProducts));

// Get user preferences (raw watchlist items with interest_type)
router.get('/user-preferences', callController(watchlistController.getUserPreferences));

// Product search for adding to watchlist
router.get('/search/products', callController(watchlistController.searchProducts));

// Recent changes for watchlist items
router.get('/changes', callController(watchlistController.getWatchlistChanges));

// Admin routes
router.get('/admin/analytics', callController(watchlistController.getWatchlistAnalytics));

export default router;

