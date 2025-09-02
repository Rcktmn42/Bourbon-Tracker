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
import inventoryRoutes from './routes/inventoryRoutes.js';  // NEW
import reportRoutes from './routes/reportRoutes.js';  // NEW - Report system

// Middleware
import { authenticate } from './middleware/authMiddleware.js';

// Note: Report generation now handled by external Python scripts via cron jobs

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

// server.js (top-level, before app.use('/api/', apiLimiter))
if (process.env.NODE_ENV === 'production') {
  // Nginx is on the same box; trust loopback or the first hop
  app.set('trust proxy', 'loopback');   // or: app.set('trust proxy', 1);
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

app.use(express.json());
app.use(cookieParser());

// Enhanced CORS config
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Enhanced Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 5000, // Very permissive in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // More permissive in development
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: process.env.NODE_ENV === 'development' ? () => false : undefined // Disable in development if needed
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 registration attempts per hour
  message: { error: 'Too many registration attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Much higher limits for static file serving
  message: { error: 'Too many report requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for 304 Not Modified responses (cached data)
    return req.headers['if-none-match'] !== undefined;
  },
  // More lenient key generator to prevent user cascade failures
  keyGenerator: (req) => {
    return `reports:${req.ip}:${req.user?.user_id || 'anonymous'}`;
  }
});

// Apply rate limiters
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/verify-email', authLimiter); // Prevent verification spam
app.use('/api/auth/resend-verification', authLimiter); // Prevent resend spam

// Static file serving for product images
// Environment-based configuration
const imagesPath = process.env.NODE_ENV === 'production' 
  ? '/opt/alcohol_images'
  : join(__dirname, '../BourbonDatabase/alcohol_images');

console.log('Serving images from:', imagesPath);
app.use('/api/images', express.static(imagesPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', authenticate, userRoutes);
app.use('/api/inventory', authenticate, inventoryRoutes);  // NEW - Protected inventory routes
app.use('/api/reports', reportLimiter, authenticate, reportRoutes);  // NEW - Protected report routes with higher limits

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server Error' });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Warehouse reports are generated by external Python cron jobs');
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.log('Force shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));