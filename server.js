// server.js — Main entry point
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data dir exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: dataDir }),
  secret: process.env.SESSION_SECRET || 'change-this-in-production-' + Math.random(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true'
  }
}));

// Global locals for views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  res.locals.lang = req.session.lang || 'en';
  res.locals.t = require('./lib/i18n')(res.locals.lang);
  res.locals.fmt = require('./lib/format');
  delete req.session.flash;
  next();
});

// Routes
app.use('/', require('./routes/public'));
app.use('/auth', require('./routes/auth'));
app.use('/app', require('./middleware/requireAuth'), require('./routes/dashboard'));
app.use('/app/customers', require('./middleware/requireAuth'), require('./routes/customers'));
app.use('/app/products', require('./middleware/requireAuth'), require('./routes/products'));
app.use('/app/invoices', require('./middleware/requireAuth'), require('./routes/invoices'));
app.use('/app/settings', require('./middleware/requireAuth'), require('./routes/settings'));
app.use('/admin', require('./middleware/requireAdmin'), require('./routes/admin'));

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'Page not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: err.message || 'Something went wrong' });
});

// Get local network IP - prioritize Wi-Fi over virtual adapters
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  let fallbackIP = '127.0.0.1';
  
  // First pass: look for Wi-Fi or Ethernet (real networks)
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet') && !name.includes('Ethernet 2')) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  
  // Second pass: any non-internal IPv4 (skip virtual adapters)
  for (const name of Object.keys(interfaces)) {
    if (!name.toLowerCase().includes('local area connection')) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && !name.includes('Ethernet 2')) {
          fallbackIP = iface.address;
        }
      }
    }
  }
  
  return fallbackIP;
}

const localIP = getLocalIP();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Pokhara Invoice running`);
  console.log(`   Localhost:     http://localhost:${PORT}`);
  console.log(`   Network:       http://${localIP}:${PORT}`);
  console.log(`\n📧 Credentials:`);
  console.log(`   Admin login: admin@pokhara.local / admin1234`);
  console.log(`   Demo login:  demo@pokhara.local / demo1234\n`);
});
