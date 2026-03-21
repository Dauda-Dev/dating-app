const express = require('express');
const router = express.Router();
const stealController = require('../controllers/stealController');
const { authenticateJWT } = require('../middleware/auth');
const { stealValidator } = require('../validators/inputValidator');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @swagger
 * /api/steals/request:
 *   post:
 *     summary: Create a steal request for a user in someone else's match
 *     description: Send a request to "steal" (connect with) someone who is currently matched with another user
 *     tags: [Steals]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user to send steal request to
 *               message:
 *                 type: string
 *                 description: Optional message with the steal request
 *     responses:
 *       201:
 *         description: Steal request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 fromUserId:
 *                   type: string
 *                   format: uuid
 *                 toUserId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [pending, accepted, rejected]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Cannot steal - user not in an active match
 */
router.post('/request', authenticateJWT, stealValidator, handleValidationErrors, stealController.createRequest);

/**
 * @swagger
 * /api/steals/requests/{id}/accept:
 *   post:
 *     summary: Accept a steal request
 *     description: Accept a steal request from another user
 *     tags: [Steals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Steal request ID
 *     responses:
 *       200:
 *         description: Steal request accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 newMatchId:
 *                   type: string
 *                   format: uuid
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/requests/:id/accept', authenticateJWT, stealController.acceptRequest);

/**
 * @swagger
 * /api/steals/requests/{id}/reject:
 *   post:
 *     summary: Reject a steal request
 *     description: Decline a steal request from another user
 *     tags: [Steals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Steal request ID
 *     responses:
 *       200:
 *         description: Steal request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/requests/:id/reject', authenticateJWT, stealController.rejectRequest);

/**
 * @swagger
 * /api/steals/pending:
 *   get:
 *     summary: Get all pending steal requests for user
 *     description: Retrieve all pending steal requests directed to the current user
 *     tags: [Steals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of pending steal requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fromUser:
 *                         $ref: '#/components/schemas/User'
 *                       message:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/pending', authenticateJWT, stealController.pending);

module.exports = router;

