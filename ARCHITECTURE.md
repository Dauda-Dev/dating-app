# Dating App Architecture & Implementation Plan

## Project Overview

**App Name**: Dating App with Staged Locking & Stealing Mechanism
**Target Platform**: Android (React Native/Expo)
**Tech Stack**: 
- Backend: Node.js + Express.js + Sequelize ORM + PostgreSQL
- Frontend: React Native (Expo) + NativeWind
- Video: Daily.co WebRTC (free tier)
- Authentication: JWT + Google OAuth
- Email: Mailgun
- Payments: Paystack (Phase 6)

---

## Core Features

### 1. User Relationship Status Flow
```
AVAILABLE 
  ↓
MATCHED_LOCKED (when mutual like occurs)
  ↓
VIDEO_CALL_COMPLETED (after 4-minute video call)
  ↓
DATE_ACCEPTED (both users agree on date)
  ↓
POST_DATE_OPEN (after date completion, user can be "stolen")
```

### 2. Unique "Stealing" Mechanism
- Users in POST_DATE_OPEN status can be "stolen" by other AVAILABLE users
- Stealing involves requesting a match with someone already matched
- System breaks old match and creates new one (with transaction safety)
- Old matched user reverts to AVAILABLE status

### 3. One Active Match Rule
- Enforced at database level with unique constraints
- Each user can only have ONE active match at a time
- All state transitions are transaction-safe

---

## PHASE 1: Foundation & Backend Core

### 1.1 Development Environment Setup

#### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dating_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: dating_app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"

volumes:
  postgres_data:
```

#### Backend Project Structure
```
dating-app/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   └── constants.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Profile.js
│   │   ├── Match.js
│   │   ├── Like.js
│   │   └── VideoSession.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── matchController.js
│   │   ├── discoveryController.js
│   │   └── videoController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── matches.js
│   │   ├── discovery.js
│   │   └── video.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── EmailService.js
│   │   ├── MatchService.js
│   │   ├── VideoService.js
│   │   └── AuthService.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   └── helpers.js
│   ├── validators/
│   │   ├── userValidator.js
│   │   ├── matchValidator.js
│   │   └── profileValidator.js
│   └── app.js
├── tests/
├── .env
├── package.json
└── server.js
```

### 1.2 Database Schema

#### User Model
```javascript
// src/models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'NON_BINARY'),
      allowNull: false,
    },
    profilePictureUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    relationshipStatus: {
      type: DataTypes.ENUM(
        'AVAILABLE',
        'MATCHED_LOCKED',
        'VIDEO_CALL_COMPLETED',
        'DATE_ACCEPTED',
        'POST_DATE_OPEN'
      ),
      defaultValue: 'AVAILABLE',
      allowNull: false,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profileCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastActive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  return User;
};
```

#### Profile Model
```javascript
// src/models/Profile.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Profile = sequelize.define('Profile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    interests: {
      type: DataTypes.JSON, // Array of strings
      defaultValue: [],
    },
    hobbies: {
      type: DataTypes.JSON, // Array of strings
      defaultValue: [],
    },
    personalityTraits: {
      type: DataTypes.JSON, // Can store results from personality quiz
      defaultValue: {},
    },
    preferredGender: {
      type: DataTypes.ENUM('MALE', 'FEMALE', 'ANY'),
      defaultValue: 'ANY',
    },
    ageRangeMin: {
      type: DataTypes.INTEGER,
      defaultValue: 18,
    },
    ageRangeMax: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
    height: {
      type: DataTypes.STRING, // e.g., "5'10"
      allowNull: true,
    },
    bodyType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    education: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    occupation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zodiacSign: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    photoUrls: {
      type: DataTypes.JSON, // Array of photo URLs
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'profiles',
    timestamps: true,
  });

  return Profile;
};
```

#### Match Model (CRITICAL - Transaction Safe)
```javascript
// src/models/Match.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Match = sequelize.define('Match', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user1Id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user2Id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    matchStatus: {
      type: DataTypes.ENUM(
        'LOCKED',
        'VIDEO_SCHEDULED',
        'VIDEO_COMPLETED',
        'DATE_AGREED',
        'COMPLETED'
      ),
      defaultValue: 'LOCKED',
    },
    lockedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    videoSessionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    dateAgreedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    plannedDateLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    plannedDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dateCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'matches',
    timestamps: true,
    indexes: [
      {
        // Critical: Ensure one active match per user
        fields: ['user1Id'],
        where: {
          matchStatus: {
            [sequelize.Sequelize.Op.in]: ['LOCKED', 'VIDEO_SCHEDULED', 'VIDEO_COMPLETED', 'DATE_AGREED']
          }
        },
        unique: true,
        name: 'unique_user1_active_match'
      },
      {
        fields: ['user2Id'],
        where: {
          matchStatus: {
            [sequelize.Sequelize.Op.in]: ['LOCKED', 'VIDEO_SCHEDULED', 'VIDEO_COMPLETED', 'DATE_AGREED']
          }
        },
        unique: true,
        name: 'unique_user2_active_match'
      }
    ]
  });

  return Match;
};
```

#### Like Model
```javascript
// src/models/Like.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fromUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    toUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('LIKE', 'REJECT', 'SUPER_LIKE'),
      defaultValue: 'LIKE',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'likes',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['fromUserId', 'toUserId'],
        name: 'unique_from_to_user'
      }
    ]
  });

  return Like;
};
```

#### VideoSession Model
```javascript
// src/models/VideoSession.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VideoSession = sequelize.define('VideoSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'matches',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    dailyRoomUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dailyRoomToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED'),
      defaultValue: 'PENDING',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'video_sessions',
    timestamps: true,
  });

  return VideoSession;
};
```

---

## PHASE 2: Matching System

### 2.1 Core Matching Logic

#### MatchService - Transaction Safe
```javascript
// src/services/MatchService.js
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class MatchService {
  /**
   * Process mutual likes and create match if both users are AVAILABLE
   * TRANSACTION SAFE
   */
  async processLikeAndCreateMatch(fromUserId, toUserId) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get fresh user states
      const fromUser = await sequelize.models.User.findByPk(fromUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE, // Row-level lock
      });
      
      const toUser = await sequelize.models.User.findByPk(toUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      // Validation: Both must be AVAILABLE
      if (fromUser.relationshipStatus !== 'AVAILABLE') {
        throw new Error(`User ${fromUserId} is not AVAILABLE for matching`);
      }
      
      if (toUser.relationshipStatus !== 'AVAILABLE') {
        throw new Error(`User ${toUserId} is not AVAILABLE for matching`);
      }

      // Check if mutual like exists (toUser already liked fromUser)
      const mutualLike = await sequelize.models.Like.findOne({
        where: {
          fromUserId: toUserId,
          toUserId: fromUserId,
          type: { [Op.in]: ['LIKE', 'SUPER_LIKE'] }
        },
        transaction,
      });

      if (!mutualLike) {
        // No mutual like yet, just create the like
        await sequelize.models.Like.create({
          fromUserId,
          toUserId,
          type: 'LIKE',
        }, { transaction });
        
        await transaction.commit();
        return { matched: false, message: 'Like recorded. Waiting for mutual like.' };
      }

      // MUTUAL LIKE DETECTED - Create match
      const match = await sequelize.models.Match.create({
        user1Id: fromUserId,
        user2Id: toUserId,
        matchStatus: 'LOCKED',
      }, { transaction });

      // Update both users to MATCHED_LOCKED
      await fromUser.update(
        { relationshipStatus: 'MATCHED_LOCKED' },
        { transaction }
      );
      
      await toUser.update(
        { relationshipStatus: 'MATCHED_LOCKED' },
        { transaction }
      );

      await transaction.commit();
      
      return {
        matched: true,
        match: {
          id: match.id,
          user1Id: match.user1Id,
          user2Id: match.user2Id,
          matchStatus: match.matchStatus,
        },
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get current active match for user
   */
  async getActiveMatch(userId) {
    const match = await sequelize.models.Match.findOne({
      where: {
        [Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
        ],
        matchStatus: {
          [Op.in]: ['LOCKED', 'VIDEO_SCHEDULED', 'VIDEO_COMPLETED', 'DATE_AGREED']
        }
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'User1',
          attributes: ['id', 'firstName', 'lastName', 'profilePictureUrl']
        },
        {
          model: sequelize.models.User,
          as: 'User2',
          attributes: ['id', 'firstName', 'lastName', 'profilePictureUrl']
        }
      ]
    });

    return match;
  }

  /**
   * Reject a match (user must be MATCHED_LOCKED status)
   * TRANSACTION SAFE
   */
  async rejectMatch(userId, matchId) {
    const transaction = await sequelize.transaction();
    
    try {
      const match = await sequelize.models.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      const isUser1 = match.user1Id === userId;
      const isUser2 = match.user2Id === userId;

      if (!isUser1 && !isUser2) {
        throw new Error('User is not part of this match');
      }

      // Delete the match
      await match.destroy({ transaction });

      // Reset both users to AVAILABLE
      const user1 = await sequelize.models.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await sequelize.models.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'AVAILABLE' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'AVAILABLE' },
        { transaction }
      );

      await transaction.commit();

      return { success: true, message: 'Match rejected' };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new MatchService();
```

### 2.2 Discovery Service

```javascript
// src/services/DiscoveryService.js
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class DiscoveryService {
  /**
   * Get eligible users for discovery (AVAILABLE users not already liked)
   */
  async getEligibleUsers(userId, limit = 20, offset = 0) {
    const user = await sequelize.models.User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Get all users this user has already liked or rejected
    const alreadyInteracted = await sequelize.models.Like.findAll({
      where: { fromUserId: userId },
      attributes: ['toUserId'],
      raw: true,
    });

    const interactedUserIds = alreadyInteracted.map(l => l.toUserId);

    // Get profile preferences
    const userProfile = await sequelize.models.Profile.findOne({
      where: { userId }
    });

    const preferredGender = userProfile?.preferredGender === 'ANY' 
      ? ['MALE', 'FEMALE', 'NON_BINARY']
      : [userProfile?.preferredGender];

    // Find AVAILABLE users matching preferences
    const eligibleUsers = await sequelize.models.User.findAll({
      where: {
        id: { [Op.ne]: userId },
        relationshipStatus: 'AVAILABLE',
        gender: { [Op.in]: preferredGender },
        id: { [Op.notIn]: interactedUserIds }
      },
      include: [
        {
          model: sequelize.models.Profile,
          attributes: ['bio', 'location', 'interests', 'hobbies', 'photoUrls']
        }
      ],
      limit,
      offset,
      order: [['lastActive', 'DESC']],
    });

    return eligibleUsers;
  }

  /**
   * Calculate compatibility score between two users
   */
  calculateCompatibility(user1Profile, user2Profile) {
    let score = 0;

    // Shared interests
    if (user1Profile.interests && user2Profile.interests) {
      const sharedInterests = user1Profile.interests.filter(i =>
        user2Profile.interests.includes(i)
      );
      score += sharedInterests.length * 15;
    }

    // Shared hobbies
    if (user1Profile.hobbies && user2Profile.hobbies) {
      const sharedHobbies = user1Profile.hobbies.filter(h =>
        user2Profile.hobbies.includes(h)
      );
      score += sharedHobbies.length * 10;
    }

    // Cap score at 100
    return Math.min(score, 100);
  }
}

module.exports = new DiscoveryService();
```

---

## PHASE 3: Video Calling Integration

### 3.1 Daily.co Integration

```javascript
// src/services/VideoService.js
const axios = require('axios');
const { sequelize } = require('../config/database');

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
      const room = await axios.post(
        `${this.dailyApiUrl}/rooms`,
        {
          name: `match-${matchId}`,
          properties: {
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
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

      return room.data;
    } catch (error) {
      console.error('Daily.co room creation error:', error);
      throw new Error('Failed to create video room');
    }
  }

  /**
   * Generate token for user to join room
   */
  async generateRoomToken(roomName, userId) {
    try {
      const token = await axios.post(
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

      return token.data.token;
    } catch (error) {
      console.error('Token generation error:', error);
      throw new Error('Failed to generate meeting token');
    }
  }

  /**
   * Initialize video session
   * TRANSACTION SAFE
   */
  async initializeVideoSession(matchId, user1Id, user2Id) {
    const transaction = await sequelize.transaction();

    try {
      const match = await sequelize.models.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.matchStatus !== 'LOCKED') {
        throw new Error('Match must be in LOCKED status to start video call');
      }

      // Create Daily.co room
      const room = await this.createVideoRoom(matchId);
      const token1 = await this.generateRoomToken(room.name, user1Id);
      const token2 = await this.generateRoomToken(room.name, user2Id);

      // Create video session
      const videoSession = await sequelize.models.VideoSession.create({
        matchId,
        dailyRoomUrl: room.url,
        dailyRoomToken: token1, // Store for later reference
        status: 'PENDING',
      }, { transaction });

      // Update match status
      await match.update(
        { matchStatus: 'VIDEO_SCHEDULED', videoSessionId: videoSession.id },
        { transaction }
      );

      await transaction.commit();

      return {
        sessionId: videoSession.id,
        roomUrl: room.url,
        token1,
        token2,
        maxDurationSeconds: 240, // 4 minutes
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Complete video session (called when both users exit or 4 minutes elapse)
   * TRANSACTION SAFE
   */
  async completeVideoSession(sessionId, durationSeconds) {
    const transaction = await sequelize.transaction();

    try {
      const session = await sequelize.models.VideoSession.findByPk(sessionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!session) {
        throw new Error('Video session not found');
      }

      // Enforce 4-minute maximum
      if (durationSeconds > 240) {
        durationSeconds = 240;
      }

      // Update session
      await session.update({
        status: 'COMPLETED',
        endedAt: new Date(),
        durationSeconds,
      }, { transaction });

      // Update match
      const match = await sequelize.models.Match.findByPk(session.matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await match.update(
        { matchStatus: 'VIDEO_COMPLETED' },
        { transaction }
      );

      // Update both users
      const user1 = await sequelize.models.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await sequelize.models.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'VIDEO_CALL_COMPLETED' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'VIDEO_CALL_COMPLETED' },
        { transaction }
      );

      await transaction.commit();

      return { success: true, sessionId };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new VideoService();
```

---

## PHASE 4: Date Planning & Agreement

### 4.1 Date Agreement Service

```javascript
// src/services/DateService.js
const { sequelize } = require('../config/database');

class DateService {
  /**
   * Propose date details (location and time)
   */
  async proposeDateDetails(matchId, userId, location, proposedDateTime) {
    const match = await sequelize.models.Match.findByPk(matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    const isUser1 = match.user1Id === userId;
    const isUser2 = match.user2Id === userId;

    if (!isUser1 && !isUser2) {
      throw new Error('User is not part of this match');
    }

    if (match.matchStatus !== 'VIDEO_COMPLETED') {
      throw new Error('Video call must be completed before proposing date');
    }

    // For MVP: One user proposes, both must agree before changing to DATE_ACCEPTED
    await match.update({
      plannedDateLocation: location,
      plannedDateTime: proposedDateTime,
    });

    return { success: true, match };
  }

  /**
   * Accept date proposal (both users must accept)
   * TRANSACTION SAFE
   */
  async acceptDateProposal(matchId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const match = await sequelize.models.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (!match.plannedDateLocation || !match.plannedDateTime) {
        throw new Error('Date details not yet proposed');
      }

      // For MVP: Simple acceptance (in full implementation, add acceptance tracking)
      const isUser1 = match.user1Id === userId;
      const isUser2 = match.user2Id === userId;

      if (!isUser1 && !isUser2) {
        throw new Error('User is not part of this match');
      }

      await match.update(
        { matchStatus: 'DATE_AGREED' },
        { transaction }
      );

      // Update both users
      const user1 = await sequelize.models.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await sequelize.models.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'DATE_ACCEPTED' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'DATE_ACCEPTED' },
        { transaction }
      );

      await transaction.commit();

      return { success: true, match };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Mark date as completed
   * TRANSACTION SAFE
   * Sets users to POST_DATE_OPEN status (eligible for stealing)
   */
  async completeDateAndOpenForStealing(matchId) {
    const transaction = await sequelize.transaction();

    try {
      const match = await sequelize.models.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      await match.update(
        {
          matchStatus: 'COMPLETED',
          dateCompletedAt: new Date(),
        },
        { transaction }
      );

      // Update both users to POST_DATE_OPEN
      const user1 = await sequelize.models.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await sequelize.models.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'POST_DATE_OPEN' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'POST_DATE_OPEN' },
        { transaction }
      );

      await transaction.commit();

      return { success: true, message: 'Date marked as completed. Users now available for stealing.' };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new DateService();
```

---

## PHASE 5: Stealing Mechanism

### 5.1 Steal Request Service

```javascript
// src/models/StealRequest.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StealRequest = sequelize.define('StealRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    currentMatchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'matches',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'),
      defaultValue: 'PENDING',
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      defaultValue: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    },
  }, {
    tableName: 'steal_requests',
    timestamps: false,
  });

  return StealRequest;
};
```

### 5.2 Stealing Service

```javascript
// src/services/StealService.js
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class StealService {
  /**
   * Create steal request
   * Requester must be AVAILABLE, Target must be POST_DATE_OPEN
   */
  async createStealRequest(requesterId, targetUserId) {
    // Validation
    const requester = await sequelize.models.User.findByPk(requesterId);
    const target = await sequelize.models.User.findByPk(targetUserId);

    if (!requester || !target) {
      throw new Error('User not found');
    }

    if (requester.relationshipStatus !== 'AVAILABLE') {
      throw new Error('You must be AVAILABLE to request stealing');
    }

    if (target.relationshipStatus !== 'POST_DATE_OPEN') {
      throw new Error('Target user is not available for stealing');
    }

    // Get target's current match
    const currentMatch = await sequelize.models.Match.findOne({
      where: {
        [Op.or]: [
          { user1Id: targetUserId },
          { user2Id: targetUserId }
        ],
        matchStatus: 'COMPLETED'
      }
    });

    // Create steal request
    const stealRequest = await sequelize.models.StealRequest.create({
      requesterId,
      targetUserId,
      currentMatchId: currentMatch?.id,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    });

    return stealRequest;
  }

  /**
   * Accept steal request and break old match
   * TRANSACTION SAFE - Critical for integrity
   */
  async acceptStealRequest(stealRequestId, acceptingUserId) {
    const transaction = await sequelize.transaction();

    try {
      const stealRequest = await sequelize.models.StealRequest.findByPk(
        stealRequestId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!stealRequest) {
        throw new Error('Steal request not found');
      }

      if (stealRequest.status !== 'PENDING') {
        throw new Error('Steal request already processed');
      }

      // Verify the accepting user is the target
      if (stealRequest.targetUserId !== acceptingUserId) {
        throw new Error('Only the target user can accept the steal request');
      }

      // Lock all users involved
      const requester = await sequelize.models.User.findByPk(
        stealRequest.requesterId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      const target = await sequelize.models.User.findByPk(
        acceptingUserId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (requester.relationshipStatus !== 'AVAILABLE') {
        throw new Error('Requester is no longer AVAILABLE');
      }

      // Get old match
      const oldMatch = await sequelize.models.Match.findByPk(
        stealRequest.currentMatchId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!oldMatch) {
        throw new Error('Original match not found');
      }

      const oldPartner = oldMatch.user1Id === acceptingUserId
        ? await sequelize.models.User.findByPk(oldMatch.user2Id, {
            transaction,
            lock: transaction.LOCK.UPDATE
          })
        : await sequelize.models.User.findByPk(oldMatch.user1Id, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });

      // Delete old match and reset old partner
      await oldMatch.destroy({ transaction });
      await oldPartner.update(
        { relationshipStatus: 'AVAILABLE' },
        { transaction }
      );

      // Create new match
      const newMatch = await sequelize.models.Match.create({
        user1Id: stealRequest.requesterId,
        user2Id: stealRequest.targetUserId,
        matchStatus: 'LOCKED',
      }, { transaction });

      // Update both users in new match
      await requester.update(
        { relationshipStatus: 'MATCHED_LOCKED' },
        { transaction }
      );

      await target.update(
        { relationshipStatus: 'MATCHED_LOCKED' },
        { transaction }
      );

      // Mark steal request as accepted
      await stealRequest.update(
        {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        newMatchId: newMatch.id,
        message: 'User successfully stolen! New match created.'
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reject steal request
   */
  async rejectStealRequest(stealRequestId, rejectingUserId) {
    const stealRequest = await sequelize.models.StealRequest.findByPk(
      stealRequestId
    );

    if (!stealRequest) {
      throw new Error('Steal request not found');
    }

    if (stealRequest.targetUserId !== rejectingUserId) {
      throw new Error('Only the target user can reject the steal request');
    }

    await stealRequest.update({
      status: 'REJECTED',
      respondedAt: new Date(),
    });

    return { success: true, message: 'Steal request rejected' };
  }

  /**
   * Get pending steal requests for a user
   */
  async getPendingStealRequests(userId) {
    const requests = await sequelize.models.StealRequest.findAll({
      where: {
        targetUserId: userId,
        status: 'PENDING',
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'Requester',
          attributes: ['id', 'firstName', 'lastName', 'profilePictureUrl']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return requests;
  }
}

module.exports = new StealService();
```

---

## API Endpoints Summary

### Authentication Endpoints
- `POST /api/auth/signup` - Register with email
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/verify-email` - Verify email token
- `POST /api/auth/logout` - Logout

### User Endpoints
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `PUT /api/users/me/profile-details` - Update personality/interests
- `GET /api/users/:id` - Get user by ID

### Discovery Endpoints
- `GET /api/discovery/eligible-users` - Get users to swipe
- `POST /api/discovery/like` - Like a user
- `POST /api/discovery/reject` - Reject a user

### Match Endpoints
- `GET /api/matches/current` - Get current active match
- `POST /api/matches/reject` - Reject current match
- `GET /api/matches/:id` - Get match details

### Video Endpoints
- `POST /api/video/initialize` - Start video call
- `POST /api/video/sessions/:sessionId/complete` - End video call
- `GET /api/video/sessions/:sessionId` - Get session status

### Date Endpoints
- `POST /api/dates/propose` - Propose date details
- `POST /api/dates/accept` - Accept date proposal
- `POST /api/dates/complete` - Mark date as completed

### Stealing Endpoints
- `POST /api/steals/request` - Create steal request
- `POST /api/steals/requests/:id/accept` - Accept steal request
- `POST /api/steals/requests/:id/reject` - Reject steal request
- `GET /api/steals/pending` - Get pending steal requests

---

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dating_app
DB_USER=dating_user
DB_PASSWORD=secure_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_FROM_EMAIL=noreply@yourdomain.com

# Daily.co
DAILY_API_KEY=your_daily_api_key

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
```

---

## Testing Strategy

### Phase 1 Testing
- Database connection and migrations
- Model relationships and constraints
- User CRUD operations

### Phase 2 Testing
- Matching logic with transaction rollbacks
- Like/reject functionality
- One-active-match constraint enforcement

### Phase 3 Testing
- Daily.co room creation
- Token generation
- Video session lifecycle (start, duration, end)

### Phase 4 Testing
- Date proposal and acceptance
- User status transitions
- Date completion

### Phase 5 Testing (Critical)
- Steal request creation
- Accept steal with match replacement
- Transaction rollback on failure
- Old partner reset to AVAILABLE

---

## Security Considerations

1. **Transaction Safety**: All critical operations use database transactions
2. **JWT Tokens**: Short expiry (7 days), refresh tokens not shown here but recommended
3. **Email Verification**: Required before full access
4. **Google OAuth**: Secure redirect URIs
5. **Daily.co Tokens**: Time-limited (1 hour expiry)
6. **Database Locks**: Row-level locks on critical operations
7. **Validation**: Input validation at API and service levels

---

## Next Steps

1. Set up PostgreSQL and Docker
2. Initialize Express.js project
3. Implement Phase 1 (Models and Database)
4. Build authentication system
5. Implement matching logic with thorough testing
6. Integrate Daily.co
7. Build React Native frontend
