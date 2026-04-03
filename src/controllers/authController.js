const bcrypt = require('bcryptjs');
const axios = require('axios');
const db = require('../config/database');
const EmailService = require('../services/EmailService');
const { generateToken, formatUserResponse, createError } = require('../utils/helpers');

module.exports = {
  async signup(req, res, next) {
    try {
      const { email, password, firstName, lastName, dateOfBirth, gender } = req.body;

      if (!email || !firstName || !lastName || !dateOfBirth || !gender) {
        throw createError('Missing required fields', 400);
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await db.User.findOne({ where: { email: normalizedEmail } });
      if (existing) throw createError('Email already in use', 409);

      let hashed = null;
      if (password) {
        hashed = await bcrypt.hash(password, 10);
      }

      const verificationToken = EmailService.generateOtp(); // 6-digit code for mobile
      const verificationExpires = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes

      const user = await db.User.create({
        email: normalizedEmail,
        password: hashed,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Send verification email
      try {
        await EmailService.sendVerificationOtp(email, firstName, verificationToken);
        await EmailService.sendWelcomeEmail(firstName, email);
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
      }

      return res.status(201).json({
        success: true,
        message: 'Signup successful. Please check your email to verify your account.'
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) throw createError('Verification token required', 400);

      const user = await db.User.findOne({ where: { emailVerificationToken: token } });
      if (!user) throw createError('Invalid verification token', 400);

      // Check expiry
      if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
        // Clear expired token
        await user.update({ emailVerificationToken: null, emailVerificationExpires: null });
        throw createError('Verification token has expired', 400);
      }

      await user.update({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });

      return res.json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
      next(err);
    }
  },

  // Mobile OTP flow — user types 6-digit code shown in email
  async verifyEmailOtp(req, res, next) {
    try {
      const { email, code } = req.body;
      if (!email || !code) throw createError('Email and code are required', 400);

      const normalizedEmail = email.trim().toLowerCase();
      const user = await db.User.findOne({ where: { email: normalizedEmail } });
      if (!user) throw createError('No account found with this email', 404);
      if (user.isEmailVerified) return res.json({ success: true, message: 'Email already verified' });

      if (!user.emailVerificationToken || user.emailVerificationToken !== String(code)) {
        throw createError('Invalid verification code', 400);
      }
      if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
        await user.update({ emailVerificationToken: null, emailVerificationExpires: null });
        throw createError('Code has expired — request a new one', 400);
      }

      await user.update({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      return res.json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) throw createError('Email is required', 400);

      const normalizedEmail = email.trim().toLowerCase();
      const user = await db.User.findOne({ where: { email: normalizedEmail } });
      if (!user) throw createError('No account found with this email', 404);

      if (user.isEmailVerified) {
        return res.json({ message: 'Email is already verified' });
      }

      // Generate new OTP
      const verificationToken = EmailService.generateOtp();
      const verificationExpires = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes

      await user.update({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Send OTP email
      await EmailService.sendVerificationOtp(normalizedEmail, user.firstName, verificationToken);

      return res.json({ message: 'Verification email sent successfully' });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) throw createError('Missing credentials', 400);

      const user = await db.User.findOne({ where: { email: email.trim().toLowerCase() } });
      if (!user) throw createError('Invalid credentials', 401);

      if (!user.password) throw createError('Password not set for this user', 401);

      const match = await bcrypt.compare(password, user.password);
      if (!match) throw createError('Invalid credentials', 401);

      if (!user.isEmailVerified) {
        throw createError('Please verify your email before logging in', 403);
      }

      // Issue refresh token on login
      const token = generateToken(user.id, user.email);
      const refreshToken = EmailService.generateToken();
      await user.update({ refreshToken });

      return res.json({ token, refreshToken, user: formatUserResponse(user) });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      if (!userId) throw createError('Not authenticated', 401);

      const user = await db.User.findByPk(userId, { include: [{ model: db.Profile, as: 'profile' }] });
      if (!user) throw createError('User not found', 404);

      return res.json({ user: formatUserResponse(user), profile: user.profile });
    } catch (err) {
      next(err);
    }
  },

  async googleAuthCallback(req, res, next) {
    try {
      // User is authenticated via Passport
      const user = req.user;
      if (!user) throw createError('Authentication failed', 401);

      // Update last login
      await user.update({ lastLoginAt: new Date() });

      // Generate JWT token for API access
      const token = generateToken(user.id, user.email);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/callback?token=${token}&userId=${user.id}`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/google/mobile
   * Accepts a Google id_token from expo-auth-session, verifies it with Google,
   * then finds or creates a user and returns a JWT directly (no redirect).
   */
  async googleMobileAuth(req, res, next) {
    try {
      const { idToken } = req.body;
      if (!idToken) throw createError('idToken is required', 400);

      // Verify id_token with Google
      let googleData;
      try {
        const { data } = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
        );
        googleData = data;
      } catch {
        throw createError('Invalid Google token', 401);
      }

      const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = googleData;

      if (!email) throw createError('Google account has no email', 400);

      // Check client_id matches (optional but secure)
      const expectedClientId = process.env.GOOGLE_CLIENT_ID;
      if (expectedClientId && googleData.aud !== expectedClientId) {
        throw createError('Token audience mismatch', 401);
      }

      // Find or create user
      let user = await db.User.findOne({ where: { email } });

      if (!user) {
        // New Google user — create account (no password, email pre-verified)
        user = await db.User.create({
          email,
          firstName: firstName || 'User',
          lastName: lastName || '',
          googleId,
          profilePhoto: picture || null,
          isEmailVerified: true,
          dateOfBirth: null,
          gender: null,
        });
      } else if (!user.googleId) {
        // Existing account — link Google ID
        await user.update({ googleId, isEmailVerified: true });
      }

      await user.update({ lastLoginAt: new Date() });

      const token = generateToken(user.id, user.email);
      const refreshToken = EmailService.generateToken();
      await user.update({ refreshToken });

      return res.json({ token, refreshToken, user: formatUserResponse(user) });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      if (!userId) throw createError('Not authenticated', 401);

      // Revoke refresh token
      await db.User.update({ refreshToken: null }, { where: { id: userId } });

      req.logout((err) => {
        if (err) {
          return next(err);
        }
        return res.json({ success: true, message: 'Logged out successfully' });
      });
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw createError('Refresh token required', 400);

      // Find user with matching refresh token
      const user = await db.User.findOne({ where: { refreshToken } });
      if (!user) throw createError('Invalid or expired refresh token', 401);

      // Generate new access token
      const newAccessToken = generateToken(user.id, user.email);
      
      // Optionally generate new refresh token (rotation)
      const newRefreshToken = EmailService.generateToken();
      await user.update({ refreshToken: newRefreshToken });

      return res.json({
        token: newAccessToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully'
      });
    } catch (err) {
      next(err);
    }
  },

  async resendVerificationEmail(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) throw createError('Email required', 400);

      const user = await db.User.findOne({ where: { email } });
      if (!user) {
        // Return generic message for security (user enumeration protection)
        return res.json({ success: true, message: 'If email exists and unverified, verification email sent' });
      }

      // Only allow resend if email not already verified
      if (user.isEmailVerified) {
        return res.json({ success: true, message: 'Email already verified' });
      }

      // Generate new verification token with 24h expiry
      const verificationToken = EmailService.generateToken();
      const verificationExpires = new Date(Date.now() + (24 * 60 * 60 * 1000));

      await user.update({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(email, verificationToken);
      } catch (emailErr) {
        console.error('Resend verification email failed:', emailErr);
      }

      return res.json({ success: true, message: 'If email exists and unverified, verification email sent' });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) throw createError('Email required', 400);

      const user = await db.User.findOne({ where: { email } });
      if (!user) {
        return res.json({ success: true, message: 'If email exists, password reset link sent' });
      }

      const resetToken = EmailService.generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      await user.update({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      try {
        await EmailService.sendPasswordResetEmail(email, user.firstName, resetToken);
      } catch (emailErr) {
        console.error('Password reset email failed:', emailErr);
      }

      return res.json({ success: true, message: 'If email exists, password reset link sent' });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) throw createError('Token and password required', 400);

      if (newPassword.length < 8) throw createError('Password must be at least 8 characters', 400);

      const user = await db.User.findOne({
        where: { passwordResetToken: token }
      });

      if (!user) throw createError('Invalid or expired reset token', 400);

      if (new Date() > user.passwordResetExpires) {
        await user.update({
          passwordResetToken: null,
          passwordResetExpires: null
        });
        throw createError('Password reset token has expired', 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await user.update({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      return res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  }
};

