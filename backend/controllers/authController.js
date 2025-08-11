// backend/controllers/authController.js
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;

// ---------- Validation Schemas ----------
const registerSchema = Joi.object({
  first_name: Joi.string().trim().min(1).required(),
  last_name: Joi.string().trim().min(1).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string()
    .pattern(/[A-Z]/, 'an uppercase letter')
    .pattern(/[a-z]/, 'a lowercase letter')
    .pattern(/\d/, 'a number')
    .pattern(/\W/, 'a symbol')
    .min(8)
    .required()
});

const changePasswordSchema = Joi.object({
  old_password: Joi.string().required(),
  new_password: Joi.string()
    .pattern(/[A-Z]/, 'an uppercase letter')
    .pattern(/[a-z]/, 'a lowercase letter')
    .pattern(/\d/, 'a number')
    .pattern(/\W/, 'a symbol')
    .min(8)
    .required()
});

// ---------- Helpers ----------
function issueCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    path: '/'
  });
}

// ---------- Controllers ----------

// POST /api/auth/register
export async function register(req, res) {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: error.details.map(d => d.message).join(' ')
    });
  }

  const { first_name, last_name, email, password } = value;

  const existing = await db('users').where({ email }).first();
  if (existing) {
    return res.status(409).json({ error: 'Email already in use.' });
  }

  const password_hash = await bcrypt.hash(password, 12);

  // Insert user; SQLite doesn't reliably support .returning(), so re-select
  await db('users').insert({
    first_name,
    last_name,
    email,
    password_hash,
    status: 'active', // your app treats new users as active; change if you switch to email verification
    role: 'user',
    created_at: new Date(),
    updated_at: new Date()
  });

  const user = await db('users')
    .select('user_id', 'first_name', 'last_name', 'email', 'role', 'status', 'phone_number', 'created_at')
    .where({ email })
    .first();

  res.status(201).json(user);
}

// POST /api/auth/login
export async function login(req, res) {
  let { email, password } = req.body;
  email = (email || '').trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  const user = await db('users').where({ email }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account not activated.' });
  }

  const token = jwt.sign({ sub: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  issueCookie(res, token);

  // Return user data instead of just success message
  const safeUser = {
    user_id: user.user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone_number: user.phone_number,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
  res.status(200).json(safeUser);
}

// POST /api/auth/logout
export function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  res.status(200).json({ message: 'Logged out' });
}

// GET /api/auth/whoami  (protected)
export async function whoami(req, res) {
  const userId = req.user?.sub;
  if (!userId) return res.sendStatus(401);

  const user = await db('users')
    .select(
      'user_id',
      'first_name',
      'last_name',
      'email',
      'phone_number',
      'role',
      'status',
      'created_at',
      'updated_at'
    )
    .where({ user_id: userId })
    .first();

  if (!user) return res.sendStatus(404);
  res.json(user);
}

// POST /api/auth/change-password  (protected)
export async function changePassword(req, res) {
  const userId = req.user?.sub;
  if (!userId) return res.sendStatus(401);

  const { error, value } = changePasswordSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: error.details.map(d => d.message).join(' ')
    });
  }

  const { old_password, new_password } = value;

  const user = await db('users').where({ user_id: userId }).first();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const ok = await bcrypt.compare(old_password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Old password is incorrect.' });

  const new_hash = await bcrypt.hash(new_password, 12);
  await db('users')
    .where({ user_id: userId })
    .update({ password_hash: new_hash, updated_at: new Date() });

  res.json({ message: 'Password updated successfully.' });
}