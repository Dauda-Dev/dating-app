const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { submitReport, getMyReports } = require('../controllers/reportController');

// POST /api/reports — submit a report
router.post('/', authenticateJWT, submitReport);

// GET /api/reports/my — get my filed reports
router.get('/my', authenticateJWT, getMyReports);

module.exports = router;
