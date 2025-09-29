// backend/controllers/watchlistController.js
import databaseManager from '../config/databaseSafety.js';
import Joi from 'joi';

// Validation schemas
const addToWatchlistSchema = Joi.object({
  plu: Joi.number().integer().min(10000).max(99999).required(),
  custom_name: Joi.string().max(100).optional(),
  interest_type: Joi.string().valid('interested', 'not_interested').default('interested')
});

const updateWatchlistSchema = Joi.object({
  custom_name: Joi.string().max(100).optional(),
  notify_email: Joi.boolean().optional(),
  notify_text: Joi.boolean().optional(),
  active: Joi.boolean().optional()
});

const IMAGE_CONFIG = {
  development: {
    urlPrefix: '/api/images/'
  },
  production: {
    urlPrefix: '/api/images/'
  }
};

const normalizeImagePath = (imagePath) => {
  if (!imagePath) {
    return null;
  }

  return imagePath
    .replace(/\\/g, '/')
    .replace(/^alcohol_images\//i, '')
    .replace(/^\//, '');
};

const buildImageUrl = (imagePath) => {
  const normalized = normalizeImagePath(imagePath);

  if (!normalized) {
    return null;
  }

  const config = IMAGE_CONFIG[process.env.NODE_ENV] || IMAGE_CONFIG.development;
  return `${config.urlPrefix}${normalized}`;
};

const formatProductResponse = (product, overrides = {}) => {
  const base = { ...product };

  if (typeof base.Listing_Type !== 'undefined' && typeof base.listing_type === 'undefined') {
    base.listing_type = base.Listing_Type;
  }

  delete base.Listing_Type;

  const merged = { ...base, ...overrides };
  const { imagePath, ...rest } = merged;

  const listingType = rest.listing_type || null;
  const listingTypeKey = listingType ? listingType.toLowerCase() : null;

  const rawImagePath = rest.image_path ?? imagePath ?? null;
  const normalizedImagePath = normalizeImagePath(rawImagePath);
  const imageUrl = buildImageUrl(rawImagePath);
  const hasImage = !!(normalizedImagePath && normalizedImagePath.toLowerCase() !== 'no image available');

  return {
    ...rest,
    listing_type: listingType,
    listing_type_key: listingTypeKey,
    image_path: normalizedImagePath,
    image_url: hasImage ? imageUrl : null,
    has_image: hasImage
  };
};

class WatchlistController {
  // Get user's raw preferences (for frontend to determine toggle states)
  async getUserPreferences(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required - no user context'
        });
      }

      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID in token'
        });
      }

      const userDb = databaseManager.getUserDb();

      // Get all user's watchlist preferences (both interested and not_interested)
      const userPreferences = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('active', true)
        .select('watch_id', 'plu', 'custom_name', 'notify_email', 'notify_text', 'added_on', 'interest_type')
        .orderBy('added_on', 'desc');

      res.json({
        success: true,
        data: userPreferences,
        count: userPreferences.length
      });

    } catch (error) {
      console.error('Error fetching user preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user preferences'
      });
    }
  }

  // Get user's effective watchlist (default items + custom interested - not_interested)
  async getUserWatchlist(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required - no user context'
        });
      }

      const userId = req.user.userId || req.user.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID in token'
        });
      }

      const userDb = databaseManager.getUserDb();
      const inventoryDb = databaseManager.getInventoryDb();

      // Get all user's watchlist preferences
      const userPreferences = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('active', true)
        .select('watch_id', 'plu', 'custom_name', 'notify_email', 'notify_text', 'added_on', 'interest_type')
        .orderBy('added_on', 'desc');

      // Create maps for quick lookup
      const notInterestedPLUs = new Set(
        userPreferences
          .filter(item => item.interest_type === 'not_interested')
          .map(item => item.plu)
      );

      const interestedItems = userPreferences.filter(item => item.interest_type === 'interested');

      // Get default premium products
      const defaultProducts = await this.getDefaultProductsList(inventoryDb);

      // Build effective watchlist:
      // 1. Default products NOT in the not_interested list
      const defaultWatchlist = defaultProducts
        .filter(product => !notInterestedPLUs.has(product.plu))
        .map(product =>
          formatProductResponse(product, {
            custom_name: null,
            notify_email: true,
            notify_text: false,
            source: 'default'
          })
        );

      // 2. Custom interested items with enriched product info
      const customWatchlist = await Promise.all(
        interestedItems.map(async (item) => {
          const productInfo = await inventoryDb('alcohol')
            .where('nc_code', item.plu)
            .select(
              'brand_name',
              'size_ml',
              'retail_price',
              'alcohol_type',
              'Listing_Type as listing_type',
              'image_path',
              'bottles_per_case'
            )
            .first();

          const baseProduct = {
            watch_id: item.watch_id,
            plu: item.plu,
            custom_name: item.custom_name,
            notify_email: item.notify_email,
            notify_text: item.notify_text,
            added_on: item.added_on,
            brand_name: productInfo?.brand_name || item.custom_name || `PLU ${item.plu}`,
            size_ml: productInfo?.size_ml ?? null,
            retail_price: productInfo?.retail_price ?? null,
            alcohol_type: productInfo?.alcohol_type ?? null,
            listing_type: productInfo?.listing_type || 'Custom',
            image_path: productInfo?.image_path ?? null,
            source: 'custom'
          };

          return formatProductResponse(baseProduct);
        })
      );

      // Combine and deduplicate (custom takes precedence over default)
      const customPLUs = new Set(customWatchlist.map(item => item.plu));
      const combinedWatchlist = [
        ...customWatchlist,
        ...defaultWatchlist.filter(item => !customPLUs.has(item.plu))
      ];

      // Sort by brand name
      combinedWatchlist.sort((a, b) => (a.brand_name || '').localeCompare(b.brand_name || ''));

      res.json({
        success: true,
        data: combinedWatchlist,
        count: combinedWatchlist.length,
        summary: {
          default_items: defaultWatchlist.length,
          custom_items: customWatchlist.length,
          not_interested_count: notInterestedPLUs.size
        }
      });

    } catch (error) {
      console.error('Error fetching user watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch watchlist'
      });
    }
  }

  // Helper method to get default products list
  async getDefaultProductsList(inventoryDb, options = {}) {
    const { includeCounts = false } = options;

    // Get all premium products from alcohol table only
    const alcoholRows = await inventoryDb('alcohol')
      .whereIn('Listing_Type', ['Limited', 'Allocation', 'Barrel', 'Premium'])
      .select(
        'nc_code as plu',
        'brand_name',
        'size_ml',
        'retail_price',
        'alcohol_type',
        'Listing_Type as listing_type',
        'image_path',
        'bottles_per_case'
      )
      .orderBy('brand_name');

    const formattedProducts = alcoholRows.map(product =>
      formatProductResponse(product, { source: 'default' })
    );

    if (includeCounts) {
      return {
        products: formattedProducts,
        counts: {
          total_products: formattedProducts.length,
          by_listing_type: alcoholRows.reduce((acc, product) => {
            const type = product.listing_type || 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {})
        }
      };
    }

    return formattedProducts;
  }


  // Get default premium products for watchlist
  async getDefaultProducts(req, res) {
    try {
      const inventoryDb = databaseManager.getInventoryDb();
      const { products, counts } = await this.getDefaultProductsList(inventoryDb, { includeCounts: true });

      res.json({
        success: true,
        data: products,
        counts
      });

    } catch (error) {
      console.error('Error fetching default products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch default products'
      });
    }
  }

  // Search products to add to watchlist
  async searchProducts(req, res) {
    try {
      const { q: query } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }

      const inventoryDb = databaseManager.getInventoryDb();
      const likeQuery = '%' + query + '%';

      const products = await inventoryDb('alcohol')
        .where('brand_name', 'like', likeQuery)
        .orWhere('nc_code', 'like', likeQuery)
        .select(
          'nc_code as plu',
          'brand_name',
          'size_ml',
          'retail_price',
          'alcohol_type',
          'Listing_Type as listing_type',
          'image_path',
          'bottles_per_case'
        )
        .limit(20)
        .orderBy('brand_name');

      const formattedProducts = products.map(product => formatProductResponse(product));

      res.json({
        success: true,
        data: formattedProducts
      });

    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search products'
      });
    }
  }

  // Get recent changes for user's watchlist items
  async getWatchlistChanges(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { days = 7 } = req.query;
      const userDb = databaseManager.getUserDb();
      const inventoryDb = databaseManager.getInventoryDb();

      // Get user's active watchlist PLUs
      const watchlistPLUs = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('active', true)
        .pluck('plu');

      if (watchlistPLUs.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'No items in watchlist'
        });
      }

      // Get recent changes for watched PLUs
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days));

      const changes = await inventoryDb('product_change_log as pcl')
        .whereIn('pcl.plu', watchlistPLUs)
        .where('pcl.check_time', '>=', since.toISOString())
        .leftJoin('stores as s', 'pcl.store_id', 's.store_id')
        .leftJoin('alcohol as a', 'pcl.plu', 'a.nc_code')
        .select(
          'pcl.*',
          's.store_number',
          's.nickname as store_nickname',
          'a.brand_name'
        )
        .orderBy('pcl.check_time', 'desc')
        .limit(100);

      res.json({
        success: true,
        data: changes,
        count: changes.length
      });

    } catch (error) {
      console.error('Error fetching watchlist changes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch watchlist changes'
      });
    }
  }

  // Add item to watchlist
  async addToWatchlist(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId || req.user.id;
      const { error, value } = addToWatchlistSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { plu, custom_name, interest_type } = value;
      const userDb = databaseManager.getUserDb();

      // Check if already exists
      const existing = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('plu', plu)
        .where('active', true)
        .first();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Item already in watchlist'
        });
      }

      // Insert new watchlist item
      const [watchId] = await userDb('user_watchlist').insert({
        user_id: userId,
        plu,
        custom_name: custom_name || null,
        interest_type: interest_type || 'interested',
        notify_email: true,
        notify_text: false,
        active: true,
        added_on: new Date().toISOString()
      });

      res.json({
        success: true,
        data: { watch_id: watchId, plu, custom_name, interest_type }
      });

    } catch (error) {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add to watchlist'
      });
    }
  }

  // Update watchlist item
  async updateWatchlistItem(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId || req.user.id;
      const { watchId } = req.params;
      const { error, value } = updateWatchlistSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const userDb = databaseManager.getUserDb();

      // Update the item
      const updated = await userDb('user_watchlist')
        .where('watch_id', watchId)
        .where('user_id', userId)
        .where('active', true)
        .update(value);

      if (updated === 0) {
        return res.status(404).json({
          success: false,
          message: 'Watchlist item not found'
        });
      }

      res.json({
        success: true,
        message: 'Watchlist item updated'
      });

    } catch (error) {
      console.error('Error updating watchlist item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update watchlist item'
      });
    }
  }

  // Remove item from watchlist
  async removeFromWatchlist(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.userId || req.user.id;
      const { watchId } = req.params;
      const userDb = databaseManager.getUserDb();

      // Soft delete by setting active = false
      const updated = await userDb('user_watchlist')
        .where('watch_id', watchId)
        .where('user_id', userId)
        .update({ active: false });

      if (updated === 0) {
        return res.status(404).json({
          success: false,
          message: 'Watchlist item not found'
        });
      }

      res.json({
        success: true,
        message: 'Item removed from watchlist'
      });

    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove from watchlist'
      });
    }
  }

  // Admin: Get watchlist analytics
  async getWatchlistAnalytics(req, res) {
    try {
      const userDb = databaseManager.getUserDb();
      const inventoryDb = databaseManager.getInventoryDb();

      // Most watched products - get PLU counts first
      const watchlistCounts = await userDb('user_watchlist')
        .select('plu')
        .count('* as watch_count')
        .where('active', true)
        .groupBy('plu')
        .orderBy('watch_count', 'desc')
        .limit(10);

      // Enrich with product names from inventory DB
      const mostWatched = await Promise.all(
        watchlistCounts.map(async (item) => {
          const productInfo = await inventoryDb('alcohol')
            .where('nc_code', item.plu)
            .select('brand_name')
            .first();

          return {
            plu: item.plu,
            watch_count: item.watch_count,
            brand_name: productInfo?.brand_name || `PLU ${item.plu}`
          };
        })
      );

      // Total stats
      const stats = await userDb('user_watchlist')
        .select(
          userDb.raw('COUNT(*) as total_watchlist_items'),
          userDb.raw('COUNT(DISTINCT user_id) as users_with_watchlists'),
          userDb.raw('COUNT(DISTINCT plu) as unique_products_watched')
        )
        .where('active', true)
        .first();

      res.json({
        success: true,
        data: {
          mostWatched,
          stats
        }
      });

    } catch (error) {
      console.error('Error fetching watchlist analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch watchlist analytics'
      });
    }
  }
}

export default new WatchlistController();
