const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @swagger
 * /api/payments/plans:
 *   get:
 *     tags: [Payments]
 *     summary: Get available subscription plans
 *     responses:
 *       200:
 *         description: List of subscription plans with pricing and features
 */
router.get('/plans', paymentController.getPlans);

/**
 * @swagger
 * /api/payments/initialize:
 *   post:
 *     tags: [Payments]
 *     summary: Initialize a Paystack payment for subscription upgrade
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier]
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [premium, gold]
 *     responses:
 *       200:
 *         description: Returns Paystack authorization URL
 *       400:
 *         description: Invalid tier
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/initialize', authenticateJWT, paymentController.initializePayment);

/**
 * @swagger
 * /api/payments/verify/{reference}:
 *   get:
 *     tags: [Payments]
 *     summary: Verify a Paystack transaction and apply subscription
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment verified and subscription upgraded
 *       400:
 *         description: Payment not successful
 */
router.get('/verify/:reference', authenticateJWT, paymentController.verifyPayment);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Paystack webhook endpoint (no auth required)
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/webhook', paymentController.webhook);

module.exports = router;
