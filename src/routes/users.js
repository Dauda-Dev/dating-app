const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT } = require('../middleware/auth');
const { profileValidator } = require('../validators/inputValidator');
const { handleValidationErrors } = require('../middleware/validation');
const { uploadProfilePhoto, uploadGalleryPhoto } = require('../config/cloudinary');

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Profile not found
 */
router.get('/profile', authenticateJWT, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               height:
 *                 type: integer
 *               weight:
 *                 type: integer
 *               openness:
 *                 type: number
 *               conscientiousness:
 *                 type: number
 *               extraversion:
 *                 type: number
 *               agreeableness:
 *                 type: number
 *               neuroticism:
 *                 type: number
 *               hobbies:
 *                 type: array
 *                 items:
 *                   type: string
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/profile', authenticateJWT, profileValidator, handleValidationErrors, userController.updateProfile);

/**
 * @swagger
 * /api/users/profile-picture:
 *   post:
 *     summary: Upload user profile picture
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded
 *       400:
 *         description: Invalid file format
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/profile-picture', authenticateJWT, uploadProfilePhoto.single('photo'), userController.updateProfilePicture);

// Gallery photo endpoints
router.post('/gallery-photo', authenticateJWT, uploadGalleryPhoto.single('photo'), userController.uploadGalleryPhoto);
router.delete('/gallery-photo', authenticateJWT, userController.deleteGalleryPhoto);

/**
 * @swagger
 * /api/users/last-active:
 *   post:
 *     summary: Update last active timestamp
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Last active updated
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/last-active', authenticateJWT, userController.updateLastActive);

/**
 * @swagger
 * /api/users/push-token:
 *   put:
 *     summary: Register or update device push token
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushToken
 *             properties:
 *               pushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Push token registered
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/push-token', authenticateJWT, userController.registerPushToken);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search for users
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: ageMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: ageMax
 *         schema:
 *           type: integer
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
 *         description: Search results
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
router.get('/search', authenticateJWT, userController.searchUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 profile:
 *                   $ref: '#/components/schemas/Profile'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authenticateJWT, userController.getUserById);

module.exports = router;
