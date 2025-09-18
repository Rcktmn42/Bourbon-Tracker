// backend/config/databaseSafety.js
import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseManager {
  constructor() {
    this.userDb = null;
    this.inventoryDb = null;
    this.initialized = false;
  }

  // SQLite safety pragmas for data integrity and performance
  getSafetyPragmas() {
    return [
      // WAL mode for better concurrency
      'PRAGMA journal_mode = WAL',
      
      // Enable foreign key constraints
      'PRAGMA foreign_keys = ON',
      
      // Synchronous mode for data safety vs performance balance
      'PRAGMA synchronous = NORMAL',
      
      // Connection timeout and busy timeout
      'PRAGMA busy_timeout = 30000',
      
      // Cache size optimization (negative = KB, positive = pages)
      'PRAGMA cache_size = -64000', // 64MB cache
      
      // Memory-mapped I/O for better performance
      'PRAGMA mmap_size = 134217728', // 128MB
      
      // Optimize for concurrent access
      'PRAGMA wal_autocheckpoint = 1000',
      'PRAGMA wal_checkpoint_fullfsync = 0',
      
      // Security and integrity
      'PRAGMA secure_delete = ON',
      'PRAGMA cell_size_check = ON'
    ];
  }

  // SQLite-specific connection configuration with safety measures
  createSqliteConfig(dbPath, poolConfig = {}) {
    const defaultPoolConfig = {
      min: 1,                    // Minimum connections (conservative for SQLite)
      max: 4,                    // Maximum connections (SQLite-friendly)  
      acquireTimeoutMillis: 30000,   // Wait time to get connection
      createTimeoutMillis: 30000,    // Time to create new connection
      destroyTimeoutMillis: 5000,    // Time to destroy connection
      idleTimeoutMillis: 300000,     // 5 minutes idle timeout
      reapIntervalMillis: 1000,      // Check for idle connections
      createRetryIntervalMillis: 200, // Retry interval for failed connections
      propagateCreateError: false    // Don't fail on create errors
    };

    return {
      client: 'sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
      pool: { ...defaultPoolConfig, ...poolConfig },
      acquireConnectionTimeout: 30000,
      
      // After creating connection, run safety pragmas
      afterCreate: (conn, done) => {
        const pragmas = this.getSafetyPragmas();
        let completed = 0;
        
        const runNextPragma = (index) => {
          if (index >= pragmas.length) {
            console.log(`✅ Applied ${pragmas.length} safety pragmas to database: ${path.basename(dbPath)}`);
            return done(null, conn);
          }
          
          conn.exec(pragmas[index], (err) => {
            if (err) {
              console.error(`❌ Failed to apply pragma "${pragmas[index]}"`, err);
              return done(err, conn);
            }
            runNextPragma(index + 1);
          });
        };
        
        runNextPragma(0);
      },
      
      // Add connection validation
      validate: (conn) => {
        return new Promise((resolve) => {
          conn.exec('SELECT 1', (err) => {
            resolve(!err);
          });
        });
      }
    };
  }

  // PostgreSQL connection configuration
  createPostgresConfig(url, poolConfig = {}) {
    const defaultPoolConfig = {
      min: 2,                    // Minimum connections
      max: 10,                   // Maximum connections
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 300000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      propagateCreateError: false
    };

    return {
      client: 'pg',
      connection: url,
      pool: { ...defaultPoolConfig, ...poolConfig },
      acquireConnectionTimeout: 30000
    };
  }

  // Initialize both database connections with safety measures
  async initialize() {
    if (this.initialized) {
      console.log('⚠️  Database connections already initialized');
      return;
    }

    try {
      console.log('🔧 Initializing secure database connections...');

      // Database client configuration
      const dbClient = process.env.DB_CLIENT || 'sqlite3';
      const databaseUrl = process.env.DATABASE_URL;
      const inventoryDatabaseUrl = process.env.INVENTORY_DATABASE_URL;

      console.log(`📊 Using database client: ${dbClient}`);

      // User Database Configuration
      let userDbConfig;
      if (dbClient === 'pg') {
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required when using PostgreSQL');
        }
        userDbConfig = this.createPostgresConfig(databaseUrl, { max: 5 });
        console.log('🐘 User database: PostgreSQL');
      } else {
        const userDbPath = databaseUrl || path.join(__dirname, '..', 'data', 'database.sqlite3');
        userDbConfig = this.createSqliteConfig(userDbPath, { max: 3 });
        console.log(`📁 User database: SQLite at ${userDbPath}`);
      }

      // Inventory Database Configuration  
      let inventoryDbConfig;
      if (dbClient === 'pg') {
        const invDbUrl = inventoryDatabaseUrl || databaseUrl;
        if (!invDbUrl) {
          throw new Error('INVENTORY_DATABASE_URL or DATABASE_URL required for PostgreSQL');
        }
        inventoryDbConfig = this.createPostgresConfig(invDbUrl, { max: 10 });
        console.log('🐘 Inventory database: PostgreSQL');
      } else {
        const inventoryDbPath = inventoryDatabaseUrl || (process.env.NODE_ENV === 'production' 
          ? '/opt/BourbonDatabase/inventory.db'
          : path.join(__dirname, '..', '..', 'BourbonDatabase', 'inventory.db'));
        inventoryDbConfig = this.createSqliteConfig(inventoryDbPath, { max: 4, min: 1 });
        console.log(`📁 Inventory database: SQLite at ${inventoryDbPath}`);
      }

      // Create connections
      this.userDb = knex(userDbConfig);
      this.inventoryDb = knex(inventoryDbConfig);

      // Test connections
      await this.testConnections();
      
      this.initialized = true;
      console.log('✅ Database connections initialized successfully with safety measures');
      
    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error);
      throw error;
    }
  }

  // Test both database connections
  async testConnections() {
    try {
      // Test user database
      await this.userDb.raw('SELECT 1');
      console.log('✅ User database connection verified');

      // Test inventory database  
      await this.inventoryDb.raw('SELECT 1');
      console.log('✅ Inventory database connection verified');

    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  // Get database connections (with initialization check)
  getUserDb() {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.userDb;
  }

  getInventoryDb() {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.inventoryDb;
  }

  // Graceful shutdown with connection cleanup
  async shutdown() {
    console.log('🔄 Shutting down database connections...');
    
    const shutdownPromises = [];
    
    if (this.userDb) {
      shutdownPromises.push(
        this.userDb.destroy().catch(err => 
          console.error('Error closing user database:', err)
        )
      );
    }
    
    if (this.inventoryDb) {
      shutdownPromises.push(
        this.inventoryDb.destroy().catch(err => 
          console.error('Error closing inventory database:', err)
        )
      );
    }
    
    await Promise.all(shutdownPromises);
    
    this.userDb = null;
    this.inventoryDb = null;
    this.initialized = false;
    
    console.log('✅ Database connections closed gracefully');
  }

  // Health check for monitoring
  async healthCheck() {
    if (!this.initialized) {
      return { status: 'not_initialized' };
    }

    const health = {
      status: 'healthy',
      connections: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Check user database
      const userDbStart = Date.now();
      await this.userDb.raw('SELECT 1');
      health.connections.userDb = {
        status: 'connected',
        responseTime: Date.now() - userDbStart
      };

      // Check inventory database
      const inventoryDbStart = Date.now(); 
      await this.inventoryDb.raw('SELECT 1');
      health.connections.inventoryDb = {
        status: 'connected',
        responseTime: Date.now() - inventoryDbStart
      };

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  // Get connection pool statistics
  getPoolStats() {
    if (!this.initialized) {
      return { error: 'Not initialized' };
    }

    return {
      userDb: {
        used: this.userDb.client.pool.used,
        free: this.userDb.client.pool.free,
        pendingAcquires: this.userDb.client.pool.pendingAcquires.length,
        pendingCreates: this.userDb.client.pool.pendingCreates.length
      },
      inventoryDb: {
        used: this.inventoryDb.client.pool.used,
        free: this.inventoryDb.client.pool.free,
        pendingAcquires: this.inventoryDb.client.pool.pendingAcquires.length,
        pendingCreates: this.inventoryDb.client.pool.pendingCreates.length
      }
    };
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

export default databaseManager;
export { databaseManager };