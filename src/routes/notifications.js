const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/preferences', authenticateJWT, notificationController.getPreferences);
router.put('/preferences', authenticateJWT, notificationController.updatePreferences);

module.exports = router;
