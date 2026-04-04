const express = require('express');
const router = express.Router();
const discoveryController = require('../controllers/discoveryController');
const { authenticateJWT } = require('../middleware/auth');
const { requireTier } = require('../middleware/tierGate');
const { likeValidator } = require('../validators/inputValidator');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @swagger
 * /api/discovery/eligible:
 *   get:
 *     summary: Get eligible users for matching
 *     tags: [Discovery]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of eligible users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/eligible', authenticateJWT, discoveryController.eligibleUsers);

/**
 * @swagger
 * /api/discovery/like:
 *   post:
 *     summary: Like or reject a user
 *     tags: [Discovery]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toUserId, likeType]
 *             properties:
 *               toUserId:
 *                 type: string
 *                 format: uuid
 *               likeType:
 *                 type: string
 *                 enum: [like, reject]
 *     responses:
 *       200:
 *         description: Like/reject recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 match:
 *                   type: object
 *                   nullable: true
 *                   description: Match object if mutual like
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/like', authenticateJWT, likeValidator, handleValidationErrors, discoveryController.like);

/**
 * @swagger
 * /api/discovery/user/{id}:
 *   get:
 *     summary: Get user card for viewing
 *     tags: [Discovery]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User card information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 profile:
 *                   $ref: '#/components/schemas/Profile'
 *                 compatibilityScore:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/user/:id', authenticateJWT, discoveryController.getUserCard);

/**
 * @swagger
 * /api/discovery/liked-me:
 *   get:
 *     summary: See who liked you (Premium & Gold only)
 *     tags: [Discovery]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Users who liked you
 *       403:
 *         description: Premium or Gold plan required
 */
router.get('/liked-me', authenticateJWT, requireTier('premium', 'gold'), discoveryController.likedMe);

/**
 * @swagger
 * /api/discovery/undo:
 *   post:
 *     summary: Undo last swipe (removes the most recent like/pass)
 *     tags: [Discovery]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Swipe undone — revertedUserId is the user who reappears in discovery
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 revertedUserId:
 *                   type: string
 *                   format: uuid
 *       404:
 *         description: Nothing to undo
 */
router.post('/undo', authenticateJWT, discoveryController.undo);

/**
 * @swagger
 * /api/discovery/quota:
 *   get:
 *     summary: Get your daily like quota status
 *     tags: [Discovery]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Quota information
 */
router.get('/quota', authenticateJWT, discoveryController.getQuota);

module.exports = router;
