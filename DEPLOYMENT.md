# NC Bourbon Tracker - Production Deployment Guide

## Prerequisites

- Ubuntu 20.04+ server
- Node.js 20+
- Nginx
- PM2
- SSL certificate (Let's Encrypt recommended)
- Optional: AWS CLI for S3 backups

## Directory Structure

```
/opt/bourbon-tracker/          # Main application
├── server.js                  # Backend server
├── package.json
├── ecosystem.config.js        # PM2 configuration
├── .env                       # Environment variables
├── data/                      # SQLite user database
├── logs/                      # Application logs
├── backups/                   # Local database backups
└── scripts/                   # Maintenance scripts

/opt/BourbonDatabase/          # Inventory database
└── inventory.db               # Main inventory SQLite database

/opt/alcohol_images/             # Static assets
└── alcohol_images/            # Product images

/var/log/bourbon-tracker/      # PM2 logs
├── combined.log
├── out.log
└── error.log
```

## Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Create directories
sudo mkdir -p /opt/bourbon-tracker
sudo mkdir -p /opt/BourbonDatabase
sudo mkdir -p /opt/alcohol_images
sudo mkdir -p /var/log/bourbon-tracker

# Set permissions
sudo chown -R $USER:$USER /opt/bourbon-tracker
sudo chown -R $USER:$USER /var/log/bourbon-tracker
```

## Step 2: Application Deployment

```bash
# Clone repository
cd /opt
sudo git clone <your-repo-url> bourbon-tracker
cd bourbon-tracker

# Install dependencies
npm install --production

# Copy environment file
cp .env.example .env

# Edit environment variables
sudo nano .env
```

### Required Environment Variables (.env)

```bash
# Core
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://wakepour.com

# Authentication
JWT_SECRET=<generate-64-char-random-string>
EMAIL_USER=<your-gmail>
EMAIL_PASS=<gmail-app-password>
EMAIL_FROM_NAME=WakePour
ADMIN_EMAIL=<admin-email>

# Database
DB_CLIENT=sqlite3
DATABASE_URL=/opt/bourbon-tracker/data/database.sqlite3
INVENTORY_DATABASE_URL=/opt/BourbonDatabase/inventory.db

# File Storage
IMAGES_DIR=/opt/alcohol_images

# Security
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

## Step 3: Database Setup

```bash
# Copy your existing databases
sudo cp /path/to/your/user-database.sqlite3 /opt/bourbon-tracker/data/database.sqlite3
sudo cp /path/to/your/inventory.db /opt/BourbonDatabase/inventory.db

# Set permissions
sudo chown $USER:$USER /opt/bourbon-tracker/data/database.sqlite3
sudo chown $USER:$USER /opt/BourbonDatabase/inventory.db
sudo chmod 664 /opt/bourbon-tracker/data/database.sqlite3
sudo chmod 664 /opt/BourbonDatabase/inventory.db
```

## Step 4: PM2 Setup

```bash
# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the displayed command to complete setup

# Verify PM2 is running
pm2 status
pm2 logs bourbon-tracker-api
```

## Step 5: Nginx Configuration

```bash
# Copy nginx configuration
sudo cp nginx-site.conf /etc/nginx/sites-available/bourbon-tracker

# Update domain names in config
sudo nano /etc/nginx/sites-available/bourbon-tracker

# Enable site
sudo ln -s /etc/nginx/sites-available/bourbon-tracker /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d wakepour.com -d www.wakepour.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## Step 7: Logging Setup

```bash
# Copy logrotate configuration
sudo cp logrotate.conf /etc/logrotate.d/bourbon-tracker

# Test logrotate
sudo logrotate -f /etc/logrotate.d/bourbon-tracker
```

## Step 8: Backup Setup

```bash
# Copy backup script
sudo cp scripts/backup-database.sh /opt/bourbon-tracker/scripts/
sudo chmod +x /opt/bourbon-tracker/scripts/backup-database.sh

# Add to crontab for nightly backups
crontab -e
# Add this line:
0 2 * * * /opt/bourbon-tracker/scripts/backup-database.sh >> /var/log/bourbon-tracker/backup.log 2>&1
```

## Step 9: Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (be careful!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## Step 10: Health Checks

```bash
# Check application status
curl https://wakepour.com/health

# Check PM2 status
pm2 status

# Check nginx status
sudo systemctl status nginx

# Check logs
pm2 logs bourbon-tracker-api
sudo tail -f /var/log/nginx/bourbon-tracker.access.log
```

## Maintenance Commands

### Update Application
```bash
cd /opt/bourbon-tracker
git pull origin main
npm install --production
pm2 reload ecosystem.config.js --env production
```

### Backup Database
```bash
/opt/bourbon-tracker/scripts/backup-database.sh
```

### View Logs
```bash
# PM2 logs
pm2 logs bourbon-tracker-api

# Nginx logs
sudo tail -f /var/log/nginx/bourbon-tracker.access.log
sudo tail -f /var/log/nginx/bourbon-tracker.error.log

# Application logs
tail -f /var/log/bourbon-tracker/combined.log
```

### Restart Services
```bash
# Restart application
pm2 restart bourbon-tracker-api

# Restart nginx
sudo systemctl restart nginx

# Reload nginx config
sudo systemctl reload nginx
```

## Monitoring

Monitor these metrics:
- PM2 status and memory usage: `pm2 monit`
- Disk space: `df -h`
- Database size: `ls -lh /opt/BourbonDatabase/`
- Log file sizes: `ls -lh /var/log/bourbon-tracker/`
- SSL certificate expiry: `sudo certbot certificates`

## Security Notes

1. Regularly update the server: `sudo apt update && sudo apt upgrade`
2. Monitor logs for suspicious activity
3. Keep PM2 and Node.js updated
4. Review nginx rate limiting effectiveness
5. Ensure backups are working and restorable
6. Monitor SSL certificate auto-renewal

## Troubleshooting

### Application won't start
```bash
# Check PM2 logs
pm2 logs bourbon-tracker-api

# Check environment variables
pm2 show bourbon-tracker-api

# Restart with debugging
NODE_ENV=production DEBUG=* pm2 restart bourbon-tracker-api
```

### Database connection issues
```bash
# Check file permissions
ls -la /opt/bourbon-tracker/data/
ls -la /opt/BourbonDatabase/

# Check SQLite database integrity
sqlite3 /opt/BourbonDatabase/inventory.db "PRAGMA integrity_check;"
```

### Nginx issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```