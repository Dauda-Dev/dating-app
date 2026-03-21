const express = require('express');
const router = express.Router();
const discoveryController = require('../controllers/discoveryController');
const { authenticateJWT } = require('../middleware/auth');
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

module.exports = router;
