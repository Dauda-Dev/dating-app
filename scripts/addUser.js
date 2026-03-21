require('dotenv').config();
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');

async function addUser() {
  try {
    console.log('Adding user...');

    await db.sequelize.sync({ force: false });

    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.error('Usage: node scripts/addUser.js <email> <password>');
      process.exit(1);
    }

    // Check if user exists
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      console.log('User already exists. Updating to verified...');
      await existing.update({ isEmailVerified: true });
      console.log('User updated successfully!');
      process.exit(0);
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.User.create({
      email,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: dayjs().subtract(25, 'years').toDate(),
      gender: 'male',
      isEmailVerified: true,
      relationshipStatus: 'available',
      subscriptionTier: 'free',
    });

    console.log('User created successfully!');
    console.log('Email:', user.email);
    console.log('Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addUser();
