# Canary Films Members Portal

A comprehensive members portal for the Canary Films Film Studio, featuring multiple authentication methods, shoot scheduling, script management, and production planning tools. Designed to be easily self-hosted on any Linux server.

## 🎬 Features

- **Multi-Auth System**
  - Hack Club OAuth integration
  - Google Sign-In
  - Email/Password authentication
  
- **Admin Panel**
  - Create and manage user accounts
  - Approve/revoke account access
  - Monitor user activity
  
- **Members Portal**
  - Daily shoot schedules with cast assignments
  - Personal lines to learn for upcoming shoots
  - Full script library with version control
  - Planning documents repository
  
- **Security**
  - Admin-only account creation
  - Approval-required access
  - Secure session management
  - HTTPS support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Linux server (Ubuntu 20.04+ recommended)
- Domain name configured (portal.canaryfilms.org)

### Installation

```bash
# Clone the repository
git clone https://github.com/QuizzityMC/Canary-Films-Members-Portal.git
cd Canary-Films-Members-Portal

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start
```

The portal will be available at:
- HTTP: http://localhost:9811
- HTTPS: https://localhost:9812 (if SSL certificates are configured)

### Default Admin Account

On first run, a default admin account is created with a **randomly generated password**:

```
Email: admin@canaryfilms.org
Password: (displayed in console on first startup)
```

**⚠️ IMPORTANT:** 
- Save the password shown in the console during first startup
- It will NOT be shown again
- Change this password immediately after first login

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- DNS configuration
- SSL certificate setup
- OAuth application configuration
- Systemd service setup

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options:

- `HTTP_PORT` / `HTTPS_PORT` - Server ports (default: 9811/9812)
- `SESSION_SECRET` - Secure session key
- `HACKCLUB_CLIENT_ID` / `HACKCLUB_CLIENT_SECRET` - Hack Club OAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `SSL_KEY_PATH` / `SSL_CERT_PATH` - SSL certificate paths

### OAuth Setup

#### Hack Club OAuth
1. Visit https://hackclub.com and enable Developer Mode
2. Create a new OAuth application
3. Set callback URL to: `https://portal.canaryfilms.org/auth/hackclub/callback`

#### Google OAuth
1. Visit https://console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://portal.canaryfilms.org/auth/google/callback`

## 🏗️ Architecture

- **Backend**: Node.js + Express
- **Database**: SQLite (easy self-hosting)
- **Authentication**: Passport.js with multiple strategies
- **Views**: EJS templates
- **Styling**: Custom CSS with responsive design

## 📋 Usage

### Admin Tasks

1. Login with admin credentials
2. Navigate to Admin panel
3. Create user accounts with email and optional password
4. Approve/revoke user access as needed

### Member Access

1. Admin creates your account
2. Login using Hack Club, Google, or email/password
3. Access shoot schedules, scripts, and lines
4. View planning documents

## 🔒 Security Features

- Admin-only user creation
- Account approval system
- Secure password hashing (bcrypt)
- Session-based authentication
- HTTPS support
- Protected routes and middleware

## 🌐 Deployment

The application is designed to run on ports:
- **9811** - HTTP
- **9812** - HTTPS

These ports are intended to be mapped to https://portal.canaryfilms.org

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including:
- Linux server setup
- DNS configuration
- SSL certificate installation
- Systemd service configuration
- Nginx reverse proxy setup (optional)

## 🔗 Links

Every page includes a link back to the main Canary Films website:
**[https://www.canaryfilms.org/](https://www.canaryfilms.org/)**

## 📦 Project Structure

```
.
├── src/
│   ├── config/         # Passport authentication config
│   ├── middleware/     # Auth middleware
│   ├── models/         # Database models
│   ├── routes/         # Express routes
│   └── server.js       # Main server file
├── views/
│   ├── auth/           # Authentication pages
│   ├── admin/          # Admin panel pages
│   ├── portal/         # Members portal pages
│   └── partials/       # Reusable components
├── public/
│   └── css/            # Stylesheets
├── data/               # SQLite database (created on first run)
├── .env                # Environment configuration
└── DEPLOYMENT.md       # Deployment guide
```

## 🤝 Contributing

This is a private project for Canary Films. For issues or suggestions, please contact the repository maintainers.

## 📄 License

ISC License

## 🎥 About Canary Films

Canary Films is a creative film studio dedicated to bringing stories to life. Learn more at [www.canaryfilms.org](https://www.canaryfilms.org/).

