// backend/controllers/authController.js

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// Register a new user
export async function register(req, res) {
  let { first_name, last_name, email, password } = req.body;
  email = email.trim().toLowerCase();                   // ← normalize
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const exists = await db('users').where({ email }).first();
  if (exists) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const hash = await bcrypt.hash(password, 12);
  const [user] = await db('users')
    .insert({ first_name, last_name, email, password_hash: hash })
    .returning(['user_id','first_name','last_name','email','role']);
  res.status(201).json(user);
}

// Log in an existing user
export async function login(req, res) {
  let { email, password } = req.body;
  email = email.trim().toLowerCase();                   // ← normalize
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = await db('users').where({ email }).first();
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account not activated' });
  }

  // Create JWT
  const token = jwt.sign(
    { sub: user.user_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  // Send it as an HTTP-only, same-site cookie
  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000, // 2 hours
      path: '/'                   // available to all routes
    })
    .status(200)
    .json({ message: 'Logged in' });
}

// Log out the current user
export function logout(req, res) {
  res
    .clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'    // must match the path used when setting the cookie
    })
    .status(200)
    .json({ message: 'Logged out' });
}