// backend/seed/seed_admin.js

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import db from '../config/db.js';

dotenv.config();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await db('users').where({ email }).first();
  if (existing) {
    console.log('ℹ️  Admin user already exists:', email);
    return process.exit(0);
  }

  const hash = await bcrypt.hash(password, 12);
  await db('users').insert({
    first_name: 'Site',
    last_name:  'Admin',
    email,
    password_hash: hash,
    role: 'admin',
    status: 'active'
  });

  console.log('✅  Admin user seeded:', email);
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
