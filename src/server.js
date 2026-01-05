require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const passport = require('./config/passport');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
const db = require('./models/database');

// Initialize Express app
const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Session configuration
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  // Generate a random session secret if not provided
  const crypto = require('crypto');
  sessionSecret = crypto.randomBytes(32).toString('hex');
  
  console.warn('WARNING: SESSION_SECRET environment variable is not set!');
  console.warn('Using a randomly generated session secret. This means:');
  console.warn('  - Users will be logged out when the server restarts');
  console.warn('  - Sessions will not persist across multiple instances');
  console.warn('For production, set SESSION_SECRET in your environment variables.');
  console.warn('Generate a permanent secret: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Connect-flash for messages
app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Make user available in all templates
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.baseUrl = process.env.BASE_URL || 'http://localhost:9811';
  next();
});

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/admin', adminLimiter, require('./routes/admin'));
app.use('/portal', require('./routes/portal'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { user: req.user });
});

// Initialize database and start servers
async function startServer() {
  try {
    // Initialize database
    await db.init();
    console.log('Database initialized');

    // Only create data directory if not on Vercel
    if (!process.env.VERCEL) {
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    // For Vercel serverless, don't start HTTP/HTTPS servers
    if (process.env.VERCEL) {
      console.log('Running in Vercel serverless environment');
      return;
    }

    // HTTP Server (traditional deployment)
    const httpPort = process.env.HTTP_PORT || process.env.PORT || 9811;
    const httpServer = http.createServer(app);
    httpServer.listen(httpPort, () => {
      console.log(`HTTP Server running on port ${httpPort}`);
    });

    // HTTPS Server (if SSL certificates are available)
    const httpsPort = process.env.HTTPS_PORT || 9812;
    const sslKeyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../ssl/privkey.pem');
    const sslCertPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../ssl/fullchain.pem');

    if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
      const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
      };

      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(httpsPort, () => {
        console.log(`HTTPS Server running on port ${httpsPort}`);
      });
    } else {
      if (!process.env.VERCEL) {
        console.log('SSL certificates not found. HTTPS server not started.');
        console.log('Place your SSL certificates at:');
        console.log(`  - ${sslKeyPath}`);
        console.log(`  - ${sslCertPath}`);
      }
    }

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing servers...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing servers...');
  await db.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
