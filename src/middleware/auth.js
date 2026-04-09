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
      attributes: ['id', 'isActive', 'isSuspended', 'suspendedUntil', 'role'],
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    if (user.isSuspended) {
      const until = user.suspendedUntil;
      if (!until || new Date(until) > new Date()) {
        const msg = until
          ? `Account suspended until ${new Date(until).toLocaleDateString()}.`
          : 'Account is suspended.';
        return res.status(403).json({ error: msg, suspended: true });
      }
      // Suspension expired — auto-lift
      await user.update({ isSuspended: false, suspendedUntil: null });
    }

    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Require admin or moderator role
 */
const requireAdmin = (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.userRole)) {
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
