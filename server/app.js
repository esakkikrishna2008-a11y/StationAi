import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import { ensureDbReady } from './database/seed.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import expiryRoutes from './routes/expiryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import billingRoutes from './routes/billingRoutes.js';

export const app = express();


// Trust reverse proxies (Vercel, AWS, Nginx)
app.set('trust proxy', 1);

// CORS configuration supporting local dev and Vercel same-origin
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const configuredOrigins = config.corsOrigin && config.corsOrigin !== '*'
  ? config.corsOrigin.split(',').map(o => o.trim())
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    // Same-origin requests or server-to-server calls don't send an Origin header
    if (!origin) return callback(null, true);
    // Allow any localhost / 127.0.0.1 port for Vite dev server
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow any Vercel deployment domain (*.vercel.app)
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    if (config.corsOrigin === '*' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Healthcheck endpoints (respond immediately without waiting for DB)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    success: true,
    message: 'StationAI API is running',
    status: 'ok',
    service: 'StationAI API'
  });
});

app.get(['/api', '/'], (req, res, next) => {
  // If requesting root of API, return health status
  if (req.path === '/api' || req.path === '/api/') {
    return res.json({
      success: true,
      message: 'StationAI API is running',
      version: '1.0.0'
    });
  }
  next();
});

// Middleware to ensure database & demo accounts are initialized
app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    console.error('[DB Readiness Error]:', err);
    res.status(500).json({
      success: false,
      error: 'Database initialization failed. Please check server logs and configuration.',
      message: 'Database initialization failed'
    });
  }
});

// API Routes (mounted under both /api and root to support Vercel rewrites and direct calls)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/products', '/products'], productRoutes);
app.use(['/api/inventory', '/inventory'], inventoryRoutes);
app.use(['/api/search', '/search'], searchRoutes);
app.use(['/api/expiry', '/expiry'], expiryRoutes);
app.use(['/api/alerts', '/alerts'], alertRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);
app.use(['/api/feedback', '/feedback'], feedbackRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/settings', '/settings'], settingsRoutes);
app.use(['/api/activity', '/activity'], activityRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);
app.use(['/api/bills', '/bills', '/api/billing', '/billing'], billingRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Unhandled Error]:', err);
  const status = err.status || 500;
  const message = config.nodeEnv === 'production' ? 'An internal server error occurred' : (err.message || 'An internal server error occurred');
  res.status(status).json({
    success: false,
    error: message,
    message
  });
});

export default app;
