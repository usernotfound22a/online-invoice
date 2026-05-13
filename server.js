// server.js — Main entry point with clustering & Redis
const cluster = require('cluster');
const os = require('os');
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const redis = require('redis');
const RedisStore = require('connect-redis').default;
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const numCPUs = process.env.WORKERS || os.cpus().length;

// ============= CLUSTERING FOR MULTI-CORE =============
// Only cluster when Redis is available — memory sessions don't survive across workers
if (cluster.isPrimary && process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  console.log(`\n⚙️  Master process running on PID ${process.pid}`);
  console.log(`🚀 Spawning ${numCPUs} worker processes...\n`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  return;
}

// ============= WORKER PROCESS =============
// Initialize MongoDB connection
const { mongoose } = require('./lib/mongodb');

const app = express();

// Ensure uploads dir exists (use /tmp on serverless platforms)
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'public', 'uploads');
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}

// ============= SECURITY & PERFORMANCE HEADERS =============
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(compression()); // Gzip compression

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', process.env.NODE_ENV === 'production'); // Cache views in production

// ============= MIDDLEWARE =============
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' })); // Cache static files

// ============= SESSION STORE =============
let sessionStore;
if (process.env.REDIS_URL) {
  const redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
  sessionStore = new RedisStore({ client: redisClient });
  console.log('✅ Redis session store connected');
} else {
  // Use MongoDB session store — works across restarts and serverless platforms
  const MongoStore = require('connect-mongo');
  const mongoURL = process.env.MONGODB_URL || 'mongodb+srv://ghsarthak22_db_user:6884BZ2TPnktOVfj@cluster0.trteiqs.mongodb.net/pokhara_invoice?retryWrites=true&w=majority';
  sessionStore = MongoStore.create({ mongoUrl: mongoURL, ttl: 7 * 24 * 60 * 60 });
  console.log('✅ MongoDB session store connected');
}

// Session middleware with optimized settings
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'change-this-in-production-' + Math.random(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
    sameSite: 'lax'
  }
}));

// ============= PASSPORT INITIALIZATION =============
const passport = require('passport');
require('./lib/passport-config');
app.use(passport.initialize());
app.use(passport.session());

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

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', pid: process.pid, timestamp: new Date().toISOString() });
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

// ============= START SERVER (skip on Vercel — it manages HTTP itself) =============
if (!process.env.VERCEL) {
  const interfaces = os.networkInterfaces();
  let localIP = '127.0.0.1';
  for (const ifaces of Object.values(interfaces)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) { localIP = iface.address; break; }
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Pokhara Invoice running`);
    console.log(`   Localhost:  http://localhost:${PORT}`);
    console.log(`   Network:    http://${localIP}:${PORT}`);
    console.log(`\n   Admin: admin@pokhara.local / admin1234`);
    console.log(`   Demo:  demo@pokhara.local / demo1234\n`);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

module.exports = app;
