const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticateJWT } = require('../middleware/auth');
const { videoValidator } = require('../validators/inputValidator');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @swagger
 * /api/video/initialize:
 *   post:
 *     summary: Initialize video call session
 *     tags: [Video]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchId]
 *             properties:
 *               matchId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Video call initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   format: uuid
 *                 roomUrl:
 *                   type: string
 *                 token:
 *                   type: string
 *                 minDurationSeconds:
 *                   type: number
 *                 maxDurationSeconds:
 *                   type: number
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/initialize', authenticateJWT, videoController.initialize);

/**
 * @swagger
 * /api/video/sessions/{sessionId}/complete:
 *   post:
 *     summary: Complete video call session
 *     tags: [Video]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [durationSeconds]
 *             properties:
 *               durationSeconds:
 *                 type: number
 *                 description: Call duration in seconds (min 240)
 *     responses:
 *       200:
 *         description: Video session completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                 durationSeconds:
 *                   type: number
 *                 matchStatus:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/sessions/:sessionId/complete', authenticateJWT, videoController.complete);

/**
 * @swagger
 * /api/video/webhook:
 *   post:
 *     summary: Daily.co webhook endpoint (internal)
 *     tags: [Video]
 *     description: Receives webhook events from Daily.co for room lifecycle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 type:
 *                   type: string
 */
router.post('/webhook', videoController.webhook);

/**
 * @swagger
 * /api/video/sessions/{sessionId}:
 *   get:
 *     summary: Get video session information
 *     tags: [Video]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video session details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 matchId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [initiated, active, completed]
 *                 duration:
 *                   type: number
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/sessions/:sessionId', authenticateJWT, videoController.getSession);

module.exports = router;

