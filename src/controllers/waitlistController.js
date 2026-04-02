const db = require('../config/database');
const EmailService = require('../services/EmailService');

const emailService = new EmailService();

// ── POST /api/waitlist/join ────────────────────────────────────────────────
// Accepts { email }, sends a 6-digit OTP, upserts row in waitlist table
exports.join = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const normalised = email.toLowerCase().trim();

    // Check if already verified
    const existing = await db.Waitlist.findOne({ where: { email: normalised } });
    if (existing?.isVerified) {
      return res.status(409).json({ error: 'This email is already on the waitlist!' });
    }

    const otp = emailService.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existing) {
      await existing.update({ otp, otpExpiresAt });
    } else {
      await db.Waitlist.create({ email: normalised, otp, otpExpiresAt });
    }

    await emailService.sendWaitlistOtp(normalised, otp);

    return res.json({ message: 'OTP sent! Check your inbox.' });
  } catch (err) {
    console.error('Waitlist join error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// ── POST /api/waitlist/verify ──────────────────────────────────────────────
// Accepts { email, code }, marks row as verified
exports.verify = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const normalised = email.toLowerCase().trim();
    const entry = await db.Waitlist.findOne({ where: { email: normalised } });

    if (!entry) {
      return res.status(404).json({ error: 'Email not found. Please join the waitlist first.' });
    }
    if (entry.isVerified) {
      return res.status(409).json({ error: 'Email already verified!' });
    }
    if (!entry.otp || entry.otp !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid code. Please check and try again.' });
    }
    if (new Date() > new Date(entry.otpExpiresAt)) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }

    await entry.update({
      isVerified: true,
      verifiedAt: new Date(),
      otp: null,
      otpExpiresAt: null,
    });

    // Send welcome confirmation
    await emailService.sendWaitlistWelcome(normalised);

    return res.json({ message: "You're on the list! We'll be in touch soon." });
  } catch (err) {
    console.error('Waitlist verify error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// ── GET /api/waitlist/count ────────────────────────────────────────────────
// Public endpoint so the landing page can show live waitlist count
exports.count = async (req, res) => {
  try {
    const count = await db.Waitlist.count({ where: { isVerified: true } });
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: 'Could not fetch count.' });
  }
};
