const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticateJWT } = require('../middleware/auth');
const { matchValidator } = require('../validators/inputValidator');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @swagger
 * /api/matches:
 *   get:
 *     summary: Get all matches for the authenticated user
 *     tags: [Matches]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of matches
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authenticateJWT, matchController.list);

/**
 * @swagger
 * /api/matches/current:
 *   get:
 *     summary: Get current match for user
 *     tags: [Matches]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current match information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Match'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: No active match
 */
router.get('/current', authenticateJWT, matchController.current);

/**
 * @swagger
 * /api/matches/{id}:
 *   get:
 *     summary: Get match details by ID
 *     tags: [Matches]
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
 *         description: Match details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 match:
 *                   $ref: '#/components/schemas/Match'
 *                 partner:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authenticateJWT, matchController.getById);

/**
 * @swagger
 * /api/matches/reject:
 *   post:
 *     summary: Reject current match
 *     tags: [Matches]
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
 *         description: Match rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/reject', authenticateJWT, matchValidator, handleValidationErrors, matchController.reject);

router.delete('/:id/unmatch', authenticateJWT, matchController.unmatch);

module.exports = router;
