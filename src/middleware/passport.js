const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../config/database');

// Only register the Google strategy if credentials are present.
// Without this guard the server crashes on startup when env vars are not set.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user with this Google ID exists
        let user = await db.User.findOne({
          where: { googleId: profile.id },
        });

        // If user exists, return it
        if (user) {
          return done(null, user);
        }

        // If user doesn't exist, check if email is already registered
        const existingUser = await db.User.findOne({
          where: { email: profile.emails[0]?.value },
        });

        if (existingUser) {
          // Link Google account to existing user
          await existingUser.update({
            googleId: profile.id,
            profilePhoto: profile.photos[0]?.value || existingUser.profilePhoto,
          });
          return done(null, existingUser);
        }

        // Create new user from Google profile
        const newUser = await db.User.create({
          email: profile.emails[0]?.value,
          googleId: profile.id,
          firstName: profile.name.givenName || profile.displayName.split(' ')[0],
          lastName: profile.name.familyName || profile.displayName.split(' ')[1] || '',
          profilePhoto: profile.photos[0]?.value,
          isEmailVerified: true, // Google-verified emails are trusted
          password: require('crypto').randomBytes(32).toString('hex'), // Random password for OAuth users
          // These are optional for OAuth users - they can fill in later
          dateOfBirth: new Date('2000-01-01'), // Placeholder
          gender: 'non-binary', // Default - user can update
        });

        // Create associated profile
        await db.Profile.create({
          userId: newUser.id,
        });

        return done(null, newUser);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error);
      }
    }
  )
);
} else {
  console.warn('Google OAuth is disabled: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
