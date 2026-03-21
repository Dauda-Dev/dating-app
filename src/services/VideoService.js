const axios = require('axios');
const db = require('../config/database');

class VideoService {
  constructor() {
    this.dailyApiKey = process.env.DAILY_API_KEY;
    this.dailyApiUrl = 'https://api.daily.co/v1';
  }

  /**
   * Create a Daily.co room for video session
   */
  async createVideoRoom(matchId) {
    try {
      const response = await axios.post(
        `${this.dailyApiUrl}/rooms`,
        {
          name: `match-${matchId}-${Date.now()}`,
          properties: {
            exp: Math.floor(Date.now() / 1000) + (parseInt(process.env.VIDEO_ROOM_EXPIRY_SECONDS) || 3600),
            max_participants: 2,
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.dailyApiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Daily.co room creation error:', error.response?.data || error.message);
      throw new Error('Failed to create video room');
    }
  }

  /**
   * Generate token for user to join room
   */
  async generateRoomToken(roomName, userId) {
    try {
      const response = await axios.post(
        `${this.dailyApiUrl}/meeting-tokens`,
        {
          properties: {
            room_name: roomName,
            user_name: userId,
            is_owner: false,
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.dailyApiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      return response.data.token;
    } catch (error) {
      console.error('Token generation error:', error.response?.data || error.message);
      throw new Error('Failed to generate meeting token');
    }
  }

  /**
   * Initialize video session
   * TRANSACTION SAFE
   */
  async initializeVideoSession(matchId, initiatingUserId) {
    const transaction = await db.sequelize.transaction();

    try {
      const match = await db.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is part of match
      if (match.user1Id !== initiatingUserId && match.user2Id !== initiatingUserId) {
        throw new Error('User not part of this match');
      }

      if (match.status !== 'matched_locked') {
        throw new Error('Match must be in matched_locked status to start video call');
      }

      // If a pending/active session already exists, check if its room is still valid
      const existingSession = await db.VideoSession.findOne({
        where: { matchId, status: ['pending', 'active'] },
        transaction,
      });

      if (existingSession) {
        // Verify the Daily.co room still exists
        let roomValid = false;
        try {
          await axios.get(
            `${this.dailyApiUrl}/rooms/${existingSession.dailyRoomName}`,
            { headers: { Authorization: `Bearer ${this.dailyApiKey}` } }
          );
          roomValid = true;
        } catch (_) {
          // Room is gone — cancel the stale session so we fall through and create a new one
          await existingSession.update({ status: 'cancelled', endedAt: new Date() }, { transaction });
        }

        if (roomValid) {
          await transaction.commit();
          const userToken = match.user1Id === initiatingUserId
            ? existingSession.dailyRoomTokenUser1
            : existingSession.dailyRoomTokenUser2;
          return {
            sessionId: existingSession.id,
            roomUrl: existingSession.dailyRoomUrl,
            token: userToken,
            minDurationSeconds: parseInt(process.env.VIDEO_CALL_MIN_DURATION) || 240,
            maxDurationSeconds: parseInt(process.env.VIDEO_CALL_MAX_DURATION) || 600,
            isExistingSession: true,
          };
        }
      }

      // Create Daily.co room
      const room = await this.createVideoRoom(matchId);
      
      // Generate tokens for both users
      const token1 = await this.generateRoomToken(room.name, match.user1Id);
      const token2 = await this.generateRoomToken(room.name, match.user2Id);

      // Create video session with both tokens
      const videoSession = await db.VideoSession.create({
        matchId,
        dailyRoomName: room.name,
        dailyRoomUrl: room.url,
        dailyRoomTokenUser1: token1,
        dailyRoomTokenUser2: token2,
        status: 'pending',
        startedAt: new Date(),
      }, { transaction });

      // Update match status (stays matched_locked until video completes)
      await match.update(
        { status: 'matched_locked' },
        { transaction }
      );

      await transaction.commit();

      // Return token for initiating user
      const userToken = match.user1Id === initiatingUserId ? token1 : token2;

      return {
        sessionId: videoSession.id,
        roomUrl: room.url,
        token: userToken,
        minDurationSeconds: parseInt(process.env.VIDEO_CALL_MIN_DURATION) || 240,
        maxDurationSeconds: parseInt(process.env.VIDEO_CALL_MAX_DURATION) || 600,
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Complete video session
   * TRANSACTION SAFE
   */
  async completeVideoSession(sessionId, durationSeconds) {
    const transaction = await db.sequelize.transaction();

    try {
      const session = await db.VideoSession.findByPk(sessionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        include: [{ model: db.Match, as: 'match' }]
      });

      if (!session) {
        throw new Error('Video session not found');
      }

      if (session.status === 'completed') {
        throw new Error('Video session already completed');
      }

      const minDuration = parseInt(process.env.VIDEO_CALL_MIN_DURATION) || 240;
      const maxDuration = parseInt(process.env.VIDEO_CALL_MAX_DURATION) || 600;
      
      // Enforce duration bounds
      if (durationSeconds < minDuration) {
        throw new Error(`Video call must be at least ${minDuration} seconds`);
      }
      if (durationSeconds > maxDuration) {
        durationSeconds = maxDuration;
      }

      // Update session
      await session.update({
        status: 'completed',
        endedAt: new Date(),
        durationSeconds,
      }, { transaction });

      // Update match to video_call_completed
      const match = await db.Match.findByPk(session.matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await match.update(
        { 
          status: 'video_call_completed',
          videoCallCompletedAt: new Date()
        },
        { transaction }
      );

      // Update both users to video_call_completed status
      const user1 = await db.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await db.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'video_call_completed' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'video_call_completed' },
        { transaction }
      );

      await transaction.commit();

      return { 
        success: true, 
        sessionId,
        durationSeconds,
        matchStatus: 'video_call_completed'
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Handle Daily.co webhook events
   * TRANSACTION SAFE
   */
  async handleDailyWebhook(event) {
    const transaction = await db.sequelize.transaction();

    try {
      const { type, payload } = event;

      // Extract room name from payload
      const roomName = payload?.room?.name;
      if (!roomName) {
        throw new Error('Room name not found in webhook payload');
      }

      // Find session by room name
      const session = await db.VideoSession.findOne({
        where: { dailyRoomName: roomName },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!session) {
        console.warn(`Video session not found for room: ${roomName}`);
        await transaction.commit();
        return { success: true, message: 'Session not found, skipping' };
      }

      // Handle different event types
      switch (type) {
        case 'room.meeting-ended':
        case 'recording.stopped':
          // Extract duration from payload if available
          const duration = payload?.duration || payload?.room?.duration;
          
          if (session.status !== 'completed' && duration) {
            await this.completeVideoSession(session.id, Math.floor(duration), transaction);
          }
          break;

        case 'participant.joined':
          // Update session to active when first participant joins
          if (session.status === 'pending') {
            await session.update({ status: 'active' }, { transaction });
          }
          break;

        case 'participant.left':
          // Could track when both leave
          break;

        default:
          console.log(`Unhandled Daily.co webhook event: ${type}`);
      }

      await transaction.commit();
      return { success: true, type };

    } catch (error) {
      await transaction.rollback();
      console.error('Daily.co webhook error:', error);
      throw error;
    }
  }

  /**
   * Get video session
   */
  async getVideoSession(sessionId) {
    const session = await db.VideoSession.findByPk(sessionId, {
      include: [{
        model: db.Match,
        as: 'match',
        include: [
          { model: db.User, as: 'User1', attributes: ['id', 'firstName', 'lastName'] },
          { model: db.User, as: 'User2', attributes: ['id', 'firstName', 'lastName'] }
        ]
      }]
    });

    return session;
  }
}

module.exports = new VideoService();
