const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/config', authenticateJWT, adsController.getConfig);
router.post('/events', authenticateJWT, adsController.trackEvent);

module.exports = router;
