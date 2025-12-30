require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const initDatabase = require('./db-init');

const app = express();
const PORT = process.env.PORT || 3001;

// Debug: log OAuth config on startup
console.log('OAuth Config:', {
  clientID: process.env.GOOGLE_CLIENT_ID ? 'SET (' + process.env.GOOGLE_CLIENT_ID.slice(0, 10) + '...)' : 'MISSING',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'MISSING',
  clientURL: process.env.CLIENT_URL || 'MISSING'
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
initDatabase(pool).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Trust proxy - important for cookies behind Railway's proxy
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'mona-lista-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: true,
    httpOnly: true,
    sameSite: 'none' // Allow cross-origin requests (needed for bookmarklet)
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google auth callback - profile received:', profile.id);
      
      // Check if user exists
      let result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [profile.id]
      );
      
      if (result.rows.length > 0) {
        console.log('Existing user found:', result.rows[0].id);
        return done(null, result.rows[0]);
      }
      
      // Create new user
      console.log('Creating new user...');
      result = await pool.query(
        `INSERT INTO users (google_id, email, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [profile.id, profile.emails[0].value, profile.displayName, profile.photos[0]?.value]
      );
      
      console.log('New user created:', result.rows[0].id);
      return done(null, result.rows[0]);
    } catch (err) {
      console.error('Google auth error:', err);
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user:', id);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    console.error('Deserialize error:', err);
    done(err, null);
  }
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Routes
const listsRouter = require('./routes/lists')(pool);
const itemsRouter = require('./routes/items')(pool);
const scrapeRouter = require('./routes/scrape');
const shareRouter = require('./routes/share')(pool);

// Auth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    console.log('Auth successful, session ID:', req.sessionID);
    console.log('User in session:', req.user?.id);
    res.redirect(process.env.CLIENT_URL || '/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect(process.env.CLIENT_URL || '/');
  });
});

app.get('/auth/me', (req, res) => {
  console.log('Auth check - Session ID:', req.sessionID);
  console.log('Auth check - Is authenticated:', req.isAuthenticated());
  console.log('Auth check - User:', req.user?.id);
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// API routes
app.use('/api/lists', requireAuth, listsRouter);
app.use('/api/items', requireAuth, itemsRouter);
app.use('/api/scrape', requireAuth, scrapeRouter);
app.use('/api/share', shareRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client/dist');
  if (require('fs').existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.send('Mona Lista API is running. Client not yet deployed.');
    });
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🎨 Mona Lista server running on port ${PORT}`);
});

module.exports = { pool };
