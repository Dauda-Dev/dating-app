const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// Optional: Use Redis store for distributed rate limiting
// Only connect when REDIS_URL is explicitly provided (avoids ECONNREFUSED on Render)
let redisClient;
if (process.env.REDIS_URL) {
  try {
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(err => console.error('Redis connect failed:', err));
  } catch (err) {
    console.warn('Redis not available, using memory store for rate limiting');
  }
} else {
  console.log('REDIS_URL not set — using in-memory rate limiting store.');
}

/**
 * Rate limiter for general API calls
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Rate limiter for authentication endpoints (stricter)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: false, // Count successful and failed requests
});

/**
 * Rate limiter for email resend (very strict)
 */
const emailResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 resend attempts per hour
  message: 'Too many verification email requests. Please try again in 1 hour.',
  skipSuccessfulRequests: false,
});

/**
 * Password reset request limiter
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 reset requests per hour
  message: 'Too many password reset attempts. Please try again in 1 hour.',
  skipSuccessfulRequests: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  emailResendLimiter,
  passwordResetLimiter,
};
