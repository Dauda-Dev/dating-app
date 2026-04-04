const formData = require('form-data');
const Mailgun = require('mailgun.js');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.mg = new Mailgun(formData);
    this.client = this.mg.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      ...(process.env.MAILGUN_BASE_URL && { url: process.env.MAILGUN_BASE_URL }),
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
        from: `Ovally <noreply@${this.domain}>`,
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

  // Generate a 6-digit numeric OTP
  generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // Keep old method for web/link-based flows
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

  // Mobile OTP flow — sends a 6-digit code
  async sendVerificationOtp(email, firstName, otp) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#FF6B9D;margin-bottom:8px;">Hey ${firstName || 'there'} 👋</h2>
        <p style="color:#444;font-size:15px;">Use the code below to verify your Ovally account:</p>
        <div style="background:#f9f9f9;border-radius:16px;padding:28px;text-align:center;margin:24px 0;">
          <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#222;">${otp}</span>
        </div>
        <p style="color:#888;font-size:13px;">This code expires in <strong>10 minutes</strong>. Don't share it with anyone.</p>
        <p style="color:#bbb;font-size:12px;">If you didn't create an Ovally account, you can safely ignore this email.</p>
      </div>
    `;
    await this.sendEmail(email, `${otp} is your Ovally verification code`, html);
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

  async sendPasswordResetEmail(email, firstName, otp) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8f8f8;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#FF6B9D,#C44569);padding:40px 40px 32px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">🔐</div>
                  <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Ovally</div>
                  <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Password Reset</div>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;">
                  <p style="font-size:17px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Hi ${firstName || 'there'} 👋</p>
                  <p style="font-size:14px;color:#666;margin:0 0 28px;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
                  <div style="background:linear-gradient(135deg,#FF6B9D,#C44569);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                    <div style="font-size:44px;font-weight:800;letter-spacing:12px;color:#fff;font-family:monospace;">${otp}</div>
                  </div>
                  <p style="font-size:13px;color:#999;text-align:center;margin:0;">Didn't request this? You can safely ignore it — your password won't change.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
                  <p style="font-size:12px;color:#aaa;margin:0;">© ${new Date().getFullYear()} Ovally · Made with 💗</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
    await this.sendEmail(email, `${otp} — your Ovally password reset code`, html);
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // ── Waitlist OTP ───────────────────────────────────────────────────────────
  async sendWaitlistOtp(email, otp) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8f8f8;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#FF6B9D,#C44569);padding:40px 40px 32px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">💗</div>
                  <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Ovally</div>
                  <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Find your person</div>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="font-size:17px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Your verification code</p>
                  <p style="font-size:14px;color:#666;margin:0 0 28px;">Enter this code to confirm your spot on the waitlist. It expires in 10 minutes.</p>
                  <!-- OTP box -->
                  <div style="background:linear-gradient(135deg,#FF6B9D,#C44569);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                    <div style="font-size:44px;font-weight:800;letter-spacing:12px;color:#fff;font-family:monospace;">${otp}</div>
                  </div>
                  <p style="font-size:13px;color:#999;text-align:center;margin:0;">Didn't request this? You can safely ignore it.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
                  <p style="font-size:12px;color:#aaa;margin:0;">© ${new Date().getFullYear()} Ovally · Made with 💗</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
    await this.sendEmail(email, `${otp} is your Ovally verification code`, html);
  }

  // ── Waitlist welcome ───────────────────────────────────────────────────────
  async sendWaitlistWelcome(email) {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8f8f8;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#FF6B9D,#C44569);padding:40px 40px 32px;text-align:center;">
                  <div style="font-size:36px;margin-bottom:8px;">🎉</div>
                  <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">You're in!</div>
                  <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Ovally Waitlist</div>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px;text-align:center;">
                  <p style="font-size:16px;color:#1a1a1a;line-height:1.6;margin:0 0 16px;">We've saved your spot. When Ovally launches, you'll be among the first to know.</p>
                  <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 28px;">Ovally is a new kind of dating app built around real connections — video calls, proper dates, no endless swiping loops.</p>
                  <div style="background:linear-gradient(135deg,#FF6B9D,#C44569);border-radius:50px;display:inline-block;padding:14px 36px;">
                    <span style="color:#fff;font-weight:700;font-size:15px;">Watch this space 💗</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
                  <p style="font-size:12px;color:#aaa;margin:0;">© ${new Date().getFullYear()} Ovally · Made with 💗</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
    await this.sendEmail(email, "You're on the Ovally waitlist! 💗", html);
  }
}

module.exports = new EmailService();
