# Canary Films Members Portal - Deployment Guide

This guide will help you deploy the Canary Films Members Portal on a Linux server with ports 9811 (HTTP) and 9812 (HTTPS).

## Prerequisites

- Linux server (Ubuntu 20.04+ or similar)
- Node.js 18+ installed
- Domain name pointing to your server (portal.canaryfilms.org)
- Root or sudo access

## Step 1: Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 2: Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/canary-films-portal
cd /opt/canary-films-portal

# Clone repository (or upload files)
git clone https://github.com/QuizzityMC/Canary-Films-Members-Portal.git .

# Install dependencies
npm install --production

# Create necessary directories
mkdir -p data ssl
```

## Step 3: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
sudo nano .env
```

Configure the following in `.env`:

```env
NODE_ENV=production
HTTP_PORT=9811
HTTPS_PORT=9812

# Database path
DB_PATH=./data/portal.db

# Generate a secure session secret
SESSION_SECRET=your-very-secure-random-string-here

# Hack Club OAuth (get from https://hackclub.com/api after enabling developer mode)
HACKCLUB_CLIENT_ID=your_hackclub_client_id
HACKCLUB_CLIENT_SECRET=your_hackclub_client_secret
HACKCLUB_CALLBACK_URL=https://portal.canaryfilms.org/auth/hackclub/callback

# Google OAuth (get from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://portal.canaryfilms.org/auth/google/callback

# SSL Certificate Paths
SSL_KEY_PATH=./ssl/privkey.pem
SSL_CERT_PATH=./ssl/fullchain.pem

# Base URL
BASE_URL=https://portal.canaryfilms.org
```

## Step 4: Obtain SSL Certificates

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot

# Get certificate
sudo certbot certonly --standalone -d portal.canaryfilms.org

# Copy certificates to application directory
sudo cp /etc/letsencrypt/live/portal.canaryfilms.org/privkey.pem /opt/canary-films-portal/ssl/
sudo cp /etc/letsencrypt/live/portal.canaryfilms.org/fullchain.pem /opt/canary-films-portal/ssl/

# Set permissions
sudo chown -R www-data:www-data /opt/canary-films-portal/ssl
sudo chmod 600 /opt/canary-films-portal/ssl/privkey.pem
```

### Auto-renewal setup

```bash
# Create renewal hook
sudo nano /etc/letsencrypt/renewal-hooks/deploy/canary-portal.sh
```

Add this content:

```bash
#!/bin/bash
cp /etc/letsencrypt/live/portal.canaryfilms.org/privkey.pem /opt/canary-films-portal/ssl/
cp /etc/letsencrypt/live/portal.canaryfilms.org/fullchain.pem /opt/canary-films-portal/ssl/
chown -R www-data:www-data /opt/canary-films-portal/ssl
systemctl restart canary-portal
```

Make it executable:

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/canary-portal.sh
```

## Step 5: Configure Firewall

```bash
# Allow HTTP, HTTPS, and custom ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 9811/tcp
sudo ufw allow 9812/tcp

# Enable firewall if not already enabled
sudo ufw enable

# Check status
sudo ufw status
```

## Step 6: DNS Configuration

Configure the following DNS records for `portal.canaryfilms.org`:

### A Record
```
Type: A
Name: portal
Value: YOUR_SERVER_IP_ADDRESS
TTL: 3600 (or Auto)
```

### AAAA Record (if using IPv6)
```
Type: AAAA
Name: portal
Value: YOUR_SERVER_IPV6_ADDRESS
TTL: 3600 (or Auto)
```

Wait for DNS propagation (can take up to 24 hours, usually much faster). Check with:

```bash
dig portal.canaryfilms.org
nslookup portal.canaryfilms.org
```

## Step 7: Setup Systemd Service

```bash
# Copy service file
sudo cp /opt/canary-films-portal/canary-portal.service /etc/systemd/system/

# Set proper permissions
sudo chown -R www-data:www-data /opt/canary-films-portal
sudo chmod 644 /etc/systemd/system/canary-portal.service

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable canary-portal

# Start the service
sudo systemctl start canary-portal

# Check status
sudo systemctl status canary-portal
```

## Step 8: Setup OAuth Applications

### Hack Club OAuth

1. Go to https://hackclub.com and sign in
2. Enable Developer Mode in your profile settings
3. Create a new OAuth application
4. Set the callback URL to: `https://portal.canaryfilms.org/auth/hackclub/callback`
5. Copy the Client ID and Client Secret to your `.env` file
6. Restart the service: `sudo systemctl restart canary-portal`

### Google OAuth

1. Go to https://console.cloud.google.com
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the consent screen
6. Add authorized redirect URI: `https://portal.canaryfilms.org/auth/google/callback`
7. Copy the Client ID and Client Secret to your `.env` file
8. Restart the service: `sudo systemctl restart canary-portal`

## Step 9: Verify Installation

```bash
# Check if services are running
sudo systemctl status canary-portal

# Check logs
sudo journalctl -u canary-portal -f

# Test HTTP endpoint
curl http://localhost:9811

# Test HTTPS endpoint (if SSL is configured)
curl https://localhost:9812
```

Visit your portal:
- HTTP: http://portal.canaryfilms.org:9811
- HTTPS: https://portal.canaryfilms.org:9812

## Default Admin Account

On first run, a default admin account is created:

```
Email: admin@canaryfilms.org
Password: admin123
```

**IMPORTANT:** Change this password immediately after first login!

## Optional: Nginx Reverse Proxy

If you want to use standard ports (80/443) instead of custom ports:

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/canary-portal
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name portal.canaryfilms.org;

    location / {
        proxy_pass http://localhost:9811;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name portal.canaryfilms.org;

    ssl_certificate /etc/letsencrypt/live/portal.canaryfilms.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.canaryfilms.org/privkey.pem;

    location / {
        proxy_pass https://localhost:9812;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/canary-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Management Commands

```bash
# Start service
sudo systemctl start canary-portal

# Stop service
sudo systemctl stop canary-portal

# Restart service
sudo systemctl restart canary-portal

# View logs
sudo journalctl -u canary-portal -f

# View recent logs
sudo journalctl -u canary-portal --since "1 hour ago"
```

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u canary-portal -n 50

# Check permissions
sudo chown -R www-data:www-data /opt/canary-films-portal

# Verify Node.js installation
node --version
```

### Database errors
```bash
# Check database permissions
ls -la /opt/canary-films-portal/data/

# Recreate database
rm /opt/canary-films-portal/data/portal.db
sudo systemctl restart canary-portal
```

### SSL Certificate issues
```bash
# Verify certificate files exist
ls -la /opt/canary-films-portal/ssl/

# Check certificate validity
openssl x509 -in /opt/canary-films-portal/ssl/fullchain.pem -text -noout
```

### Port already in use
```bash
# Check what's using the ports
sudo netstat -tulpn | grep 9811
sudo netstat -tulpn | grep 9812

# Kill process if needed
sudo kill -9 <PID>
```

## Backup and Maintenance

### Database Backup
```bash
# Create backup script
sudo nano /opt/canary-films-portal/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/canary-films-portal/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /opt/canary-films-portal/data/portal.db $BACKUP_DIR/portal_$DATE.db

# Keep only last 30 days of backups
find $BACKUP_DIR -name "portal_*.db" -mtime +30 -delete
```

```bash
chmod +x /opt/canary-films-portal/backup.sh

# Add to crontab for daily backups at 2 AM
sudo crontab -e
```

Add line:
```
0 2 * * * /opt/canary-films-portal/backup.sh
```

### Updates
```bash
cd /opt/canary-films-portal
git pull
npm install --production
sudo systemctl restart canary-portal
```

## Security Recommendations

1. Change default admin password immediately
2. Keep Node.js and dependencies updated
3. Use strong session secrets
4. Enable UFW firewall
5. Regularly backup database
6. Monitor logs for suspicious activity
7. Keep SSL certificates up to date
8. Use HTTPS only in production

## Support

For issues or questions:
- Repository: https://github.com/QuizzityMC/Canary-Films-Members-Portal
- Canary Films: https://www.canaryfilms.org/
