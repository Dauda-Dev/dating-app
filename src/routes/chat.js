const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { getMessages, getUnreadCounts } = require('../controllers/chatController');

// All chat routes require authentication
router.use(authenticateJWT);

// GET /api/chat/unread-counts
router.get('/unread-counts', getUnreadCounts);

// GET /api/chat/:matchId/messages
router.get('/:matchId/messages', getMessages);

module.exports = router;
