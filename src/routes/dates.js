const express = require('express');
const router = express.Router();
const dateController = require('../controllers/dateController');
const { authenticateJWT } = require('../middleware/auth');
const { dateValidator, matchValidator } = require('../validators/inputValidator');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @swagger
 * /api/dates/propose:
 *   post:
 *     summary: Propose a date with a match
 *     tags: [Dates]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchId, proposedDate, location]
 *             properties:
 *               matchId:
 *                 type: string
 *                 format: uuid
 *               proposedDate:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               venue:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Date proposal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 proposedDate:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *                   enum: [pending, accepted, declined, completed]
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/propose', authenticateJWT, dateValidator, handleValidationErrors, dateController.propose);

/**
 * @swagger
 * /api/dates/accept:
 *   post:
 *     summary: Accept a date proposal
 *     tags: [Dates]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dateId]
 *             properties:
 *               dateId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Date proposal accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/accept', authenticateJWT, matchValidator, handleValidationErrors, dateController.accept);

/**
 * @swagger
 * /api/dates/complete:
 *   post:
 *     summary: Mark a date as completed
 *     tags: [Dates]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dateId]
 *             properties:
 *               dateId:
 *                 type: string
 *                 format: uuid
 *               feedback:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Date marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/complete', authenticateJWT, matchValidator, handleValidationErrors, dateController.complete);

router.post('/reminder', authenticateJWT, matchValidator, handleValidationErrors, dateController.sendReminder);

module.exports = router;

