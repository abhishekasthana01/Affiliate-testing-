const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      if (req.user.isActive === false) {
        return res.status(403).json({ message: 'Account is disabled' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional fine-grained permissions for admins (non-breaking).
// If `required` is empty, it becomes a no-op.
const requirePermissions = (...required) => {
  return (req, res, next) => {
    if (!required.length) return next();
    const perms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const ok = required.every((p) => perms.includes(p));
    if (!ok) {
      return res.status(403).json({ message: 'Missing required permissions' });
    }
    next();
  };
};

const requireSuperAdmin = () => {
  return (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    if (req.user?.isSuperAdmin) return next();
    const perms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (perms.includes('superadmin')) return next();
    return res.status(403).json({ message: 'Superadmin required' });
  };
};

module.exports = { protect, authorize, requirePermissions, requireSuperAdmin };
