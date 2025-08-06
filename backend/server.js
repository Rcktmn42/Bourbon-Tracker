// backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { authenticate, requireRole } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100                  // limit each IP to 100 requests per window
}));

// Health-check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Auth routes: register & login
app.use('/api/auth', authRoutes);

// Protected route: only authenticated users can see this
app.get(
  '/api/whoami',
  authenticate,
  requireRole('user'),
  (req, res) => {
    res.json({ user: req.user });
  }
);

// Admin routes: list users & change roles
app.use('/api/admin', adminRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running at http://0.0.0.0:${PORT}`);
});
