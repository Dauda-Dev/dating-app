const jwt = require('jsonwebtoken');

/**
 * Authenticate JWT token from Authorization header
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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
};
