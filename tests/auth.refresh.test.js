const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

describe('Auth - Token Refresh & Email Resend', () => {
  let testUser;
  let refreshToken;
  let accessToken;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      // Create and login test user
      const hashedPassword = await bcrypt.hash('TestPassword123', 10);
      testUser = await db.User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'male',
        isEmailVerified: true,
      });

      // Login to get tokens
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'TestPassword123' });

      accessToken = loginRes.body.token;
      refreshToken = loginRes.body.refreshToken;
    });

    it('should return new access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.token).not.toBe(accessToken); // New token issued
      expect(res.body.refreshToken).not.toBe(refreshToken); // Token rotated
      expect(res.body.message).toBe('Token refreshed successfully');
    });

    it('should reject request without refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Refresh token required');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid_token_xyz' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Invalid or expired refresh token');
    });

    it('should allow using new refresh token after rotation', async () => {
      // First refresh
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      const newRefreshToken = firstRefresh.body.refreshToken;

      // Second refresh with new token
      const secondRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken });

      expect(secondRefresh.statusCode).toBe(200);
      expect(secondRefresh.body.token).toBeDefined();
    });

    it('should not accept old refresh token after rotation', async () => {
      // First refresh rotates token
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      // Try to use old token again
      const secondAttempt = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(secondAttempt.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    let unverifiedUser;

    beforeEach(async () => {
      // Create unverified user
      const hashedPassword = await bcrypt.hash('TestPassword123', 10);
      unverifiedUser = await db.User.create({
        email: 'unverified@example.com',
        password: hashedPassword,
        firstName: 'Unverified',
        lastName: 'User',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'female',
        isEmailVerified: false,
        emailVerificationToken: 'old_token',
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it('should send verification email for unverified user', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unverified@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify token was updated
      const updated = await db.User.findByPk(unverifiedUser.id);
      expect(updated.emailVerificationToken).not.toBe('old_token');
      expect(updated.emailVerificationExpires).toBeDefined();
    });

    it('should not send verification email for already verified user', async () => {
      // Verify the user first
      await unverifiedUser.update({ isEmailVerified: true });

      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unverified@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Email already verified');
    });

    it('should not reveal if email exists (security)', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('If email exists and unverified');
    });

    it('should reject request without email', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Email required');
    });

    it('should update verification expiry to 24 hours', async () => {
      const beforeResend = new Date();
      await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unverified@example.com' });

      const updated = await db.User.findByPk(unverifiedUser.id);
      const expectedExpiry = beforeResend.getTime() + (24 * 60 * 60 * 1000);
      const actualExpiry = updated.emailVerificationExpires.getTime();

      // Allow 5 second tolerance
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(5000);
    });
  });

  describe('POST /api/auth/logout - Refresh Token Revocation', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('TestPassword123', 10);
      testUser = await db.User.create({
        email: 'logout@example.com',
        password: hashedPassword,
        firstName: 'Logout',
        lastName: 'User',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'male',
        isEmailVerified: true,
      });

      // Login to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logout@example.com', password: 'TestPassword123' });

      accessToken = loginRes.body.token;
    });

    it('should revoke refresh token on logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Logged out successfully');

      // Verify refresh token was cleared
      const updated = await db.User.findByPk(testUser.id);
      expect(updated.refreshToken).toBeNull();
    });

    it('should prevent refresh token use after logout', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logout@example.com', password: 'TestPassword123' });

      const refreshToken = loginRes.body.refreshToken;

      // Logout to revoke token
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Try to refresh with revoked token
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.statusCode).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('TestPassword123', 10);
      await db.User.create({
        email: 'ratelimit@example.com',
        password: hashedPassword,
        firstName: 'Rate',
        lastName: 'Limit',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'male',
        isEmailVerified: true,
      });

      // Make 6 login attempts (limit is 5)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'ratelimit@example.com', password: 'wrong' });
      }

      const sixthAttempt = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ratelimit@example.com', password: 'wrong' });

      expect(sixthAttempt.statusCode).toBe(429); // Too Many Requests
    });

    it('should rate limit email resend requests', async () => {
      const hashedPassword = await bcrypt.hash('TestPassword123', 10);
      await db.User.create({
        email: 'resendlimit@example.com',
        password: hashedPassword,
        firstName: 'Resend',
        lastName: 'Limit',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'female',
        isEmailVerified: false,
      });

      // Make 4 resend requests (limit is 3 per hour)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/resend-verification')
          .send({ email: 'resendlimit@example.com' });
      }

      const fourthAttempt = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'resendlimit@example.com' });

      expect(fourthAttempt.statusCode).toBe(429); // Too Many Requests
    });
  });
});
