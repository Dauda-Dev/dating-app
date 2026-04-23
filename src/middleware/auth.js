const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Authenticate JWT token from Authorization header
 * Also blocks suspended / deactivated accounts
 */
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = decoded;

    // Check live account status (suspension / deactivation)
    const user = await db.User.findByPk(decoded.userId, {
      attributes: ['id', 'isActive', 'isSuspended', 'subscriptionTier'],
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Account is suspended.', suspended: true });
    }

    req.userTier = user.subscriptionTier;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // DB or other unexpected error — log it and return 401 so clients retry
    console.error('[authenticateJWT] unexpected error:', error.message, error.name);
    return res.status(401).json({ error: 'Authentication failed', detail: error.message });
  }
};

/**
 * Require admin or moderator role
 * NOTE: 'role' column not yet in DB schema — all admin routes are blocked until
 * the column is added and req.userRole is populated in authenticateJWT.
 */
const requireAdmin = (req, res, next) => {
  // req.userRole is undefined until 'role' column is added to the users table
  if (!req.userRole || !['admin', 'moderator'].includes(req.userRole)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

/**
 * Verify that user owns the resource being accessed
 */
const authorizeUser = (req, res, next) => {
  const userId = req.params.userId || req.body.userId;

  if (!userId || userId !== req.userId) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  next();
};

module.exports = {
  authenticateJWT,
  authorizeUser,
  requireAdmin,
};
