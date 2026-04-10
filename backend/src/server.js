require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const { initScheduler } = require('./services/scheduler');
const { Server } = require('socket.io');
const { initRealtime } = require('./services/realtime');

const PORT = process.env.PORT || 4000;

// Validate Environment Variables
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET is not defined in production environment');
    process.exit(1);
  }
}

// Connect to Database and start server
connectDB().then(() => {
  // Initialize Background Jobs
  initScheduler();

  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      // Reuse JWT verification from middleware logic (inline minimal)
      const jwt = require('jsonwebtoken');
      const User = require('./models/User');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || user.isActive === false) return next(new Error('unauthorized'));
      socket.user = { id: user._id.toString(), role: user.role, resellerId: user.resellerId || null };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.user;
    if (u?.role === 'admin') {
      socket.join('admins');
    }
    if (u?.resellerId) {
      socket.join(`reseller:${u.resellerId}`);
    }
  });

  initRealtime(io);
});
