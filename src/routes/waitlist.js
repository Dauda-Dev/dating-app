const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');

// POST /api/waitlist/join   — submit email, receive OTP
router.post('/join', waitlistController.join);

// POST /api/waitlist/verify — submit email + OTP code
router.post('/verify', waitlistController.verify);

// GET  /api/waitlist/count  — public: how many verified signups
router.get('/count', waitlistController.count);

module.exports = router;
