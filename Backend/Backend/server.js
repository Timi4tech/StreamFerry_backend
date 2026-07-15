const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const routes = require('./routes');
const google = require('./route/googleDriveRoutes');
const route = require('./route/zoomRoutes');
const onedrive = require('./route/oneDriveRoutes');
const connectDB = require('./db/mongooseClient');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Shared CORS origin ───────────────────────────────────────────────────────
// ✅ Single source of truth — used for both Socket.io and Express middleware
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";


 

// ─── Express middleware ───────────────────────────────────────────────────────
app.set('trust proxy', 1);

// ✅ FIX 4: Single cors() call using the shared ALLOWED_ORIGIN constant
app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    name: 'zoom2drive.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: {
      secure: false, // ✅ only force secure in prod
      httpOnly: true,
      maxAge: 1000 * 60 * 30,
    },
  })
);


  



connectDB()
// ─── Auth guard ───────────────────────────────────────────────────────────────



// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Zoom to Drive Backend API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── DB init ──────────────────────────────────────────────────────────────────


// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);
app.use('/zoom', route);
app.use('/google', ensureCurrentUser, google);
app.use('/onedrive', onedrive);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
/*process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});*/