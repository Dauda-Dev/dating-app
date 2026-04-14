const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 */
const generateToken = (userId, email, expiresIn) => {
  // Fall back to '30d' if env var is missing or empty string (jsonwebtoken rejects empty/undefined)
  const expiry = expiresIn || process.env.JWT_EXPIRY || '30d';
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: expiry }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Format user response (exclude sensitive data)
 */
const formatUserResponse = (user) => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    profilePhoto: user.profilePhoto || user.profilePhotoUrl || user.profilePictureUrl,
    relationshipStatus: user.relationshipStatus,
    isEmailVerified: user.isEmailVerified,
    profileCompleted: user.profileCompleted || false,
    subscriptionTier: user.subscriptionTier || 'free',
    lastActiveAt: user.lastLoginAt || user.lastActive,
    createdAt: user.createdAt,
  };
};

/**
 * Create custom error
 */
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = {
  generateToken,
  verifyToken,
  calculateAge,
  formatUserResponse,
  createError,
};
