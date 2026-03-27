require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const sequelizeOptions = {
  dialect: 'postgres',
  logging: isProduction ? false : console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  ...(isProduction && {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Render's managed Postgres
      },
    },
  }),
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, sequelizeOptions)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        ...sequelizeOptions,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
      }
    );

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('../models/User')(sequelize, Sequelize.DataTypes);
db.Profile = require('../models/Profile')(sequelize, Sequelize.DataTypes);
db.Like = require('../models/Like')(sequelize, Sequelize.DataTypes);
db.Match = require('../models/Match')(sequelize, Sequelize.DataTypes);
db.VideoSession = require('../models/VideoSession')(sequelize, Sequelize.DataTypes);
db.StealRequest = require('../models/StealRequest')(sequelize, Sequelize.DataTypes);

// Define associations
// User - Profile (1:1)
db.User.hasOne(db.Profile, {
  foreignKey: 'userId',
  as: 'profile',
});
db.Profile.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'user',
});

// User - Like (1:N) - from side
db.User.hasMany(db.Like, {
  foreignKey: 'fromUserId',
  as: 'likesGiven',
});
db.Like.belongsTo(db.User, {
  foreignKey: 'fromUserId',
  as: 'fromUser',
});

// User - Like (1:N) - to side
db.User.hasMany(db.Like, {
  foreignKey: 'toUserId',
  as: 'likesReceived',
});
db.Like.belongsTo(db.User, {
  foreignKey: 'toUserId',
  as: 'toUser',
});

// User - Match (1:N) - user1 side
db.User.hasMany(db.Match, {
  foreignKey: 'user1Id',
  as: 'matchesAsUser1',
});
db.Match.belongsTo(db.User, {
  foreignKey: 'user1Id',
  as: 'User1',
});

// User - Match (1:N) - user2 side
db.User.hasMany(db.Match, {
  foreignKey: 'user2Id',
  as: 'matchesAsUser2',
});
db.Match.belongsTo(db.User, {
  foreignKey: 'user2Id',
  as: 'User2',
});

// Match - VideoSession (1:N)
db.Match.hasMany(db.VideoSession, {
  foreignKey: 'matchId',
  as: 'videoSessions',
});
db.VideoSession.belongsTo(db.Match, {
  foreignKey: 'matchId',
  as: 'match',
});

// User - StealRequest (1:N) - requester side
db.User.hasMany(db.StealRequest, {
  foreignKey: 'requesterId',
  as: 'stealRequestsInitiated',
});
db.StealRequest.belongsTo(db.User, {
  foreignKey: 'requesterId',
  as: 'Requester',
});

// User - StealRequest (1:N) - target side
db.User.hasMany(db.StealRequest, {
  foreignKey: 'targetUserId',
  as: 'stealRequestsReceived',
});
db.StealRequest.belongsTo(db.User, {
  foreignKey: 'targetUserId',
  as: 'Target',
});

// Match - StealRequest (1:N)
db.Match.hasMany(db.StealRequest, {
  foreignKey: 'currentMatchId',
  as: 'stealRequests',
});
db.StealRequest.belongsTo(db.Match, {
  foreignKey: 'currentMatchId',
  as: 'currentMatch',
});

// Add authenticate method to db object
db.authenticate = async () => {
  return await sequelize.authenticate();
};

module.exports = db;
