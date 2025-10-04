// backend/workers/notificationWorker.js

import cron from 'node-cron';
import databaseManager from '../config/databaseSafety.js';
import emailService from '../services/emailService.js';

class NotificationWorker {
  constructor() {
    this.running = false;
  }

  start() {
    // Run every hour at minute 5
    cron.schedule('5 * * * *', async () => {
      if (this.running) {
        console.log('[NotificationWorker] Already running, skipping...');
        return;
      }

      console.log('[NotificationWorker] Starting notification check...');
      this.running = true;

      try {
        await this.processNotifications();
      } catch (error) {
        console.error('[NotificationWorker] Error:', error);
      } finally {
        this.running = false;
      }
    });

    console.log('[NotificationWorker] Scheduled (hourly at :05)');
  }

  async processNotifications() {
    const userDb = databaseManager.getUserDb();

    // Get all users with notify_email=true and notify_frequency='hourly'
    const users = await userDb('users')
      .where('notify_email', true)
      .where('notify_frequency', 'hourly')
      .where('status', 'active')
      .select('user_id', 'email', 'first_name');

    console.log(`[NotificationWorker] Processing ${users.length} users`);

    for (const user of users) {
      try {
        await this.processUserNotifications(user);
      } catch (error) {
        console.error(`[NotificationWorker] Error for user ${user.user_id}:`, error);
      }
    }

    console.log('[NotificationWorker] Notification check complete');
  }

  async processUserNotifications(user) {
    const userDb = databaseManager.getUserDb();
    const inventoryDb = databaseManager.getInventoryDb();

    // Get user's effective watchlist PLUs
    const watchedPLUs = await this.getUserWatchedPLUs(user.user_id);

    if (watchedPLUs.length === 0) {
      return; // User has no active watchlist items
    }

    // Get notification watermarks
    const watermarks = await userDb('user_last_notified')
      .where('user_id', user.user_id)
      .whereIn('plu', watchedPLUs);

    const watermarkMap = new Map(
      watermarks.map(w => [w.plu, new Date(w.last_notified)])
    );

    // Get changes since last notification for each PLU
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const changes = [];

    for (const plu of watchedPLUs) {
      const since = watermarkMap.get(plu) || oneHourAgo;

      const pluChanges = await inventoryDb('product_change_log as pcl')
        .where('pcl.plu', plu)
        .where('pcl.check_time', '>', since.toISOString())
        .leftJoin('stores as s', 'pcl.store_id', 's.store_id')
        .leftJoin('alcohol as a', 'pcl.plu', 'a.nc_code')
        .select(
          'pcl.*',
          's.store_number',
          's.nickname as store_nickname',
          'a.brand_name'
        )
        .orderBy('pcl.check_time', 'desc')
        .limit(10); // Max 10 changes per PLU per notification

      if (pluChanges.length > 0) {
        changes.push(...pluChanges);
      }
    }

    if (changes.length === 0) {
      return; // No new changes
    }

    // Send email notification
    await this.sendNotificationEmail(user, changes);

    // Update watermarks
    const now = new Date().toISOString();
    for (const plu of watchedPLUs) {
      await userDb('user_last_notified')
        .insert({
          user_id: user.user_id,
          plu,
          last_notified: now,
          notification_count: 1
        })
        .onConflict(['user_id', 'plu'])
        .merge({
          last_notified: now,
          notification_count: userDb.raw('notification_count + 1')
        });
    }

    console.log(`[NotificationWorker] Sent notification to ${user.email} (${changes.length} changes)`);
  }

  async getUserWatchedPLUs(userId) {
    const userDb = databaseManager.getUserDb();
    const inventoryDb = databaseManager.getInventoryDb();

    // Get defaults
    const defaults = await inventoryDb('alcohol')
      .whereIn('Listing_Type', ['Limited', 'Allocation', 'Barrel', 'Premium'])
      .pluck('nc_code');

    // Get user overrides
    const overrides = await userDb('user_watchlist')
      .where('user_id', userId)
      .where('active', true)
      .select('plu', 'interest_type');

    const notInterested = new Set(
      overrides
        .filter(o => o.interest_type === 'not_interested')
        .map(o => o.plu)
    );

    const custom = overrides
      .filter(o => o.interest_type === 'interested')
      .map(o => o.plu);

    // Effective = (defaults + custom) - not_interested
    const effective = [
      ...defaults.filter(plu => !notInterested.has(plu)),
      ...custom
    ];

    return [...new Set(effective)]; // Deduplicate
  }

  async sendNotificationEmail(user, changes) {
    // Group changes by product
    const changesByProduct = changes.reduce((acc, change) => {
      if (!acc[change.plu]) {
        acc[change.plu] = {
          brand_name: change.brand_name || `PLU ${change.plu}`,
          changes: []
        };
      }
      acc[change.plu].changes.push(change);
      return acc;
    }, {});

    // Build email HTML
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6a451f;">Watchlist Update for ${user.first_name}</h2>
        <p>The following products on your watchlist have new inventory changes:</p>
    `;

    for (const [plu, data] of Object.entries(changesByProduct)) {
      html += `
        <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #6a451f;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${data.brand_name}</h3>
          <p style="margin: 5px 0; font-size: 14px; color: #666;">PLU: ${plu}</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
      `;

      for (const change of data.changes) {
        const store = change.store_nickname || change.store_number || 'Unknown Store';
        const changeDesc = this.describeChange(change);
        html += `
          <li style="margin: 5px 0; color: #333;">
            <strong>${store}:</strong> ${changeDesc}
          </li>
        `;
      }

      html += `
          </ul>
        </div>
      `;
    }

    html += `
        <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 8px;">
          <p style="margin: 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL}/watchlist" 
               style="display: inline-block; padding: 12px 24px; background: #6a451f; 
                      color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Full Watchlist
            </a>
          </p>
        </div>
        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
          You received this email because you're watching these products. 
          <a href="${process.env.FRONTEND_URL}/profile" style="color: #6a451f;">Manage your notification settings</a>
        </p>
      </div>
    `;

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: `Watchlist Update - ${Object.keys(changesByProduct).length} Product${Object.keys(changesByProduct).length > 1 ? 's' : ''}`,
        html
      });
    } catch (error) {
      console.error(`[NotificationWorker] Failed to send email to ${user.email}:`, error);
    }
  }

  describeChange(change) {
    const { old_qty, new_qty, change_type } = change;
    
    if (change_type === 'up') {
      return `Inventory increased from ${old_qty} to ${new_qty} (+${new_qty - old_qty} bottles)`;
    } else if (change_type === 'down') {
      return `Inventory decreased from ${old_qty} to ${new_qty} (-${old_qty - new_qty} bottles)`;
    } else if (change_type === 'first') {
      return `<span style="color: #4caf50; font-weight: bold;">New arrival!</span> ${new_qty} bottles available`;
    } else if (change_type === 'zero') {
      return `<span style="color: #f44336;">Out of stock</span> (was ${old_qty} bottles)`;
    } else {
      return `Changed from ${old_qty} to ${new_qty} bottles`;
    }
  }
}

export default new NotificationWorker();
