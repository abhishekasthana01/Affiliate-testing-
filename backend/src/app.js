const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();

// Trust proxy for rate limiting (essential for Render/Vercel)
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// CORS Configuration
app.use(cors({
  origin: 'http://localhost:5173', // Replace '*' with your specific frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Reseller-Id"]
}));

// 🔥 Removed app.options as Express 5 path-to-regexp crashes on wildcard strings, and app.use(cors) already handles preflights.
app.use(helmet());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/tracking', require('./routes/trackingRoutes'));
app.use('/reseller', require('./routes/dashboard'));
app.use('/privacy', require('./routes/privacyRoutes'));
app.use('/marketing', require('./routes/marketingRoutes'));
app.use('/analytics', require('./routes/analyticsRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Affiliate Platform API' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
