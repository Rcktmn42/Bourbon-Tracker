// backend/controllers/watchlistController.js

import databaseManager from '../config/databaseSafety.js';
import Joi from 'joi';
import { createClient } from 'redis';

// Redis client setup
let redisAvailable = false;
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (err) => console.error('Redis Client Error', err));
await redis.connect()
  .then(() => {
    redisAvailable = true;
    console.log('✅ Redis connected successfully');
  })
  .catch(() => {
    redisAvailable = false;
    console.warn('⚠️ Redis unavailable, running without cache');
  });

// Validation schemas
const addToWatchlistSchema = Joi.object({
  plu: Joi.number()
    .integer()
    .min(10000)
    .max(99999)
    .required()
    .custom((value, helpers) => {
      if (value > 65000) {
        return helpers.error('plu.outOfRange', { value });
      }
      return value;
    }),
  custom_name: Joi.string().max(100).optional(),
  interest_type: Joi.string().valid('interested', 'not_interested').default('interested'),
  notify_email: Joi.boolean().default(true),
  notify_text: Joi.boolean().default(false)
});

const bulkToggleSchema = Joi.object({
  plu_list: Joi.array()
    .items(Joi.number().integer().min(10000).max(99999))
    .min(1)
    .max(50)
    .required(),
  interest_type: Joi.string().valid('interested', 'not_interested').required()
});

const updateWatchlistSchema = Joi.object({
  custom_name: Joi.string().max(100).optional(),
  notify_email: Joi.boolean().optional(),
  notify_text: Joi.boolean().optional(),
  active: Joi.boolean().optional()
});

// Image configuration
const IMAGE_CONFIG = {
  development: { urlPrefix: '/api/images/' },
  production: { urlPrefix: '/api/images/' }
};

const normalizeImagePath = (imagePath) => {
  if (!imagePath) return null;
  return imagePath
    .replace(/\\/g, '/')
    .replace(/^alcohol_images\//i, '')
    .replace(/^\//, '');
};

const buildImageUrl = (imagePath) => {
  const normalized = normalizeImagePath(imagePath);
  if (!normalized) return null;
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

// Cache invalidation helper
async function invalidateWatchlistCache(userId) {
  if (!redisAvailable) {
    return; // Skip if Redis not available
  }

  try {
    const patterns = [
      `watchlist:active:${userId}:*`,
      `watchlist:catalog:${userId}:*`
    ];

    // Use SCAN instead of KEYS for better performance
    for (const pattern of patterns) {
      let cursor = '0';
      do {
        const result = await redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          await redis.del(result.keys);
        }
      } while (cursor !== '0');
    }
  } catch (error) {
    console.warn('Cache invalidation failed:', error.message);
  }
}

class WatchlistController {
  /**
   * GET /api/watchlist - Active Watchlist (Tab 1: "My List")
   * Returns only items user is actively watching
   * Items toggled off do NOT appear here
   */
  async getUserWatchlist(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { page = 1, limit = 50, category, search } = req.query;
      
      // Check cache first
      const cacheKey = `watchlist:active:${userId}:${page}:${limit}:${category || 'all'}:${search || ''}`;
      
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json({
            success: true,
            ...JSON.parse(cached),
            cache_hit: true
          });
        }
      } catch (error) {
        console.warn('Cache read failed:', error.message);
      }

      const userDb = databaseManager.getUserDb();
      const inventoryDb = databaseManager.getInventoryDb();

      // 1. Get default PLUs from alcohol table (NOT bourbons - that's deprecated)
      let defaultsQuery = inventoryDb('alcohol')
        .whereIn('Listing_Type', ['Limited', 'Allocation', 'Barrel'])
        .select('nc_code as plu', 'brand_name', 'size_ml', 'retail_price',
                'Listing_Type as listing_type', 'image_path', 'bottles_per_case');

      if (category && category !== 'Custom') {
        defaultsQuery = defaultsQuery.where('Listing_Type', category);
      }

      if (search) {
        defaultsQuery = defaultsQuery.where('brand_name', 'like', `%${search}%`);
      }

      // Order by brand_name in the database for consistency
      defaultsQuery = defaultsQuery.orderBy('brand_name', 'asc');

      const defaults = await defaultsQuery;

      // 2. Get user overrides from user_watchlist
      const userOverrides = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('active', true)
        .select('watch_id', 'plu', 'custom_name', 'interest_type',
                'notify_email', 'notify_text', 'added_on');

      // Create maps for fast lookup
      const overrideMap = new Map(userOverrides.map(o => [o.plu, o]));
      const notInterestedPLUs = new Set(
        userOverrides
          .filter(o => o.interest_type === 'not_interested')
          .map(o => o.plu)
      );

      // 3. Get custom items (user added PLUs not in alcohol)
      const customPLUs = userOverrides
        .filter(o => o.interest_type === 'interested')
        .map(o => o.plu)
        .filter(plu => !defaults.find(d => d.plu === plu));

      let customItems = [];
      if (customPLUs.length > 0) {
        customItems = await inventoryDb('custom_alcohol')
          .whereIn('plu', customPLUs)
          .select('plu', 'proposed_name as brand_name', 'status');
      }

      // 4. Build ACTIVE list: defaults NOT toggled off + custom interested
      const activeList = [
        // Defaults (exclude toggled off)
        ...defaults
          .filter(d => !notInterestedPLUs.has(d.plu))
          .map(d => {
            const override = overrideMap.get(d.plu);
            return formatProductResponse(d, {
              source: 'default',
              is_watching: true,
              watch_id: override?.watch_id || null,
              notify_email: override?.notify_email ?? true,
              notify_text: override?.notify_text ?? false
            });
          }),
        
        // Custom items (always watching)
        ...customItems.map(c => formatProductResponse(c, {
          source: 'custom',
          is_watching: true,
          watch_id: overrideMap.get(c.plu)?.watch_id,
          notify_email: overrideMap.get(c.plu)?.notify_email ?? true,
          notify_text: overrideMap.get(c.plu)?.notify_text ?? false,
          status: c.status
        }))
      ];

      // 5. Sort alphabetically by brand_name
      activeList.sort((a, b) => (a.brand_name || '').localeCompare(b.brand_name || ''));

      // 6. Paginate
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + parseInt(limit);
      const paginatedList = activeList.slice(startIdx, endIdx);

      const result = {
        data: paginatedList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: activeList.length,
          totalPages: Math.ceil(activeList.length / limit)
        },
        cache_hit: false
      };

      // Cache for 1 hour
      try {
        await redis.setEx(cacheKey, 3600, JSON.stringify(result));
      } catch (error) {
        console.warn('Cache write failed:', error.message);
      }

      res.json({ success: true, ...result });

    } catch (error) {
      console.error('Error fetching active watchlist:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch watchlist' });
    }
  }

  /**
   * GET /api/watchlist/catalog - Full Catalog (Tab 2: "Browse Catalog")
   * Returns ALL defaults with toggle state + custom items
   * Items toggled off DO appear here with is_watching: false
   */
  async getCatalog(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { page = 1, limit = 50, category, search } = req.query;
      
      // Check cache
      const cacheKey = `watchlist:catalog:${userId}:${page}:${limit}:${category || 'all'}:${search || ''}`;
      
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json({
            success: true,
            ...JSON.parse(cached),
            cache_hit: true
          });
        }
      } catch (error) {
        console.warn('Cache read failed:', error.message);
      }

      const userDb = databaseManager.getUserDb();
      const inventoryDb = databaseManager.getInventoryDb();

      // 1. Get ALL default PLUs (no filtering by interest_type)
      let defaultsQuery = inventoryDb('alcohol')
        .whereIn('Listing_Type', ['Limited', 'Allocation', 'Barrel'])
        .select('nc_code as plu', 'brand_name', 'size_ml', 'retail_price',
                'Listing_Type as listing_type', 'image_path', 'bottles_per_case');

      if (category && category !== 'Custom') {
        defaultsQuery = defaultsQuery.where('Listing_Type', category);
      }

      if (search) {
        defaultsQuery = defaultsQuery.where('brand_name', 'like', `%${search}%`);
      }

      // Order by brand_name in the database for consistency
      defaultsQuery = defaultsQuery.orderBy('brand_name', 'asc');

      const defaults = await defaultsQuery;

      // 2. Get user overrides
      const userOverrides = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('active', true)
        .select('watch_id', 'plu', 'custom_name', 'interest_type', 
                'notify_email', 'notify_text');

      const overrideMap = new Map(userOverrides.map(o => [o.plu, o]));

      // 3. Get custom items
      const customInterested = userOverrides.filter(o => o.interest_type === 'interested');
      const customPLUs = customInterested
        .map(o => o.plu)
        .filter(plu => !defaults.find(d => d.plu === plu));

      let customItems = [];
      if (customPLUs.length > 0) {
        customItems = await inventoryDb('custom_alcohol')
          .whereIn('plu', customPLUs)
          .select('plu', 'proposed_name as brand_name', 'status');
      }

      // 4. Build CATALOG list: ALL defaults (with toggle state) + customs
      const catalogList = [
        // ALL defaults (show toggle state)
        ...defaults.map(d => {
          const override = overrideMap.get(d.plu);
          const isWatching = override ? override.interest_type === 'interested' : true;
          
          return formatProductResponse(d, {
            source: 'default',
            is_watching: isWatching,
            watch_id: override?.watch_id || null,
            notify_email: override?.notify_email ?? true,
            notify_text: override?.notify_text ?? false,
            can_toggle: true
          });
        }),
        
        // Custom items (always watching, can't toggle - only delete)
        ...customItems.map(c => formatProductResponse(c, {
          source: 'custom',
          is_watching: true,
          watch_id: overrideMap.get(c.plu)?.watch_id,
          notify_email: overrideMap.get(c.plu)?.notify_email ?? true,
          notify_text: overrideMap.get(c.plu)?.notify_text ?? false,
          status: c.status,
          can_toggle: false
        }))
      ];

      // 5. Sort alphabetically by brand_name
      catalogList.sort((a, b) => (a.brand_name || '').localeCompare(b.brand_name || ''));

      // 6. Paginate
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + parseInt(limit);
      const paginatedList = catalogList.slice(startIdx, endIdx);

      const result = {
        data: paginatedList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: catalogList.length,
          totalPages: Math.ceil(catalogList.length / limit)
        },
        cache_hit: false
      };

      // Cache for 30 minutes (catalog changes less frequently)
      try {
        await redis.setEx(cacheKey, 1800, JSON.stringify(result));
      } catch (error) {
        console.warn('Cache write failed:', error.message);
      }

      res.json({ success: true, ...result });

    } catch (error) {
      console.error('Error fetching catalog:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch catalog' });
    }
  }

  /**
   * POST /api/watchlist - Add or toggle watchlist item
   */
  async addToWatchlist(req, res) {
    const startTime = Date.now();
    let timings = {};

    try {
      const userId = req.user.userId || req.user.id;
      const { error, value } = addToWatchlistSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { plu, custom_name, interest_type, notify_email, notify_text } = value;
      const userDb = databaseManager.getUserDb();
      const inventoryDb = databaseManager.getInventoryDb();

      // Check if PLU exists in alcohol table
      const t1 = Date.now();
      const alcoholEntry = await inventoryDb('alcohol')
        .where('nc_code', plu)
        .first();
      timings.alcoholCheck = Date.now() - t1;

      let status = alcoholEntry ? 'confirmed' : 'pending_verification';
      let productName = custom_name || alcoholEntry?.brand_name;

      // If not in alcohol, add to custom_alcohol
      if (!alcoholEntry) {
        if (!custom_name) {
          return res.status(400).json({
            success: false,
            message: 'custom_name required for PLUs not in catalog'
          });
        }

        const t2 = Date.now();
        // Upsert custom_alcohol
        await inventoryDb('custom_alcohol')
          .insert({
            plu,
            proposed_name: custom_name,
            proposed_by_user_id: userId,
            status: 'pending',
            created_by_ip: req.ip,
            created_by_user_agent: req.get('user-agent')
          })
          .onConflict('plu')
          .ignore();
        timings.customInsert = Date.now() - t2;
      }

      // Check if user already has this in watchlist
      const t3 = Date.now();
      const existing = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('plu', plu)
        .first();
      timings.existingCheck = Date.now() - t3;

      let watchId;

      const t4 = Date.now();
      if (existing) {
        // Update existing
        await userDb('user_watchlist')
          .where('watch_id', existing.watch_id)
          .update({
            interest_type,
            notify_email,
            notify_text,
            active: true,
            custom_name: custom_name || existing.custom_name
          });
        watchId = existing.watch_id;
      } else {
        // Insert new
        [watchId] = await userDb('user_watchlist').insert({
          user_id: userId,
          plu,
          custom_name,
          interest_type,
          notify_email,
          notify_text,
          active: true,
          added_on: new Date().toISOString()
        });
      }
      timings.dbWrite = Date.now() - t4;

      // Audit log
      const t5 = Date.now();
      await userDb('watchlist_audit_log').insert({
        user_id: userId,
        action: alcoholEntry ? 'toggle_default' : 'add_custom',
        plu,
        details: JSON.stringify({ custom_name, status, interest_type }),
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      timings.auditLog = Date.now() - t5;

      // Invalidate cache
      const t6 = Date.now();
      await invalidateWatchlistCache(userId);
      timings.cacheInvalidation = Date.now() - t6;

      timings.total = Date.now() - startTime;

      // Log performance if over 100ms
      if (timings.total > 100) {
        console.warn('⚠️ Slow toggle operation:', {
          plu,
          userId,
          timings,
          redisAvailable
        });
      }

      res.status(201).json({
        success: true,
        data: {
          watch_id: watchId,
          plu,
          status,
          custom_name: productName,
          message: status === 'confirmed'
            ? 'Added to watchlist'
            : 'Added to watchlist. Product details pending official data.',
          interest_type,
          is_watching: interest_type === 'interested'
        }
      });

    } catch (error) {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({ success: false, message: 'Failed to add to watchlist' });
    }
  }

  /**
   * PATCH /api/watchlist/:watchId - Update watchlist item
   */
  async updateWatchlistItem(req, res) {
    try {
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

      // Invalidate cache
      await invalidateWatchlistCache(userId);

      res.json({
        success: true,
        message: 'Watchlist item updated'
      });

    } catch (error) {
      console.error('Error updating watchlist item:', error);
      res.status(500).json({ success: false, message: 'Failed to update watchlist item' });
    }
  }

  /**
   * DELETE /api/watchlist/:watchId - Remove item from watchlist
   */
  async removeFromWatchlist(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { watchId } = req.params;
      const { hard } = req.query;
      const userDb = databaseManager.getUserDb();

      if (hard === 'true' && req.user.role === 'admin') {
        // Hard delete (admin only)
        const deleted = await userDb('user_watchlist')
          .where('watch_id', watchId)
          .where('user_id', userId)
          .del();

        if (deleted === 0) {
          return res.status(404).json({
            success: false,
            message: 'Watchlist item not found'
          });
        }
      } else {
        // Soft delete
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
      }

      // Audit log
      await userDb('watchlist_audit_log').insert({
        user_id: userId,
        action: 'remove',
        details: JSON.stringify({ watch_id: watchId, hard: hard === 'true' }),
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      // Invalidate cache
      await invalidateWatchlistCache(userId);

      res.json({
        success: true,
        message: 'Item removed from watchlist'
      });

    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(500).json({ success: false, message: 'Failed to remove from watchlist' });
    }
  }

  /**
   * POST /api/watchlist/bulk/toggle - Toggle multiple items at once
   */
  async bulkToggleWatchlist(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { error, value } = bulkToggleSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { plu_list, interest_type } = value;
      const userDb = databaseManager.getUserDb();

      // Upsert all PLUs in one transaction
      await userDb.transaction(async (trx) => {
        for (const plu of plu_list) {
          await trx('user_watchlist')
            .insert({
              user_id: userId,
              plu,
              interest_type,
              active: true,
              added_on: new Date().toISOString()
            })
            .onConflict(['user_id', 'plu'])
            .merge({ interest_type, active: true });
        }

        // Audit log
        await trx('watchlist_audit_log').insert({
          user_id: userId,
          action: 'bulk_toggle',
          details: JSON.stringify({ plu_count: plu_list.length, interest_type }),
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      });

      // Invalidate cache
      await invalidateWatchlistCache(userId);

      res.json({
        success: true,
        updated: plu_list.length,
        message: `Toggled ${plu_list.length} items`
      });

    } catch (error) {
      console.error('Error bulk toggling:', error);
      res.status(500).json({ success: false, message: 'Failed to bulk toggle' });
    }
  }

  /**
   * GET /api/watchlist/export - Export watchlist as JSON
   */
  async exportWatchlist(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const userDb = databaseManager.getUserDb();

      const watchlist = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('active', true)
        .select('plu', 'custom_name', 'interest_type', 'notify_email', 'notify_text', 'added_on');

      res.json({
        success: true,
        data: {
          exported_at: new Date().toISOString(),
          user_id: userId,
          items: watchlist
        }
      });

    } catch (error) {
      console.error('Error exporting watchlist:', error);
      res.status(500).json({ success: false, message: 'Failed to export watchlist' });
    }
  }

  /**
   * POST /api/watchlist/import - Import watchlist from JSON
   */
  async importWatchlist(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: 'items must be an array'
        });
      }

      const userDb = databaseManager.getUserDb();
      let imported = 0;
      let skipped = 0;

      await userDb.transaction(async (trx) => {
        for (const item of items) {
          try {
            await trx('user_watchlist')
              .insert({
                user_id: userId,
                plu: item.plu,
                custom_name: item.custom_name,
                interest_type: item.interest_type || 'interested',
                notify_email: item.notify_email ?? true,
                notify_text: item.notify_text ?? false,
                active: true,
                added_on: new Date().toISOString()
              })
              .onConflict(['user_id', 'plu'])
              .ignore();
            imported++;
          } catch (error) {
            skipped++;
          }
        }

        // Audit log
        await trx('watchlist_audit_log').insert({
          user_id: userId,
          action: 'import',
          details: JSON.stringify({ imported, skipped, total: items.length }),
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      });

      // Invalidate cache
      await invalidateWatchlistCache(userId);

      res.json({
        success: true,
        imported,
        skipped,
        message: `Imported ${imported} items, skipped ${skipped}`
      });

    } catch (error) {
      console.error('Error importing watchlist:', error);
      res.status(500).json({ success: false, message: 'Failed to import watchlist' });
    }
  }

  /**
   * POST /api/watchlist/reset-to-defaults - Reset all items to default (remove all overrides)
   */
  async resetToDefaults(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const userDb = databaseManager.getUserDb();

      // Count items before deletion
      const beforeCount = await userDb('user_watchlist')
        .where('user_id', userId)
        .where('active', true)
        .count('* as count')
        .first();

      // Delete all user watchlist entries (both custom and overrides)
      await userDb('user_watchlist')
        .where('user_id', userId)
        .update({ active: false });

      // Audit log
      await userDb('watchlist_audit_log').insert({
        user_id: userId,
        action: 'reset_to_defaults',
        details: JSON.stringify({ removed_items: beforeCount.count }),
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      // Invalidate cache
      await invalidateWatchlistCache(userId);

      res.json({
        success: true,
        message: `Reset complete. Removed ${beforeCount.count} custom items and overrides.`,
        removed_count: beforeCount.count
      });

    } catch (error) {
      console.error('Error resetting to defaults:', error);
      res.status(500).json({ success: false, message: 'Failed to reset watchlist' });
    }
  }
}

export default new WatchlistController();
