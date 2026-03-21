/**
 * Basic smoke tests for dating app API
 * Run with: npm test tests/smoke.test.js
 */
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

let user1Token, user1Id, user2Token, user2Id, matchId;

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

afterAll(async () => {
  await db.sequelize.close();
});

describe('Auth Flow', () => {
  test('Signup user 1', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'user1@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        gender: 'MALE'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    user1Token = res.body.token;
    user1Id = res.body.user.id;
  });

  test('Signup user 2', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'user2@test.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1992-05-20',
        gender: 'FEMALE'
      });

    expect(res.status).toBe(201);
    user2Token = res.body.token;
    user2Id = res.body.user.id;
  });

  test('Get current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user1@test.com');
  });
});

describe('Profile Management', () => {
  test('Update profile for user 1', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        bio: 'Adventurous software engineer',
        location: 'New York',
        interests: ['travel', 'tech'],
        hobbies: ['hiking', 'coding']
      });

    expect(res.status).toBe(200);
    expect(res.body.profile.bio).toBe('Adventurous software engineer');
  });

  test('Update profile for user 2', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        bio: 'Designer and dog lover',
        location: 'Brooklyn',
        interests: ['art', 'design'],
        hobbies: ['painting', 'yoga']
      });

    expect(res.status).toBe(200);
  });
});

describe('Discovery & Matching', () => {
  test('Get eligible users', async () => {
    const res = await request(app)
      .get('/api/discovery/eligible')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  test('User 1 likes User 2 (no mutual like yet)', async () => {
    const res = await request(app)
      .post('/api/discovery/like')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ toUserId: user2Id });

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(false);
  });

  test('User 2 likes User 1 (mutual like creates match)', async () => {
    const res = await request(app)
      .post('/api/discovery/like')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ toUserId: user1Id });

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(true);
    matchId = res.body.match.id;
  });

  test('Get current match for user 1', async () => {
    const res = await request(app)
      .get('/api/matches/current')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.match).toBeDefined();
  });
});

describe('Video Calling', () => {
  test('Initialize video session', async () => {
    const res = await request(app)
      .post('/api/video/initialize')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        matchId,
        otherUserId: user2Id
      });

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeDefined();
  });
});

describe('Date Planning', () => {
  test('Propose a date', async () => {
    // First, complete video call to enable date proposal
    const matchRes = await request(app)
      .get(`/api/matches/${matchId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    const videoSessionId = matchRes.body.match.videoSessions?.[0]?.id;

    if (videoSessionId) {
      await request(app)
        .post(`/api/video/sessions/${videoSessionId}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ durationSeconds: 240 });
    }

    // Now propose date
    const res = await request(app)
      .post('/api/dates/propose')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        matchId,
        location: 'Central Park Coffee',
        proposedDateTime: '2026-02-14T19:00:00Z'
      });

    expect(res.status).toBe(200);
  });
});

describe('Stealing Mechanism', () => {
  test('Complete a date to enable stealing', async () => {
    const res = await request(app)
      .post('/api/dates/complete')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ matchId });

    expect(res.status).toBe(200);
  });

  test('Create a new match to test stealing with', async () => {
    // Create user 3
    const user3Res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'user3@test.com',
        password: 'password123',
        firstName: 'Bob',
        lastName: 'Johnson',
        dateOfBirth: '1991-07-10',
        gender: 'MALE'
      });

    const user3Token = user3Res.body.token;
    const user3Id = user3Res.body.user.id;

    // User 3 tries to steal user 2
    const stealRes = await request(app)
      .post('/api/steals/request')
      .set('Authorization', `Bearer ${user3Token}`)
      .send({ targetUserId: user2Id });

    expect(stealRes.status).toBe(201);
  });
});
