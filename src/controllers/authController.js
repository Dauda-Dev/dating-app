const bcrypt = require('bcryptjs');
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

      const existing = await db.User.findOne({ where: { email } });
      if (existing) throw createError('Email already in use', 409);

      let hashed = null;
      if (password) {
        hashed = await bcrypt.hash(password, 10);
      }

      const verificationToken = EmailService.generateToken();
      const verificationExpires = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

      const user = await db.User.create({
        email,
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
        await EmailService.sendVerificationEmail(email, verificationToken);
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

  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) throw createError('Email is required', 400);

      const user = await db.User.findOne({ where: { email } });
      if (!user) throw createError('No account found with this email', 404);

      if (user.isEmailVerified) {
        return res.json({ message: 'Email is already verified' });
      }

      // Generate new verification token
      const verificationToken = EmailService.generateToken();
      const verificationExpires = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

      await user.update({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      });

      // Send verification email
      await EmailService.sendVerificationEmail(email, verificationToken);

      return res.json({ message: 'Verification email sent successfully' });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) throw createError('Missing credentials', 400);

      const user = await db.User.findOne({ where: { email } });
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

