// Test suite for password reset functionality
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Password Reset Flow', () => {
  let testUser;
  let resetToken;

  beforeAll(async () => {
    // Initialize database
    await db.authenticate();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await db.User.create({
      email: 'passwordreset@test.com',
      password: '$2a$10$hashedpassword123', // Pre-hashed for testing
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      emailVerified: true
    });
  });

  afterEach(async () => {
    // Cleanup test user
    await db.User.destroy({ where: { email: 'passwordreset@test.com' } });
  });

  afterAll(async () => {
    await db.close();
  });

  describe('POST /api/auth/forgot-password', () => {
    test('Should send reset email for valid email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'passwordreset@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('password reset link sent');

      // Verify token was saved to database
      const updatedUser = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpires).toBeDefined();
      resetToken = updatedUser.passwordResetToken;
    });

    test('Should return generic message for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('password reset link sent');
    });

    test('Should reject missing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email required');
    });

    test('Should generate new token on second request', async () => {
      // First request
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'passwordreset@test.com' });

      let user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      const token1 = user.passwordResetToken;

      // Second request
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'passwordreset@test.com' });

      user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      const token2 = user.passwordResetToken;

      expect(token1).not.toBe(token2);
    });

    test('Should set token expiry to 1 hour from now', async () => {
      const before = new Date();
      
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'passwordreset@test.com' });

      const user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      const after = new Date();
      
      const expectedMin = new Date(before.getTime() + 59 * 60 * 1000); // 59 minutes
      const expectedMax = new Date(after.getTime() + 61 * 60 * 1000);  // 61 minutes

      expect(user.passwordResetExpires.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(user.passwordResetExpires.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });
  });

  describe('POST /api/auth/reset-password', () => {
    beforeEach(async () => {
      // Generate valid reset token
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'passwordreset@test.com' });

      const user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      resetToken = user.passwordResetToken;
    });

    test('Should reset password with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset successfully');

      // Verify token was cleared
      const user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetExpires).toBeNull();
    });

    test('Should reject invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalidtoken123',
          newPassword: 'NewSecurePassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or expired reset token');
    });

    test('Should reject password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'Short1'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 8 characters');
    });

    test('Should reject missing token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          newPassword: 'NewSecurePassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Token and password required');
    });

    test('Should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Token and password required');
    });

    test('Should reject expired token', async () => {
      // Manually expire the token
      await testUser.update({
        passwordResetExpires: new Date(Date.now() - 1000) // 1 second ago
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    test('Should prevent token reuse', async () => {
      // First reset
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'FirstNewPassword123'
        });

      // Try to reuse same token
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'SecondNewPassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or expired reset token');
    });

    test('Should allow login with new password after reset', async () => {
      const newPassword = 'NewSecurePassword123';

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword
        });

      // Try login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'passwordreset@test.com',
          password: newPassword
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      expect(loginRes.body.user).toBeDefined();
    });

    test('Should reject old password after reset', async () => {
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewSecurePassword123';

      // Update user with old password (hashed)
      const bcrypt = require('bcryptjs');
      const hashedOld = await bcrypt.hash(oldPassword, 10);
      await testUser.update({ password: hashedOld });

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword
        });

      // Try login with old password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'passwordreset@test.com',
          password: oldPassword
        });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error).toContain('Invalid credentials');
    });

    test('Should hash new password correctly', async () => {
      const bcrypt = require('bcryptjs');
      const newPassword = 'NewSecurePassword123';

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword
        });

      // Verify password is hashed
      const user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      const isMatch = await bcrypt.compare(newPassword, user.password);

      expect(isMatch).toBe(true);
      expect(user.password).not.toBe(newPassword);
    });
  });

  describe('Complete Password Reset Flow', () => {
    test('Complete flow from forgot to reset to login', async () => {
      // Step 1: User forgets password
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'passwordreset@test.com' });

      expect(forgotRes.status).toBe(200);

      // Step 2: Get reset token from database
      let user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      const token = user.passwordResetToken;
      expect(token).toBeDefined();

      // Step 3: User resets password
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'CompleteFlowPassword123'
        });

      expect(resetRes.status).toBe(200);

      // Step 4: Verify token was cleared
      user = await db.User.findOne({ where: { email: 'passwordreset@test.com' } });
      expect(user.passwordResetToken).toBeNull();

      // Step 5: User logs in with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'passwordreset@test.com',
          password: 'CompleteFlowPassword123'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });
  });
});
