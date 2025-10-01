// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import storesRoutes from './routes/storesRoutes.js';
import stateRoutes from './routes/stateRoutes.js';
import watchlistRoutes from './routes/watchlist.js';

// Middleware
import { authenticate } from './middleware/authMiddleware.js';
import { validateCSRFToken, skipRateLimitForInternal } from './middleware/validationMiddleware.js';

// Config
dotenv.config();

// Initialize database with safety measures
import databaseManager from './config/databaseSafety.js';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced environment variable validation
const requiredEnvVars = [
  'JWT_SECRET',
  'EMAIL_USER', 
  'EMAIL_PASS',
  'EMAIL_FROM_NAME'
];

const optionalWithDefaults = {
  'NODE_ENV': 'development',
  'PORT': '3000',
  'FRONTEND_URL': 'http://localhost:5173',
  'DB_CLIENT': 'sqlite3',
  'IMAGES_DIR': null, // Will be set based on environment
  'LOG_LEVEL': 'info'
};

// Validate required environment variables
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(envVar => console.error(`   - ${envVar}`));
  console.error('\n💡 Copy .env.example to .env and fill in the values');
  process.exit(1);
}

// Set defaults for optional variables
Object.entries(optionalWithDefaults).forEach(([key, defaultValue]) => {
  if (!process.env[key] && defaultValue !== null) {
    process.env[key] = defaultValue;
  }
});

// Environment-specific path configurations
const isProduction = process.env.NODE_ENV === 'production';
const imagesPath = process.env.IMAGES_DIR || (isProduction 
  ? '/opt/alcohol_images' 
  : join(__dirname, '../BourbonDatabase/alcohol_images')
);

const app = express();

console.log(`🚀 Starting NC Bourbon Tracker [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
console.log(`📊 Database client: ${process.env.DB_CLIENT}`);
console.log(`🖼️  Images directory: ${imagesPath}`);
console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

// Trust proxy in production (nginx reverse proxy)
if (isProduction) {
  app.set('trust proxy', 'loopback');
}

// CSP Nonce middleware for production security
app.use((req, res, next) => {
  if (isProduction) {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  }
  next();
});

// Enhanced Security Headers with environment-specific CSP
const helmetConfig = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": isProduction 
        ? ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`]
        : ["'self'", "'unsafe-inline'"], // Allow unsafe-inline in development for Vite
      "style-src": ["'self'", "'unsafe-inline'"], // CSS needs unsafe-inline for now
      "img-src": ["'self'", "data:", "https:"],
      "connect-src": ["'self'"],
      "font-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'none'"],
      "frame-ancestors": ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  // Additional security headers
  referrerPolicy: { policy: "origin-when-cross-origin" },
  permissionsPolicy: {
    features: {
      geolocation: [],
      camera: [],
      microphone: [],
      payment: [],
      usb: [],
      bluetooth: []
    }
  }
};

app.use(helmet(helmetConfig));

// Enable compression for all responses
app.use(compression({
  level: 6, // Good balance of compression vs CPU
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Compress JSON responses (like our reports)
    if (res.getHeader('content-type')?.includes('application/json')) {
      return true;
    }
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '10mb' })); // Increased for potential report uploads
app.use(cookieParser());

// Security middleware
app.use(skipRateLimitForInternal); // Allow internal services to bypass rate limits
app.use(validateCSRFToken); // CSRF protection for write operations

// CORS Allowlist for production security
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "https://wakepour.com",
  "https://www.wakepour.com",
  // Development origins
  ...(isProduction ? [] : [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175"
  ])
].filter(Boolean));

console.log('🌐 CORS allowlist:', Array.from(allowedOrigins));

app.use(cors({
  origin: (origin, callback) => {
    console.log(`🔍 CORS check for origin: ${origin || 'null'}`);

    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      console.log(`✅ CORS allowing request with no origin`);
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      console.log(`✅ CORS allowing origin: ${origin}`);
      return callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from: ${origin}`);
      console.warn(`🚫 Allowed origins:`, Array.from(allowedOrigins));
      return callback(new Error('CORS policy violation'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight for 24 hours
}));

// Enhanced Rate Limiting with environment configuration
// Note: These are conservative backup limits since nginx handles primary rate limiting in production
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (15 * 60 * 1000), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 100 : 1000),
  authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || (isProduction ? 10 : 25)
};

console.log('🛡️  Rate limiting config:', {
  window: `${rateLimitConfig.windowMs / 1000 / 60}min`,
  general: `${rateLimitConfig.maxRequests} requests`,
  auth: `${rateLimitConfig.authMaxRequests} auth attempts`,
  note: isProduction ? 'Backup limits (nginx primary)' : 'Development limits'
});

const generalLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/health' || req.path.startsWith('/api/images');
  }
});

const authLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.authMaxRequests,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // Very conservative for registrations
  message: { error: 'Too many registration attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Nginx handles primary limiting
  message: { error: 'Too many report requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for 304 Not Modified responses (cached data)
    return req.headers['if-none-match'] !== undefined;
  }, // <-- ADD THIS COMMA
  // Remove the custom keyGenerator - let express-rate-limit handle IP addresses properly
});

// Apply rate limiters - but only if not in production (nginx handles it)
if (!isProduction) {
  app.use('/api/', generalLimiter);
}
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);

// Static file serving for product images
// In production, nginx serves images directly, but keep this as fallback/development
if (isProduction) {
  console.log('⚠️  Note: In production, nginx serves images directly for better performance');
  console.log('   Node.js image serving acts as fallback only');
}

// Serve images with appropriate caching headers
app.use('/api/images', express.static(imagesPath, {
  maxAge: isProduction ? '7d' : '1h', // Longer caching in production
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Security headers for images
    res.set('X-Content-Type-Options', 'nosniff');
    if (isProduction) {
      res.set('X-Served-By', 'node-fallback'); // Distinguish from nginx serving
    }
  }
}));

// Health check with detailed info including database status
app.get('/health', async (req, res) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };
  
  // Add database health check
  try {
    const dbHealth = await databaseManager.healthCheck();
    healthInfo.database = dbHealth;
    
    // Add pool statistics
    healthInfo.connectionPools = databaseManager.getPoolStats();
  } catch (error) {
    healthInfo.database = { status: 'error', message: error.message };
    healthInfo.status = 'DEGRADED';
  }
  
  // Additional production health checks
  if (isProduction) {
    healthInfo.features = {
      nginx_proxy: req.headers['x-forwarded-for'] ? 'detected' : 'not_detected',
      ssl: req.headers['x-forwarded-proto'] === 'https' ? 'enabled' : 'disabled'
    };
  }
  
  res.json(healthInfo);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', authenticate, userRoutes);
app.use('/api/inventory', authenticate, inventoryRoutes);
app.use('/api/reports', reportLimiter, authenticate, reportRoutes);
app.use('/api/stores', authenticate, storesRoutes);
app.use('/api/state', authenticate, stateRoutes);
app.use('/api/watchlist', authenticate, watchlistRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handler with environment-appropriate details
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack);
  
  const errorResponse = {
    message: 'Server Error',
    path: req.path,
    method: req.method
  };
  
  // Only include stack trace in development
  if (!isProduction) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.message;
  }
  
  res.status(500).json(errorResponse);
});

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database connections with safety measures
    console.log('🔧 Initializing database connections...');
    await databaseManager.initialize();
    
    // Start server after database is ready
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📦 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
      console.log(`🖼️  Images served from: ${imagesPath}`);
      console.log(`🗄️  Database connections: User DB + Inventory DB with safety pragmas`);
      
      if (isProduction) {
        console.log('🌐 Production features enabled:');
        console.log('   • Nginx reverse proxy expected');
        console.log('   • Enhanced security headers');
        console.log('   • Optimized rate limiting');
        console.log('   • Image serving via nginx (with Node.js fallback)');
        console.log('   • Database connection pooling and WAL mode');
      } else {
        console.log('🛠️  Development mode active:');
        console.log('   • CORS enabled for localhost:5173');
        console.log('   • Detailed error messages');
        console.log('   • Images served directly by Node.js');
        console.log('   • Database connection pooling enabled');
      }
      
      console.log('📊 External Python scripts handle warehouse report generation');
      console.log('✅ Server ready for connections\n');
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

const server = await startServer();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n📟 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server first
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ HTTP server closed gracefully');
    
    // Close database connections
    await databaseManager.shutdown();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));