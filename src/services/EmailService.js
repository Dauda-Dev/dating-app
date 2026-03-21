const formData = require('form-data');
const Mailgun = require('mailgun.js');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.mg = new Mailgun(formData);
    this.client = this.mg.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY
    });
    this.domain = process.env.MAILGUN_DOMAIN;
  }

  async sendEmail(to, subject, html, text = '') {
    try {
      if (!this.domain || !process.env.MAILGUN_API_KEY) {
        console.warn('Mailgun not configured, skipping email');
        return;
      }

      const data = {
        from: `DatingApp <noreply@${this.domain}>`,
        to: [to],
        subject,
        html,
        text
      };

      await this.client.messages.create(this.domain, data);
      console.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendVerificationEmail(email, token) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const html = `
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>Or copy and paste this link in your browser:</p>
      <p>${verificationLink}</p>
      <p>This link expires in 24 hours.</p>
    `;

    await this.sendEmail(email, 'Verify Your Email Address', html);
  }

  async sendWelcomeEmail(firstName, email) {
    const html = `
      <h2>Welcome to DatingApp, ${firstName}!</h2>
      <p>We're excited to have you on board.</p>
      <p>Complete your profile to start meeting people:</p>
      <a href="${process.env.FRONTEND_URL}/complete-profile">Complete Profile</a>
    `;

    await this.sendEmail(email, 'Welcome to DatingApp', html);
  }

  async sendMatchNotification(userEmail, matchedUserName) {
    const html = `
      <h2>You have a new match!</h2>
      <p>You matched with <strong>${matchedUserName}</strong>.</p>
      <p>Go to the app to start a video call and get to know them better.</p>
    `;

    await this.sendEmail(userEmail, 'New Match!', html);
  }

  async sendVideoCallInvite(userEmail, matchedUserName) {
    const html = `
      <h2>Video Call from ${matchedUserName}</h2>
      <p>${matchedUserName} is ready for a video call.</p>
      <p>Open the app to join the call!</p>
    `;

    await this.sendEmail(userEmail, 'Video Call Invitation', html);
  }

  async sendDateProposal(userEmail, matchedUserName, location, dateTime) {
    const html = `
      <h2>Date Proposal from ${matchedUserName}</h2>
      <p><strong>${matchedUserName}</strong> proposed a date:</p>
      <p><strong>Location:</strong> ${location}</p>
      <p><strong>Date & Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
      <p>Open the app to respond to this proposal.</p>
    `;

    await this.sendEmail(userEmail, 'Date Proposal', html);
  }

  async sendStealNotification(userEmail, stealerName) {
    const html = `
      <h2>Someone wants to steal you!</h2>
      <p><strong>${stealerName}</strong> is interested in going on a date with you!</p>
      <p>Open the app to accept or reject this request.</p>
    `;

    await this.sendEmail(userEmail, 'You Have a New Admirer!', html);
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>Or copy and paste this link in your browser:</p>
      <p>${resetLink}</p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `;

    await this.sendEmail(email, 'Reset Your Password', html);
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new EmailService();
