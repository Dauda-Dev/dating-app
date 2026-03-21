const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const VideoService = require('../src/services/VideoService');

// Mock Daily.co API
jest.mock('axios');
const axios = require('axios');

describe('Video Integration Tests', () => {
  let user1, user2, match;
  let user1Token, user2Token;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    // Create two test users
    const hashedPassword = await bcrypt.hash('TestPassword123', 10);
    
    user1 = await db.User.create({
      email: 'user1@example.com',
      password: hashedPassword,
      firstName: 'User',
      lastName: 'One',
      dateOfBirth: new Date('1995-01-01'),
      gender: 'male',
      isEmailVerified: true,
      relationshipStatus: 'available'
    });

    user2 = await db.User.create({
      email: 'user2@example.com',
      password: hashedPassword,
      firstName: 'User',
      lastName: 'Two',
      dateOfBirth: new Date('1996-01-01'),
      gender: 'female',
      isEmailVerified: true,
      relationshipStatus: 'available'
    });

    // Create a match
    match = await db.Match.create({
      user1Id: user1.id,
      user2Id: user2.id,
      status: 'matched_locked',
      lockedAt: new Date(),
      compatibilityScore: 85
    });

    // Update users to matched_locked status
    await user1.update({ relationshipStatus: 'matched_locked' });
    await user2.update({ relationshipStatus: 'matched_locked' });

    // Login both users
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'TestPassword123' });
    user1Token = login1.body.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@example.com', password: 'TestPassword123' });
    user2Token = login2.body.token;

    // Mock Daily.co API responses
    axios.post.mockImplementation((url) => {
      if (url.includes('/rooms')) {
        return Promise.resolve({
          data: {
            name: 'test-room-123',
            url: 'https://test.daily.co/test-room-123',
            config: { exp: Math.floor(Date.now() / 1000) + 3600 }
          }
        });
      }
      if (url.includes('/meeting-tokens')) {
        return Promise.resolve({
          data: { token: 'mock-daily-token-' + Date.now() }
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(async () => {
    await db.VideoSession.destroy({ where: {} });
    await db.Match.destroy({ where: {} });
    await db.User.destroy({ where: {} });
    jest.clearAllMocks();
  });

  describe('POST /api/video/initialize', () => {
    it('should create video session with tokens for both users', async () => {
      const res = await request(app)
        .post('/api/video/initialize')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ matchId: match.id });

      expect(res.statusCode).toBe(200);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.roomUrl).toBe('https://test.daily.co/test-room-123');
      expect(res.body.token).toBeDefined();
      expect(res.body.minDurationSeconds).toBe(240);
      expect(res.body.maxDurationSeconds).toBe(600);

      // Verify session in database
      const session = await db.VideoSession.findByPk(res.body.sessionId);
      expect(session).toBeTruthy();
      expect(session.matchId).toBe(match.id);
      expect(session.dailyRoomTokenUser1).toBeDefined();
      expect(session.dailyRoomTokenUser2).toBeDefined();
      expect(session.status).toBe('pending');
    });

    it('should return error if user not in match', async () => {
      const otherUser = await db.User.create({
        email: 'other@example.com',
        password: await bcrypt.hash('TestPassword123', 10),
        firstName: 'Other',
        lastName: 'User',
        dateOfBirth: new Date('1997-01-01'),
        gender: 'male',
        isEmailVerified: true
      });

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'TestPassword123' });

      const res = await request(app)
        .post('/api/video/initialize')
        .set('Authorization', `Bearer ${login.body.token}`)
        .send({ matchId: match.id });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('not part of this match');
    });

    it('should return error if match not in locked status', async () => {
      await match.update({ status: 'video_call_completed' });

      const res = await request(app)
        .post('/api/video/initialize')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ matchId: match.id });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('not in locked status');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/video/initialize')
        .send({ matchId: match.id });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/video/sessions/:sessionId/complete', () => {
    let session;

    beforeEach(async () => {
      // Create video session
      session = await db.VideoSession.create({
        matchId: match.id,
        dailyRoomName: 'test-room-123',
        dailyRoomUrl: 'https://test.daily.co/test-room-123',
        dailyRoomTokenUser1: 'token1',
        dailyRoomTokenUser2: 'token2',
        status: 'active',
        startedAt: new Date()
      });
    });

    it('should complete video session with valid duration', async () => {
      const res = await request(app)
        .post(`/api/video/sessions/${session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ durationSeconds: 300 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchStatus).toBe('video_call_completed');

      // Verify session updated
      await session.reload();
      expect(session.status).toBe('completed');
      expect(session.durationSeconds).toBe(300);
      expect(session.endedAt).toBeTruthy();

      // Verify match updated
      await match.reload();
      expect(match.status).toBe('video_call_completed');
      expect(match.videoCallCompletedAt).toBeTruthy();

      // Verify users updated
      await user1.reload();
      await user2.reload();
      expect(user1.relationshipStatus).toBe('video_call_completed');
      expect(user2.relationshipStatus).toBe('video_call_completed');
    });

    it('should reject duration below minimum (240s)', async () => {
      const res = await request(app)
        .post(`/api/video/sessions/${session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ durationSeconds: 200 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('minimum');
    });

    it('should cap duration at maximum (600s)', async () => {
      const res = await request(app)
        .post(`/api/video/sessions/${session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ durationSeconds: 800 });

      expect(res.statusCode).toBe(200);

      // Verify capped at 600s
      await session.reload();
      expect(session.durationSeconds).toBe(600);
    });

    it('should reject if session already completed', async () => {
      await session.update({ status: 'completed', endedAt: new Date(), durationSeconds: 300 });

      const res = await request(app)
        .post(`/api/video/sessions/${session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ durationSeconds: 300 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('already completed');
    });

    it('should reject negative duration', async () => {
      const res = await request(app)
        .post(`/api/video/sessions/${session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ durationSeconds: -100 });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/video/sessions/:sessionId', () => {
    let session;

    beforeEach(async () => {
      session = await db.VideoSession.create({
        matchId: match.id,
        dailyRoomName: 'test-room-123',
        dailyRoomUrl: 'https://test.daily.co/test-room-123',
        dailyRoomTokenUser1: 'token1',
        dailyRoomTokenUser2: 'token2',
        status: 'pending'
      });
    });

    it('should return session for authorized user', async () => {
      const res = await request(app)
        .get(`/api/video/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.session.id).toBe(session.id);
      expect(res.body.session.match).toBeDefined();
      expect(res.body.session.match.user1Id).toBe(user1.id);
    });

    it('should reject unauthorized user not in match', async () => {
      const otherUser = await db.User.create({
        email: 'unauthorized@example.com',
        password: await bcrypt.hash('TestPassword123', 10),
        firstName: 'Unauthorized',
        lastName: 'User',
        dateOfBirth: new Date('1998-01-01'),
        gender: 'male',
        isEmailVerified: true
      });

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unauthorized@example.com', password: 'TestPassword123' });

      const res = await request(app)
        .get(`/api/video/sessions/${session.id}`)
        .set('Authorization', `Bearer ${login.body.token}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/video/sessions/${fakeUuid}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/video/webhook', () => {
    let session;

    beforeEach(async () => {
      session = await db.VideoSession.create({
        matchId: match.id,
        dailyRoomName: 'test-room-webhook',
        dailyRoomUrl: 'https://test.daily.co/test-room-webhook',
        dailyRoomTokenUser1: 'token1',
        dailyRoomTokenUser2: 'token2',
        status: 'active',
        startedAt: new Date()
      });
    });

    it('should auto-complete session on room.meeting-ended event', async () => {
      const webhookPayload = {
        type: 'room.meeting-ended',
        payload: {
          room: 'test-room-webhook',
          duration: 350
        }
      };

      const res = await request(app)
        .post('/api/video/webhook')
        .send(webhookPayload);

      expect(res.statusCode).toBe(200);

      // Verify session completed
      await session.reload();
      expect(session.status).toBe('completed');
      expect(session.durationSeconds).toBe(350);

      // Verify match and users updated
      await match.reload();
      await user1.reload();
      await user2.reload();
      expect(match.status).toBe('video_call_completed');
      expect(user1.relationshipStatus).toBe('video_call_completed');
      expect(user2.relationshipStatus).toBe('video_call_completed');
    });

    it('should update status to active on participant.joined', async () => {
      await session.update({ status: 'pending' });

      const webhookPayload = {
        type: 'participant.joined',
        payload: {
          room: 'test-room-webhook',
          participant: { user_id: user1.id }
        }
      };

      const res = await request(app)
        .post('/api/video/webhook')
        .send(webhookPayload);

      expect(res.statusCode).toBe(200);

      await session.reload();
      expect(session.status).toBe('active');
    });

    it('should return 200 even with invalid room name', async () => {
      const webhookPayload = {
        type: 'room.meeting-ended',
        payload: {
          room: 'non-existent-room',
          duration: 300
        }
      };

      const res = await request(app)
        .post('/api/video/webhook')
        .send(webhookPayload);

      // Webhook should always return 200 to acknowledge receipt
      expect(res.statusCode).toBe(200);
    });

    it('should not require authentication', async () => {
      const webhookPayload = {
        type: 'participant.left',
        payload: {
          room: 'test-room-webhook'
        }
      };

      // No Authorization header
      const res = await request(app)
        .post('/api/video/webhook')
        .send(webhookPayload);

      expect(res.statusCode).toBe(200);
    });
  });
});
