# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NC Bourbon Tracker is a web application for tracking bourbon inventory across North Carolina ABC stores. The system uses a dual-database architecture with separate databases for user authentication and inventory tracking.

## Development Commands

### Backend (Node.js/Express)
```bash
cd backend
npm install          # Install dependencies
npm start            # Start production server (node server.js)
node server.js       # Direct server start

# Database operations
npx knex migrate:latest    # Run migrations
npx knex seed:run         # Run seeds
```

### Frontend (React/Vite)
```bash
cd frontend
npm install          # Install dependencies
npm run dev         # Start development server with hot reload
npm run build       # Build for production
npm run lint        # Run ESLint
npm run preview     # Preview production build locally
```

### Development Setup
1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev` 
3. Frontend development server runs on port 5173 with proxy to backend on port 3000

## Architecture

### Database Architecture (Dual Database System)
- **User Database**: SQLite at `backend/data/database.sqlite3` - handles authentication, user management
- **Inventory Database**: SQLite at `BourbonDatabase/inventory.db` (dev) or `/opt/BourbonDatabase/inventory.db` (prod) - handles bourbon inventory data
- **Query Builder**: Knex.js configured for both databases in `backend/config/db.js`
- **Migrations**: Located in `backend/migrations/` for user database schema

### Backend Structure
- **Framework**: Express.js with ES modules (`"type": "module"`)
- **Authentication**: JWT tokens stored in HTTP-only cookies, custom middleware at `backend/middleware/authMiddleware.js`
- **Security**: Helmet, CORS, rate limiting, CSP headers configured
- **Email Service**: Nodemailer integration with HTML templates in `backend/templates/`
- **Controllers**: Separate controllers for auth, admin, user, and inventory operations
- **Routes**: Modular routing structure in `backend/routes/`

### Frontend Structure  
- **Framework**: React 19 with React Router DOM
- **Build Tool**: Vite with development proxy configuration
- **Authentication**: Context-based auth management in `frontend/src/contexts/AuthContext.jsx`
- **Layout**: Protected routes with `AuthenticatedLayout` component
- **Pages**: Login, Register, Home, Admin, Profile, CurrentInventory, DeliveryAnalysis, TodaysArrivals
- **Email Verification**: Complete flow with verification pages and success handling

### Key Configuration Files
- `backend/knexfile.js` - Database migration configuration
- `frontend/vite.config.js` - Development proxy setup (`/api` and `/health` routes to localhost:3000)
- `backend/config/db.js` - Dual database connection setup
- Environment variables required: `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`

### Security Implementation
- JWT authentication with HTTP-only cookies
- Email verification system with HTML templates
- Role-based access control (admin, power_user roles)
- Rate limiting and security headers
- Production proxy trust configuration for Nginx deployment

### Email System
- Nodemailer service in `backend/services/emailService.js`
- HTML templates: admin-notification, approval, email-verification, welcome
- Email verification workflow implemented

## Database Schema Details

### User Database Tables
- **users**: Complete user management with email verification, roles (admin, power_user, user), and status (pending, active, disabled)
- **knex_migrations**: Database migration tracking
- Email verification fields: `verification_token`, `verification_token_expires`, `email_verified`, `verification_attempts`

### Inventory Database Tables  
- **stores**: NC ABC stores with regions, nicknames, delivery tracking
- **alcohol**: Complete product catalog with NC codes, pricing, suppliers, brokers
- **bourbons**: Focused bourbon/whiskey tracking with PLU codes
- **current_inventory**: Real-time store inventory levels
- **inventory_history**: Historical inventory changes with change types ('up','down','zero','first','seed')
- **boards**: ABC board information for shipment tracking
- **shipments_history**: Historical shipment data with NC codes and quantities
- **warehouse_inventory_history_v2**: State warehouse inventory tracking

## API Endpoints Reference

### Authentication (`/api/auth/`)
- `POST /register` - User registration with email verification
- `POST /login` - JWT cookie authentication  
- `POST /logout` - Clear authentication cookies
- `POST /verify-email` - Email verification with 6-digit codes
- `POST /resend-verification` - Resend verification emails
- `GET /whoami` - Get current user info
- `POST /change-password` - Password changes

### Inventory (`/api/inventory/`) - Protected Routes
- `GET /test` - Database connection test
- `GET /todays-arrivals` - Today's new inventory arrivals
- `GET /summary` - Inventory summary statistics  
- `GET /allocated-current` - Current allocated product inventory
- `GET /product/:plu/stores` - Store availability for specific product
- `GET /search/:term` - Search allocated products
- `POST /delivery-analysis` - Generate delivery pattern analysis
- `POST /stores-without-deliveries` - Find stores missing deliveries
- `GET /warehouse-inventory` - State warehouse inventory
- `GET /shipments` - Historical shipment data
- `GET /store-inventory/:storeId` - Individual store inventory
- `GET /product-history/:plu` - Product inventory history

### Warehouse Reports (`/api/reports/`) - Protected Routes - **OPTIMIZED ARCHITECTURE**
- `GET /warehouse-inventory` - High-performance warehouse inventory reports with client-side filtering
- `GET /status` - Report generation status and metadata
- `POST /generate` - Admin-only manual report generation trigger

### Admin (`/api/admin/`) - Admin Only
- `GET /users` - List all users for management
- `PATCH /users/:userId/role` - Update user roles
- `PATCH /users/:userId/status` - Activate/disable users

### User (`/api/user/`) - Protected Routes  
- `GET /me` - Get user profile
- `PUT /me` - Update user profile

## Rate Limiting & Security - **OPTIMIZED**

- General API: 100 requests per 15 minutes (5000 in development)
- **Report endpoints**: 50 requests per 15 minutes (1000 in development) - Higher limits for warehouse data
- Authentication endpoints: 5 attempts per 15 minutes  
- Registration: 3 attempts per hour
- Email verification: Rate limited to prevent spam
- **Smart rate limiting**: 304 Not Modified responses bypass rate limits entirely
- **Response compression**: Gzip compression (level 6) for all JSON responses over 1KB
- Helmet security headers with CSP policies
- Production proxy trust configuration for Nginx

## Email System Architecture

- **Service**: Nodemailer with Gmail SMTP (port 587)
- **Templates**: HTML email templates in `backend/templates/`
  - `email-verification.html` - 6-digit verification codes
  - `welcome.html` - Welcome message after verification
  - `admin-notification.html` - Admin notification of new registrations  
  - `approval.html` - Account approval notifications
- **Template Processing**: `{{variable}}` placeholder replacement
- **Environment Variables**: `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM_NAME`, `ADMIN_EMAIL`
- **Brand**: WakePour branding throughout email templates

## Warehouse Inventory Reporting System - **HIGH-PERFORMANCE ARCHITECTURE**

### **Python Report Generation (Cron Jobs)**
- **Script**: `warehouse_inventory_generator.py` - Generates JSON files via scheduled cron jobs
- **Schedule**: 3 times daily (morning, midday, evening) to match business needs
- **Time Periods**: current_month, last_30_days, last_90_days, last_180_days
- **Output Directory**: `./warehouse-reports/` (dev) or `/opt/warehouse-reports/` (prod)
- **Data Processing**: Alphabetical sorting, comprehensive product statistics
- **File Size**: ~1.6MB JSON files with full product datasets

### **Optimized API Architecture**
- **No Server-Side Filtering**: API returns complete datasets, all filtering done client-side
- **HTTP Caching**: ETag validation with 4-hour cache control headers
- **304 Not Modified**: Efficient cache validation with minimal bandwidth
- **Gzip Compression**: ~70% size reduction (1.6MB → ~400KB compressed)
- **Request Deduplication**: Prevents duplicate API calls for same data

### **Frontend Performance Optimizations**
- **Client-Side Filtering**: Product types, search, zero activity - all instant browser filtering
- **Smart Caching**: 4-hour localStorage cache aligned with 3x daily refresh schedule
- **Single Download Per Period**: Download full JSON once, unlimited filtering without server requests
- **ETag Cache Validation**: Automatic freshness checks without full re-downloads
- **Zero Network Impact**: Filter changes, search, and product type selection require no server calls

### **Performance Benefits**
- **90% Server Load Reduction**: Filter operations moved to client browsers
- **Unlimited Concurrent Users**: Multiple users can filter data simultaneously
- **Zero Rate Limiting**: Normal filtering usage never hits rate limits
- **Instant User Experience**: All filtering operations are immediate
- **Bandwidth Efficient**: Smart caching and compression minimize data transfer

### **File Structure**
```
warehouse-reports/
├── warehouse_inventory_current_month.json     (~1.6MB)
├── warehouse_inventory_last_30_days.json
├── warehouse_inventory_last_90_days.json
├── warehouse_inventory_last_180_days.json
├── reports_index.json                         (metadata)
├── current_month_metadata.json               (quick stats)
└── generator.log                             (processing logs)
```

### **Cron Job Setup (Production)**
```bash
# Generate warehouse reports 3x daily
0 8 * * * /usr/bin/python3 /opt/bourbon-scripts/warehouse_inventory_generator.py
0 13 * * * /usr/bin/python3 /opt/bourbon-scripts/warehouse_inventory_generator.py  
0 17 * * * /usr/bin/python3 /opt/bourbon-scripts/warehouse_inventory_generator.py
```

## Future Implementation: Delivery Date Tracking

A comprehensive delivery tracking system is planned with:
- **store_deliveries** table for historical delivery date tracking
- **Dual-field approach**: recorded vs assigned delivery dates
- **Pattern learning**: Automatic detection of store delivery weekdays
- **Timezone handling**: America/New_York timezone for all date operations
- **Nightly ETL job**: End-of-day reconciliation of inventory changes
- **Backfill capability**: Historical data population from existing inventory_history

## Important Notes

- Uses ES modules throughout backend (`import/export` syntax)
- Dual database architecture requires importing both `userDb` and `inventoryDb` from `backend/config/db.js`
- Development frontend runs on port 5173, backend on port 3000
- Production deployment expects Nginx reverse proxy setup
- Email functionality requires proper environment configuration
- Timezone operations should use America/New_York (not UTC) for delivery tracking
- Inventory analysis focuses on allocated products (Allocation, Limited, Barrel listing types)

### **Performance Architecture Notes**
- **Warehouse reports**: Use Python cron jobs for data generation + client-side filtering for performance
- **No server-side filtering**: Always download complete datasets and filter in browser
- **Cache alignment**: 4-hour frontend cache matches 3x daily report generation schedule
- **Rate limiting**: Report endpoints have higher limits than general API
- **Compression**: Gzip enabled for all JSON responses over 1KB
- **ETag validation**: Prevents unnecessary downloads when data hasn't changed