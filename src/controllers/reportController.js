const { Op } = require('sequelize');
const db = require('../config/database');

const VALID_REASONS = [
  'harassment',
  'fake_profile',
  'underage',
  'spam',
  'inappropriate_content',
  'other',
];

/**
 * POST /api/reports
 * Submit a report against another user
 */
const submitReport = async (req, res) => {
  try {
    const reporterId = req.userId;
    const { reportedUserId, reason, matchId, details } = req.body;

    if (!reportedUserId) {
      return res.status(400).json({ error: 'reportedUserId is required.' });
    }

    if (reportedUserId === reporterId) {
      return res.status(400).json({ error: 'You cannot report yourself.' });
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({
        error: `reason must be one of: ${VALID_REASONS.join(', ')}`,
      });
    }

    // Verify reported user exists
    const reportedUser = await db.User.findByPk(reportedUserId, {
      attributes: ['id', 'username'],
    });
    if (!reportedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent duplicate pending report for same pair + reason
    const existing = await db.Report.findOne({
      where: {
        reporterId,
        reportedUserId,
        reason,
        status: 'pending',
      },
    });
    if (existing) {
      return res.status(409).json({
        error: 'You already have a pending report against this user for that reason.',
      });
    }

    const report = await db.Report.create({
      reporterId,
      reportedUserId,
      matchId: matchId || null,
      reason,
      details: details || null,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Report submitted successfully. Our team will review it shortly.',
      reportId: report.id,
    });
  } catch (err) {
    console.error('[reportController.submitReport]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/reports/my
 * Get reports filed by the authenticated user
 */
const getMyReports = async (req, res) => {
  try {
    const reports = await db.Report.findAll({
      where: { reporterId: req.userId },
      include: [
        {
          model: db.User,
          as: 'reportedUser',
          attributes: ['id', 'username'],
          include: [
            { model: db.Profile, as: 'profile', attributes: ['firstName', 'photos'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ reports });
  } catch (err) {
    console.error('[reportController.getMyReports]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { submitReport, getMyReports };
