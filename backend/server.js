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

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

// Middleware
import { authenticate } from './middleware/authMiddleware.js';

// Config
dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy in production (nginx reverse proxy)
if (isProduction) {
  app.set('trust proxy', 'loopback');
}

// Enhanced Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Vite dev needs unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for development
}));

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

// Enhanced CORS config
app.use(cors({
  origin: process.env.FRONTEND_URL || (isProduction ? 'https://wakepour.com' : 'http://localhost:5173'),
  credentials: true,
  optionsSuccessStatus: 200
}));

// Enhanced Rate Limiting - More lenient in production since nginx handles primary rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 5000, // Higher in production since nginx pre-filters
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/health' || req.path.startsWith('/api/images');
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 20 : 50, // Nginx handles primary auth limiting
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Slightly higher since nginx pre-filters
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
  },
  keyGenerator: (req) => {
    return `reports:${req.ip}:${req.user?.user_id || 'anonymous'}`;
  }
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
const imagesPath = isProduction 
  ? '/opt/alcohol_images'
  : join(__dirname, '../BourbonDatabase/alcohol_images');

console.log(`[${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}] Image serving:`, imagesPath);

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

// Health check with detailed info
app.get('/health', (req, res) => {
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

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`🖼️  Images served from: ${imagesPath}`);
  
  if (isProduction) {
    console.log('🌐 Production features enabled:');
    console.log('   • Nginx reverse proxy expected');
    console.log('   • Enhanced security headers');
    console.log('   • Optimized rate limiting');
    console.log('   • Image serving via nginx (with Node.js fallback)');
  } else {
    console.log('🛠️  Development mode active:');
    console.log('   • CORS enabled for localhost:5173');
    console.log('   • Detailed error messages');
    console.log('   • Images served directly by Node.js');
  }
  
  console.log('📊 External Python scripts handle warehouse report generation');
  console.log('✅ Server ready for connections\n');
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n📟 Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed gracefully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.log('⏰ Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));