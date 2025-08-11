# NC Bourbon Tracker - Source Code Documentation

**Generated:** 2025-08-10T14:17:31.075226  
**Project Root:** C:\Users\JTLew\source\repos\Bourbon-Tracker

## Architecture Overview

This project uses a **secure-by-default architecture** with:

- **Frontend:** React with Vite, using a two-layout system (PublicLayout for auth, AuthenticatedLayout for app)
- **Backend:** Node.js with Express, JWT authentication via HTTP-only cookies
- **Database:** SQLite with user management and future ABC warehouse data
- **Security:** All routes protected by default, explicit public routes only for auth

## API Endpoints (Auto-Extracted)

| Method | Path | File |
|---|---|---|
| `GET` | `/users` | `backend\routes\adminRoutes.js` |
| `PATCH` | `/users/:userId/role` | `backend\routes\adminRoutes.js` |
| `PATCH` | `/users/:userId/status` | `backend\routes\adminRoutes.js` |
| `POST` | `/register` | `backend\routes\authRoutes.js` |
| `POST` | `/login` | `backend\routes\authRoutes.js` |
| `POST` | `/logout` | `backend\routes\authRoutes.js` |
| `GET` | `/whoami` | `backend\routes\authRoutes.js` |
| `POST` | `/change-password` | `backend\routes\authRoutes.js` |
| `PUT` | `/update-profile` | `backend\routes\authRoutes.js` |
| `GET` | `/me` | `backend\routes\userRoutes.js` |
| `PUT` | `/me` | `backend\routes\userRoutes.js` |
| `POST` | `/change-password` | `backend\routes\userRoutes.js` |

## Environment Variables (from .env.example)

_No .env.example found or no variables detected._

## TODOs / FIXMEs
- document_project.py (line 264): """Scan important source files for TODO/FIXME comments."""
- document_project.py (line 281): if 'TODO' in line or 'FIXME' in line:
- document_project.py (line 333): md_content += "\n## TODOs / FIXMEs\n"
- document_project.py (line 338): md_content += "\n_No TODOs or FIXMEs found._\n"
- document_project.py (line 407): print("🚦 Scanning for TODOs/FIXMEs...")

## Configuration Files

### .gitignore

**Purpose:** Project file: .gitignore

```text
# local env vars
.env
*.sqlite3
*.db

```

### README.md

**Purpose:** Project file: README.md

```markdown

```

### api-routes.json

**Purpose:** Project file: api-routes.json

```json
[
  {
    "method": "GET",
    "path": "/users",
    "file": "backend\\routes\\adminRoutes.js"
  },
  {
    "method": "PATCH",
    "path": "/users/:userId/role",
    "file": "backend\\routes\\adminRoutes.js"
  },
  {
    "method": "PATCH",
    "path": "/users/:userId/status",
    "file": "backend\\routes\\adminRoutes.js"
  },
  {
    "method": "POST",
    "path": "/register",
    "file": "backend\\routes\\authRoutes.js"
  },
  {
    "method": "POST",
    "path": "/login",
    "file": "backend\\routes\\authRoutes.js"
  },
  {
    "method": "POST",
    "path": "/logout",
    "file": "backend\\routes\\authRoutes.js"
  },
  {
    "method": "GET",
    "path": "/whoami",
    "file": "backend\\routes\\authRoutes.js"
  },
  {
    "method": "POST",
    "path": "/change-password",
    "file": "backend\\routes\\authRoutes.js"
  },
  {
    "method": "PUT",
    "path": "/update-profile",
    "file": "backend\\routes\\authRoutes.js"
  },
  {
    "method": "GET",
    "path": "/me",
    "file": "backend\\routes\\userRoutes.js"
  },
  {
    "method": "PUT",
    "path": "/me",
    "file": "backend\\routes\\userRoutes.js"
  },
  {
    "method": "POST",
    "path": "/change-password",
    "file": "backend\\routes\\userRoutes.js"
  }
]
```

### backend\config\db.js

**Purpose:** Project file: backend\config\db.js

```javascript
// backend/config/db.js

// Load .env first
import 'dotenv/config';

import knex from 'knex';

// Choose your client (sqlite3 today, pg later)
const client = process.env.DB_CLIENT || 'sqlite3';
const databaseUrl = process.env.DATABASE_URL || './data/database.sqlite3';

// Build the Knex instance
const db = knex({
  client,
  connection:
    client === 'sqlite3'
      ? { filename: databaseUrl }
      : databaseUrl,
  useNullAsDefault: client === 'sqlite3'
});

export default db;

```

### backend\controllers\adminController.js

**Purpose:** Project file: backend\controllers\adminController.js

```javascript
// backend/controllers/adminController.js

import db from '../config/db.js';

// List all users
export async function listUsers(req, res) {
  const users = await db('users')
    .select(
      'user_id',
      'first_name',
      'last_name',
      'email',
      'status',
      'role',
      'created_at'
    );
  res.json(users);
}

// Update a user’s role
export async function updateUserRole(req, res) {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['admin','power_user','user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const updated = await db('users')
    .where({ user_id: userId })
    .update({ role, updated_at: new Date() });
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ message: `User ${userId} role set to ${role}` });
}
// Activate a pending user
export async function updateUserStatus(req, res) {
  const { userId } = req.params;
  const { status } = req.body;
  if (!['pending','active','disabled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const count = await db('users')
    .where({ user_id: userId })
    .update({ status, updated_at: new Date() });
  if (!count) return res.status(404).json({ error: 'User not found' });
  res.json({ message: `User ${userId} status set to ${status}` });
}
// Delete a user
```

### backend\controllers\authController.js

**Purpose:** Project file: backend\controllers\authController.js

```javascript
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

const profileSchema = Joi.object({
  first_name: Joi.string().trim().min(1).optional(),
  last_name: Joi.string().trim().min(1).optional(),
  // allow common phone formats; we can normalize later if you want E.164
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9()\-\s]{7,20}$/)
    .allow('', null)
    .optional()
}).min(1); // must provide at least one field

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
    .select('user_id', 'first_name', 'last_name', 'email', 'role', 'status', 'phone', 'created_at')
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
  res.status(200).json({ message: 'Logged in' });
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
      'phone',
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

// PUT /api/auth/update-profile  (protected)
export async function updateProfile(req, res) {
  const userId = req.user?.sub;
  if (!userId) return res.sendStatus(401);

  const { error, value } = profileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: error.details.map(d => d.message).join(' ')
    });
  }

  const updates = { ...value, updated_at: new Date() };

  const changed = await db('users').where({ user_id: userId }).update(updates);
  if (!changed) return res.status(404).json({ error: 'User not found' });

  const user = await db('users')
    .select('user_id', 'first_name', 'last_name', 'email', 'phone', 'role', 'status', 'created_at', 'updated_at')
    .where({ user_id: userId })
    .first();

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

```

### backend\controllers\userController.js

**Purpose:** Project file: backend\controllers\userController.js

```javascript
// backend/controllers/userController.js
import db from '../config/db.js';
import bcrypt from 'bcrypt';
import Joi from 'joi';

// Reuse similar password strength expectations as register (uppercase, lowercase, number, symbol, min 8).
// Your register schema already enforces this; we mirror it here. :contentReference[oaicite:2]{index=2}
const passwordSchema = Joi.object({
  current_password: Joi.string().min(1).required(),
  new_password: Joi.string()
    .pattern(/[A-Z]/, 'an uppercase letter')
    .pattern(/[a-z]/, 'a lowercase letter')
    .pattern(/\d/, 'a number')
    .pattern(/\W/, 'a symbol')
    .min(8)
    .required()
    .messages({
      'string.pattern.name': 'Password must contain at least {#name}.',
      'string.min': 'Password must be at least {#limit} characters.',
      'string.empty': 'Password is required.',
    }),
});

const profileSchema = Joi.object({
  first_name: Joi.string().trim().min(1).required(),
  last_name: Joi.string().trim().min(1).required(),
  phone_number: Joi.string().trim().allow(null, '').max(20),
});

// GET /api/user/profile
export async function getProfile(req, res) {
  try {
    const u = await db('users')
      .select('first_name', 'last_name', 'email', 'phone_number')
      .where({ user_id: req.user.sub }) // sub set by JWT (user_id) :contentReference[oaicite:3]{index=3}
      .first();

    if (!u) return res.sendStatus(404);
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// PATCH /api/user/profile
export async function updateProfile(req, res) {
  const { error, value } = profileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details.map(e => e.message).join(' ') });
  }

  try {
    const { first_name, last_name, phone_number } = value;
    const count = await db('users')
      .where({ user_id: req.user.sub })
      .update({ first_name, last_name, phone_number, updated_at: new Date() });

    if (!count) return res.sendStatus(404);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// PATCH /api/user/profile/password
export async function changePassword(req, res) {
  const { error, value } = passwordSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details.map(e => e.message).join(' ') });
  }

  const { current_password, new_password } = value;

  try {
    const user = await db('users')
      .where({ user_id: req.user.sub })
      .first();

    if (!user) return res.sendStatus(404);

    const ok = await bcrypt.compare(current_password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Incorrect current password' });

    const hash = await bcrypt.hash(new_password, 12);
    await db('users')
      .where({ user_id: req.user.sub })
      .update({ password_hash: hash, updated_at: new Date() });

    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
}

```

### backend\knexfile.js

**Purpose:** Project file: backend\knexfile.js

```javascript
// backend/knexfile.js
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname shim for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('knex').Knex.Config} */
const config = {
  development: {
    client: process.env.DB_CLIENT || 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL ||
        path.join(__dirname, 'data', 'database.sqlite3'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations'
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations'
    },
  }
};

export default config;

```

### backend\middleware\authMiddleware.js

**Purpose:** Project file: backend\middleware\authMiddleware.js

```javascript
// backend/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

export function authenticate(req, res, next) {
  const token = req.cookies.token;      // <— read from HTTP-only cookie
  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;                 // attach payload to req.user
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.sendStatus(403);
    }
    next();
  };
}

```

### backend\migrations\20250802013046_create_users_table.js

**Purpose:** Project file: backend\migrations\20250802013046_create_users_table.js

```javascript
// backend/migrations/20250802013046_create_users_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('users', table => {
    table.increments('user_id').primary();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table
      .enu('role', ['admin','power_user','user'])
      .notNullable()
      .defaultTo('user');
    table.timestamps(true, true);  // adds created_at & updated_at
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('users');
}

```

### backend\migrations\20250805012817_create_stores_table.js

**Purpose:** Project file: backend\migrations\20250805012817_create_stores_table.js

```javascript
// backend/migrations/‹timestamp›_create_stores_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('stores', table => {
    table.increments('store_id').primary();
    table.text('store_number').notNullable().unique();
    table.text('address').unique();
    table.text('region');
    table.text('nickname');
    table.integer('delivery_interval_days');
    table.date('last_delivery_date');
    table
      .integer('mixed_beverage')
      .notNullable()
      .defaultTo(0);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('stores');
}

```

### backend\migrations\20250805013223_create_boards_table.js

**Purpose:** Project file: backend\migrations\20250805013223_create_boards_table.js

```javascript
// backend/migrations/‹timestamp›_create_boards_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('boards', table => {
    table.increments('board_id').primary();
    table.text('board_name').notNullable().unique();
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('boards');
}

```

### backend\migrations\20250805013332_create_alcohol_table.js

**Purpose:** Project file: backend\migrations\20250805013332_create_alcohol_table.js

```javascript
// backend/migrations/‹timestamp›_create_alcohol_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('alcohol', table => {
    table.increments('alcohol_id').primary();
    table.integer('nc_code').notNullable().unique();
    table.text('brand_name');
    table.integer('size_ml');
    table.integer('cases_per_pallet');
    table.text('supplier');
    table.text('broker_name');
    table.date('first_seen_date');
    table.text('image_path');
    table.text('listing_type');
    table.text('style_tags');
    table.text('alcohol_type');
    table.text('alcohol_subtype');
    table.float('retail_price');
    table.integer('bottles_per_case');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('alcohol');
}

```

### backend\migrations\20250805013533_create_bourbons_table.js

**Purpose:** Project file: backend\migrations\20250805013533_create_bourbons_table.js

```javascript
// backend/migrations/‹timestamp›_create_bourbons_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('bourbons', table => {
    table.increments('bourbon_id').primary();
    table.text('name').notNullable();
    table.integer('plu').notNullable().unique();
    table.date('last_seeded_date');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('bourbons');
}

```

### backend\migrations\20250805013827_create_current_inventory_table.js

**Purpose:** Project file: backend\migrations\20250805013827_create_current_inventory_table.js

```javascript
// backend/migrations/‹timestamp›_create_current_inventory_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('current_inventory', table => {
    table.increments('inventory_id').primary();
    table
      .integer('store_id')
      .notNullable()
      .references('store_id')
      .inTable('stores');
    table.integer('plu').notNullable();
    table.integer('quantity');
    table
      .timestamp('last_updated', { useTz: false })
      .defaultTo(knex.fn.now());
    table.unique(['store_id','plu']);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('current_inventory');
}

```

### backend\migrations\20250805014216_create_inventory_history_table.js

**Purpose:** Project file: backend\migrations\20250805014216_create_inventory_history_table.js

```javascript
// backend/migrations/‹timestamp›_create_inventory_history_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('inventory_history', table => {
    table.increments('history_id').primary();
    table
      .integer('store_id')
      .notNullable()
      .references('store_id')
      .inTable('stores');
    table.integer('plu').notNullable();
    table.integer('quantity');
    table.date('snapshot_date').notNullable();
    table.unique(['store_id','plu','snapshot_date']);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('inventory_history');
}

```

### backend\migrations\20250805014453_create_warehouse_inventory_history_v2_table.js

**Purpose:** Project file: backend\migrations\20250805014453_create_warehouse_inventory_history_v2_table.js

```javascript
// backend/migrations/‹timestamp›_create_warehouse_inventory_history_v2_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('warehouse_inventory_history_v2', table => {
    table.increments('history_id').primary();
    table.text('nc_code').notNullable();
    table.date('check_date').notNullable();
    table.integer('total_available');
    table.text('listing_type');
    table.integer('supplier_allotment');
    table
      .unique(['nc_code', 'check_date']);
    // If you want to enforce the old FK to alcohol_old, uncomment:
    // table.foreign('nc_code').references('nc_code').inTable('alcohol_old');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('warehouse_inventory_history_v2');
}

```

### backend\migrations\20250805014727_create_shipments_history_table.js

**Purpose:** Project file: backend\migrations\20250805014727_create_shipments_history_table.js

```javascript
// backend/migrations/20250805014727_create_shipments_history_table.js

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('shipments_history', table => {
    table.increments('shipment_id').primary();
    table.text('nc_code').notNullable();
    table
      .integer('board_id')
      .notNullable()
      .references('board_id')
      .inTable('boards');
    table.date('ship_date').notNullable();
    table.integer('num_units').notNullable();
    table.unique(['nc_code', 'board_id', 'ship_date']);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('shipments_history');
}

```

### backend\migrations\20250805021555_add_status_to_users.js

**Purpose:** Project file: backend\migrations\20250805021555_add_status_to_users.js

```javascript
// backend/migrations/‹timestamp›_add_status_to_users.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('users', table => {
    table
      .enu('status', ['pending','active','disabled'], {
        useNative: true,
        enumName: 'user_status'
      })
      .notNullable()
      .defaultTo('pending');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('status');
  });
  // If you want to drop the enum type (Postgres only), you could do:
  // await knex.raw('DROP TYPE IF EXISTS user_status');
}

```

### backend\migrations\20250808000100_add_phone_number_to_users.js

**Purpose:** Project file: backend\migrations\20250808000100_add_phone_number_to_users.js

```javascript
/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('phone_number', 20).nullable().index();
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone_number');
  });
}

```

### backend\migrations\20250809034338_add_updated_at_to_users.js

**Purpose:** Project file: backend\migrations\20250809034338_add_updated_at_to_users.js

```javascript
// backend/migrations/[timestamp]_add_updated_at_to_users.js
// Run: npx knex migrate:make add_updated_at_to_users

export const up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('updated_at');
  });
};
```

### backend\package-lock.json

**Purpose:** Project file: backend\package-lock.json

```json
{
  "name": "backend",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "backend",
      "version": "1.0.0",
      "license": "ISC",
      "dependencies": {
        "bcrypt": "^6.0.0",
        "cookie-parser": "^1.4.7",
        "cors": "^2.8.5",
        "dotenv": "^17.2.1",
        "express": "^5.1.0",
        "express-rate-limit": "^8.0.1",
        "helmet": "^8.1.0",
        "joi": "^18.0.0",
        "jsonwebtoken": "^9.0.2",
        "knex": "^3.1.0",
        "sqlite3": "^5.1.7"
      },
      "devDependencies": {
        "@types/cors": "^2.8.19",
        "@types/express": "^5.0.3",
        "@types/express-rate-limit": "^5.1.3",
        "@types/helmet": "^0.0.48",
        "@types/jsonwebtoken": "^9.0.10"
      }
    },
    "node_modules/@gar/promisify": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/@gar/promisify/-/promisify-1.1.3.tgz",
      "integrity": "sha512-k2Ty1JcVojjJFwrg/ThKi2ujJ7XNLYaFGNB/bWT9wGR+oSMJHMa5w+CUq6p/pVrKeNNgA7pCqEcjSnHVoqJQFw==",
      "optional": true
    },
    "node_modules/@hapi/address": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/@hapi/address/-/address-5.1.1.tgz",
      "integrity": "sha512-A+po2d/dVoY7cYajycYI43ZbYMXukuopIsqCjh5QzsBCipDtdofHntljDlpccMjIfTy6UOkg+5KPriwYch2bXA==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@hapi/hoek": "^11.0.2"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@hapi/formula": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/@hapi/formula/-/formula-3.0.2.tgz",
      "integrity": "sha512-hY5YPNXzw1He7s0iqkRQi+uMGh383CGdyyIGYtB+W5N3KHPXoqychklvHhKCC9M3Xtv0OCs/IHw+r4dcHtBYWw==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@hapi/hoek": {
      "version": "11.0.7",
      "resolved": "https://registry.npmjs.org/@hapi/hoek/-/hoek-11.0.7.tgz",
      "integrity": "sha512-HV5undWkKzcB4RZUusqOpcgxOaq6VOAH7zhhIr2g3G8NF/MlFO75SjOr2NfuSx0Mh40+1FqCkagKLJRykUWoFQ==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@hapi/pinpoint": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/@hapi/pinpoint/-/pinpoint-2.0.1.tgz",
      "integrity": "sha512-EKQmr16tM8s16vTT3cA5L0kZZcTMU5DUOZTuvpnY738m+jyP3JIUj+Mm1xc1rsLkGBQ/gVnfKYPwOmPg1tUR4Q==",
      "license": "BSD-3-Clause"
    },
    "node_modules/@hapi/tlds": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@hapi/tlds/-/tlds-1.1.2.tgz",
      "integrity": "sha512-1jkwm1WY9VIb6WhdANRmWDkXQUcIRpxqZpSdS+HD9vhoVL3zwoFvP8doQNEgT6k3VST0Ewu50wZnXIceRYp5tw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@hapi/topo": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/@hapi/topo/-/topo-6.0.2.tgz",
      "integrity": "sha512-KR3rD5inZbGMrHmgPxsJ9dbi6zEK+C3ZwUwTa+eMwWLz7oijWUTWD2pMSNNYJAU6Qq+65NkxXjqHr/7LM2Xkqg==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@hapi/hoek": "^11.0.2"
      }
    },
    "node_modules/@npmcli/fs": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/@npmcli/fs/-/fs-1.1.1.tgz",
      "integrity": "sha512-8KG5RD0GVP4ydEzRn/I4BNDuxDtqVbOdm8675T49OIG/NGhaK0pjPX7ZcDlvKYbA+ulvVK3ztfcF4uBdOxuJbQ==",
      "optional": true,
      "dependencies": {
        "@gar/promisify": "^1.0.1",
        "semver": "^7.3.5"
      }
    },
    "node_modules/@npmcli/move-file": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@npmcli/move-file/-/move-file-1.1.2.tgz",
      "integrity": "sha512-1SUf/Cg2GzGDyaf15aR9St9TWlb+XvbZXWpDx8YKs7MLzMH/BCeopv+y9vzrzgkfykCGuWOlSu3mZhj2+FQcrg==",
      "deprecated": "This functionality has been moved to @npmcli/fs",
      "optional": true,
      "dependencies": {
        "mkdirp": "^1.0.4",
        "rimraf": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/@standard-schema/spec": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/@standard-schema/spec/-/spec-1.0.0.tgz",
      "integrity": "sha512-m2bOd0f2RT9k8QJx1JN85cZYyH1RqFBdlwtkSlf4tBDYLCiiZnv1fIIwacK6cqwXavOydf0NPToMQgpKq+dVlA==",
      "license": "MIT"
    },
    "node_modules/@tootallnate/once": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/@tootallnate/once/-/once-1.1.2.tgz",
      "integrity": "sha512-RbzJvlNzmRq5c3O09UipeuXno4tA1FE6ikOjxZK0tuxVv3412l64l5t1W5pj4+rJq9vpkm/kwiR07aZXnsKPxw==",
      "optional": true,
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/@types/body-parser": {
      "version": "1.19.6",
      "resolved": "https://registry.npmjs.org/@types/body-parser/-/body-parser-1.19.6.tgz",
      "integrity": "sha512-HLFeCYgz89uk22N5Qg3dvGvsv46B8GLvKKo1zKG4NybA8U2DiEO3w9lqGg29t/tfLRJpJ6iQxnVw4OnB7MoM9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/connect": "*",
        "@types/node": "*"
      }
    },
    "node_modules/@types/connect": {
      "version": "3.4.38",
      "resolved": "https://registry.npmjs.org/@types/connect/-/connect-3.4.38.tgz",
      "integrity": "sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/cors": {
      "version": "2.8.19",
      "resolved": "https://registry.npmjs.org/@types/cors/-/cors-2.8.19.tgz",
      "integrity": "sha512-mFNylyeyqN93lfe/9CSxOGREz8cpzAhH+E93xJ4xWQf62V8sQ/24reV2nyzUWM6H6Xji+GGHpkbLe7pVoUEskg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*"
      }
    },
    "node_modules/@types/express": {
      "version": "5.0.3",
      "resolved": "https://registry.npmjs.org/@types/express/-/express-5.0.3.tgz",
      "integrity": "sha512-wGA0NX93b19/dZC1J18tKWVIYWyyF2ZjT9vin/NRu0qzzvfVzWjs04iq2rQ3H65vCTQYlRqs3YHfY7zjdV+9Kw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/body-parser": "*",
        "@types/express-serve-static-core": "^5.0.0",
        "@types/serve-static": "*"
      }
    },
    "node_modules/@types/express-rate-limit": {
      "version": "5.1.3",
      "resolved": "https://registry.npmjs.org/@types/express-rate-limit/-/express-rate-limit-5.1.3.tgz",
      "integrity": "sha512-H+TYy3K53uPU2TqPGFYaiWc2xJV6+bIFkDd/Ma2/h67Pa6ARk9kWE0p/K9OH1Okm0et9Sfm66fmXoAxsH2PHXg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/express": "*"
      }
    },
    "node_modules/@types/express-serve-static-core": {
      "version": "5.0.7",
      "resolved": "https://registry.npmjs.org/@types/express-serve-static-core/-/express-serve-static-core-5.0.7.tgz",
      "integrity": "sha512-R+33OsgWw7rOhD1emjU7dzCDHucJrgJXMA5PYCzJxVil0dsyx5iBEPHqpPfiKNJQb7lZ1vxwoLR4Z87bBUpeGQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/node": "*",
        "@types/qs": "*",
        "@types/range-parser": "*",
        "@types/send": "*"
      }
    },
    "node_modules/@types/helmet": {
      "version": "0.0.48",
      "resolved": "https://registry.npmjs.org/@types/helmet/-/helmet-0.0.48.tgz",
      "integrity": "sha512-C7MpnvSDrunS1q2Oy1VWCY7CDWHozqSnM8P4tFeRTuzwqni+PYOjEredwcqWG+kLpYcgLsgcY3orHB54gbx2Jw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/express": "*"
      }
    },
    "node_modules/@types/http-errors": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/@types/http-errors/-/http-errors-2.0.5.tgz",
      "integrity": "sha512-r8Tayk8HJnX0FztbZN7oVqGccWgw98T/0neJphO91KkmOzug1KkofZURD4UaD5uH8AqcFLfdPErnBod0u71/qg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/jsonwebtoken": {
      "version": "9.0.10",
      "resolved": "https://registry.npmjs.org/@types/jsonwebtoken/-/jsonwebtoken-9.0.10.tgz",
      "integrity": "sha512-asx5hIG9Qmf/1oStypjanR7iKTv0gXQ1Ov/jfrX6kS/EO0OFni8orbmGCn0672NHR3kXHwpAwR+B368ZGN/2rA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/ms": "*",
        "@types/node": "*"
      }
    },
    "node_modules/@types/mime": {
      "version": "1.3.5",
      "resolved": "https://registry.npmjs.org/@types/mime/-/mime-1.3.5.tgz",
      "integrity": "sha512-/pyBZWSLD2n0dcHE3hq8s8ZvcETHtEuF+3E7XVt0Ig2nvsVQXdghHVcEkIWjy9A0wKfTn97a/PSDYohKIlnP/w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/ms": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/@types/ms/-/ms-2.1.0.tgz",
      "integrity": "sha512-GsCCIZDE/p3i96vtEqx+7dBUGXrc7zeSK3wwPHIaRThS+9OhWIXRqzs4d6k1SVU8g91DrNRWxWUGhp5KXQb2VA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "24.2.0",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-24.2.0.tgz",
      "integrity": "sha512-3xyG3pMCq3oYCNg7/ZP+E1ooTaGB4cG8JWRsqqOYQdbWNY4zbaV0Ennrd7stjiJEFZCaybcIgpTjJWHRfBSIDw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "undici-types": "~7.10.0"
      }
    },
    "node_modules/@types/qs": {
      "version": "6.14.0",
      "resolved": "https://registry.npmjs.org/@types/qs/-/qs-6.14.0.tgz",
      "integrity": "sha512-eOunJqu0K1923aExK6y8p6fsihYEn/BYuQ4g0CxAAgFc4b/ZLN4CrsRZ55srTdqoiLzU2B2evC+apEIxprEzkQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/range-parser": {
      "version": "1.2.7",
      "resolved": "https://registry.npmjs.org/@types/range-parser/-/range-parser-1.2.7.tgz",
      "integrity": "sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/send": {
      "version": "0.17.5",
      "resolved": "https://registry.npmjs.org/@types/send/-/send-0.17.5.tgz",
      "integrity": "sha512-z6F2D3cOStZvuk2SaP6YrwkNO65iTZcwA2ZkSABegdkAh/lf+Aa/YQndZVfmEXT5vgAp6zv06VQ3ejSVjAny4w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/mime": "^1",
        "@types/node": "*"
      }
    },
    "node_modules/@types/serve-static": {
      "version": "1.15.8",
      "resolved": "https://registry.npmjs.org/@types/serve-static/-/serve-static-1.15.8.tgz",
      "integrity": "sha512-roei0UY3LhpOJvjbIP6ZZFngyLKl5dskOtDhxY5THRSpO+ZI+nzJ+m5yUMzGrp89YRa7lvknKkMYjqQFGwA7Sg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/http-errors": "*",
        "@types/node": "*",
        "@types/send": "*"
      }
    },
    "node_modules/abbrev": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/abbrev/-/abbrev-1.1.1.tgz",
      "integrity": "sha512-nne9/IiQ/hzIhY6pdDnbBtz7DjPTKrY00P/zvPSm5pOFkl6xuGrGnXn/VtTNNfNtAfZ9/1RtehkszU9qcTii0Q==",
      "optional": true
    },
    "node_modules/accepts": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-2.0.0.tgz",
      "integrity": "sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==",
      "dependencies": {
        "mime-types": "^3.0.0",
        "negotiator": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/agent-base": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-6.0.2.tgz",
      "integrity": "sha512-RZNwNclF7+MS/8bDg70amg32dyeZGZxiDuQmZxKLAlQjr3jGyLx+4Kkk58UO7D2QdgFIQCovuSuZESne6RG6XQ==",
      "optional": true,
      "dependencies": {
        "debug": "4"
      },
      "engines": {
        "node": ">= 6.0.0"
      }
    },
    "node_modules/agentkeepalive": {
      "version": "4.6.0",
      "resolved": "https://registry.npmjs.org/agentkeepalive/-/agentkeepalive-4.6.0.tgz",
      "integrity": "sha512-kja8j7PjmncONqaTsB8fQ+wE2mSU2DJ9D4XKoJ5PFWIdRMa6SLSN1ff4mOr4jCbfRSsxR4keIiySJU0N9T5hIQ==",
      "optional": true,
      "dependencies": {
        "humanize-ms": "^1.2.1"
      },
      "engines": {
        "node": ">= 8.0.0"
      }
    },
    "node_modules/aggregate-error": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/aggregate-error/-/aggregate-error-3.1.0.tgz",
      "integrity": "sha512-4I7Td01quW/RpocfNayFdFVk1qSuoh0E7JrbRJ16nH01HhKFQ88INq9Sd+nd72zqRySlr9BmDA8xlEJ6vJMrYA==",
      "optional": true,
      "dependencies": {
        "clean-stack": "^2.0.0",
        "indent-string": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "optional": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/aproba": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/aproba/-/aproba-2.1.0.tgz",
      "integrity": "sha512-tLIEcj5GuR2RSTnxNKdkK0dJ/GrC7P38sUkiDmDuHfsHmbagTFAxDVIBltoklXEVIQ/f14IL8IMJ5pn9Hez1Ew==",
      "optional": true
    },
    "node_modules/are-we-there-yet": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/are-we-there-yet/-/are-we-there-yet-3.0.1.tgz",
      "integrity": "sha512-QZW4EDmGwlYur0Yyf/b2uGucHQMa8aFUP7eu9ddR73vvhFyt4V0Vl3QHPcTNJ8l6qYOBdxgXdnBXQrHilfRQBg==",
      "deprecated": "This package is no longer supported.",
      "optional": true,
      "dependencies": {
        "delegates": "^1.0.0",
        "readable-stream": "^3.6.0"
      },
      "engines": {
        "node": "^12.13.0 || ^14.15.0 || >=16.0.0"
      }
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "optional": true
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ]
    },
    "node_modules/bcrypt": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/bcrypt/-/bcrypt-6.0.0.tgz",
      "integrity": "sha512-cU8v/EGSrnH+HnxV2z0J7/blxH8gq7Xh2JFT6Aroax7UohdmiJJlxApMxtKfuI7z68NvvVcmR78k2LbT6efhRg==",
      "hasInstallScript": true,
      "license": "MIT",
      "dependencies": {
        "node-addon-api": "^8.3.0",
        "node-gyp-build": "^4.8.4"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/bcrypt/node_modules/node-addon-api": {
      "version": "8.5.0",
      "resolved": "https://registry.npmjs.org/node-addon-api/-/node-addon-api-8.5.0.tgz",
      "integrity": "sha512-/bRZty2mXUIFY/xU5HLvveNHlswNJej+RnxBjOMkidWfwZzgTbPG1E3K5TOxRLOR+5hX7bSofy8yf1hZevMS8A==",
      "license": "MIT",
      "engines": {
        "node": "^18 || ^20 || >= 21"
      }
    },
    "node_modules/bindings": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/bindings/-/bindings-1.5.0.tgz",
      "integrity": "sha512-p2q/t/mhvuOj/UeLlV6566GD/guowlr0hHxClI0W9m7MWYkL1F0hLo+0Aexs9HSPCtR1SXQ0TD3MMKrXZajbiQ==",
      "dependencies": {
        "file-uri-to-path": "1.0.0"
      }
    },
    "node_modules/bl": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/bl/-/bl-4.1.0.tgz",
      "integrity": "sha512-1W07cM9gS6DcLperZfFSj+bWLtaPGSOHWhPiGzXmvVJbRLdG82sH/Kn8EtW1VqWVA54AKf2h5k5BbnIbwF3h6w==",
      "dependencies": {
        "buffer": "^5.5.0",
        "inherits": "^2.0.4",
        "readable-stream": "^3.4.0"
      }
    },
    "node_modules/body-parser": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-2.2.0.tgz",
      "integrity": "sha512-02qvAaxv8tp7fBa/mw1ga98OGm+eCbqzJOKoRt70sLmfEEi+jyBYVTDGfCL/k06/4EMk/z01gCe7HoCH/f2LTg==",
      "dependencies": {
        "bytes": "^3.1.2",
        "content-type": "^1.0.5",
        "debug": "^4.4.0",
        "http-errors": "^2.0.0",
        "iconv-lite": "^0.6.3",
        "on-finished": "^2.4.1",
        "qs": "^6.14.0",
        "raw-body": "^3.0.0",
        "type-is": "^2.0.0"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "optional": true,
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/buffer": {
      "version": "5.7.1",
      "resolved": "https://registry.npmjs.org/buffer/-/buffer-5.7.1.tgz",
      "integrity": "sha512-EHcyIPBQ4BSGlvjB16k5KgAJ27CIsHY/2JBmCRReo48y9rQ3MaUzWX3KVlBa4U7MyX02HdVj0K7C3WaB3ju7FQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "dependencies": {
        "base64-js": "^1.3.1",
        "ieee754": "^1.1.13"
      }
    },
    "node_modules/buffer-equal-constant-time": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz",
      "integrity": "sha512-zRpUiDwd/xk6ADqPMATG8vc9VPrkck7T07OIx0gnjmJAnHnTVXNQG3vfvWNuiZIkwu9KrKdA1iJKfsfTVxE6NA=="
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/cacache": {
      "version": "15.3.0",
      "resolved": "https://registry.npmjs.org/cacache/-/cacache-15.3.0.tgz",
      "integrity": "sha512-VVdYzXEn+cnbXpFgWs5hTT7OScegHVmLhJIR8Ufqk3iFD6A6j5iSX1KuBTfNEv4tdJWE2PzA6IVFtcLC7fN9wQ==",
      "optional": true,
      "dependencies": {
        "@npmcli/fs": "^1.0.0",
        "@npmcli/move-file": "^1.0.1",
        "chownr": "^2.0.0",
        "fs-minipass": "^2.0.0",
        "glob": "^7.1.4",
        "infer-owner": "^1.0.4",
        "lru-cache": "^6.0.0",
        "minipass": "^3.1.1",
        "minipass-collect": "^1.0.2",
        "minipass-flush": "^1.0.5",
        "minipass-pipeline": "^1.2.2",
        "mkdirp": "^1.0.3",
        "p-map": "^4.0.0",
        "promise-inflight": "^1.0.1",
        "rimraf": "^3.0.2",
        "ssri": "^8.0.1",
        "tar": "^6.0.2",
        "unique-filename": "^1.1.1"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/chownr": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/chownr/-/chownr-2.0.0.tgz",
      "integrity": "sha512-bIomtDF5KGpdogkLd9VspvFzk9KfpyyGlS8YFVZl7TGPBHL5snIOnxeshwVgPteQ9b4Eydl+pVbIyE1DcvCWgQ==",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/clean-stack": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/clean-stack/-/clean-stack-2.2.0.tgz",
      "integrity": "sha512-4diC9HaTE+KRAMWhDhrGOECgWZxoevMc5TlkObMqNSsVU62PYzXZ/SMTjzyGAFF1YusgxGcSWTEXBhp0CPwQ1A==",
      "optional": true,
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/color-support": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/color-support/-/color-support-1.1.3.tgz",
      "integrity": "sha512-qiBjkpbMLO/HL68y+lh4q0/O1MZFj2RX6X/KmMa3+gJD3z+WwI1ZzDHysvqHGS3mP6mznPckpXmw1nI9cJjyRg==",
      "optional": true,
      "bin": {
        "color-support": "bin.js"
      }
    },
    "node_modules/colorette": {
      "version": "2.0.19",
      "resolved": "https://registry.npmjs.org/colorette/-/colorette-2.0.19.tgz",
      "integrity": "sha512-3tlv/dIP7FWvj3BsbHrGLJ6l/oKh1O3TcgBqMn+yyCagOxc23fyzDS6HypQbgxWbkpDnf52p1LuR4eWDQ/K9WQ=="
    },
    "node_modules/commander": {
      "version": "10.0.1",
      "resolved": "https://registry.npmjs.org/commander/-/commander-10.0.1.tgz",
      "integrity": "sha512-y4Mg2tXshplEbSGzx7amzPwKKOCGuoSRP/CjEdwwk0FOGlUbq6lKuoyDZTNZkmxHdJtp54hdfY/JUrdL7Xfdug==",
      "engines": {
        "node": ">=14"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "optional": true
    },
    "node_modules/console-control-strings": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/console-control-strings/-/console-control-strings-1.1.0.tgz",
      "integrity": "sha512-ty/fTekppD2fIwRvnZAVdeOiGd1c7YXEixbgJTNzqcxJWKQnjJ/V1bNEEE6hygpM3WjwHFUVK6HTjWSzV4a8sQ==",
      "optional": true
    },
    "node_modules/content-disposition": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-1.0.0.tgz",
      "integrity": "sha512-Au9nRL8VNUut/XSzbQA38+M78dzP4D+eqg3gfJHMIHHYa3bg067xj1KxMUWj+VULbiZMowKngFFbKczUrNJ1mg==",
      "dependencies": {
        "safe-buffer": "5.2.1"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/content-type": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-1.0.5.tgz",
      "integrity": "sha512-nTjqfcBFEipKdXCv4YDQWCfmcLZKm81ldF0pAopTvyrFGVbcR6P/VAAd5G7N+0tTr8QqiU0tFadD6FK4NtJwOA==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie-parser": {
      "version": "1.4.7",
      "resolved": "https://registry.npmjs.org/cookie-parser/-/cookie-parser-1.4.7.tgz",
      "integrity": "sha512-nGUvgXnotP3BsjiLX2ypbQnWoGUPIIfHQNZkkC668ntrzGWEZVW70HDEB1qnNGMicPje6EttlIgzo51YSwNQGw==",
      "license": "MIT",
      "dependencies": {
        "cookie": "0.7.2",
        "cookie-signature": "1.0.6"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/cookie-parser/node_modules/cookie-signature": {
      "version": "1.0.6",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.0.6.tgz",
      "integrity": "sha512-QADzlaHc8icV8I7vbaJXJwod9HWYp8uCqf1xa4OfNu1T7JVxQIrUgOWtHdNDtPiywmFbiS12VjotIXLrKM3orQ==",
      "license": "MIT"
    },
    "node_modules/cookie-signature": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.2.2.tgz",
      "integrity": "sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==",
      "engines": {
        "node": ">=6.6.0"
      }
    },
    "node_modules/cors": {
      "version": "2.8.5",
      "resolved": "https://registry.npmjs.org/cors/-/cors-2.8.5.tgz",
      "integrity": "sha512-KIHbLJqu73RGr/hnbrO9uBeixNGuvSQjul/jdFvS/KFSIH1hWVd1ng7zOHx+YrEfInLG7q4n6GHQ9cDtxv/P6g==",
      "dependencies": {
        "object-assign": "^4",
        "vary": "^1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/debug": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.1.tgz",
      "integrity": "sha512-KcKCqiftBJcZr++7ykoDIEwSa3XWowTfNPo92BYxjXiyYEVrUQh2aLyhxBCwww+heortUFxEJYcRzosstTEBYQ==",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/decompress-response": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/decompress-response/-/decompress-response-6.0.0.tgz",
      "integrity": "sha512-aW35yZM6Bb/4oJlZncMH2LCoZtJXTRxES17vE3hoRiowU2kWHaJKFkSBDnDR+cm9J+9QhXmREyIfv0pji9ejCQ==",
      "dependencies": {
        "mimic-response": "^3.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/deep-extend": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/deep-extend/-/deep-extend-0.6.0.tgz",
      "integrity": "sha512-LOHxIOaPYdHlJRtCQfDIVZtfw/ufM8+rVj649RIHzcm/vGwQRXFt6OPqIFWsm2XEMrNIEtWR64sY1LEKD2vAOA==",
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/delegates": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/delegates/-/delegates-1.0.0.tgz",
      "integrity": "sha512-bd2L678uiWATM6m5Z1VzNCErI3jiGzt6HGY8OVICs40JQq/HALfbyNJmp0UDakEY4pMMaN0Ly5om/B1VI/+xfQ==",
      "optional": true
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.0.4.tgz",
      "integrity": "sha512-3UDv+G9CsCKO1WKMGw9fwq/SWJYbI0c5Y7LU1AXYoDdbhE2AHQ6N6Nb34sG8Fj7T5APy8qXDCKuuIHd1BR0tVA==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/dotenv": {
      "version": "17.2.1",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-17.2.1.tgz",
      "integrity": "sha512-kQhDYKZecqnM0fCnzI5eIv5L4cAe/iRI+HqMbO/hbRdTAeXDG+M9FjipUxNfbARuEg4iHIbhnhs78BCHNbSxEQ==",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ecdsa-sig-formatter": {
      "version": "1.0.11",
      "resolved": "https://registry.npmjs.org/ecdsa-sig-formatter/-/ecdsa-sig-formatter-1.0.11.tgz",
      "integrity": "sha512-nagl3RYrbNv6kQkeJIpt6NJZy8twLB/2vtz6yN9Z4vRKHN4/QZJIEbqohALSgwKdnksuY3k5Addp5lg8sVoVcQ==",
      "dependencies": {
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow=="
    },
    "node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "optional": true
    },
    "node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/encoding": {
      "version": "0.1.13",
      "resolved": "https://registry.npmjs.org/encoding/-/encoding-0.1.13.tgz",
      "integrity": "sha512-ETBauow1T35Y/WZMkio9jiM0Z5xjHHmJ4XmjZOq1l/dXz3lr2sRn87nJy20RupqSh1F2m3HHPSp8ShIPQJrJ3A==",
      "optional": true,
      "dependencies": {
        "iconv-lite": "^0.6.2"
      }
    },
    "node_modules/end-of-stream": {
      "version": "1.4.5",
      "resolved": "https://registry.npmjs.org/end-of-stream/-/end-of-stream-1.4.5.tgz",
      "integrity": "sha512-ooEGc6HP26xXq/N+GCGOT0JKCLDGrq2bQUZrQ7gyrJiZANJ/8YDTxTpQBXGMn+WbIQXNVpyWymm7KYVICQnyOg==",
      "dependencies": {
        "once": "^1.4.0"
      }
    },
    "node_modules/env-paths": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/env-paths/-/env-paths-2.2.1.tgz",
      "integrity": "sha512-+h1lkLKhZMTYjog1VEpJNG7NZJWcuc2DDk/qsqSTRRCOXiLjeQ1d1/udrUGhqMxUgAlwKNZ0cf2uqan5GLuS2A==",
      "optional": true,
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/err-code": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/err-code/-/err-code-2.0.3.tgz",
      "integrity": "sha512-2bmlRpNKBxT/CRmPOlyISQpNj+qSeYvcym/uT0Jx2bMOlKLtSy1ZmLuVxSEKKyor/N5yhvp/ZiG1oE3DEYMSFA==",
      "optional": true
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.1.tgz",
      "integrity": "sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow=="
    },
    "node_modules/esm": {
      "version": "3.2.25",
      "resolved": "https://registry.npmjs.org/esm/-/esm-3.2.25.tgz",
      "integrity": "sha512-U1suiZ2oDVWv4zPO56S0NcR5QriEahGtdN2OR6FiOG4WJvcjBVFB0qI4+eKoWFH483PKGuLuu6V8Z4T5g63UVA==",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/expand-template": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/expand-template/-/expand-template-2.0.3.tgz",
      "integrity": "sha512-XYfuKMvj4O35f/pOXLObndIRvyQ+/+6AhODh+OKWj9S9498pHHn/IMszH+gt0fBCRWMNfk1ZSp5x3AifmnI2vg==",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/express": {
      "version": "5.1.0",
      "resolved": "https://registry.npmjs.org/express/-/express-5.1.0.tgz",
      "integrity": "sha512-DT9ck5YIRU+8GYzzU5kT3eHGA5iL+1Zd0EutOmTE9Dtk+Tvuzd23VBU+ec7HPNSTxXYO55gPV/hq4pSBJDjFpA==",
      "dependencies": {
        "accepts": "^2.0.0",
        "body-parser": "^2.2.0",
        "content-disposition": "^1.0.0",
        "content-type": "^1.0.5",
        "cookie": "^0.7.1",
        "cookie-signature": "^1.2.1",
        "debug": "^4.4.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "finalhandler": "^2.1.0",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.0",
        "merge-descriptors": "^2.0.0",
        "mime-types": "^3.0.0",
        "on-finished": "^2.4.1",
        "once": "^1.4.0",
        "parseurl": "^1.3.3",
        "proxy-addr": "^2.0.7",
        "qs": "^6.14.0",
        "range-parser": "^1.2.1",
        "router": "^2.2.0",
        "send": "^1.1.0",
        "serve-static": "^2.2.0",
        "statuses": "^2.0.1",
        "type-is": "^2.0.1",
        "vary": "^1.1.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express-rate-limit": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/express-rate-limit/-/express-rate-limit-8.0.1.tgz",
      "integrity": "sha512-aZVCnybn7TVmxO4BtlmnvX+nuz8qHW124KKJ8dumsBsmv5ZLxE0pYu7S2nwyRBGHHCAzdmnGyrc5U/rksSPO7Q==",
      "dependencies": {
        "ip-address": "10.0.1"
      },
      "engines": {
        "node": ">= 16"
      },
      "funding": {
        "url": "https://github.com/sponsors/express-rate-limit"
      },
      "peerDependencies": {
        "express": ">= 4.11"
      }
    },
    "node_modules/file-uri-to-path": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/file-uri-to-path/-/file-uri-to-path-1.0.0.tgz",
      "integrity": "sha512-0Zt+s3L7Vf1biwWZ29aARiVYLx7iMGnEUl9x33fbB/j3jR81u/O2LbqK+Bm1CDSNDKVtJ/YjwY7TUd5SkeLQLw=="
    },
    "node_modules/finalhandler": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-2.1.0.tgz",
      "integrity": "sha512-/t88Ty3d5JWQbWYgaOGCCYfXRwV1+be02WqYYlL6h0lEiUAMPM8o8qKGO01YIkOHzka2up08wvgYD0mDiI+q3Q==",
      "dependencies": {
        "debug": "^4.4.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "on-finished": "^2.4.1",
        "parseurl": "^1.3.3",
        "statuses": "^2.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fresh": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-2.0.0.tgz",
      "integrity": "sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/fs-constants": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/fs-constants/-/fs-constants-1.0.0.tgz",
      "integrity": "sha512-y6OAwoSIf7FyjMIv94u+b5rdheZEjzR63GTyZJm5qh4Bi+2YgwLCcI/fPFZkL5PSixOt6ZNKm+w+Hfp/Bciwow=="
    },
    "node_modules/fs-minipass": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fs-minipass/-/fs-minipass-2.1.0.tgz",
      "integrity": "sha512-V/JgOLFCS+R6Vcq0slCuaeWEdNC3ouDlJMNIsacH2VtALiu9mV4LPrHc5cDl8k5aw6J8jwgWWpiTo5RYhmIzvg==",
      "dependencies": {
        "minipass": "^3.0.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/fs.realpath": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/fs.realpath/-/fs.realpath-1.0.0.tgz",
      "integrity": "sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw==",
      "optional": true
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/gauge": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/gauge/-/gauge-4.0.4.tgz",
      "integrity": "sha512-f9m+BEN5jkg6a0fZjleidjN51VE1X+mPFQ2DJ0uv1V39oCLCbsGe6yjbBnp7eK7z/+GAon99a3nHuqbuuthyPg==",
      "deprecated": "This package is no longer supported.",
      "optional": true,
      "dependencies": {
        "aproba": "^1.0.3 || ^2.0.0",
        "color-support": "^1.1.3",
        "console-control-strings": "^1.1.0",
        "has-unicode": "^2.0.1",
        "signal-exit": "^3.0.7",
        "string-width": "^4.2.3",
        "strip-ansi": "^6.0.1",
        "wide-align": "^1.1.5"
      },
      "engines": {
        "node": "^12.13.0 || ^14.15.0 || >=16.0.0"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-package-type": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/get-package-type/-/get-package-type-0.1.0.tgz",
      "integrity": "sha512-pjzuKtY64GYfWizNAJ0fr9VqttZkNiK2iS430LtIHzjBEr6bX8Am2zm4sW4Ro5wjWW5cAlRL1qAMTcXbjNAO2Q==",
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/getopts": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/getopts/-/getopts-2.3.0.tgz",
      "integrity": "sha512-5eDf9fuSXwxBL6q5HX+dhDj+dslFGWzU5thZ9kNKUkcPtaPdatmUFKwHFrLb/uf/WpA4BHET+AX3Scl56cAjpA=="
    },
    "node_modules/github-from-package": {
      "version": "0.0.0",
      "resolved": "https://registry.npmjs.org/github-from-package/-/github-from-package-0.0.0.tgz",
      "integrity": "sha512-SyHy3T1v2NUXn29OsWdxmK6RwHD+vkj3v8en8AOBZ1wBQ/hCAQ5bAQTD02kW4W9tUp/3Qh6J8r9EvntiyCmOOw=="
    },
    "node_modules/glob": {
      "version": "7.2.3",
      "resolved": "https://registry.npmjs.org/glob/-/glob-7.2.3.tgz",
      "integrity": "sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q==",
      "deprecated": "Glob versions prior to v9 are no longer supported",
      "optional": true,
      "dependencies": {
        "fs.realpath": "^1.0.0",
        "inflight": "^1.0.4",
        "inherits": "2",
        "minimatch": "^3.1.1",
        "once": "^1.3.0",
        "path-is-absolute": "^1.0.0"
      },
      "engines": {
        "node": "*"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "optional": true
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-unicode": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/has-unicode/-/has-unicode-2.0.1.tgz",
      "integrity": "sha512-8Rf9Y83NBReMnx0gFzA8JImQACstCYWUplepDa9xprwwtmgEZUF0h/i5xSA625zB/I37EtrswSST6OXxwaaIJQ==",
      "optional": true
    },
    "node_modules/hasown": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.2.tgz",
      "integrity": "sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/helmet": {
      "version": "8.1.0",
      "resolved": "https://registry.npmjs.org/helmet/-/helmet-8.1.0.tgz",
      "integrity": "sha512-jOiHyAZsmnr8LqoPGmCjYAaiuWwjAPLgY8ZX2XrmHawt99/u1y6RgrZMTeoPfpUbV96HOalYgz1qzkRbw54Pmg==",
      "engines": {
        "node": ">=18.0.0"
      }
    },
    "node_modules/http-cache-semantics": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/http-cache-semantics/-/http-cache-semantics-4.2.0.tgz",
      "integrity": "sha512-dTxcvPXqPvXBQpq5dUr6mEMJX4oIEFv6bwom3FDwKRDsuIjjJGANqhBuoAn9c1RQJIdAKav33ED65E2ys+87QQ==",
      "optional": true
    },
    "node_modules/http-errors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.0.tgz",
      "integrity": "sha512-FtwrG/euBzaEjYeRqOgly7G0qviiXoJWnvEH2Z1plBdXgbyjv34pHTSb9zoeHMyDy33+DWy5Wt9Wo+TURtOYSQ==",
      "dependencies": {
        "depd": "2.0.0",
        "inherits": "2.0.4",
        "setprototypeof": "1.2.0",
        "statuses": "2.0.1",
        "toidentifier": "1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/http-errors/node_modules/statuses": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.1.tgz",
      "integrity": "sha512-RwNA9Z/7PrK06rYLIzFMlaF+l73iwpzsqRIFgbMLbTcLD6cOao82TaWefPXQvB2fOC4AjuYSEndS7N/mTCbkdQ==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/http-proxy-agent": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/http-proxy-agent/-/http-proxy-agent-4.0.1.tgz",
      "integrity": "sha512-k0zdNgqWTGA6aeIRVpvfVob4fL52dTfaehylg0Y4UvSySvOq/Y+BOyPrgpUrA7HylqvU8vIZGsRuXmspskV0Tg==",
      "optional": true,
      "dependencies": {
        "@tootallnate/once": "1",
        "agent-base": "6",
        "debug": "4"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/https-proxy-agent": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-5.0.1.tgz",
      "integrity": "sha512-dFcAjpTQFgoLMzC2VwU+C/CbS7uRL0lWmxDITmqm7C+7F0Odmj6s9l6alZc6AELXhrnggM2CeWSXHGOdX2YtwA==",
      "optional": true,
      "dependencies": {
        "agent-base": "6",
        "debug": "4"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/humanize-ms": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/humanize-ms/-/humanize-ms-1.2.1.tgz",
      "integrity": "sha512-Fl70vYtsAFb/C06PTS9dZBo7ihau+Tu/DNCk/OyHhea07S+aeMWpFFkUaXRa8fI+ScZbEI8dfSxwY7gxZ9SAVQ==",
      "optional": true,
      "dependencies": {
        "ms": "^2.0.0"
      }
    },
    "node_modules/iconv-lite": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.6.3.tgz",
      "integrity": "sha512-4fCk79wshMdzMp2rH06qWrJE4iolqLhCUH+OiuIgU++RB0+94NlDL81atO7GX55uUKueo0txHNtvEyI6D7WdMw==",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/ieee754": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/ieee754/-/ieee754-1.2.1.tgz",
      "integrity": "sha512-dcyqhDvX1C46lXZcVqCpK+FtMRQVdIMN6/Df5js2zouUsqG7I6sFxitIC+7KYK29KdXOLHdu9zL4sFnoVQnqaA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ]
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "optional": true,
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/indent-string": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/indent-string/-/indent-string-4.0.0.tgz",
      "integrity": "sha512-EdDDZu4A2OyIK7Lr/2zG+w5jmbuk1DVBnEwREQvBzspBJkCEbRa8GxU1lghYcaGJCnRWibjDXlq779X1/y5xwg==",
      "optional": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/infer-owner": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/infer-owner/-/infer-owner-1.0.4.tgz",
      "integrity": "sha512-IClj+Xz94+d7irH5qRyfJonOdfTzuDaifE6ZPWfx0N0+/ATZCbuTPq2prFl526urkQd90WyUKIh1DfBQ2hMz9A==",
      "optional": true
    },
    "node_modules/inflight": {
      "version": "1.0.6",
      "resolved": "https://registry.npmjs.org/inflight/-/inflight-1.0.6.tgz",
      "integrity": "sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA==",
      "deprecated": "This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.",
      "optional": true,
      "dependencies": {
        "once": "^1.3.0",
        "wrappy": "1"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ=="
    },
    "node_modules/ini": {
      "version": "1.3.8",
      "resolved": "https://registry.npmjs.org/ini/-/ini-1.3.8.tgz",
      "integrity": "sha512-JV/yugV2uzW5iMRSiZAyDtQd+nxtUnjeLt0acNdw98kKLrvuRVyB80tsREOE7yvGVgalhZ6RNXCmEHkUKBKxew=="
    },
    "node_modules/interpret": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/interpret/-/interpret-2.2.0.tgz",
      "integrity": "sha512-Ju0Bz/cEia55xDwUWEa8+olFpCiQoypjnQySseKtmjNrnps3P+xfpUmGr90T7yjlVJmOtybRvPXhKMbHr+fWnw==",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/ip-address": {
      "version": "10.0.1",
      "resolved": "https://registry.npmjs.org/ip-address/-/ip-address-10.0.1.tgz",
      "integrity": "sha512-NWv9YLW4PoW2B7xtzaS3NCot75m6nK7Icdv0o3lfMceJVRfSoQwqD4wEH5rLwoKJwUiZ/rfpiVBhnaF0FK4HoA==",
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.16.1",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.16.1.tgz",
      "integrity": "sha512-UfoeMA6fIJ8wTYFEUjelnaGI67v6+N7qXJEvQuIGa99l4xsCruSYOVSQ0uPANn4dAzm8lkYPaKLrrijLq7x23w==",
      "dependencies": {
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "optional": true,
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-lambda": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/is-lambda/-/is-lambda-1.0.1.tgz",
      "integrity": "sha512-z7CMFGNrENq5iFB9Bqo64Xk6Y9sg+epq1myIcdHaGnbMTYOxvzsEtdYqQUylB7LxfkvgrrjP32T6Ywciio9UIQ==",
      "optional": true
    },
    "node_modules/is-promise": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/is-promise/-/is-promise-4.0.0.tgz",
      "integrity": "sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ=="
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "optional": true
    },
    "node_modules/joi": {
      "version": "18.0.0",
      "resolved": "https://registry.npmjs.org/joi/-/joi-18.0.0.tgz",
      "integrity": "sha512-fpbpXN/TD04Xz1/cCXzUR3ghDkhyiHjbzTILx3wNyKXIzQJ55uYAkUGWwhX72uHge/6MdFA/kp1ZUh35DlYmaA==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "@hapi/address": "^5.1.1",
        "@hapi/formula": "^3.0.2",
        "@hapi/hoek": "^11.0.7",
        "@hapi/pinpoint": "^2.0.1",
        "@hapi/tlds": "^1.1.1",
        "@hapi/topo": "^6.0.2",
        "@standard-schema/spec": "^1.0.0"
      },
      "engines": {
        "node": ">= 20"
      }
    },
    "node_modules/jsbn": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/jsbn/-/jsbn-1.1.0.tgz",
      "integrity": "sha512-4bYVV3aAMtDTTu4+xsDYa6sy9GyJ69/amsu9sYF2zqjiEoZA5xJi3BrfX3uY+/IekIu7MwdObdbDWpoZdBv3/A==",
      "optional": true
    },
    "node_modules/jsonwebtoken": {
      "version": "9.0.2",
      "resolved": "https://registry.npmjs.org/jsonwebtoken/-/jsonwebtoken-9.0.2.tgz",
      "integrity": "sha512-PRp66vJ865SSqOlgqS8hujT5U4AOgMfhrwYIuIhfKaoSCZcirrmASQr8CX7cUg+RMih+hgznrjp99o+W4pJLHQ==",
      "dependencies": {
        "jws": "^3.2.2",
        "lodash.includes": "^4.3.0",
        "lodash.isboolean": "^3.0.3",
        "lodash.isinteger": "^4.0.4",
        "lodash.isnumber": "^3.0.3",
        "lodash.isplainobject": "^4.0.6",
        "lodash.isstring": "^4.0.1",
        "lodash.once": "^4.0.0",
        "ms": "^2.1.1",
        "semver": "^7.5.4"
      },
      "engines": {
        "node": ">=12",
        "npm": ">=6"
      }
    },
    "node_modules/jwa": {
      "version": "1.4.2",
      "resolved": "https://registry.npmjs.org/jwa/-/jwa-1.4.2.tgz",
      "integrity": "sha512-eeH5JO+21J78qMvTIDdBXidBd6nG2kZjg5Ohz/1fpa28Z4CcsWUzJ1ZZyFq/3z3N17aZy+ZuBoHljASbL1WfOw==",
      "dependencies": {
        "buffer-equal-constant-time": "^1.0.1",
        "ecdsa-sig-formatter": "1.0.11",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/jws": {
      "version": "3.2.2",
      "resolved": "https://registry.npmjs.org/jws/-/jws-3.2.2.tgz",
      "integrity": "sha512-YHlZCB6lMTllWDtSPHz/ZXTsi8S00usEV6v1tjq8tOUZzw7DpSDWVXjXDre6ed1w/pd495ODpHZYSdkRTsa0HA==",
      "dependencies": {
        "jwa": "^1.4.1",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/knex": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/knex/-/knex-3.1.0.tgz",
      "integrity": "sha512-GLoII6hR0c4ti243gMs5/1Rb3B+AjwMOfjYm97pu0FOQa7JH56hgBxYf5WK2525ceSbBY1cjeZ9yk99GPMB6Kw==",
      "dependencies": {
        "colorette": "2.0.19",
        "commander": "^10.0.0",
        "debug": "4.3.4",
        "escalade": "^3.1.1",
        "esm": "^3.2.25",
        "get-package-type": "^0.1.0",
        "getopts": "2.3.0",
        "interpret": "^2.2.0",
        "lodash": "^4.17.21",
        "pg-connection-string": "2.6.2",
        "rechoir": "^0.8.0",
        "resolve-from": "^5.0.0",
        "tarn": "^3.0.2",
        "tildify": "2.0.0"
      },
      "bin": {
        "knex": "bin/cli.js"
      },
      "engines": {
        "node": ">=16"
      },
      "peerDependenciesMeta": {
        "better-sqlite3": {
          "optional": true
        },
        "mysql": {
          "optional": true
        },
        "mysql2": {
          "optional": true
        },
        "pg": {
          "optional": true
        },
        "pg-native": {
          "optional": true
        },
        "sqlite3": {
          "optional": true
        },
        "tedious": {
          "optional": true
        }
      }
    },
    "node_modules/knex/node_modules/debug": {
      "version": "4.3.4",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.3.4.tgz",
      "integrity": "sha512-PRWFHuSU3eDtQJPvnNY7Jcket1j0t5OuOsFzPPzsekD52Zl8qUfFIPEiswXqIvHWGVHOgX+7G/vCNNhehwxfkQ==",
      "dependencies": {
        "ms": "2.1.2"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/knex/node_modules/ms": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.2.tgz",
      "integrity": "sha512-sGkPx+VjMtmA6MX27oA4FBFELFCZZ4S4XqeGOXCv68tT+jb3vk/RyaKWP0PTKyWtmLSM0b+adUTEvbs1PEaH2w=="
    },
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg=="
    },
    "node_modules/lodash.includes": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/lodash.includes/-/lodash.includes-4.3.0.tgz",
      "integrity": "sha512-W3Bx6mdkRTGtlJISOvVD/lbqjTlPPUDTMnlXZFnVwi9NKJ6tiAk6LVdlhZMm17VZisqhKcgzpO5Wz91PCt5b0w=="
    },
    "node_modules/lodash.isboolean": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/lodash.isboolean/-/lodash.isboolean-3.0.3.tgz",
      "integrity": "sha512-Bz5mupy2SVbPHURB98VAcw+aHh4vRV5IPNhILUCsOzRmsTmSQ17jIuqopAentWoehktxGd9e/hbIXq980/1QJg=="
    },
    "node_modules/lodash.isinteger": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/lodash.isinteger/-/lodash.isinteger-4.0.4.tgz",
      "integrity": "sha512-DBwtEWN2caHQ9/imiNeEA5ys1JoRtRfY3d7V9wkqtbycnAmTvRRmbHKDV4a0EYc678/dia0jrte4tjYwVBaZUA=="
    },
    "node_modules/lodash.isnumber": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/lodash.isnumber/-/lodash.isnumber-3.0.3.tgz",
      "integrity": "sha512-QYqzpfwO3/CWf3XP+Z+tkQsfaLL/EnUlXWVkIk5FUPc4sBdTehEqZONuyRt2P67PXAk+NXmTBcc97zw9t1FQrw=="
    },
    "node_modules/lodash.isplainobject": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/lodash.isplainobject/-/lodash.isplainobject-4.0.6.tgz",
      "integrity": "sha512-oSXzaWypCMHkPC3NvBEaPHf0KsA5mvPrOPgQWDsbg8n7orZ290M0BmC/jgRZ4vcJ6DTAhjrsSYgdsW/F+MFOBA=="
    },
    "node_modules/lodash.isstring": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/lodash.isstring/-/lodash.isstring-4.0.1.tgz",
      "integrity": "sha512-0wJxfxH1wgO3GrbuP+dTTk7op+6L41QCXbGINEmD+ny/G/eCqGzxyCsh7159S+mgDDcoarnBw6PC1PS5+wUGgw=="
    },
    "node_modules/lodash.once": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/lodash.once/-/lodash.once-4.1.1.tgz",
      "integrity": "sha512-Sb487aTOCr9drQVL8pIxOzVhafOjZN9UU54hiN8PU3uAiSV7lx1yYNpbNmex2PK6dSJoNTSJUUswT651yww3Mg=="
    },
    "node_modules/lru-cache": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-6.0.0.tgz",
      "integrity": "sha512-Jo6dJ04CmSjuznwJSS3pUeWmd/H0ffTlkXXgwZi+eq1UCmqQwCh+eLsYOYCwY991i2Fah4h1BEMCx4qThGbsiA==",
      "optional": true,
      "dependencies": {
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/make-fetch-happen": {
      "version": "9.1.0",
      "resolved": "https://registry.npmjs.org/make-fetch-happen/-/make-fetch-happen-9.1.0.tgz",
      "integrity": "sha512-+zopwDy7DNknmwPQplem5lAZX/eCOzSvSNNcSKm5eVwTkOBzoktEfXsa9L23J/GIRhxRsaxzkPEhrJEpE2F4Gg==",
      "optional": true,
      "dependencies": {
        "agentkeepalive": "^4.1.3",
        "cacache": "^15.2.0",
        "http-cache-semantics": "^4.1.0",
        "http-proxy-agent": "^4.0.1",
        "https-proxy-agent": "^5.0.0",
        "is-lambda": "^1.0.1",
        "lru-cache": "^6.0.0",
        "minipass": "^3.1.3",
        "minipass-collect": "^1.0.2",
        "minipass-fetch": "^1.3.2",
        "minipass-flush": "^1.0.5",
        "minipass-pipeline": "^1.2.4",
        "negotiator": "^0.6.2",
        "promise-retry": "^2.0.1",
        "socks-proxy-agent": "^6.0.0",
        "ssri": "^8.0.0"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/make-fetch-happen/node_modules/negotiator": {
      "version": "0.6.4",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.4.tgz",
      "integrity": "sha512-myRT3DiWPHqho5PrJaIRyaMv2kgYf0mUVgBNOYMuCH5Ki1yEiQaf/ZJuQ62nvpc44wL5WDbTX7yGJi1Neevw8w==",
      "optional": true,
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-1.1.0.tgz",
      "integrity": "sha512-aisnrDP4GNe06UcKFnV5bfMNPBUw4jsLGaWwWfnH3v02GnBuXX2MCVn5RbrWo0j3pczUilYblq7fQ7Nw2t5XKw==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/merge-descriptors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-2.0.0.tgz",
      "integrity": "sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/mime-db": {
      "version": "1.54.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.54.0.tgz",
      "integrity": "sha512-aU5EJuIN2WDemCcAp2vFBfp/m4EAhWJnUNSSw0ixs7/kXbd6Pg64EmwJkNdFhB8aWt1sH2CTXrLxo/iAGV3oPQ==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-3.0.1.tgz",
      "integrity": "sha512-xRc4oEhT6eaBpU1XF7AjpOFD+xQmXNB5OVKwp4tqCuBpHLS/ZbBDrc07mYTDqVMg6PfxUjjNp85O6Cd2Z/5HWA==",
      "dependencies": {
        "mime-db": "^1.54.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mimic-response": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/mimic-response/-/mimic-response-3.1.0.tgz",
      "integrity": "sha512-z0yWI+4FDrrweS8Zmt4Ej5HdJmky15+L2e6Wgn3+iK5fWzb6T3fhNFq2+MeTRb064c6Wr4N/wv0DzQTjNzHNGQ==",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "optional": true,
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/minipass": {
      "version": "3.3.6",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-3.3.6.tgz",
      "integrity": "sha512-DxiNidxSEK+tHG6zOIklvNOwm3hvCrbUrdtzY74U6HKTJxvIDfOUL5W5P2Ghd3DTkhhKPYGqeNUIh5qcM4YBfw==",
      "dependencies": {
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/minipass-collect": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/minipass-collect/-/minipass-collect-1.0.2.tgz",
      "integrity": "sha512-6T6lH0H8OG9kITm/Jm6tdooIbogG9e0tLgpY6mphXSm/A9u8Nq1ryBG+Qspiub9LjWlBPsPS3tWQ/Botq4FdxA==",
      "optional": true,
      "dependencies": {
        "minipass": "^3.0.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/minipass-fetch": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/minipass-fetch/-/minipass-fetch-1.4.1.tgz",
      "integrity": "sha512-CGH1eblLq26Y15+Azk7ey4xh0J/XfJfrCox5LDJiKqI2Q2iwOLOKrlmIaODiSQS8d18jalF6y2K2ePUm0CmShw==",
      "optional": true,
      "dependencies": {
        "minipass": "^3.1.0",
        "minipass-sized": "^1.0.3",
        "minizlib": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      },
      "optionalDependencies": {
        "encoding": "^0.1.12"
      }
    },
    "node_modules/minipass-flush": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/minipass-flush/-/minipass-flush-1.0.5.tgz",
      "integrity": "sha512-JmQSYYpPUqX5Jyn1mXaRwOda1uQ8HP5KAT/oDSLCzt1BYRhQU0/hDtsB1ufZfEEzMZ9aAVmsBw8+FWsIXlClWw==",
      "optional": true,
      "dependencies": {
        "minipass": "^3.0.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/minipass-pipeline": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/minipass-pipeline/-/minipass-pipeline-1.2.4.tgz",
      "integrity": "sha512-xuIq7cIOt09RPRJ19gdi4b+RiNvDFYe5JH+ggNvBqGqpQXcru3PcRmOZuHBKWK1Txf9+cQ+HMVN4d6z46LZP7A==",
      "optional": true,
      "dependencies": {
        "minipass": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/minipass-sized": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/minipass-sized/-/minipass-sized-1.0.3.tgz",
      "integrity": "sha512-MbkQQ2CTiBMlA2Dm/5cY+9SWFEN8pzzOXi6rlM5Xxq0Yqbda5ZQy9sU75a673FE9ZK0Zsbr6Y5iP6u9nktfg2g==",
      "optional": true,
      "dependencies": {
        "minipass": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/minizlib": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/minizlib/-/minizlib-2.1.2.tgz",
      "integrity": "sha512-bAxsR8BVfj60DWXHE3u30oHzfl4G7khkSuPW+qvpd7jFRHm7dLxOjUk1EHACJ/hxLY8phGJ0YhYHZo7jil7Qdg==",
      "dependencies": {
        "minipass": "^3.0.0",
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/mkdirp": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/mkdirp/-/mkdirp-1.0.4.tgz",
      "integrity": "sha512-vVqVZQyf3WLx2Shd0qJ9xuvqgAyKPLAiqITEtqW0oIUjzo3PePDd6fW9iFz30ef7Ysp/oiWqbhszeGWW2T6Gzw==",
      "bin": {
        "mkdirp": "bin/cmd.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/mkdirp-classic": {
      "version": "0.5.3",
      "resolved": "https://registry.npmjs.org/mkdirp-classic/-/mkdirp-classic-0.5.3.tgz",
      "integrity": "sha512-gKLcREMhtuZRwRAfqP3RFW+TK4JqApVBtOIftVgjuABpAtpxhPGaDcfvbhNvD0B8iD1oUr/txX35NjcaY6Ns/A=="
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA=="
    },
    "node_modules/napi-build-utils": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/napi-build-utils/-/napi-build-utils-2.0.0.tgz",
      "integrity": "sha512-GEbrYkbfF7MoNaoh2iGG84Mnf/WZfB0GdGEsM8wz7Expx/LlWf5U8t9nvJKXSp3qr5IsEbK04cBGhol/KwOsWA=="
    },
    "node_modules/negotiator": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-1.0.0.tgz",
      "integrity": "sha512-8Ofs/AUQh8MaEcrlq5xOX0CQ9ypTF5dl78mjlMNfOK08fzpgTHQRQPBxcPlEtIw0yRpws+Zo/3r+5WRby7u3Gg==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/node-abi": {
      "version": "3.75.0",
      "resolved": "https://registry.npmjs.org/node-abi/-/node-abi-3.75.0.tgz",
      "integrity": "sha512-OhYaY5sDsIka7H7AtijtI9jwGYLyl29eQn/W623DiN/MIv5sUqc4g7BIDThX+gb7di9f6xK02nkp8sdfFWZLTg==",
      "dependencies": {
        "semver": "^7.3.5"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/node-addon-api": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/node-addon-api/-/node-addon-api-7.1.1.tgz",
      "integrity": "sha512-5m3bsyrjFWE1xf7nz7YXdN4udnVtXK6/Yfgn5qnahL6bCkf2yKt4k3nuTKAtT4r3IG8JNR2ncsIMdZuAzJjHQQ=="
    },
    "node_modules/node-gyp": {
      "version": "8.4.1",
      "resolved": "https://registry.npmjs.org/node-gyp/-/node-gyp-8.4.1.tgz",
      "integrity": "sha512-olTJRgUtAb/hOXG0E93wZDs5YiJlgbXxTwQAFHyNlRsXQnYzUaF2aGgujZbw+hR8aF4ZG/rST57bWMWD16jr9w==",
      "optional": true,
      "dependencies": {
        "env-paths": "^2.2.0",
        "glob": "^7.1.4",
        "graceful-fs": "^4.2.6",
        "make-fetch-happen": "^9.1.0",
        "nopt": "^5.0.0",
        "npmlog": "^6.0.0",
        "rimraf": "^3.0.2",
        "semver": "^7.3.5",
        "tar": "^6.1.2",
        "which": "^2.0.2"
      },
      "bin": {
        "node-gyp": "bin/node-gyp.js"
      },
      "engines": {
        "node": ">= 10.12.0"
      }
    },
    "node_modules/node-gyp-build": {
      "version": "4.8.4",
      "resolved": "https://registry.npmjs.org/node-gyp-build/-/node-gyp-build-4.8.4.tgz",
      "integrity": "sha512-LA4ZjwlnUblHVgq0oBF3Jl/6h/Nvs5fzBLwdEF4nuxnFdsfajde4WfxtJr3CaiH+F6ewcIB/q4jQ4UzPyid+CQ==",
      "license": "MIT",
      "bin": {
        "node-gyp-build": "bin.js",
        "node-gyp-build-optional": "optional.js",
        "node-gyp-build-test": "build-test.js"
      }
    },
    "node_modules/nopt": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/nopt/-/nopt-5.0.0.tgz",
      "integrity": "sha512-Tbj67rffqceeLpcRXrT7vKAN8CwfPeIBgM7E6iBkmKLV7bEMwpGgYLGv0jACUsECaa/vuxP0IjEont6umdMgtQ==",
      "optional": true,
      "dependencies": {
        "abbrev": "1"
      },
      "bin": {
        "nopt": "bin/nopt.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/npmlog": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/npmlog/-/npmlog-6.0.2.tgz",
      "integrity": "sha512-/vBvz5Jfr9dT/aFWd0FIRf+T/Q2WBsLENygUaFUqstqsycmZAP/t5BvFJTK0viFmSUxiUKTUplWy5vt+rvKIxg==",
      "deprecated": "This package is no longer supported.",
      "optional": true,
      "dependencies": {
        "are-we-there-yet": "^3.0.0",
        "console-control-strings": "^1.1.0",
        "gauge": "^4.0.3",
        "set-blocking": "^2.0.0"
      },
      "engines": {
        "node": "^12.13.0 || ^14.15.0 || >=16.0.0"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/on-finished": {
      "version": "2.4.1",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.1.tgz",
      "integrity": "sha512-oVlzkg3ENAhCk2zdv7IJwd/QUD4z2RxRwpkcGY8psCVcCYZNq4wYnVWALHM+brtuJjePWiYF/ClmuDr8Ch5+kg==",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/once": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/once/-/once-1.4.0.tgz",
      "integrity": "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/p-map": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/p-map/-/p-map-4.0.0.tgz",
      "integrity": "sha512-/bjOqmgETBYB5BoEeGVea8dmvHb2m9GLy1E9W43yeyfP6QQCZGFNa+XRceJEuDB6zqr+gKpIAmlLebMpykw/MQ==",
      "optional": true,
      "dependencies": {
        "aggregate-error": "^3.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parseurl": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz",
      "integrity": "sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/path-is-absolute": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/path-is-absolute/-/path-is-absolute-1.0.1.tgz",
      "integrity": "sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg==",
      "optional": true,
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw=="
    },
    "node_modules/path-to-regexp": {
      "version": "8.2.0",
      "resolved": "https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-8.2.0.tgz",
      "integrity": "sha512-TdrF7fW9Rphjq4RjrW0Kp2AW0Ahwu9sRGTkS6bvDi0SCwZlEZYmcfDbEsTz8RVk0EHIS/Vd1bv3JhG+1xZuAyQ==",
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/pg-connection-string": {
      "version": "2.6.2",
      "resolved": "https://registry.npmjs.org/pg-connection-string/-/pg-connection-string-2.6.2.tgz",
      "integrity": "sha512-ch6OwaeaPYcova4kKZ15sbJ2hKb/VP48ZD2gE7i1J+L4MspCtBMAx8nMgz7bksc7IojCIIWuEhHibSMFH8m8oA=="
    },
    "node_modules/prebuild-install": {
      "version": "7.1.3",
      "resolved": "https://registry.npmjs.org/prebuild-install/-/prebuild-install-7.1.3.tgz",
      "integrity": "sha512-8Mf2cbV7x1cXPUILADGI3wuhfqWvtiLA1iclTDbFRZkgRQS0NqsPZphna9V+HyTEadheuPmjaJMsbzKQFOzLug==",
      "dependencies": {
        "detect-libc": "^2.0.0",
        "expand-template": "^2.0.3",
        "github-from-package": "0.0.0",
        "minimist": "^1.2.3",
        "mkdirp-classic": "^0.5.3",
        "napi-build-utils": "^2.0.0",
        "node-abi": "^3.3.0",
        "pump": "^3.0.0",
        "rc": "^1.2.7",
        "simple-get": "^4.0.0",
        "tar-fs": "^2.0.0",
        "tunnel-agent": "^0.6.0"
      },
      "bin": {
        "prebuild-install": "bin.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/promise-inflight": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/promise-inflight/-/promise-inflight-1.0.1.tgz",
      "integrity": "sha512-6zWPyEOFaQBJYcGMHBKTKJ3u6TBsnMFOIZSa6ce1e/ZrrsOlnHRHbabMjLiBYKp+n44X9eUI6VUPaukCXHuG4g==",
      "optional": true
    },
    "node_modules/promise-retry": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/promise-retry/-/promise-retry-2.0.1.tgz",
      "integrity": "sha512-y+WKFlBR8BGXnsNlIHFGPZmyDf3DFMoLhaflAnyZgV6rG6xu+JwesTo2Q9R6XwYmtmwAFCkAk3e35jEdoeh/3g==",
      "optional": true,
      "dependencies": {
        "err-code": "^2.0.2",
        "retry": "^0.12.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/proxy-addr": {
      "version": "2.0.7",
      "resolved": "https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.7.tgz",
      "integrity": "sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==",
      "dependencies": {
        "forwarded": "0.2.0",
        "ipaddr.js": "1.9.1"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/pump": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/pump/-/pump-3.0.3.tgz",
      "integrity": "sha512-todwxLMY7/heScKmntwQG8CXVkWUOdYxIvY2s0VWAAMh/nd8SoYiRaKjlr7+iCs984f2P8zvrfWcDDYVb73NfA==",
      "dependencies": {
        "end-of-stream": "^1.1.0",
        "once": "^1.3.1"
      }
    },
    "node_modules/qs": {
      "version": "6.14.0",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.14.0.tgz",
      "integrity": "sha512-YWWTjgABSKcvs/nWBi9PycY/JiPJqOD4JA6o9Sej2AtvSGarXxKC3OQSk4pAarbdQlKAh5D4FCQkJNkW+GAn3w==",
      "dependencies": {
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/range-parser": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/range-parser/-/range-parser-1.2.1.tgz",
      "integrity": "sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/raw-body": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/raw-body/-/raw-body-3.0.0.tgz",
      "integrity": "sha512-RmkhL8CAyCRPXCE28MMH0z2PNWQBNk2Q09ZdxM9IOOXwxwZbN+qbWaatPkdkWIKL2ZVDImrN/pK5HTRz2PcS4g==",
      "dependencies": {
        "bytes": "3.1.2",
        "http-errors": "2.0.0",
        "iconv-lite": "0.6.3",
        "unpipe": "1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/rc": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/rc/-/rc-1.2.8.tgz",
      "integrity": "sha512-y3bGgqKj3QBdxLbLkomlohkvsA8gdAiUQlSBJnBhfn+BPxg4bc62d8TcBW15wavDfgexCgccckhcZvywyQYPOw==",
      "dependencies": {
        "deep-extend": "^0.6.0",
        "ini": "~1.3.0",
        "minimist": "^1.2.0",
        "strip-json-comments": "~2.0.1"
      },
      "bin": {
        "rc": "cli.js"
      }
    },
    "node_modules/readable-stream": {
      "version": "3.6.2",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-3.6.2.tgz",
      "integrity": "sha512-9u/sniCrY3D5WdsERHzHE4G2YCXqoG5FTHUiCC4SIbr6XcLZBY05ya9EKjYek9O5xOAwjGq+1JdGBAS7Q9ScoA==",
      "dependencies": {
        "inherits": "^2.0.3",
        "string_decoder": "^1.1.1",
        "util-deprecate": "^1.0.1"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/rechoir": {
      "version": "0.8.0",
      "resolved": "https://registry.npmjs.org/rechoir/-/rechoir-0.8.0.tgz",
      "integrity": "sha512-/vxpCXddiX8NGfGO/mTafwjq4aFa/71pvamip0++IQk3zG8cbCj0fifNPrjjF1XMXUne91jL9OoxmdykoEtifQ==",
      "dependencies": {
        "resolve": "^1.20.0"
      },
      "engines": {
        "node": ">= 10.13.0"
      }
    },
    "node_modules/resolve": {
      "version": "1.22.10",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-1.22.10.tgz",
      "integrity": "sha512-NPRy+/ncIMeDlTAsuqwKIiferiawhefFJtkNSW0qZJEqMEb+qBt/77B/jGeeek+F0uOeN05CDa6HXbbIgtVX4w==",
      "dependencies": {
        "is-core-module": "^2.16.0",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve-from": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-5.0.0.tgz",
      "integrity": "sha512-qYg9KP24dD5qka9J47d0aVky0N+b4fTU89LN9iDnjB5waksiC49rvMB0PrUJQGoTmH50XPiqOvAjDfaijGxYZw==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/retry": {
      "version": "0.12.0",
      "resolved": "https://registry.npmjs.org/retry/-/retry-0.12.0.tgz",
      "integrity": "sha512-9LkiTwjUh6rT555DtE9rTX+BKByPfrMzEAtnlEtdEwr3Nkffwiihqe2bWADg+OQRjt9gl6ICdmB/ZFDCGAtSow==",
      "optional": true,
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/rimraf": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/rimraf/-/rimraf-3.0.2.tgz",
      "integrity": "sha512-JZkJMZkAGFFPP2YqXZXPbMlMBgsxzE8ILs4lMIX/2o0L9UBw9O/Y3o6wFw/i9YLapcUJWwqbi3kdxIPdC62TIA==",
      "deprecated": "Rimraf versions prior to v4 are no longer supported",
      "optional": true,
      "dependencies": {
        "glob": "^7.1.3"
      },
      "bin": {
        "rimraf": "bin.js"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/router": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/router/-/router-2.2.0.tgz",
      "integrity": "sha512-nLTrUKm2UyiL7rlhapu/Zl45FwNgkZGaCpZbIHajDYgwlJCOzLSk+cIPAnsEqV955GjILJnKbdQC1nVPz+gAYQ==",
      "dependencies": {
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "is-promise": "^4.0.0",
        "parseurl": "^1.3.3",
        "path-to-regexp": "^8.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ]
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg=="
    },
    "node_modules/semver": {
      "version": "7.7.2",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.7.2.tgz",
      "integrity": "sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA==",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/send": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/send/-/send-1.2.0.tgz",
      "integrity": "sha512-uaW0WwXKpL9blXE2o0bRhoL2EGXIrZxQ2ZQ4mgcfoBxdFmQold+qWsD2jLrfZ0trjKL6vOw0j//eAwcALFjKSw==",
      "dependencies": {
        "debug": "^4.3.5",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.0",
        "mime-types": "^3.0.1",
        "ms": "^2.1.3",
        "on-finished": "^2.4.1",
        "range-parser": "^1.2.1",
        "statuses": "^2.0.1"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/serve-static": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-2.2.0.tgz",
      "integrity": "sha512-61g9pCh0Vnh7IutZjtLGGpTA355+OPn2TyDv/6ivP2h/AdAVX9azsoxmg2/M6nZeQZNYBEwIcsne1mJd9oQItQ==",
      "dependencies": {
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "parseurl": "^1.3.3",
        "send": "^1.2.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/set-blocking": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/set-blocking/-/set-blocking-2.0.0.tgz",
      "integrity": "sha512-KiKBS8AnWGEyLzofFfmvKwpdPzqiy16LvQfK3yv/fVH7Bj13/wl3JSR1J+rfgRE9q7xUJK4qvgS8raSOeLUehw==",
      "optional": true
    },
    "node_modules/setprototypeof": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/setprototypeof/-/setprototypeof-1.2.0.tgz",
      "integrity": "sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw=="
    },
    "node_modules/side-channel": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.0.tgz",
      "integrity": "sha512-ZX99e6tRweoUXqR+VBrslhda51Nh5MTQwou5tnUDgbtyM0dBgmhEDtWGP/xbKn6hqfPRHujUNwz5fy/wbbhnpw==",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3",
        "side-channel-list": "^1.0.0",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.0.tgz",
      "integrity": "sha512-FCLHtRD/gnpCiCHEiJLOwdmFP+wzCmDEkc9y7NsYxeF4u7Btsn1ZuwgwJGxImImHicJArLP4R0yX4c2KCrMrTA==",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/signal-exit": {
      "version": "3.0.7",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-3.0.7.tgz",
      "integrity": "sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==",
      "optional": true
    },
    "node_modules/simple-concat": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/simple-concat/-/simple-concat-1.0.1.tgz",
      "integrity": "sha512-cSFtAPtRhljv69IK0hTVZQ+OfE9nePi/rtJmw5UjHeVyVroEqJXP1sFztKUy1qU+xvz3u/sfYJLa947b7nAN2Q==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ]
    },
    "node_modules/simple-get": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/simple-get/-/simple-get-4.0.1.tgz",
      "integrity": "sha512-brv7p5WgH0jmQJr1ZDDfKDOSeWWg+OVypG99A/5vYGPqJ6pxiaHLy8nxtFjBA7oMa01ebA9gfh1uMCFqOuXxvA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "dependencies": {
        "decompress-response": "^6.0.0",
        "once": "^1.3.1",
        "simple-concat": "^1.0.0"
      }
    },
    "node_modules/smart-buffer": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/smart-buffer/-/smart-buffer-4.2.0.tgz",
      "integrity": "sha512-94hK0Hh8rPqQl2xXc3HsaBoOXKV20MToPkcXvwbISWLEs+64sBq5kFgn2kJDHb1Pry9yrP0dxrCI9RRci7RXKg==",
      "optional": true,
      "engines": {
        "node": ">= 6.0.0",
        "npm": ">= 3.0.0"
      }
    },
    "node_modules/socks": {
      "version": "2.8.6",
      "resolved": "https://registry.npmjs.org/socks/-/socks-2.8.6.tgz",
      "integrity": "sha512-pe4Y2yzru68lXCb38aAqRf5gvN8YdjP1lok5o0J7BOHljkyCGKVz7H3vpVIXKD27rj2giOJ7DwVyk/GWrPHDWA==",
      "optional": true,
      "dependencies": {
        "ip-address": "^9.0.5",
        "smart-buffer": "^4.2.0"
      },
      "engines": {
        "node": ">= 10.0.0",
        "npm": ">= 3.0.0"
      }
    },
    "node_modules/socks-proxy-agent": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/socks-proxy-agent/-/socks-proxy-agent-6.2.1.tgz",
      "integrity": "sha512-a6KW9G+6B3nWZ1yB8G7pJwL3ggLy1uTzKAgCb7ttblwqdz9fMGJUuTy3uFzEP48FAs9FLILlmzDlE2JJhVQaXQ==",
      "optional": true,
      "dependencies": {
        "agent-base": "^6.0.2",
        "debug": "^4.3.3",
        "socks": "^2.6.2"
      },
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/socks/node_modules/ip-address": {
      "version": "9.0.5",
      "resolved": "https://registry.npmjs.org/ip-address/-/ip-address-9.0.5.tgz",
      "integrity": "sha512-zHtQzGojZXTwZTHQqra+ETKd4Sn3vgi7uBmlPoXVWZqYvuKmtI0l/VZTjqGmJY9x88GGOaZ9+G9ES8hC4T4X8g==",
      "optional": true,
      "dependencies": {
        "jsbn": "1.1.0",
        "sprintf-js": "^1.1.3"
      },
      "engines": {
        "node": ">= 12"
      }
    },
    "node_modules/sprintf-js": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/sprintf-js/-/sprintf-js-1.1.3.tgz",
      "integrity": "sha512-Oo+0REFV59/rz3gfJNKQiBlwfHaSESl1pcGyABQsnnIfWOFt6JNj5gCog2U6MLZ//IGYD+nA8nI+mTShREReaA==",
      "optional": true
    },
    "node_modules/sqlite3": {
      "version": "5.1.7",
      "resolved": "https://registry.npmjs.org/sqlite3/-/sqlite3-5.1.7.tgz",
      "integrity": "sha512-GGIyOiFaG+TUra3JIfkI/zGP8yZYLPQ0pl1bH+ODjiX57sPhrLU5sQJn1y9bDKZUFYkX1crlrPfSYt0BKKdkog==",
      "hasInstallScript": true,
      "dependencies": {
        "bindings": "^1.5.0",
        "node-addon-api": "^7.0.0",
        "prebuild-install": "^7.1.1",
        "tar": "^6.1.11"
      },
      "optionalDependencies": {
        "node-gyp": "8.x"
      },
      "peerDependencies": {
        "node-gyp": "8.x"
      },
      "peerDependenciesMeta": {
        "node-gyp": {
          "optional": true
        }
      }
    },
    "node_modules/ssri": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/ssri/-/ssri-8.0.1.tgz",
      "integrity": "sha512-97qShzy1AiyxvPNIkLWoGua7xoQzzPjQ0HAH4B0rWKo7SZ6USuPcrUiAFrws0UH8RrbWmgq3LMTObhPIHbbBeQ==",
      "optional": true,
      "dependencies": {
        "minipass": "^3.1.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/string_decoder": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.3.0.tgz",
      "integrity": "sha512-hkRX8U1WjJFd8LsDJ2yQ/wWWxaopEsABU1XfkM8A+j0+85JAGppt16cr1Whg6KIbb4okU6Mql6BOj+uup/wKeA==",
      "dependencies": {
        "safe-buffer": "~5.2.0"
      }
    },
    "node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "optional": true,
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "optional": true,
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-2.0.1.tgz",
      "integrity": "sha512-4gB8na07fecVVkOI6Rs4e7T6NOTki5EmL7TUduTs6bu3EdnSycntVJ4re8kgZA+wx9IueI2Y11bfbgwtzuE0KQ==",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/tar": {
      "version": "6.2.1",
      "resolved": "https://registry.npmjs.org/tar/-/tar-6.2.1.tgz",
      "integrity": "sha512-DZ4yORTwrbTj/7MZYq2w+/ZFdI6OZ/f9SFHR+71gIVUZhOQPHzVCLpvRnPgyaMpfWxxk/4ONva3GQSyNIKRv6A==",
      "dependencies": {
        "chownr": "^2.0.0",
        "fs-minipass": "^2.0.0",
        "minipass": "^5.0.0",
        "minizlib": "^2.1.1",
        "mkdirp": "^1.0.3",
        "yallist": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/tar-fs": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/tar-fs/-/tar-fs-2.1.3.tgz",
      "integrity": "sha512-090nwYJDmlhwFwEW3QQl+vaNnxsO2yVsd45eTKRBzSzu+hlb1w2K9inVq5b0ngXuLVqQ4ApvsUHHnu/zQNkWAg==",
      "dependencies": {
        "chownr": "^1.1.1",
        "mkdirp-classic": "^0.5.2",
        "pump": "^3.0.0",
        "tar-stream": "^2.1.4"
      }
    },
    "node_modules/tar-fs/node_modules/chownr": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/chownr/-/chownr-1.1.4.tgz",
      "integrity": "sha512-jJ0bqzaylmJtVnNgzTeSOs8DPavpbYgEr/b0YL8/2GO3xJEhInFmhKMUnEJQjZumK7KXGFhUy89PrsJWlakBVg=="
    },
    "node_modules/tar-stream": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/tar-stream/-/tar-stream-2.2.0.tgz",
      "integrity": "sha512-ujeqbceABgwMZxEJnk2HDY2DlnUZ+9oEcb1KzTVfYHio0UE6dG71n60d8D2I4qNvleWrrXpmjpt7vZeF1LnMZQ==",
      "dependencies": {
        "bl": "^4.0.3",
        "end-of-stream": "^1.4.1",
        "fs-constants": "^1.0.0",
        "inherits": "^2.0.3",
        "readable-stream": "^3.1.1"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/tar/node_modules/minipass": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-5.0.0.tgz",
      "integrity": "sha512-3FnjYuehv9k6ovOEbyOswadCDPX1piCfhV8ncmYtHOjuPwylVWsghTLo7rabjC3Rx5xD4HDx8Wm1xnMF7S5qFQ==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/tarn": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/tarn/-/tarn-3.0.2.tgz",
      "integrity": "sha512-51LAVKUSZSVfI05vjPESNc5vwqqZpbXCsU+/+wxlOrUjk2SnFTt97v9ZgQrD4YmxYW1Px6w2KjaDitCfkvgxMQ==",
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/tildify": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/tildify/-/tildify-2.0.0.tgz",
      "integrity": "sha512-Cc+OraorugtXNfs50hU9KS369rFXCfgGLpfCfvlc+Ud5u6VWmUQsOAa9HbTvheQdYnrdJqqv1e5oIqXppMYnSw==",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/toidentifier": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/toidentifier/-/toidentifier-1.0.1.tgz",
      "integrity": "sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/tunnel-agent": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/tunnel-agent/-/tunnel-agent-0.6.0.tgz",
      "integrity": "sha512-McnNiV1l8RYeY8tBgEpuodCC1mLUdbSN+CYBL7kJsJNInOP8UjDDEwdk6Mw60vdLLrr5NHKZhMAOSrR2NZuQ+w==",
      "dependencies": {
        "safe-buffer": "^5.0.1"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/type-is": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-2.0.1.tgz",
      "integrity": "sha512-OZs6gsjF4vMp32qrCbiVSkrFmXtG/AZhY3t0iAMrMBiAZyV9oALtXO8hsrHbMXF9x6L3grlFuwW2oAz7cav+Gw==",
      "dependencies": {
        "content-type": "^1.0.5",
        "media-typer": "^1.1.0",
        "mime-types": "^3.0.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/undici-types": {
      "version": "7.10.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-7.10.0.tgz",
      "integrity": "sha512-t5Fy/nfn+14LuOc2KNYg75vZqClpAiqscVvMygNnlsHBFpSXdJaYtXMcdNLpl/Qvc3P2cB3s6lOV51nqsFq4ag==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/unique-filename": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/unique-filename/-/unique-filename-1.1.1.tgz",
      "integrity": "sha512-Vmp0jIp2ln35UTXuryvjzkjGdRyf9b2lTXuSYUiPmzRcl3FDtYqAwOnTJkAngD9SWhnoJzDbTKwaOrZ+STtxNQ==",
      "optional": true,
      "dependencies": {
        "unique-slug": "^2.0.0"
      }
    },
    "node_modules/unique-slug": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/unique-slug/-/unique-slug-2.0.2.tgz",
      "integrity": "sha512-zoWr9ObaxALD3DOPfjPSqxt4fnZiWblxHIgeWqW8x7UqDzEtHEQLzji2cuJYQFCU6KmoJikOYAZlrTHHebjx2w==",
      "optional": true,
      "dependencies": {
        "imurmurhash": "^0.1.4"
      }
    },
    "node_modules/unpipe": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/unpipe/-/unpipe-1.0.0.tgz",
      "integrity": "sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw=="
    },
    "node_modules/vary": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/vary/-/vary-1.1.2.tgz",
      "integrity": "sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "optional": true,
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/wide-align": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/wide-align/-/wide-align-1.1.5.tgz",
      "integrity": "sha512-eDMORYaPNZ4sQIuuYPDHdQvf4gyCF9rEEV/yPxGfwPkRodwEgiMUUXTx/dex+Me0wxx53S+NgUHaP7y3MGlDmg==",
      "optional": true,
      "dependencies": {
        "string-width": "^1.0.2 || 2 || 3 || 4"
      }
    },
    "node_modules/wrappy": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz",
      "integrity": "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ=="
    },
    "node_modules/yallist": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-4.0.0.tgz",
      "integrity": "sha512-3wdGidZyq5PB084XLES5TpOSRA3wjXAlIWMhum2kRcv/41Sn2emQ0dycQW4uZXLejwKvg6EsvbdlVL+FYEct7A=="
    }
  }
}

```

### backend\package.json

**Purpose:** Project file: backend\package.json

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.2.1",
    "express": "^5.1.0",
    "express-rate-limit": "^8.0.1",
    "helmet": "^8.1.0",
    "joi": "^18.0.0",
    "jsonwebtoken": "^9.0.2",
    "knex": "^3.1.0",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "@types/express-rate-limit": "^5.1.3",
    "@types/helmet": "^0.0.48",
    "@types/jsonwebtoken": "^9.0.10"
  }
}

```

### backend\routes\adminRoutes.js

**Purpose:** Project file: backend\routes\adminRoutes.js

```javascript
// backend/routes/adminRoutes.js

import express from 'express';
import {
  listUsers,
  updateUserRole,
  updateUserStatus
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only power_users or admins can see these routes
router.use(authenticate);
router.use((req, res, next) => {
  if (req.user.role === 'power_user' || req.user.role === 'admin') {
    return next();
  }
  return res.sendStatus(403);
});
router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', updateUserStatus);

export default router;

```

### backend\routes\authRoutes.js

**Purpose:** Project file: backend\routes\authRoutes.js

```javascript
// backend/routes/authRoutes.js
import express from 'express';
import {
  register,
  login,
  logout,
  whoami,
  changePassword,
  updateProfile
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Authenticated routes
router.get('/whoami', authenticate, whoami);
router.post('/change-password', authenticate, changePassword);
router.put('/update-profile', authenticate, updateProfile);

export default router;

```

### backend\routes\userRoutes.js

**Purpose:** Project file: backend\routes\userRoutes.js

```javascript
// backend/routes/userRoutes.js
import express from 'express';
import bcrypt from 'bcrypt';
import db from '../config/db.js';

const router = express.Router();

// GET /api/user/me - Get current user profile
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'phone', 'role', 'status', 'created_at')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/me - Update current user profile
router.put('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, phone } = req.body;

    // Validation
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    if (first_name.trim().length === 0 || last_name.trim().length === 0) {
      return res.status(400).json({ error: 'First name and last name cannot be empty' });
    }

    // Phone validation if provided
    if (phone && (!/^\d{10}$/.test(phone))) {
      return res.status(400).json({ error: 'Phone must be exactly 10 digits' });
    }

    // Update user
    await db('users')
      .where({ id: userId })
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone || null,
        updated_at: db.fn.now()
      });

    // Get updated user
    const updatedUser = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'phone', 'role', 'status', 'created_at')
      .where({ id: userId })
      .first();

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/change-password - Change user password
router.post('/change-password', async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Validation
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Get current user
    const user = await db('users')
      .select('id', 'password')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await db('users')
      .where({ id: userId })
      .update({
        password: hashedNewPassword,
        updated_at: db.fn.now()
      });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### backend\seed\seed_admin.js

**Purpose:** Project file: backend\seed\seed_admin.js

```javascript
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

```

### backend\server.js

**Purpose:** Project file: backend\server.js

```javascript
// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js'; // NEW

// Config
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS config — adjust origin for your frontend dev URL
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes); // Mount the profile routes

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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

```

### docker-compose.yml

**Purpose:** Project file: docker-compose.yml

```yaml

```

### document_project.py

**Purpose:** Project file: document_project.py

```python
#!/usr/bin/env python3
"""
NC Bourbon Tracker Project Documentation Generator (Enhanced)

Outputs:
    - project-structure.json: Complete project structure and metadata
    - project-source.md: All important source code files
    - api-routes.json: All Express endpoints extracted from backend/routes/
    - env-vars.json: All environment variables (from .env.example)
"""

import os
import re
import json
import datetime
from pathlib import Path
from typing import Dict, List, Tuple

class ProjectDocumenter:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.timestamp = datetime.datetime.now().isoformat()

        # Files and directories to exclude
        self.exclude_dirs = {
            'node_modules', '.git', '__pycache__', '.vscode', '.idea',
            'dist', 'build', '.next', 'coverage', 'logs'
        }
        self.exclude_files = {
            '.DS_Store', 'Thumbs.db', '*.log', '*.tmp', '*.pyc',
            '.env', '.env.local', '.env.production', '.env.development'
        }
        # Important file extensions to include in source documentation
        self.important_extensions = {
            '.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.md',
            '.py', '.sql', '.yaml', '.yml', '.env.example'
        }
        # Critical files to always include (even if extension not in list)
        self.critical_files = {
            'package.json', 'package-lock.json', 'README.md', 'Dockerfile',
            'docker-compose.yml', '.gitignore', 'server.js', 'App.jsx'
        }

    def should_exclude_dir(self, dir_name: str) -> bool:
        """Check if directory should be excluded"""
        return dir_name in self.exclude_dirs or dir_name.startswith('.')

    def should_include_file(self, file_path: Path) -> bool:
        """Check if file should be included in source documentation"""
        if file_path.name in self.critical_files:
            return True
        if file_path.suffix.lower() in self.important_extensions:
            return True
        return False

    def get_project_structure(self) -> Dict:
        """Generate complete project structure"""
        structure = {
            "project_name": "NC Bourbon Tracker",
            "generated_at": self.timestamp,
            "root_path": str(self.project_root),
            "architecture": {
                "type": "Full Stack Web Application",
                "frontend": "React + Vite",
                "backend": "Node.js + Express",
                "database": "SQLite",
                "auth": "JWT with HTTP-only cookies",
                "security": "Secure by default architecture"
            },
            "directory_structure": {},
            "file_summary": {
                "total_files": 0,
                "important_files": 0,
                "file_types": {}
            },
            "key_decisions": [
                "Implemented secure-by-default authentication",
                "Separated PublicLayout vs AuthenticatedLayout",
                "JWT stored in HTTP-only cookies",
                "Role-based access control (admin, power_user, user)",
                "Full-width background images on all pages"
            ]
        }

        for root, dirs, files in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(d)]
            root_path = Path(root)
            rel_path = root_path.relative_to(self.project_root)
            if any(part.startswith('.') or part in self.exclude_dirs for part in rel_path.parts):
                continue
            dir_key = str(rel_path) if str(rel_path) != '.' else 'root'
            structure["directory_structure"][dir_key] = {
                "files": [],
                "purpose": self.get_directory_purpose(rel_path)
            }
            for file in files:
                file_path = root_path / file
                rel_file_path = file_path.relative_to(self.project_root)
                file_info = {
                    "name": file,
                    "path": str(rel_file_path),
                    "size": file_path.stat().st_size,
                    "important": self.should_include_file(file_path),
                    "type": file_path.suffix.lower() or "no_extension"
                }
                structure["directory_structure"][dir_key]["files"].append(file_info)
                structure["file_summary"]["total_files"] += 1
                if file_info["important"]:
                    structure["file_summary"]["important_files"] += 1
                file_type = file_info["type"]
                structure["file_summary"]["file_types"][file_type] = \
                    structure["file_summary"]["file_types"].get(file_type, 0) + 1
        return structure

    def get_directory_purpose(self, rel_path: Path) -> str:
        """Get human-readable purpose of directory"""
        path_str = str(rel_path).lower()
        purposes = {
            'frontend': "React frontend application",
            'backend': "Node.js backend server",
            'frontend/src': "React source code",
            'frontend/src/components': "Reusable React components",
            'frontend/src/pages': "Page-level React components",
            'frontend/src/contexts': "React context providers",
            'frontend/public': "Static assets and images",
            'frontend/public/images': "Background images and assets",
            'backend/routes': "Express.js API route handlers",
            'backend/controllers': "Business logic controllers",
            'backend/middleware': "Authentication and other middleware",
            'backend/config': "Database and configuration files",
            'backend/data': "Database files and migrations"
        }
        return purposes.get(path_str, "Project files")

    def categorize_file(self, file_path: str) -> str:
        """Categorize file based on path and name"""
        path_lower = file_path.lower()
        if file_path in ['package.json', 'package-lock.json', '.gitignore', 'README.md']:
            return "Configuration Files"
        elif 'frontend/src/pages' in path_lower:
            return "Frontend - Pages"
        elif 'frontend/src/components' in path_lower:
            return "Frontend - Components"
        elif path_lower.endswith('.css'):
            return "Frontend - Styling"
        elif file_path in ['frontend/src/App.jsx', 'frontend/src/main.jsx']:
            return "Frontend - Main App"
        elif 'frontend/src' in path_lower:
            return "Frontend - Components"
        elif file_path == 'backend/server.js' or 'backend/app.js' in path_lower:
            return "Backend - Main"
        elif 'backend/routes' in path_lower:
            return "Backend - Routes"
        elif 'backend/controllers' in path_lower:
            return "Backend - Controllers"
        elif 'backend/middleware' in path_lower:
            return "Backend - Middleware"
        elif 'backend/config' in path_lower or 'backend/data' in path_lower:
            return "Backend - Config"
        else:
            return "Configuration Files"

    def get_file_description(self, file_path: str) -> str:
        """Get human-readable description of file purpose"""
        descriptions = {
            'package.json': "Project dependencies and scripts",
            'frontend/src/App.jsx': "Main React app with secure-by-default routing",
            'frontend/src/main.jsx': "React app entry point",
            'backend/server.js': "Express server with security middleware",
            'frontend/src/pages/Login.jsx': "Login page component with styled form",
            'frontend/src/pages/Register.jsx': "Registration page component",
            'frontend/src/pages/Home.jsx': "Protected home page",
            'frontend/src/pages/Admin.jsx': "Admin dashboard for user management",
            'frontend/src/components/PublicLayout.jsx': "Layout for unauthenticated users",
            'frontend/src/components/ProtectedRoute.jsx': "Route protection component",
            'frontend/src/contexts/AuthContext.jsx': "Authentication state management",
            'backend/routes/authRoutes.js': "Authentication API endpoints",
            'backend/routes/adminRoutes.js': "Admin API endpoints",
            'backend/controllers/authController.js': "Authentication business logic",
            'backend/controllers/adminController.js': "Admin functionality",
            'backend/middleware/authMiddleware.js': "JWT authentication middleware"
        }
        return descriptions.get(file_path, f"Project file: {file_path}")

    def get_file_language(self, file_path: str) -> str:
        """Get language identifier for syntax highlighting"""
        ext = Path(file_path).suffix.lower()
        language_map = {
            '.js': 'javascript',
            '.jsx': 'jsx',
            '.ts': 'typescript',
            '.tsx': 'tsx',
            '.css': 'css',
            '.json': 'json',
            '.md': 'markdown',
            '.py': 'python',
            '.sql': 'sql',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        }
        return language_map.get(ext, 'text')

    def read_file_safely(self, file_path: Path) -> str:
        """Safely read file content, handling encoding issues"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception:
                return f"[Could not read file: {file_path}]"
        except Exception as e:
            return f"[Error reading file: {e}]"

    def extract_express_routes(self) -> List[Dict]:
        """Scan backend/routes/ for Express route definitions (method, path, file)."""
        routes = []
        routes_dir = self.project_root / 'backend' / 'routes'
        if not routes_dir.exists():
            return routes
        route_pattern = re.compile(
            r"router\.(get|post|put|patch|delete)\(\s*['\"](.*?)['\"]",
            re.IGNORECASE
        )
        for route_file in routes_dir.glob("*.js"):
            try:
                with open(route_file, "r", encoding="utf-8") as f:
                    text = f.read()
                for match in route_pattern.finditer(text):
                    method, path = match.groups()
                    routes.append({
                        "method": method.upper(),
                        "path": path,
                        "file": str(route_file.relative_to(self.project_root))
                    })
            except Exception:
                continue
        return routes

    def extract_env_vars(self) -> List[Dict]:
        """Parse .env.example for environment variables and comments."""
        env_vars = []
        env_file = self.project_root / '.env.example'
        if not env_file.exists():
            return env_vars
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.rstrip()
                if not line or line.startswith('#'):
                    continue
                if "=" in line:
                    var, val = line.split("=", 1)
                    comment = ""
                    env_vars.append({
                        "name": var.strip(),
                        "default": val.strip(),
                        "comment": comment
                    })
        return env_vars

    def extract_todos(self) -> List[Dict]:
        """Scan important source files for TODO/FIXME comments."""
        todos = []
        important_files = []
        for root, dirs, files in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(d)]
            root_path = Path(root)
            rel_path = root_path.relative_to(self.project_root)
            if any(part.startswith('.') or part in self.exclude_dirs for part in rel_path.parts):
                continue
            for file in files:
                file_path = root_path / file
                if self.should_include_file(file_path):
                    important_files.append((str(file_path.relative_to(self.project_root)), file_path))
        for rel_path, full_path in important_files:
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f, 1):
                        if 'TODO' in line or 'FIXME' in line:
                            todos.append({
                                "file": rel_path,
                                "line": i,
                                "text": line.strip()
                            })
            except Exception:
                continue
        return todos

    def read_changelog(self) -> str:
        changelog_file = self.project_root / "CHANGELOG.md"
        if changelog_file.exists():
            try:
                with open(changelog_file, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                return "[Error reading CHANGELOG.md]"
        return ""

    def generate_source_documentation(self, api_routes, env_vars, todos, changelog) -> str:
        md_content = f"""# NC Bourbon Tracker - Source Code Documentation

**Generated:** {self.timestamp}  
**Project Root:** {self.project_root}

## Architecture Overview

This project uses a **secure-by-default architecture** with:

- **Frontend:** React with Vite, using a two-layout system (PublicLayout for auth, AuthenticatedLayout for app)
- **Backend:** Node.js with Express, JWT authentication via HTTP-only cookies
- **Database:** SQLite with user management and future ABC warehouse data
- **Security:** All routes protected by default, explicit public routes only for auth

## API Endpoints (Auto-Extracted)
"""
        if api_routes:
            md_content += "\n| Method | Path | File |\n|---|---|---|\n"
            for r in api_routes:
                md_content += f"| `{r['method']}` | `{r['path']}` | `{r['file']}` |\n"
        else:
            md_content += "\n_No Express routes found._\n"

        md_content += "\n## Environment Variables (from .env.example)\n"
        if env_vars:
            md_content += "\n| Name | Default | Comment |\n|---|---|---|\n"
            for v in env_vars:
                md_content += f"| `{v['name']}` | `{v['default']}` | {v['comment']} |\n"
        else:
            md_content += "\n_No .env.example found or no variables detected._\n"

        md_content += "\n## TODOs / FIXMEs\n"
        if todos:
            for t in todos:
                md_content += f"- {t['file']} (line {t['line']}): {t['text']}\n"
        else:
            md_content += "\n_No TODOs or FIXMEs found._\n"

        if changelog:
            md_content += "\n## Change Log\n"
            md_content += changelog

        # Collect all important files
        important_files = []
        for root, dirs, files in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(d)]
            root_path = Path(root)
            rel_path = root_path.relative_to(self.project_root)
            if any(part.startswith('.') or part in self.exclude_dirs for part in rel_path.parts):
                continue
            for file in files:
                file_path = root_path / file
                if self.should_include_file(file_path):
                    rel_file_path = file_path.relative_to(self.project_root)
                    important_files.append((str(rel_file_path), file_path))
        important_files.sort(key=lambda x: (x[0].count('/'), x[0]))
        categories = {
            "Configuration Files": [],
            "Frontend - Main App": [],
            "Frontend - Components": [],
            "Frontend - Pages": [],
            "Frontend - Styling": [],
            "Backend - Main": [],
            "Backend - Routes": [],
            "Backend - Controllers": [],
            "Backend - Middleware": [],
            "Backend - Config": []
        }
        for rel_path, full_path in important_files:
            content = self.read_file_safely(full_path)
            if content is None:
                continue
            category = self.categorize_file(rel_path)
            categories[category].append({
                "path": rel_path,
                "content": content,
                "description": self.get_file_description(rel_path)
            })
        for category, files in categories.items():
            if not files:
                continue
            md_content += f"\n## {category}\n\n"
            for file_info in files:
                md_content += f"### {file_info['path']}\n\n"
                md_content += f"**Purpose:** {file_info['description']}\n\n"
                md_content += f"```{self.get_file_language(file_info['path'])}\n"
                md_content += file_info['content']
                md_content += "\n```\n\n"

        return md_content

    def generate_documentation(self):
        print("🔍 Scanning project structure...")
        structure = self.get_project_structure()

        print("🔎 Extracting Express API routes...")
        api_routes = self.extract_express_routes()
        with open(self.project_root / "api-routes.json", 'w', encoding='utf-8') as f:
            json.dump(api_routes, f, indent=2)

        print("🗒️  Parsing environment variables...")
        env_vars = self.extract_env_vars()
        with open(self.project_root / "env-vars.json", 'w', encoding='utf-8') as f:
            json.dump(env_vars, f, indent=2)

        print("🚦 Scanning for TODOs/FIXMEs...")
        todos = self.extract_todos()

        print("📝 Checking for CHANGELOG.md...")
        changelog = self.read_changelog()

        print("📊 Generating structure documentation...")
        structure_file = self.project_root / "project-structure.json"
        with open(structure_file, 'w', encoding='utf-8') as f:
            json.dump(structure, f, indent=2, default=str)

        print("📝 Generating source code documentation...")
        source_content = self.generate_source_documentation(api_routes, env_vars, todos, changelog)
        source_file = self.project_root / "project-source.md"
        with open(source_file, 'w', encoding='utf-8') as f:
            f.write(source_content)

        print(f"\n✅ Documentation generated successfully!")
        print(f"📁 Structure: {structure_file}")
        print(f"📄 Source: {source_file}")
        print(f"🔎 API Routes: {self.project_root / 'api-routes.json'}")
        print(f"🗒️  Env Vars: {self.project_root / 'env-vars.json'}")
        print(f"\n📊 Summary:")
        print(f"   • Total files scanned: {structure['file_summary']['total_files']}")
        print(f"   • Important files documented: {structure['file_summary']['important_files']}")
        print(f"   • File types: {', '.join(structure['file_summary']['file_types'].keys())}")

        print(f"\n💡 Usage:")
        print(f"   • Copy project-structure.json for quick project overview")
        print(f"   • Copy relevant sections of project-source.md for detailed code context")
        print(f"   • Use api-routes.json and env-vars.json for onboarding or AI code suggestions")

if __name__ == "__main__":
    documenter = ProjectDocumenter()
    documenter.generate_documentation()

```

### env-vars.json

**Purpose:** Project file: env-vars.json

```json
[]
```

### frontend\.gitignore

**Purpose:** Project file: frontend\.gitignore

```text
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

### frontend\README.md

**Purpose:** Project file: frontend\README.md

```markdown
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

```

### frontend\eslint.config.js

**Purpose:** Project file: frontend\eslint.config.js

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])

```

### frontend\package-lock.json

**Purpose:** Project file: frontend\package-lock.json

```json
{
  "name": "frontend",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "frontend",
      "version": "0.0.0",
      "dependencies": {
        "react": "^19.1.0",
        "react-dom": "^19.1.0",
        "react-router-dom": "^7.7.1"
      },
      "devDependencies": {
        "@eslint/js": "^9.30.1",
        "@types/react": "^19.1.8",
        "@types/react-dom": "^19.1.6",
        "@vitejs/plugin-react": "^4.7.0",
        "eslint": "^9.30.1",
        "eslint-plugin-react-hooks": "^5.2.0",
        "eslint-plugin-react-refresh": "^0.4.20",
        "globals": "^16.3.0",
        "vite": "^7.0.4"
      }
    },
    "node_modules/@ampproject/remapping": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/@ampproject/remapping/-/remapping-2.3.0.tgz",
      "integrity": "sha512-30iZtAPgz+LTIYoeivqYo853f02jBYSd5uGnGpkFV0M3xOt9aN73erkgYAmZU43x4VfqcnLxW9Kpg3R5LC4YYw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.27.1.tgz",
      "integrity": "sha512-cjQ7ZlQ0Mv3b47hABuTevyTuYN4i+loJKGeV9flcCgIK37cCXRh+L1bd3iBHlynerhQ7BhCkn2BPbQUL+rGqFg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.27.1",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.28.0.tgz",
      "integrity": "sha512-60X7qkglvrap8mn1lh2ebxXdZYtUcpd7gsmy9kLaBJ4i/WdY8PqTSdxyA8qraikqKQK5C1KRBKXqznrVapyNaw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.28.0.tgz",
      "integrity": "sha512-UlLAnTPrFdNGoFtbSXwcGFQBtQZJCNjaN6hQNP3UPvuNXT1i82N26KL3dZeIpNalWywr9IuQuncaAfUaS1g6sQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@ampproject/remapping": "^2.2.0",
        "@babel/code-frame": "^7.27.1",
        "@babel/generator": "^7.28.0",
        "@babel/helper-compilation-targets": "^7.27.2",
        "@babel/helper-module-transforms": "^7.27.3",
        "@babel/helpers": "^7.27.6",
        "@babel/parser": "^7.28.0",
        "@babel/template": "^7.27.2",
        "@babel/traverse": "^7.28.0",
        "@babel/types": "^7.28.0",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.28.0.tgz",
      "integrity": "sha512-lJjzvrbEeWrhB4P3QBsH7tey117PjLZnDbLiQEKjQ/fNJTjuq4HSqgFA+UNSwZT8D7dxxbnuSBMsa1lrWzKlQg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.28.0",
        "@babel/types": "^7.28.0",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.27.2",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.27.2.tgz",
      "integrity": "sha512-2+1thGUUWWjLTYTHZWK1n8Yga0ijBz1XAhUXcKy81rd5g6yh7hGqMp45v7cadSbEHc9G3OTv45SyneRN3ps4DQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.27.2",
        "@babel/helper-validator-option": "^7.27.1",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.28.0.tgz",
      "integrity": "sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.27.1.tgz",
      "integrity": "sha512-0gSFWUPNXNopqtIPQvlD5WgXYI5GY2kP2cCvoT8kczjbfcfuIljTbcWrulD1CIPIX2gt1wghbDy08yE1p+/r3w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.27.1",
        "@babel/types": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.27.3",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.27.3.tgz",
      "integrity": "sha512-dSOvYwvyLsWBeIRyOeHXp5vPj5l1I011r52FM1+r1jCERv+aFXYk4whgQccYEGYxK2H3ZAIA8nuPkQ0HaUo3qg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.27.1",
        "@babel/helper-validator-identifier": "^7.27.1",
        "@babel/traverse": "^7.27.3"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.27.1.tgz",
      "integrity": "sha512-1gn1Up5YXka3YYAHGKpbideQ5Yjf1tDa9qYcgysz+cNCXukyLl6DjPXhD3VRwSb8c0J9tA4b2+rHEZtc6R0tlw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.27.1.tgz",
      "integrity": "sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.27.1.tgz",
      "integrity": "sha512-D2hP9eA+Sqx1kBZgzxZh0y1trbuU+JoDkiEwqhQ36nodYqJwyEIhPSdMNd7lOm/4io72luTPWH20Yda0xOuUow==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.27.1.tgz",
      "integrity": "sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.28.2",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.28.2.tgz",
      "integrity": "sha512-/V9771t+EgXz62aCcyofnQhGM8DQACbRhvzKFsXKC9QM+5MadF8ZmIm0crDMaz3+o0h0zXfJnd4EhbYbxsrcFw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.27.2",
        "@babel/types": "^7.28.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.28.0.tgz",
      "integrity": "sha512-jVZGvOxOuNSsuQuLRTh13nU0AogFlw32w/MT+LV6D3sP5WdbW61E77RnkbaO2dUvmPAYrBDJXGn5gGS6tH4j8g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.0"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-self": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-self/-/plugin-transform-react-jsx-self-7.27.1.tgz",
      "integrity": "sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-source": {
      "version": "7.27.1",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-source/-/plugin-transform-react-jsx-source-7.27.1.tgz",
      "integrity": "sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.27.2",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.27.2.tgz",
      "integrity": "sha512-LPDZ85aEJyYSd18/DkjNh4/y1ntkE5KwUHWTiqgRxruuZL2F1yuHligVHLvcHY2vMHXttKFpJn6LwfI7cw7ODw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.27.1",
        "@babel/parser": "^7.27.2",
        "@babel/types": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.28.0.tgz",
      "integrity": "sha512-mGe7UK5wWyh0bKRfupsUchrQGqvDbZDbKJw+kcRGSmdHVYrv+ltd0pnpDTVpiTqnaBru9iEvA8pz8W46v0Amwg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.27.1",
        "@babel/generator": "^7.28.0",
        "@babel/helper-globals": "^7.28.0",
        "@babel/parser": "^7.28.0",
        "@babel/template": "^7.27.2",
        "@babel/types": "^7.28.0",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.28.2",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.28.2.tgz",
      "integrity": "sha512-ruv7Ae4J5dUYULmeXw1gmb7rYRz57OWCPM57pHojnLq/3Z1CK2lNSLTCVjxVk1F/TZHwOZZrOWi0ur95BbLxNQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.27.1",
        "@babel/helper-validator-identifier": "^7.27.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.25.8.tgz",
      "integrity": "sha512-urAvrUedIqEiFR3FYSLTWQgLu5tb+m0qZw0NBEasUeo6wuqatkMDaRT+1uABiGXEu5vqgPd7FGE1BhsAIy9QVA==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.25.8.tgz",
      "integrity": "sha512-RONsAvGCz5oWyePVnLdZY/HHwA++nxYWIX1atInlaW6SEkwq6XkP3+cb825EUcRs5Vss/lGh/2YxAb5xqc07Uw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.25.8.tgz",
      "integrity": "sha512-OD3p7LYzWpLhZEyATcTSJ67qB5D+20vbtr6vHlHWSQYhKtzUYrETuWThmzFpZtFsBIxRvhO07+UgVA9m0i/O1w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.25.8.tgz",
      "integrity": "sha512-yJAVPklM5+4+9dTeKwHOaA+LQkmrKFX96BM0A/2zQrbS6ENCmxc4OVoBs5dPkCCak2roAD+jKCdnmOqKszPkjA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.8.tgz",
      "integrity": "sha512-Jw0mxgIaYX6R8ODrdkLLPwBqHTtYHJSmzzd+QeytSugzQ0Vg4c5rDky5VgkoowbZQahCbsv1rT1KW72MPIkevw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.25.8.tgz",
      "integrity": "sha512-Vh2gLxxHnuoQ+GjPNvDSDRpoBCUzY4Pu0kBqMBDlK4fuWbKgGtmDIeEC081xi26PPjn+1tct+Bh8FjyLlw1Zlg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.25.8.tgz",
      "integrity": "sha512-YPJ7hDQ9DnNe5vxOm6jaie9QsTwcKedPvizTVlqWG9GBSq+BuyWEDazlGaDTC5NGU4QJd666V0yqCBL2oWKPfA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.25.8.tgz",
      "integrity": "sha512-MmaEXxQRdXNFsRN/KcIimLnSJrk2r5H8v+WVafRWz5xdSVmWLoITZQXcgehI2ZE6gioE6HirAEToM/RvFBeuhw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.25.8.tgz",
      "integrity": "sha512-FuzEP9BixzZohl1kLf76KEVOsxtIBFwCaLupVuk4eFVnOZfU+Wsn+x5Ryam7nILV2pkq2TqQM9EZPsOBuMC+kg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.25.8.tgz",
      "integrity": "sha512-WIgg00ARWv/uYLU7lsuDK00d/hHSfES5BzdWAdAig1ioV5kaFNrtK8EqGcUBJhYqotlUByUKz5Qo6u8tt7iD/w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.25.8.tgz",
      "integrity": "sha512-A1D9YzRX1i+1AJZuFFUMP1E9fMaYY+GnSQil9Tlw05utlE86EKTUA7RjwHDkEitmLYiFsRd9HwKBPEftNdBfjg==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.25.8.tgz",
      "integrity": "sha512-O7k1J/dwHkY1RMVvglFHl1HzutGEFFZ3kNiDMSOyUrB7WcoHGf96Sh+64nTRT26l3GMbCW01Ekh/ThKM5iI7hQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.25.8.tgz",
      "integrity": "sha512-uv+dqfRazte3BzfMp8PAQXmdGHQt2oC/y2ovwpTteqrMx2lwaksiFZ/bdkXJC19ttTvNXBuWH53zy/aTj1FgGw==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.25.8.tgz",
      "integrity": "sha512-GyG0KcMi1GBavP5JgAkkstMGyMholMDybAf8wF5A70CALlDM2p/f7YFE7H92eDeH/VBtFJA5MT4nRPDGg4JuzQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.25.8.tgz",
      "integrity": "sha512-rAqDYFv3yzMrq7GIcen3XP7TUEG/4LK86LUPMIz6RT8A6pRIDn0sDcvjudVZBiiTcZCY9y2SgYX2lgK3AF+1eg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.25.8.tgz",
      "integrity": "sha512-Xutvh6VjlbcHpsIIbwY8GVRbwoviWT19tFhgdA7DlenLGC/mbc3lBoVb7jxj9Z+eyGqvcnSyIltYUrkKzWqSvg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.8.tgz",
      "integrity": "sha512-ASFQhgY4ElXh3nDcOMTkQero4b1lgubskNlhIfJrsH5OKZXDpUAKBlNS0Kx81jwOBp+HCeZqmoJuihTv57/jvQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.25.8.tgz",
      "integrity": "sha512-d1KfruIeohqAi6SA+gENMuObDbEjn22olAR7egqnkCD9DGBG0wsEARotkLgXDu6c4ncgWTZJtN5vcgxzWRMzcw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.25.8.tgz",
      "integrity": "sha512-nVDCkrvx2ua+XQNyfrujIG38+YGyuy2Ru9kKVNyh5jAys6n+l44tTtToqHjino2My8VAY6Lw9H7RI73XFi66Cg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.25.8.tgz",
      "integrity": "sha512-j8HgrDuSJFAujkivSMSfPQSAa5Fxbvk4rgNAS5i3K+r8s1X0p1uOO2Hl2xNsGFppOeHOLAVgYwDVlmxhq5h+SQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.25.8.tgz",
      "integrity": "sha512-1h8MUAwa0VhNCDp6Af0HToI2TJFAn1uqT9Al6DJVzdIBAd21m/G0Yfc77KDM3uF3T/YaOgQq3qTJHPbTOInaIQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.25.8.tgz",
      "integrity": "sha512-r2nVa5SIK9tSWd0kJd9HCffnDHKchTGikb//9c7HX+r+wHYCpQrSgxhlY6KWV1nFo1l4KFbsMlHk+L6fekLsUg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.25.8.tgz",
      "integrity": "sha512-zUlaP2S12YhQ2UzUfcCuMDHQFJyKABkAjvO5YSndMiIkMimPmxA+BYSBikWgsRpvyxuRnow4nS5NPnf9fpv41w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.25.8.tgz",
      "integrity": "sha512-YEGFFWESlPva8hGL+zvj2z/SaK+pH0SwOM0Nc/d+rVnW7GSTFlLBGzZkuSU9kFIGIo8q9X3ucpZhu8PDN5A2sQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.25.8.tgz",
      "integrity": "sha512-hiGgGC6KZ5LZz58OL/+qVVoZiuZlUYlYHNAmczOm7bs2oE1XriPFi5ZHHrS8ACpV5EjySrnoCKmcbQMN+ojnHg==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.8.tgz",
      "integrity": "sha512-cn3Yr7+OaaZq1c+2pe+8yxC8E144SReCQjN6/2ynubzYjvyqZjTXfQJpAcQpsdJq3My7XADANiYGHoFC69pLQw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.7.0",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.7.0.tgz",
      "integrity": "sha512-dyybb3AcajC7uha6CvhdVRJqaKyn7w2YKqKyAN37NKYgZT36w+iRb0Dymmc5qEJ549c/S31cMMSFd75bteCpCw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.12.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.1.tgz",
      "integrity": "sha512-CCZCDJuduB9OUkFkY2IgppNZMi2lBQgD2qzwXkEia16cge2pijY/aXi96CJMquDMn3nJdlPV1A5KrJEXwfLNzQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.21.0",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.21.0.tgz",
      "integrity": "sha512-ENIdc4iLu0d93HeYirvKmrzshzofPw6VkZRKQGe9Nv46ZnWUzcF1xV01dcvEg/1wXUR61OmmlSfyeyO7EvjLxQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^2.1.6",
        "debug": "^4.3.1",
        "minimatch": "^3.1.2"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/config-helpers": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.3.0.tgz",
      "integrity": "sha512-ViuymvFmcJi04qdZeDc2whTHryouGcDlaxPqarTD0ZE10ISpxGUVZGZDx4w01upyIynL3iu6IXH2bS1NhclQMw==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.15.1",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.15.1.tgz",
      "integrity": "sha512-bkOp+iumZCCbt1K1CmWf0R9pM5yKpDv+ZXtvSyQpudrI9kuFLp+bM2WOPXImuD/ceQuaa8f5pj93Y7zyECIGNA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/json-schema": "^7.0.15"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.3.1.tgz",
      "integrity": "sha512-gtF186CXhIl1p4pJNGZw8Yc6RlshoePRvE0X91oPGb3vZ8pM3qOS9W9NGPat9LziaBV7XrJWGylNQXkGcnM3IQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^6.12.4",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.1.0",
        "minimatch": "^3.1.2",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.32.0",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.32.0.tgz",
      "integrity": "sha512-BBpRFZK3eX6uMLKz8WxFOBIFFcGFJ/g8XuwjTHCqHROSIsopI+ddn/d5Cfh36+7+e5edVS8dbSHnBNhrLEX0zg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.6",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.6.tgz",
      "integrity": "sha512-RBMg5FRL0I0gs51M/guSAj5/e14VQ4tpZnQNWwuDT66P14I43ItmPfIZRhO9fUVIPOAQXU47atlywZ/czoqFPA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.3.4",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.3.4.tgz",
      "integrity": "sha512-Ul5l+lHEcw3L5+k8POx6r74mxEYKG5kOb6Xpy2gCRW6zweT6TEhAf8vhxGgjhqrd/VO/Dirhsb+1hNpD1ue9hw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.15.1",
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.1",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.1.tgz",
      "integrity": "sha512-5DyQ4+1JEUzejeK1JGICcideyfUbGixgS9jNgex5nqkW+cY7WZhxBigmieN5Qnw9ZosSNVC9KQKyb+GUaGyKUA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.6",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.6.tgz",
      "integrity": "sha512-YuI2ZHQL78Q5HbhDiBA1X4LmYdXCKCMQIfw0pw7piHJwyREFebJUvrQN4cMssyES6x+vfUbx1CIpaQUKYdQZOw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.1",
        "@humanwhocodes/retry": "^0.3.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node/node_modules/@humanwhocodes/retry": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.3.1.tgz",
      "integrity": "sha512-JBxkERygn7Bv/GbN5Rv8Ul6LVknS+5Bp6RgDC/O8gEBU/yeH5Ui5C/OlWrTb6qct7LjjfT6Re2NxB0ln0yYybA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.4.3",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz",
      "integrity": "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.12",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.12.tgz",
      "integrity": "sha512-OuLGC46TjB5BbN1dH8JULVVZY4WTdkF7tV9Ys6wLL1rubZnCMstOhNHueU5bLCrnRuDhKPDM4g6sw4Bel5Gzqg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.4.tgz",
      "integrity": "sha512-VT2+G1VQs/9oz078bLrYbecdZKs912zQlkelYpuf+SXF+QvZDYJlbx/LSx+meSAwdDFnF8FVXW92AVjjkVmgFw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.29",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.29.tgz",
      "integrity": "sha512-uw6guiW/gcAGPDhLmd77/6lW8QLeiV5RUTsAX46Db6oLhGaVj4lhnPwb184s1bkc8kdVg/+h988dro8GRDpmYQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.0-beta.27",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.0-beta.27.tgz",
      "integrity": "sha512-+d0F4MKMCbeVUJwG96uQ4SgAznZNSq93I3V+9NHA4OpvqG8mRCpGdKmK8l/dl02h2CCDHwW2FqilnTyDcAnqjA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.46.2.tgz",
      "integrity": "sha512-Zj3Hl6sN34xJtMv7Anwb5Gu01yujyE/cLBDB2gnHTAHaWS1Z38L7kuSG+oAh0giZMqG060f/YBStXtMH6FvPMA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.46.2.tgz",
      "integrity": "sha512-nTeCWY83kN64oQ5MGz3CgtPx8NSOhC5lWtsjTs+8JAJNLcP3QbLCtDDgUKQc/Ro/frpMq4SHUaHN6AMltcEoLQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.46.2.tgz",
      "integrity": "sha512-HV7bW2Fb/F5KPdM/9bApunQh68YVDU8sO8BvcW9OngQVN3HHHkw99wFupuUJfGR9pYLLAjcAOA6iO+evsbBaPQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.46.2.tgz",
      "integrity": "sha512-SSj8TlYV5nJixSsm/y3QXfhspSiLYP11zpfwp6G/YDXctf3Xkdnk4woJIF5VQe0of2OjzTt8EsxnJDCdHd2xMA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.46.2.tgz",
      "integrity": "sha512-ZyrsG4TIT9xnOlLsSSi9w/X29tCbK1yegE49RYm3tu3wF1L/B6LVMqnEWyDB26d9Ecx9zrmXCiPmIabVuLmNSg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.46.2.tgz",
      "integrity": "sha512-pCgHFoOECwVCJ5GFq8+gR8SBKnMO+xe5UEqbemxBpCKYQddRQMgomv1104RnLSg7nNvgKy05sLsY51+OVRyiVw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.46.2.tgz",
      "integrity": "sha512-EtP8aquZ0xQg0ETFcxUbU71MZlHaw9MChwrQzatiE8U/bvi5uv/oChExXC4mWhjiqK7azGJBqU0tt5H123SzVA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.46.2.tgz",
      "integrity": "sha512-qO7F7U3u1nfxYRPM8HqFtLd+raev2K137dsV08q/LRKRLEc7RsiDWihUnrINdsWQxPR9jqZ8DIIZ1zJJAm5PjQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.46.2.tgz",
      "integrity": "sha512-3dRaqLfcOXYsfvw5xMrxAk9Lb1f395gkoBYzSFcc/scgRFptRXL9DOaDpMiehf9CO8ZDRJW2z45b6fpU5nwjng==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.46.2.tgz",
      "integrity": "sha512-fhHFTutA7SM+IrR6lIfiHskxmpmPTJUXpWIsBXpeEwNgZzZZSg/q4i6FU4J8qOGyJ0TR+wXBwx/L7Ho9z0+uDg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loongarch64-gnu": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-loongarch64-gnu/-/rollup-linux-loongarch64-gnu-4.46.2.tgz",
      "integrity": "sha512-i7wfGFXu8x4+FRqPymzjD+Hyav8l95UIZ773j7J7zRYc3Xsxy2wIn4x+llpunexXe6laaO72iEjeeGyUFmjKeA==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.46.2.tgz",
      "integrity": "sha512-B/l0dFcHVUnqcGZWKcWBSV2PF01YUt0Rvlurci5P+neqY/yMKchGU8ullZvIv5e8Y1C6wOn+U03mrDylP5q9Yw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.46.2.tgz",
      "integrity": "sha512-32k4ENb5ygtkMwPMucAb8MtV8olkPT03oiTxJbgkJa7lJ7dZMr0GCFJlyvy+K8iq7F/iuOr41ZdUHaOiqyR3iQ==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.46.2.tgz",
      "integrity": "sha512-t5B2loThlFEauloaQkZg9gxV05BYeITLvLkWOkRXogP4qHXLkWSbSHKM9S6H1schf/0YGP/qNKtiISlxvfmmZw==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.46.2.tgz",
      "integrity": "sha512-YKjekwTEKgbB7n17gmODSmJVUIvj8CX7q5442/CK80L8nqOUbMtf8b01QkG3jOqyr1rotrAnW6B/qiHwfcuWQA==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.46.2.tgz",
      "integrity": "sha512-Jj5a9RUoe5ra+MEyERkDKLwTXVu6s3aACP51nkfnK9wJTraCC8IMe3snOfALkrjTYd2G1ViE1hICj0fZ7ALBPA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.46.2.tgz",
      "integrity": "sha512-7kX69DIrBeD7yNp4A5b81izs8BqoZkCIaxQaOpumcJ1S/kmqNFjPhDu1LHeVXv0SexfHQv5cqHsxLOjETuqDuA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.46.2.tgz",
      "integrity": "sha512-wiJWMIpeaak/jsbaq2HMh/rzZxHVW1rU6coyeNNpMwk5isiPjSTx0a4YLSlYDwBH/WBvLz+EtsNqQScZTLJy3g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.46.2.tgz",
      "integrity": "sha512-gBgaUDESVzMgWZhcyjfs9QFK16D8K6QZpwAaVNJxYDLHWayOta4ZMjGm/vsAEy3hvlS2GosVFlBlP9/Wb85DqQ==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.46.2.tgz",
      "integrity": "sha512-CvUo2ixeIQGtF6WvuB87XWqPQkoFAFqW+HUo/WzHwuHDvIwZCtjdWXoYCcr06iKGydiqTclC4jU/TNObC/xKZg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@types/babel__core": {
      "version": "7.20.5",
      "resolved": "https://registry.npmjs.org/@types/babel__core/-/babel__core-7.20.5.tgz",
      "integrity": "sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.20.7",
        "@babel/types": "^7.20.7",
        "@types/babel__generator": "*",
        "@types/babel__template": "*",
        "@types/babel__traverse": "*"
      }
    },
    "node_modules/@types/babel__generator": {
      "version": "7.27.0",
      "resolved": "https://registry.npmjs.org/@types/babel__generator/-/babel__generator-7.27.0.tgz",
      "integrity": "sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__template": {
      "version": "7.4.4",
      "resolved": "https://registry.npmjs.org/@types/babel__template/-/babel__template-7.4.4.tgz",
      "integrity": "sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.1.0",
        "@babel/types": "^7.0.0"
      }
    },
    "node_modules/@types/babel__traverse": {
      "version": "7.28.0",
      "resolved": "https://registry.npmjs.org/@types/babel__traverse/-/babel__traverse-7.28.0.tgz",
      "integrity": "sha512-8PvcXf70gTDZBgt9ptxJ8elBeBjcLOAcOtoO/mPJjtji1+CdGbHgm77om1GrsPxsiE+uXIpNSK64UYaIwQXd4Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.28.2"
      }
    },
    "node_modules/@types/estree": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.8.tgz",
      "integrity": "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/react": {
      "version": "19.1.9",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.1.9.tgz",
      "integrity": "sha512-WmdoynAX8Stew/36uTSVMcLJJ1KRh6L3IZRx1PZ7qJtBqT3dYTgyDTx8H1qoRghErydW7xw9mSJ3wS//tCRpFA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.0.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.1.7",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.1.7.tgz",
      "integrity": "sha512-i5ZzwYpqjmrKenzkoLM2Ibzt6mAsM7pxB6BCIouEVVmgiqaMj1TjaK7hnA36hbW5aZv20kx7Lw6hWzPWg0Rurw==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.0.0"
      }
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "4.7.0",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-4.7.0.tgz",
      "integrity": "sha512-gUu9hwfWvvEDBBmgtAowQCojwZmJ5mcLn3aufeCsitijs3+f2NsrPtlAWIR6OPiqljl96GVCUbLe0HyqIpVaoA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.28.0",
        "@babel/plugin-transform-react-jsx-self": "^7.27.1",
        "@babel/plugin-transform-react-jsx-source": "^7.27.1",
        "@rolldown/pluginutils": "1.0.0-beta.27",
        "@types/babel__core": "^7.20.5",
        "react-refresh": "^0.17.0"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "peerDependencies": {
        "vite": "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"
      }
    },
    "node_modules/acorn": {
      "version": "8.15.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.15.0.tgz",
      "integrity": "sha512-NZyJarBfL7nWwIq+FDL6Zp/yHEhePMNnnJ0y3qfieCrmNvYct8uvtiV41UvlSe6apAfk0fY1FbWx+NwfmpvtTg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/ajv": {
      "version": "6.12.6",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.12.6.tgz",
      "integrity": "sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "dev": true,
      "license": "Python-2.0"
    },
    "node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/brace-expansion": {
      "version": "1.1.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.12.tgz",
      "integrity": "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/browserslist": {
      "version": "4.25.1",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.25.1.tgz",
      "integrity": "sha512-KGj0KoOMXLpSNkkEI6Z6mShmQy0bc1I+T7K9N81k4WWMrfz+6fQ6es80B/YLAeRoKvjYE1YSHHOW1qe9xIVzHw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "caniuse-lite": "^1.0.30001726",
        "electron-to-chromium": "^1.5.173",
        "node-releases": "^2.0.19",
        "update-browserslist-db": "^1.1.3"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001731",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001731.tgz",
      "integrity": "sha512-lDdp2/wrOmTRWuoB5DpfNkC0rJDU8DqRa6nYL6HK6sytw70QMopt/NIc/9SM7ylItlBWfACXk0tEn37UWM/+mg==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/cookie": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-1.0.2.tgz",
      "integrity": "sha512-9Kr/j4O16ISv8zBBhJoi4bXOYNTkFLOqSL3UDB0njXxCXNezjeyVrJyGOWtgfs/q2km1gwBcfH8q1yEGoMYunA==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/csstype": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.1.3.tgz",
      "integrity": "sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/debug": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.1.tgz",
      "integrity": "sha512-KcKCqiftBJcZr++7ykoDIEwSa3XWowTfNPo92BYxjXiyYEVrUQh2aLyhxBCwww+heortUFxEJYcRzosstTEBYQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.194",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.194.tgz",
      "integrity": "sha512-SdnWJwSUot04UR51I2oPD8kuP2VI37/CADR1OHsFOUzZIvfWJBO6q11k5P/uKNyTT3cdOsnyjkrZ+DDShqYqJA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/esbuild": {
      "version": "0.25.8",
      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.25.8.tgz",
      "integrity": "sha512-vVC0USHGtMi8+R4Kz8rt6JhEWLxsv9Rnu/lGYbPR8u47B+DCBksq9JarW0zOO7bs37hyOK1l2/oqtbciutL5+Q==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.25.8",
        "@esbuild/android-arm": "0.25.8",
        "@esbuild/android-arm64": "0.25.8",
        "@esbuild/android-x64": "0.25.8",
        "@esbuild/darwin-arm64": "0.25.8",
        "@esbuild/darwin-x64": "0.25.8",
        "@esbuild/freebsd-arm64": "0.25.8",
        "@esbuild/freebsd-x64": "0.25.8",
        "@esbuild/linux-arm": "0.25.8",
        "@esbuild/linux-arm64": "0.25.8",
        "@esbuild/linux-ia32": "0.25.8",
        "@esbuild/linux-loong64": "0.25.8",
        "@esbuild/linux-mips64el": "0.25.8",
        "@esbuild/linux-ppc64": "0.25.8",
        "@esbuild/linux-riscv64": "0.25.8",
        "@esbuild/linux-s390x": "0.25.8",
        "@esbuild/linux-x64": "0.25.8",
        "@esbuild/netbsd-arm64": "0.25.8",
        "@esbuild/netbsd-x64": "0.25.8",
        "@esbuild/openbsd-arm64": "0.25.8",
        "@esbuild/openbsd-x64": "0.25.8",
        "@esbuild/openharmony-arm64": "0.25.8",
        "@esbuild/sunos-x64": "0.25.8",
        "@esbuild/win32-arm64": "0.25.8",
        "@esbuild/win32-ia32": "0.25.8",
        "@esbuild/win32-x64": "0.25.8"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint": {
      "version": "9.32.0",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.32.0.tgz",
      "integrity": "sha512-LSehfdpgMeWcTZkWZVIJl+tkZ2nuSkyyB9C27MZqFWXuph7DvaowgcTvKqxvpLW1JZIk8PN7hFY3Rj9LQ7m7lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.2.0",
        "@eslint-community/regexpp": "^4.12.1",
        "@eslint/config-array": "^0.21.0",
        "@eslint/config-helpers": "^0.3.0",
        "@eslint/core": "^0.15.0",
        "@eslint/eslintrc": "^3.3.1",
        "@eslint/js": "9.32.0",
        "@eslint/plugin-kit": "^0.3.4",
        "@humanfs/node": "^0.16.6",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.4.2",
        "@types/estree": "^1.0.6",
        "@types/json-schema": "^7.0.15",
        "ajv": "^6.12.4",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.6",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.4.0",
        "eslint-visitor-keys": "^4.2.1",
        "espree": "^10.4.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.2",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-5.2.0.tgz",
      "integrity": "sha512-+f15FfK64YQwZdJNELETdn5ibXEUQmW1DZL6KXhNnc2heoy/sg9VJJeT7n8TlMWouzWqSWavFkIhHyIbIAEapg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0"
      }
    },
    "node_modules/eslint-plugin-react-refresh": {
      "version": "0.4.20",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-refresh/-/eslint-plugin-react-refresh-0.4.20.tgz",
      "integrity": "sha512-XpbHQ2q5gUF8BGOX4dHe+71qoirYMhApEPZ7sfhF/dNnOF1UXnCMGZf79SFTBO7Bz5YEIT4TMieSlJBWhP9WBA==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "eslint": ">=8.40"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.4.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.4.0.tgz",
      "integrity": "sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree": {
      "version": "10.4.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.4.0.tgz",
      "integrity": "sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.15.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.2.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.6.0.tgz",
      "integrity": "sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fdir": {
      "version": "6.4.6",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.4.6.tgz",
      "integrity": "sha512-hiFoqpyZcfNm1yc4u8oWCf9A2c4D3QjCrks3zmoVKVxpQRzmPNar1hUJcBG2RQHvEVGDN+Jm81ZheVLAQMK6+w==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.3.3",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.3.3.tgz",
      "integrity": "sha512-GX+ysw4PBCz0PzosHDepZGANEuFCMLrnRTiEy9McGjmkCQYwRq4A/X786G/fjM/+OjsWSU1ZrY5qyARZmO/uwg==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/globals": {
      "version": "16.3.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-16.3.0.tgz",
      "integrity": "sha512-bqWEnJ1Nt3neqx2q5SFfGS8r/ahumIakg3HcwtNlrVlwXIeNumWn/c7Pn/wKzGhf6SaW6H6uWXLqC30STCMchQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.1.tgz",
      "integrity": "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.0.tgz",
      "integrity": "sha512-wpxZs9NoxZaJESJGIZTyDEaYpl0FKSA+FB9aJiyemKhMwkxQg63h4T1KJgUGHpTqPDNRcmmYLugrRjJlBtWvRA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/minimatch": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.2.tgz",
      "integrity": "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/nanoid": {
      "version": "3.3.11",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.11.tgz",
      "integrity": "sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/node-releases": {
      "version": "2.0.19",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.19.tgz",
      "integrity": "sha512-xxOWJsBKtzAq7DY0J+DTzuz58K8e7sJbdgwkbMWQe8UYB6ekmsQ45q0M/tJDsGaZmbC+l7n57UV8Hl5tHxO9uw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.3.tgz",
      "integrity": "sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.6",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.6.tgz",
      "integrity": "sha512-3Ybi1tAuwAP9s0r1UQ2J4n5Y0G05bJkpUIO0/bI9MhwmD70S5aTWbXGBwxHrelT+XM1k6dM0pk+SwNkpTRN7Pg==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.11",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/react": {
      "version": "19.1.1",
      "resolved": "https://registry.npmjs.org/react/-/react-19.1.1.tgz",
      "integrity": "sha512-w8nqGImo45dmMIfljjMwOGtbmC/mk4CMYhWIicdSflH91J9TyCyczcPFXJzrZ/ZXcgGRFeP6BU0BEJTw6tZdfQ==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.1.1",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.1.1.tgz",
      "integrity": "sha512-Dlq/5LAZgF0Gaz6yiqZCf6VCcZs1ghAJyrsu84Q/GT0gV+mCxbfmKNoGRKBYMJ8IEdGPqu49YWXD02GCknEDkw==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.26.0"
      },
      "peerDependencies": {
        "react": "^19.1.1"
      }
    },
    "node_modules/react-refresh": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/react-refresh/-/react-refresh-0.17.0.tgz",
      "integrity": "sha512-z6F7K9bV85EfseRCp2bzrpyQ0Gkw1uLoCel9XBVWPg/TjRj94SkJzUTGfOa4bs7iJvBWtQG0Wq7wnI0syw3EBQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-router": {
      "version": "7.7.1",
      "resolved": "https://registry.npmjs.org/react-router/-/react-router-7.7.1.tgz",
      "integrity": "sha512-jVKHXoWRIsD/qS6lvGveckwb862EekvapdHJN/cGmzw40KnJH5gg53ujOJ4qX6EKIK9LSBfFed/xiQ5yeXNrUA==",
      "license": "MIT",
      "dependencies": {
        "cookie": "^1.0.1",
        "set-cookie-parser": "^2.6.0"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      },
      "peerDependenciesMeta": {
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/react-router-dom": {
      "version": "7.7.1",
      "resolved": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-7.7.1.tgz",
      "integrity": "sha512-bavdk2BA5r3MYalGKZ01u8PGuDBloQmzpBZVhDLrOOv1N943Wq6dcM9GhB3x8b7AbqPMEezauv4PeGkAJfy7FQ==",
      "license": "MIT",
      "dependencies": {
        "react-router": "7.7.1"
      },
      "engines": {
        "node": ">=20.0.0"
      },
      "peerDependencies": {
        "react": ">=18",
        "react-dom": ">=18"
      }
    },
    "node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/rollup": {
      "version": "4.46.2",
      "resolved": "https://registry.npmjs.org/rollup/-/rollup-4.46.2.tgz",
      "integrity": "sha512-WMmLFI+Boh6xbop+OAGo9cQ3OgX9MIg7xOQjn+pTCwOkk+FNDAeAemXkJ3HzDJrVXleLOFVa1ipuc1AmEx1Dwg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "1.0.8"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@rollup/rollup-android-arm-eabi": "4.46.2",
        "@rollup/rollup-android-arm64": "4.46.2",
        "@rollup/rollup-darwin-arm64": "4.46.2",
        "@rollup/rollup-darwin-x64": "4.46.2",
        "@rollup/rollup-freebsd-arm64": "4.46.2",
        "@rollup/rollup-freebsd-x64": "4.46.2",
        "@rollup/rollup-linux-arm-gnueabihf": "4.46.2",
        "@rollup/rollup-linux-arm-musleabihf": "4.46.2",
        "@rollup/rollup-linux-arm64-gnu": "4.46.2",
        "@rollup/rollup-linux-arm64-musl": "4.46.2",
        "@rollup/rollup-linux-loongarch64-gnu": "4.46.2",
        "@rollup/rollup-linux-ppc64-gnu": "4.46.2",
        "@rollup/rollup-linux-riscv64-gnu": "4.46.2",
        "@rollup/rollup-linux-riscv64-musl": "4.46.2",
        "@rollup/rollup-linux-s390x-gnu": "4.46.2",
        "@rollup/rollup-linux-x64-gnu": "4.46.2",
        "@rollup/rollup-linux-x64-musl": "4.46.2",
        "@rollup/rollup-win32-arm64-msvc": "4.46.2",
        "@rollup/rollup-win32-ia32-msvc": "4.46.2",
        "@rollup/rollup-win32-x64-msvc": "4.46.2",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/scheduler": {
      "version": "0.26.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.26.0.tgz",
      "integrity": "sha512-NlHwttCI/l5gCPR3D1nNXtWABUmBwvZpEQiD4IXSbIDq8BzLIK/7Ir5gTFSGZDUu37K5cMNp0hFtzO38sC7gWA==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/set-cookie-parser": {
      "version": "2.7.1",
      "resolved": "https://registry.npmjs.org/set-cookie-parser/-/set-cookie-parser-2.7.1.tgz",
      "integrity": "sha512-IOc8uWeOZgnb3ptbCURJWNjWUPcO3ZnTTdzsurqERrP6nPyv+paC55vJM0LpOlT2ne+Ix+9+CRG1MNLlyZ4GjQ==",
      "license": "MIT"
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.14",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.14.tgz",
      "integrity": "sha512-tX5e7OM1HnYr2+a2C/4V0htOcSQcoSTH9KgJnVvNm5zm/cyEWKJ7j7YutsH9CxMdtOkkLFy2AHrMci9IM8IPZQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.4.4",
        "picomatch": "^4.0.2"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/update-browserslist-db": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.1.3.tgz",
      "integrity": "sha512-UxhIZQ+QInVdunkDAaiazvvT/+fXL5Osr0JZlJulepYu6Jd7qJtDZjlur0emRlT71EN3ScPoE7gvsuIKKNavKw==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/vite": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/vite/-/vite-7.0.6.tgz",
      "integrity": "sha512-MHFiOENNBd+Bd9uvc8GEsIzdkn1JxMmEeYX35tI3fv0sJBUTfW5tQsoaOwuY4KhBI09A3dUJ/DXf2yxPVPUceg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "esbuild": "^0.25.0",
        "fdir": "^6.4.6",
        "picomatch": "^4.0.3",
        "postcss": "^8.5.6",
        "rollup": "^4.40.0",
        "tinyglobby": "^0.2.14"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^20.19.0 || >=22.12.0",
        "jiti": ">=1.21.0",
        "less": "^4.0.0",
        "lightningcss": "^1.21.0",
        "sass": "^1.70.0",
        "sass-embedded": "^1.70.0",
        "stylus": ">=0.54.8",
        "sugarss": "^5.0.0",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    }
  }
}

```

### frontend\package.json

**Purpose:** Project file: frontend\package.json

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.7.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.30.1",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.7.0",
    "eslint": "^9.30.1",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.3.0",
    "vite": "^7.0.4"
  }
}

```

### frontend\src\App.jsx

**Purpose:** Project file: frontend\src\App.jsx

```jsx
// frontend/src/App.jsx

import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Admin from './pages/Admin.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx'; // <-- NEW
import './App.css';

// Authenticated Layout - Full app experience
function AuthenticatedLayout({ children }) {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return <p>Loading…</p>;
  }

  return (
    <>
      <header className="main-header">
        <nav className="main-nav">
          <div className="nav-left">
            <Link to="/">Home</Link>
            {user && (user.role === 'admin' || user.role === 'power_user') && (
              <Link to="/admin">Admin</Link>
            )}
            <Link to="/profile">Profile</Link> {/* <-- NEW */}
          </div>
          <div className="nav-right">
            <span style={{ marginRight: '1rem', color: '#5A3E1B' }}>
              Welcome, {user?.first_name}!
            </span>
            <button className="nav-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      </header>

      <main className="main-content">{children}</main>
    </>
  );
}

// Main App Component
export default function App() {
  const [status, setStatus] = useState('Loading…');

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus('Error'));
  }, []);

  return (
    <BrowserRouter>
      <AppContent status={status} />
    </BrowserRouter>
  );
}

// Separate component to use auth context inside Router
function AppContent({ status }) {
  const { user, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  // If user is not logged in, show public layout with only auth routes
  if (!user) {
    return (
      <PublicLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Redirect any other route to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </PublicLayout>
    );
  }

  // User is logged in, show authenticated layout with all app routes
  return (
    <AuthenticatedLayout>
      <Routes>
        {/* Protected routes - all automatically secured */}
        <Route path="/" element={<Home status={status} />} />
        <Route path="/profile" element={<Profile />} /> {/* <-- NEW */}
        
        {/* Admin route with role checking */}
        <Route 
          path="/admin" 
          element={
            user.role === 'admin' || user.role === 'power_user' ? (
              <Admin />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        {/* Redirect auth routes to home if already logged in */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        
        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthenticatedLayout>
  );
}

```

### frontend\src\components\ProtectedRoute.jsx

**Purpose:** Project file: frontend\src\components\ProtectedRoute.jsx

```jsx
// frontend/src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    // User is logged in but doesn't have required role
    return <Navigate to="/" replace />;
  }

  return children;
}
```

### frontend\src\components\PublicLayout.jsx

**Purpose:** Project file: frontend\src\components\PublicLayout.jsx

```jsx
// frontend/src/components/PublicLayout.jsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './PublicLayout.css';

export default function PublicLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      <header className="public-header">
        <div className="public-nav">
          <div className="public-brand">
            <h1>NC Bourbon Tracker</h1>
          </div>
          <div className="public-auth-links">
            {isLoginPage ? (
              <Link to="/register" className="public-link">
                Need an account? Register
              </Link>
            ) : (
              <Link to="/login" className="public-link">
                Have an account? Login
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className="public-main">
        {children}
      </main>
    </>
  );
}
```

### frontend\src\contexts\AuthContext.jsx

**Purpose:** Project file: frontend\src\contexts\AuthContext.jsx

```jsx
// frontend/src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Debug: log when user state changes
  useEffect(() => {
    console.log('User state changed:', user);
  }, [user]);

  // Function to check current authentication status
  const checkAuth = async () => {
    try {
      console.log('Checking auth status...'); // Debug log
      const response = await fetch('/api/whoami', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('Auth check successful:', data.user); // Debug log
        setUser(data.user);
        return data.user;
      } else {
        console.log('Auth check failed'); // Debug log
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to handle login
  const login = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login response:', data); // Debug log
        
        // If login API doesn't return user data, fetch it separately
        if (data.user) {
          console.log('Setting user from login response:', data.user);
          setUser(data.user);
          return { success: true, user: data.user };
        } else {
          // Login succeeded but no user data, fetch it
          console.log('Login succeeded, fetching user data...');
          await checkAuth();
          return { success: true };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Function to handle logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    refreshAuth: checkAuth // Alias for forcing auth refresh
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### frontend\src\main.jsx

**Purpose:** Project file: frontend\src\main.jsx

```jsx
// frontend/main.jsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';  // ← import the provider
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>    {/* ← wrap your app */}
      <App />
    </AuthProvider>
  </StrictMode>,
);

```

### frontend\src\pages\Admin.jsx

**Purpose:** Project file: frontend\src\pages\Admin.jsx

```jsx
// frontend/src/pages/Admin.jsx

import React, { useEffect, useState } from 'react';
import './admin.css';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`Error fetching users: ${res.status}`);
        return res.json();
      })
      .then(setUsers)
      .catch(err => setError(err.toString()));
  }, []);

  const changeRole = (userId, newRole) => {
    fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update role');
        setUsers(us =>
          us.map(u => (u.user_id === userId ? { ...u, role: newRole } : u))
        );
      })
      .catch(err => setError(err.toString()));
  };

  const changeStatus = (userId, newStatus) => {
    fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update status');
        setUsers(us =>
          us.map(u => (u.user_id === userId ? { ...u, status: newStatus } : u))
        );
      })
      .catch(err => setError(err.toString()));
  };

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h1 style={{ color: '#3D2B1F', marginBottom: '1rem' }}>
          Admin: Manage Users
        </h1>

        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id}>
                <td>{u.user_id}</td>
                <td>{u.first_name} {u.last_name}</td>
                <td>{u.email}</td>
                <td>
                  {(u.status === 'pending' || u.status === 'disabled') ? (
                    <button onClick={() => changeStatus(u.user_id, 'active')}>
                      Activate
                    </button>
                  ) : u.status === 'active' ? (
                    <button onClick={() => changeStatus(u.user_id, 'disabled')}>
                      Disable
                    </button>
                  ) : (
                    u.status
                  )}
                </td>
                <td>
                  <select
                    value={u.role}
                    onChange={e => changeRole(u.user_id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="power_user">power_user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

```

### frontend\src\pages\Home.jsx

**Purpose:** Project file: frontend\src\pages\Home.jsx

```jsx
// Home.jsx
import React from 'react';
import './Home.css';

export default function Home({ status }) {
  return (
    <div className="home-page">
      <div className="home-container">
        <h1>NC Bourbon Tracker</h1>
        <p>Backend health: <strong>{status}</strong></p>
      </div>
    </div>
  );
}

```

### frontend\src\pages\Login.jsx

**Purpose:** Project file: frontend\src\pages\Login.jsx

```jsx
// frontend/src/pages/Login.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleChange = e => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login({
      email: formData.email.trim().toLowerCase(),
      password: formData.password
    });

    if (!result.success) {
      setError(result.error || 'Login failed');
      setIsLoading(false);
    }
    // On success, user context updates and triggers redirect
  };

  // Don’t render form while redirecting
  if (user) return null;

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <div className="login-error">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="login-input"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="login-input"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          className="login-button"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

```

### frontend\src\pages\Profile.jsx

**Purpose:** Project file: frontend\src\pages\Profile.jsx

```jsx
// frontend/src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import './profile.css';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState(''); // read-only
  const [phone, setPhone]         = useState(''); // nullable

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (ignore) return;

        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone_number ?? '');
      } catch (err) {
        if (!ignore) setLoadError('Could not load your profile. Please try again.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => { ignore = true; };
  }, []);

  function validateBeforeSave() {
    // If any password fields are filled, require all & make sure they’re valid
    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return 'To change your password, please fill in all three password fields.';
      }
      if (newPassword !== confirmPassword) {
        return 'New password and confirmation do not match.';
      }
      // Optional: front-end strength checks
      if (newPassword.length < 8) {
        return 'New password must be at least 8 characters.';
      }
    }

    // Optional: simple phone sanity check (let backend be source of truth)
    if (phone && !/^[+()\-\s\d]{7,20}$/.test(phone)) {
      return 'Please enter a valid phone number or leave it blank.';
    }

    return null;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    const validation = validateBeforeSave();
    if (validation) {
      setSaveError(validation);
      return;
    }

    setSaving(true);
    try {
      const body = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone?.trim() || null
      };

      // Only include password fields if user is changing the password
      if (currentPassword || newPassword || confirmPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }

      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || `HTTP ${res.status}`);
      }

      setSaveSuccess('Profile updated successfully.');
      // If backend returns updated fields, sync them (nice for phone normalization)
      if (payload?.user) {
        setFirstName(payload.user.first_name ?? firstName);
        setLastName(payload.user.last_name ?? lastName);
        setPhone(payload.user.phone_number ?? phone);
      }

      // Clear password fields after success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSaveError(err.message || 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-viewport">
        <div className="profile-panel">
          <div className="profile-header">
            <h1>My Profile</h1>
          </div>
          <div className="profile-body">
            <p>Loading your profile…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-viewport">
      <div className="profile-panel">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p className="profile-subtitle">Manage your account details and password.</p>
        </div>

        {(loadError || saveError || saveSuccess) && (
          <div className="profile-messages">
            {loadError && <div className="banner banner-error">{loadError}</div>}
            {saveError && <div className="banner banner-error">{saveError}</div>}
            {saveSuccess && <div className="banner banner-success">{saveSuccess}</div>}
          </div>
        )}

        <form className="profile-form" onSubmit={handleSave} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                readOnly
                className="readonly"
                autoComplete="email"
              />
              <small className="hint">Email is managed by the system.</small>
            </div>

            <div className="form-field">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                placeholder="Optional"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>

          <fieldset className="password-section">
            <legend>Change password (optional)</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="currentPassword">Current password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="form-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <small className="hint">
                  Use 8+ characters with a mix of upper/lowercase, numbers & symbols.
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </fieldset>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

```

### frontend\src\pages\Register.jsx

**Purpose:** Project file: frontend\src\pages\Register.jsx

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './register.css';

const passwordChecks = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'A lowercase letter', test: pw => /[a-z]/.test(pw) },
  { label: 'An uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'A number', test: pw => /\d/.test(pw) },
  { label: 'A symbol', test: pw => /\W/.test(pw) },
];

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Password checks
  const passwordResults = passwordChecks.map(check => check.test(form.password));
  const allPasswordOk = passwordResults.every(Boolean);
  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: value,
    }));
    setError('');
    setSuccess('');
  };

  const canSubmit =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.email.trim() &&
    allPasswordOk &&
    passwordsMatch;

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        <div className="register-input-group">
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            className="register-input"
            value={form.first_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="register-input-group">
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            className="register-input"
            value={form.last_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="register-input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="register-input"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Password + confirm password with show/hide */}
        <div className="register-input-group password-toggle-group">
          <label htmlFor="password">Password</label>
          <div className="register-password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="register-input"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="register-toggle-button"
              onClick={() => setShowPassword(s => !s)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <ul className="password-checklist">
            {passwordChecks.map((check, i) => (
              <li key={check.label} className={passwordResults[i] ? 'met' : 'unmet'}>
                {passwordResults[i] ? '✔' : '✗'} {check.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="register-input-group password-toggle-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="register-password-field">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="register-input"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>
          {form.confirmPassword && (
            <div className={passwordsMatch ? "password-match met" : "password-match unmet"}>
              {passwordsMatch ? "✔ Passwords match" : "✗ Passwords do not match"}
            </div>
          )}
        </div>

        {/* Actionable feedback */}
        {error && <div className="register-error">{error}</div>}
        {success && <div className="register-success">{success}</div>}

        <button
          type="submit"
          className="register-button"
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        {allPasswordOk && passwordsMatch && (
          <div className="password-strong-hint">Great, your password is strong!</div>
        )}
      </form>
    </div>
  );
}

```

### frontend\vite.config.js

**Purpose:** Project file: frontend\vite.config.js

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});

```

### project-structure.json

**Purpose:** Project file: project-structure.json

```json
{
  "project_name": "NC Bourbon Tracker",
  "generated_at": "2025-08-10T14:17:31.075226",
  "root_path": "C:\\Users\\JTLew\\source\\repos\\Bourbon-Tracker",
  "architecture": {
    "type": "Full Stack Web Application",
    "frontend": "React + Vite",
    "backend": "Node.js + Express",
    "database": "SQLite",
    "auth": "JWT with HTTP-only cookies",
    "security": "Secure by default architecture"
  },
  "directory_structure": {
    "root": {
      "files": [
        {
          "name": ".env.example",
          "path": ".env.example",
          "size": 0,
          "important": false,
          "type": ".example"
        },
        {
          "name": ".gitignore",
          "path": ".gitignore",
          "size": 41,
          "important": true,
          "type": "no_extension"
        },
        {
          "name": "docker-compose.yml",
          "path": "docker-compose.yml",
          "size": 0,
          "important": true,
          "type": ".yml"
        },
        {
          "name": "document_project.py",
          "path": "document_project.py",
          "size": 19934,
          "important": true,
          "type": ".py"
        },
        {
          "name": "favicon.ico",
          "path": "favicon.ico",
          "size": 15406,
          "important": false,
          "type": ".ico"
        },
        {
          "name": "README.md",
          "path": "README.md",
          "size": 0,
          "important": true,
          "type": ".md"
        },
        {
          "name": "Solution Blueprint.docx",
          "path": "Solution Blueprint.docx",
          "size": 19718,
          "important": false,
          "type": ".docx"
        }
      ],
      "purpose": "Project files"
    },
    "backend": {
      "files": [
        {
          "name": ".env",
          "path": "backend\\.env",
          "size": 191,
          "important": false,
          "type": "no_extension"
        },
        {
          "name": "knexfile.js",
          "path": "backend\\knexfile.js",
          "size": 1271,
          "important": true,
          "type": ".js"
        },
        {
          "name": "package-lock.json",
          "path": "backend\\package-lock.json",
          "size": 100162,
          "important": true,
          "type": ".json"
        },
        {
          "name": "package.json",
          "path": "backend\\package.json",
          "size": 784,
          "important": true,
          "type": ".json"
        },
        {
          "name": "server.js",
          "path": "backend\\server.js",
          "size": 1689,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "Node.js backend server"
    },
    "backend\\config": {
      "files": [
        {
          "name": "db.js",
          "path": "backend\\config\\db.js",
          "size": 506,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "Project files"
    },
    "backend\\controllers": {
      "files": [
        {
          "name": "adminController.js",
          "path": "backend\\controllers\\adminController.js",
          "size": 1442,
          "important": true,
          "type": ".js"
        },
        {
          "name": "authController.js",
          "path": "backend\\controllers\\authController.js",
          "size": 6265,
          "important": true,
          "type": ".js"
        },
        {
          "name": "userController.js",
          "path": "backend\\controllers\\userController.js",
          "size": 3222,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "Project files"
    },
    "backend\\data": {
      "files": [
        {
          "name": "database.sqlite3",
          "path": "backend\\data\\database.sqlite3",
          "size": 106496,
          "important": false,
          "type": ".sqlite3"
        }
      ],
      "purpose": "Project files"
    },
    "backend\\middleware": {
      "files": [
        {
          "name": "authMiddleware.js",
          "path": "backend\\middleware\\authMiddleware.js",
          "size": 743,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "Project files"
    },
    "backend\\migrations": {
      "files": [
        {
          "name": "20250802013046_create_users_table.js",
          "path": "backend\\migrations\\20250802013046_create_users_table.js",
          "size": 720,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805012817_create_stores_table.js",
          "path": "backend\\migrations\\20250805012817_create_stores_table.js",
          "size": 674,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805013223_create_boards_table.js",
          "path": "backend\\migrations\\20250805013223_create_boards_table.js",
          "size": 414,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805013332_create_alcohol_table.js",
          "path": "backend\\migrations\\20250805013332_create_alcohol_table.js",
          "size": 843,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805013533_create_bourbons_table.js",
          "path": "backend\\migrations\\20250805013533_create_bourbons_table.js",
          "size": 492,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805013827_create_current_inventory_table.js",
          "path": "backend\\migrations\\20250805013827_create_current_inventory_table.js",
          "size": 715,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805014216_create_inventory_history_table.js",
          "path": "backend\\migrations\\20250805014216_create_inventory_history_table.js",
          "size": 682,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805014453_create_warehouse_inventory_history_v2_table.js",
          "path": "backend\\migrations\\20250805014453_create_warehouse_inventory_history_v2_table.js",
          "size": 829,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805014727_create_shipments_history_table.js",
          "path": "backend\\migrations\\20250805014727_create_shipments_history_table.js",
          "size": 712,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250805021555_add_status_to_users.js",
          "path": "backend\\migrations\\20250805021555_add_status_to_users.js",
          "size": 671,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250808000100_add_phone_number_to_users.js",
          "path": "backend\\migrations\\20250808000100_add_phone_number_to_users.js",
          "size": 381,
          "important": true,
          "type": ".js"
        },
        {
          "name": "20250809034338_add_updated_at_to_users.js",
          "path": "backend\\migrations\\20250809034338_add_updated_at_to_users.js",
          "size": 420,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "Project files"
    },
    "backend\\models": {
      "files": [],
      "purpose": "Project files"
    },
    "backend\\routes": {
      "files": [
        {
          "name": "adminRoutes.js",
          "path": "backend\\routes\\adminRoutes.js",
          "size": 695,
          "important": true,
          "type": ".js"
        },
        {
          "name": "authRoutes.js",
          "path": "backend\\routes\\authRoutes.js",
          "size": 646,
          "important": true,
          "type": ".js"
        },
        {
          "name": "userRoutes.js",
          "path": "backend\\routes\\userRoutes.js",
          "size": 3689,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "Project files"
    },
    "backend\\seed": {
      "files": [
        {
          "name": "seed_admin.js",
          "path": "backend\\seed\\seed_admin.js",
          "size": 982,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "Project files"
    },
    "frontend": {
      "files": [
        {
          "name": ".gitignore",
          "path": "frontend\\.gitignore",
          "size": 253,
          "important": true,
          "type": "no_extension"
        },
        {
          "name": "eslint.config.js",
          "path": "frontend\\eslint.config.js",
          "size": 763,
          "important": true,
          "type": ".js"
        },
        {
          "name": "index.html",
          "path": "frontend\\index.html",
          "size": 370,
          "important": false,
          "type": ".html"
        },
        {
          "name": "package-lock.json",
          "path": "frontend\\package-lock.json",
          "size": 97411,
          "important": true,
          "type": ".json"
        },
        {
          "name": "package.json",
          "path": "frontend\\package.json",
          "size": 638,
          "important": true,
          "type": ".json"
        },
        {
          "name": "README.md",
          "path": "frontend\\README.md",
          "size": 856,
          "important": true,
          "type": ".md"
        },
        {
          "name": "vite.config.js",
          "path": "frontend\\vite.config.js",
          "size": 432,
          "important": true,
          "type": ".js"
        }
      ],
      "purpose": "React frontend application"
    },
    "frontend\\public": {
      "files": [
        {
          "name": "favicon.ico",
          "path": "frontend\\public\\favicon.ico",
          "size": 15406,
          "important": false,
          "type": ".ico"
        },
        {
          "name": "vite.svg",
          "path": "frontend\\public\\vite.svg",
          "size": 1497,
          "important": false,
          "type": ".svg"
        }
      ],
      "purpose": "Project files"
    },
    "frontend\\public\\images": {
      "files": [
        {
          "name": "admin-bg.jpg",
          "path": "frontend\\public\\images\\admin-bg.jpg",
          "size": 5045813,
          "important": false,
          "type": ".jpg"
        },
        {
          "name": "home-bg.jpg",
          "path": "frontend\\public\\images\\home-bg.jpg",
          "size": 363471,
          "important": false,
          "type": ".jpg"
        },
        {
          "name": "login-bg.jpg",
          "path": "frontend\\public\\images\\login-bg.jpg",
          "size": 2773911,
          "important": false,
          "type": ".jpg"
        },
        {
          "name": "profile-bg.jpg",
          "path": "frontend\\public\\images\\profile-bg.jpg",
          "size": 4428769,
          "important": false,
          "type": ".jpg"
        },
        {
          "name": "register-bg.jpg",
          "path": "frontend\\public\\images\\register-bg.jpg",
          "size": 273487,
          "important": false,
          "type": ".jpg"
        }
      ],
      "purpose": "Project files"
    },
    "frontend\\src": {
      "files": [
        {
          "name": "App.css",
          "path": "frontend\\src\\App.css",
          "size": 1854,
          "important": true,
          "type": ".css"
        },
        {
          "name": "App.jsx",
          "path": "frontend\\src\\App.jsx",
          "size": 3884,
          "important": true,
          "type": ".jsx"
        },
        {
          "name": "index.css",
          "path": "frontend\\src\\index.css",
          "size": 1370,
          "important": true,
          "type": ".css"
        },
        {
          "name": "main.jsx",
          "path": "frontend\\src\\main.jsx",
          "size": 413,
          "important": true,
          "type": ".jsx"
        }
      ],
      "purpose": "Project files"
    },
    "frontend\\src\\assets": {
      "files": [
        {
          "name": "react.svg",
          "path": "frontend\\src\\assets\\react.svg",
          "size": 4126,
          "important": false,
          "type": ".svg"
        }
      ],
      "purpose": "Project files"
    },
    "frontend\\src\\components": {
      "files": [
        {
          "name": "ProtectedRoute.jsx",
          "path": "frontend\\src\\components\\ProtectedRoute.jsx",
          "size": 783,
          "important": true,
          "type": ".jsx"
        },
        {
          "name": "PublicLayout.css",
          "path": "frontend\\src\\components\\PublicLayout.css",
          "size": 1428,
          "important": true,
          "type": ".css"
        },
        {
          "name": "PublicLayout.jsx",
          "path": "frontend\\src\\components\\PublicLayout.jsx",
          "size": 1017,
          "important": true,
          "type": ".jsx"
        }
      ],
      "purpose": "Project files"
    },
    "frontend\\src\\contexts": {
      "files": [
        {
          "name": "AuthContext.jsx",
          "path": "frontend\\src\\contexts\\AuthContext.jsx",
          "size": 3250,
          "important": true,
          "type": ".jsx"
        }
      ],
      "purpose": "Project files"
    },
    "frontend\\src\\pages": {
      "files": [
        {
          "name": "admin.css",
          "path": "frontend\\src\\pages\\admin.css",
          "size": 1521,
          "important": true,
          "type": ".css"
        },
        {
          "name": "Admin.jsx",
          "path": "frontend\\src\\pages\\Admin.jsx",
          "size": 3424,
          "important": true,
          "type": ".jsx"
        },
        {
          "name": "Home.css",
          "path": "frontend\\src\\pages\\Home.css",
          "size": 740,
          "important": true,
          "type": ".css"
        },
        {
          "name": "Home.jsx",
          "path": "frontend\\src\\pages\\Home.jsx",
          "size": 324,
          "important": true,
          "type": ".jsx"
        },
        {
          "name": "Login.css",
          "path": "frontend\\src\\pages\\Login.css",
          "size": 2031,
          "important": true,
          "type": ".css"
        },
        {
          "name": "Login.jsx",
          "path": "frontend\\src\\pages\\Login.jsx",
          "size": 2357,
          "important": true,
          "type": ".jsx"
        },
        {
          "name": "profile.css",
          "path": "frontend\\src\\pages\\profile.css",
          "size": 3327,
          "important": true,
          "type": ".css"
        },
        {
          "name": "Profile.jsx",
          "path": "frontend\\src\\pages\\Profile.jsx",
          "size": 9038,
          "important": true,
          "type": ".jsx"
        },
        {
          "name": "register.css",
          "path": "frontend\\src\\pages\\register.css",
          "size": 3573,
          "important": true,
          "type": ".css"
        },
        {
          "name": "Register.jsx",
          "path": "frontend\\src\\pages\\Register.jsx",
          "size": 6307,
          "important": true,
          "type": ".jsx"
        }
      ],
      "purpose": "Project files"
    }
  },
  "file_summary": {
    "total_files": 67,
    "important_files": 53,
    "file_types": {
      ".example": 1,
      "no_extension": 3,
      ".yml": 1,
      ".py": 1,
      ".ico": 2,
      ".md": 2,
      ".docx": 1,
      ".js": 25,
      ".json": 4,
      ".sqlite3": 1,
      ".html": 1,
      ".svg": 2,
      ".jpg": 5,
      ".css": 8,
      ".jsx": 10
    }
  },
  "key_decisions": [
    "Implemented secure-by-default authentication",
    "Separated PublicLayout vs AuthenticatedLayout",
    "JWT stored in HTTP-only cookies",
    "Role-based access control (admin, power_user, user)",
    "Full-width background images on all pages"
  ]
}
```


## Frontend - Styling

### frontend\src\App.css

**Purpose:** Project file: frontend\src\App.css

```css
/* App.css */

/* Reset any body/html backgrounds that might interfere */
body, html {
  margin: 0;
  padding: 0;
  background: none;
}

/* Fixed header at the top */
.main-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: #f0e6d2;
  padding: 1rem;
  box-sizing: border-box;
  z-index: 100;
}

/* Flex nav with space between left & right */
.main-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-left,
.nav-right {
  display: flex;
  gap: 1rem;
}

/* Push page content below the header */
.main-content {
  padding-top: 4rem; /* adjust if your header is taller */
  /* Remove any backgrounds that could interfere */
  background: none;
  /* Ensure full width and height for page backgrounds */
  width: 100vw;
  min-height: calc(100vh - 4rem);
  margin-left: calc(-50vw + 50%); /* Break out of container constraints */
}

#root {
  max-width: 1280px; /* Restore original container width for content */
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  background: none; /* Ensure no background here */
  position: relative;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

/* make our nav-button look like a link */
.nav-button {
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.nav-button:hover {
  color: #0066cc;
}
```

### frontend\src\components\PublicLayout.css

**Purpose:** Project file: frontend\src\components\PublicLayout.css

```css
/* PublicLayout.css */

/* Minimal header for public pages */
.public-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: rgba(240, 230, 210, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem;
  box-sizing: border-box;
  z-index: 100;
  border-bottom: 1px solid rgba(140, 107, 61, 0.3);
}

.public-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.public-brand h1 {
  margin: 0;
  color: #3D2B1F;
  font-size: 1.5rem;
  font-weight: bold;
}

.public-auth-links {
  display: flex;
  gap: 1rem;
}

.public-link {
  color: #264653;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease;
}

.public-link:hover {
  background-color: rgba(38, 70, 83, 0.1);
  text-decoration: underline;
}

/* Main content area - allow full-width backgrounds */
.public-main {
  padding-top: 5rem; /* Space for fixed header */
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding-left: 0;
  padding-right: 0;
  position: relative;
  overflow-x: hidden; /* Prevent horizontal scroll from full-width elements */
  margin-left: calc(-50vw + 50%); /* Break out of any container constraints for full-width backgrounds */
}

/* Reset any global styles that might interfere */
.public-main * {
  box-sizing: border-box;
}
```

### frontend\src\index.css

**Purpose:** Project file: frontend\src\index.css

```css
/* frontend/src/index.css */

:root {
  /* Typography defaults and font smoothing */
  line-height: 1.5;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  /* Base font + centering content */
  margin: 0;
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;

  /* Wood-plank background */
  background: url('/images/wood.jpg') center/cover no-repeat;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  /* Light-mode tweaks */
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}

/* Override nav links in the header to match our form labels */
header nav a {
  color: #5A3E1B;
}

header nav a:hover {
  color: #5A3E1B;
}

```

### frontend\src\pages\Home.css

**Purpose:** Project file: frontend\src\pages\Home.css

```css
/* Home.css */

/* Full‐viewport background for Home */
.home-page {
  min-height: calc(100vh - 4rem); /* subtract header height */
  width: 100vw;
  background: url('/images/home-bg.jpg') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  /* Ensure this background covers any underlying backgrounds */
  position: relative;
  z-index: 1;
  /* Break out of container to use full width */
  margin-left: calc(-50vw + 50%);
}

/* White card in the center */
.home-container {
  background: rgba(255, 255, 255, 0.9);
  padding: 2rem;
  border-radius: 0.5rem;
  text-align: center;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### frontend\src\pages\Login.css

**Purpose:** Project file: frontend\src\pages\Login.css

```css
/* Login.css */

/* Full‐viewport background for Login */
.login-page {
  min-height: 100vh;
  width: 100vw;
  background: url('/images/login-bg.jpg') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  /* Remove the container breakout - not needed in PublicLayout */
  margin: 0;
  padding: 0;
}

/* White card container (over the background) */
.login-form {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 2.5rem 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 1rem; /* Add side margins for mobile */
}

/* Header */
.login-form h2 {
  margin-bottom: 1.5rem;
  color: #3D2B1F;
  text-align: center;
}

/* Labels */
.login-form label {
  align-self: flex-start;
  margin-bottom: 0.25rem;
  font-weight: bold;
  color: #5A3E1B;
}

/* Inputs */
.login-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #D3B8AE;
  border-radius: 0.5rem;
  margin-bottom: 1.25rem;
  font-size: 1rem;
  box-sizing: border-box;
}

.login-input:focus {
  outline: none;
  border-color: #264653;
  box-shadow: 0 0 0 2px rgba(38, 70, 83, 0.2);
}

/* Button */
.login-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #264653;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.125rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.login-button:hover {
  background-color: #1B3642;
}

.login-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Error message */
.login-error {
  align-self: flex-start;
  color: #B91C1C;
  background-color: #FEE2E2;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  width: 100%;
  text-align: center;
  border: 1px solid #B91C1C;
  box-sizing: border-box;
}
```

### frontend\src\pages\admin.css

**Purpose:** Project file: frontend\src\pages\admin.css

```css
/* frontend/src/pages/Admin.css */

/* Full-screen background */
.admin-page {
  padding: 2rem;
  min-height: calc(100vh - 4rem);
  width: 100vw;
  background: url('/images/admin-bg.jpg') center/cover no-repeat;
  box-sizing: border-box;
  /* Ensure this background covers any underlying backgrounds */
  position: relative;
  z-index: 1;
  /* Break out of container to use full width */
  margin-left: calc(-50vw + 50%);
}

.admin-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Table spacing so each row is isolated */
.user-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 1rem; /* vertical gap between rows */
}

/* Header row styling */
.user-table thead th {
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.8);
  color: #3D2B1F;
  text-align: left;
  border-bottom: 2px solid #8C6B3D; /* thick line under headers */
}

/* Each user in its own "box" */
.user-table tbody tr {
  display: table-row;
  background-color: #F6E0C4; /* cream background */
  border: 3px solid #8C6B3D;  /* thick outer border */
  border-radius: 0.5rem;
  overflow: hidden;
}

/* Cells: padding + thin dividers */
.user-table tbody td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #ccc; /* thin horizontal line under each cell */
}

/* Vertical lines between cells */
.user-table tbody td:not(:last-child) {
  border-right: 1px solid #ccc;
}
```

### frontend\src\pages\profile.css

**Purpose:** Project file: frontend\src\pages\profile.css

```css
/* frontend/src/pages/profile.css */

/* 
  Background image:
  - Tries .jpb first (as requested)
  - Falls back to .jpg if .jpb isn't present
*/
.profile-viewport {
  min-height: 100vh;
  background-image:
    url('/images/profile-bg.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  display: grid;
  place-items: center;
  padding: 2rem;
}

/* Panel */
.profile-panel {
  width: min(960px, 100%);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

/* Header */
.profile-header {
  padding: 1.5rem 1.75rem 1rem;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.6));
}

.profile-header h1 {
  margin: 0 0 0.25rem;
  font-size: 1.6rem;
  color: #2a1a0a;
  letter-spacing: 0.2px;
}

.profile-subtitle {
  margin: 0;
  color: #6b5a4a;
}

/* Messages */
.profile-messages {
  padding: 1rem 1.75rem 0 1.75rem;
}

.banner {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.banner-error {
  background: #ffe8e5;
  color: #8c1b11;
  border: 1px solid #f3b0a9;
}

.banner-success {
  background: #e9f8ee;
  color: #0f5a2a;
  border: 1px solid #b9e3c9;
}

/* Form */
.profile-form {
  padding: 1.25rem 1.75rem 1.75rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem 1rem;
}

.form-field {
  grid-column: span 12;
  display: flex;
  flex-direction: column;
}

@media (min-width: 720px) {
  .form-field { grid-column: span 6; }
  /* email can be full width if you prefer:
     .form-field.email { grid-column: span 12; }
  */
}

.form-field label {
  font-weight: 600;
  color: #3b2a1a;
  margin-bottom: 0.35rem;
}

.form-field input {
  border: 1px solid #d7cfc8;
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  font-size: 1rem;
  outline: none;
  background: #fff;
  transition: box-shadow 120ms ease, border-color 120ms ease;
}

.form-field input:focus {
  border-color: #b08c6e;
  box-shadow: 0 0 0 3px rgba(176, 140, 110, 0.2);
}

.form-field input.readonly {
  background: #f8f6f4;
  color: #6e6a66;
}

.hint {
  color: #7a6b5d;
  margin-top: 0.35rem;
  font-size: 0.9rem;
}

/* Password section */
.password-section {
  margin-top: 1.25rem;
  padding: 1rem;
  border: 1px dashed #d7cfc8;
  border-radius: 12px;
  background: #fffdfb;
}

.password-section legend {
  padding: 0 0.3rem;
  color: #4b3626;
  font-weight: 700;
}

/* Actions */
.form-actions {
  margin-top: 1.25rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-primary {
  background: #6a451f;
  color: white;
  border: none;
  padding: 0.75rem 1.1rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.btn-primary:hover {
  background: #7b5227;
  box-shadow: 0 6px 18px rgba(106, 69, 31, 0.25);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #bda999;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

```

### frontend\src\pages\register.css

**Purpose:** Project file: frontend\src\pages\register.css

```css
/* Register.css */

/* Full‐viewport background for Register */
.register-page {
  min-height: 100vh;
  width: 100vw;
  background: url('/images/register-bg.jpg') center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  /* Remove the container breakout - not needed in PublicLayout */
  margin: 0;
  padding: 0;
}

/* White card container (over the background) */
.register-form {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 2.5rem 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 450px;  /* Slightly wider for more fields */
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 1rem; /* Add side margins for mobile */
}

/* Header */
.register-form h2 {
  margin-bottom: 1.5rem;
  color: #3D2B1F;
  text-align: center;
}

/* Input groups */
.register-input-group {
  width: 100%;
  margin-bottom: 1.25rem;
}

/* Labels */
.register-form label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: bold;
  color: #5A3E1B;
  text-align: left;
}

/* Inputs */
.register-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #D3B8AE;
  border-radius: 0.5rem;
  font-size: 1rem;
  box-sizing: border-box;
}

.register-input:focus {
  outline: none;
  border-color: #264653;
  box-shadow: 0 0 0 2px rgba(38, 70, 83, 0.2);
}

/* Button */
.register-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #264653;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.125rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-top: 1rem;
}

.register-button:hover {
  background-color: #1B3642;
}

.register-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Success/Error messages */
.register-success {
  color: #2D5A27;
  background-color: #D4F4DD;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  text-align: center;
  border: 1px solid #2D5A27;
  width: 100%;
  box-sizing: border-box;
}

.register-error {
  color: #B91C1C;
  background-color: #FEE2E2;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-top: 1rem;
  text-align: center;
  border: 1px solid #B91C1C;
  width: 100%;
  box-sizing: border-box;
}

/* Password toggle styles */
.register-password-field {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.register-toggle-button {
  position: absolute;
  right: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.15rem;
  color: #5A3E1B;
  padding: 0 0.2rem;
  z-index: 2;
}

.register-toggle-button:focus {
  outline: 2px solid #264653;
}

/* Optional: reduce gap under password fields */
.password-toggle-group {
  margin-bottom: 1rem;
}
/* Password checklist and feedback */
.password-checklist {
  margin: 0.5rem 0 0.2rem 0;
  padding-left: 1.2em;
  font-size: 0.98rem;
  color: #333;
  list-style: none;
}
.password-checklist li {
  margin-bottom: 2px;
}
.password-checklist .met {
  color: #2D5A27;
}
.password-checklist .unmet {
  color: #B91C1C;
}

.password-match {
  font-size: 0.98rem;
  margin-top: 0.15rem;
}
.password-match.met {
  color: #2D5A27;
}
.password-match.unmet {
  color: #B91C1C;
}

.password-strong-hint {
  color: #2D5A27;
  margin-top: 0.3rem;
  font-weight: 600;
  text-align: center;
}

```

