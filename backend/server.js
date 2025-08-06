// backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { authenticate, requireRole } from './middleware/authMiddleware.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Security & parsing middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173',  // your React dev server
  credentials: true                 // allow cookies
}));
app.use(cookieParser());            // <— parse cookies into req.cookies
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100                  // limit each IP
}));

// Health-check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Auth routes: register & login
app.use('/api/auth', authRoutes);

// Protected route: anyone with a valid cookie
 app.get(
   '/api/whoami',
   authenticate,          // no more requireRole('user')
   (req, res) => {
     res.json({ user: req.user });
   }
 );

// Admin routes: list users & change roles/status
app.use('/api/admin', adminRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running at http://0.0.0.0:${PORT}`);
});
