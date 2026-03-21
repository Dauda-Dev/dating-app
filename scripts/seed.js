require('dotenv').config();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    // Sync database (dev only)
    await db.sequelize.sync({ force: false });
    console.log('Database synced.');

    // Check if users already exist
    const existingUsers = await db.User.count();
    if (existingUsers > 0) {
      console.log('Users already exist. Skipping seed.');
      process.exit(0);
    }

    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123', 10);
    const verificationToken = 'test_verification_token_' + Date.now();

    const users = await db.User.bulkCreate([
      {
        email: 'alice@example.com',
        password: hashedPassword,
        firstName: 'Alice',
        lastName: 'Wonder',
        dateOfBirth: dayjs().subtract(25, 'years').toDate(),
        gender: 'female',
        isEmailVerified: true,
        relationshipStatus: 'available',
        subscriptionTier: 'premium',
      },
      {
        email: 'bob@example.com',
        password: hashedPassword,
        firstName: 'Bob',
        lastName: 'Builder',
        dateOfBirth: dayjs().subtract(28, 'years').toDate(),
        gender: 'male',
        isEmailVerified: true,
        relationshipStatus: 'available',
        subscriptionTier: 'free',
      },
      {
        email: 'charlie@example.com',
        password: hashedPassword,
        firstName: 'Charlie',
        lastName: 'Brown',
        dateOfBirth: dayjs().subtract(26, 'years').toDate(),
        gender: 'non-binary',
        isEmailVerified: true,
        relationshipStatus: 'available',
        subscriptionTier: 'gold',
      }
    ]);

    console.log(`Created ${users.length} test users.`);

    // Create profiles for each user
    for (const user of users) {
      await db.Profile.create({
        userId: user.id,
        bio: `I'm ${user.firstName}, nice to meet you!`,
        hobbies: ['reading', 'hiking', 'music'],
        interests: ['travel', 'cooking', 'art'],
        relationshipGoal: 'long_term',
        smoking: 'never',
        drinking: 'socially',
        exerciseFrequency: '3_plus_times_week',
        education: 'bachelor',
      });
    }

    console.log('Created profiles for all users.');

    // Create a test match
    const match = await db.Match.create({
      user1Id: users[0].id,
      user2Id: users[1].id,
      status: 'matched_locked',
      initiatedBy: users[0].id,
      compatibilityScore: 87,
    });

    console.log('Created test match.');

    // Create a test video session
    await db.VideoSession.create({
      matchId: match.id,
      dailyRoomName: 'test-room-001',
      dailyRoomUrl: 'https://test.daily.co/test-room-001',
      dailyRoomTokenUser1: 'test_token_user1_mock',
      dailyRoomTokenUser2: 'test_token_user2_mock',
      status: 'pending',
    });

    console.log('Created test video session.');

    // Create a test steal request
    await db.StealRequest.create({
      requesterId: users[2].id,
      targetUserId: users[1].id,
      currentMatchId: match.id,
      status: 'pending',
      expiresAt: dayjs().add(48, 'hours').toDate(),
    });

    console.log('Created test steal request.');

    console.log('✓ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
