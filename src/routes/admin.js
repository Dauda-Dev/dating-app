const express = require('express');
const router = express.Router();
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const {
  getReports,
  getReportById,
  reviewReport,
  updateUserStatus,
  getUsers,
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authenticateJWT, requireAdmin);

// Reports
router.get('/reports', getReports);
router.get('/reports/:id', getReportById);
router.patch('/reports/:id', reviewReport);

// Users
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
