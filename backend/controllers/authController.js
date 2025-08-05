// backend/controllers/authController.js

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// Register a new user
export async function register(req, res) {
  const { first_name, last_name, email, password } = req.body;
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
    .returning(['user_id', 'first_name', 'last_name', 'email', 'role']);
  res.status(201).json(user);
}

// Log in an existing user
export async function login(req, res) {
  const { email, password } = req.body;
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
  const token = jwt.sign(
    { sub: user.user_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  res.json({ token });
}
