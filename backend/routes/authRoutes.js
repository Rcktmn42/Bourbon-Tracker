// backend/routes/authRoutes.js

import express from 'express';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/register → creates a new user
router.post('/register', register);

// POST /api/auth/login → returns a JWT
router.post('/login', login);

export default router;
