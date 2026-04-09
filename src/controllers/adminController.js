const { Op } = require('sequelize');
const db = require('../config/database');

/**
 * GET /api/admin/reports
 * List all reports with optional status filter + pagination
 */
const getReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await db.Report.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'reporter',
          attributes: ['id', 'username', 'email'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['firstName', 'photos'] }],
        },
        {
          model: db.User,
          as: 'reportedUser',
          attributes: ['id', 'username', 'email', 'isSuspended', 'isActive'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['firstName', 'photos'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[adminController.getReports]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/admin/reports/:id
 * Get single report with full details
 */
const getReportById = async (req, res) => {
  try {
    const report = await db.Report.findByPk(req.params.id, {
      include: [
        {
          model: db.User,
          as: 'reporter',
          attributes: ['id', 'username', 'email', 'createdAt'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['firstName', 'lastName', 'photos', 'bio', 'age'] }],
        },
        {
          model: db.User,
          as: 'reportedUser',
          attributes: ['id', 'username', 'email', 'isSuspended', 'isActive', 'suspendedUntil', 'createdAt'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['firstName', 'lastName', 'photos', 'bio', 'age'] }],
        },
        {
          model: db.User,
          as: 'reviewer',
          attributes: ['id', 'username'],
          required: false,
        },
      ],
    });

    if (!report) return res.status(404).json({ error: 'Report not found.' });

    return res.json({ report });
  } catch (err) {
    console.error('[adminController.getReportById]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/admin/reports/:id
 * Update report status + optional admin note
 */
const reviewReport = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const VALID_STATUSES = ['reviewed', 'actioned', 'dismissed'];

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const report = await db.Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    await report.update({
      status,
      adminNote: adminNote || report.adminNote,
      reviewedBy: req.userId,
      reviewedAt: new Date(),
    });

    return res.json({ message: 'Report updated.', report });
  } catch (err) {
    console.error('[adminController.reviewReport]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Change a user's account status
 * body.action: 'suspend_7d' | 'suspend_30d' | 'suspend_permanent' | 'deactivate' | 'activate'
 */
const updateUserStatus = async (req, res) => {
  try {
    const { action, reason } = req.body;
    const VALID_ACTIONS = ['suspend_7d', 'suspend_30d', 'suspend_permanent', 'deactivate', 'activate'];

    if (!action || !VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` });
    }

    const user = await db.User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Prevent admins from acting on other admins
    if (user.role === 'admin' && req.userId !== user.id) {
      return res.status(403).json({ error: 'Cannot modify another admin account.' });
    }

    const updates = {};

    if (action === 'suspend_7d') {
      const until = new Date();
      until.setDate(until.getDate() + 7);
      updates.isSuspended = true;
      updates.suspendedUntil = until;
    } else if (action === 'suspend_30d') {
      const until = new Date();
      until.setDate(until.getDate() + 30);
      updates.isSuspended = true;
      updates.suspendedUntil = until;
    } else if (action === 'suspend_permanent') {
      updates.isSuspended = true;
      updates.suspendedUntil = null;
    } else if (action === 'deactivate') {
      updates.isActive = false;
      updates.deactivatedAt = new Date();
    } else if (action === 'activate') {
      updates.isActive = true;
      updates.isSuspended = false;
      updates.suspendedUntil = null;
      updates.deactivatedAt = null;
    }

    await user.update(updates);

    return res.json({
      message: `User ${action.replace('_', ' ')} successfully.`,
      userId: user.id,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      suspendedUntil: user.suspendedUntil,
    });
  } catch (err) {
    console.error('[adminController.updateUserStatus]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/admin/users
 * List users with optional filters (suspended, deactivated, all)
 */
const getUsers = async (req, res) => {
  try {
    const { filter, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (filter === 'suspended') where.isSuspended = true;
    else if (filter === 'deactivated') where.isActive = false;
    else if (filter === 'active') { where.isActive = true; where.isSuspended = false; }

    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: ['id', 'username', 'email', 'isActive', 'isSuspended', 'suspendedUntil', 'role', 'createdAt'],
      include: [
        { model: db.Profile, as: 'profile', attributes: ['firstName', 'lastName', 'photos'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      users: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('[adminController.getUsers]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

module.exports = { getReports, getReportById, reviewReport, updateUserStatus, getUsers };
