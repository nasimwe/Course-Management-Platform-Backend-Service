'use strict';

const express = require('express');
const { register, login, refreshToken, getCurrentUser, updateProfile, changePassword, activateUser, deactivateUser } = require('../services/authService');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@university.edu
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecurePass123
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               role:
 *                 type: string
 *                 enum: [manager, facilitator, student]
 *                 example: facilitator
 *               profileData:
 *                 type: object
 *                 description: Role-specific profile data
 *                 example:
 *                   employeeId: "EMP001"
 *                   specialization: "Computer Science"
 *                   department: "Engineering"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', validateUserRegistration, asyncHandler(async (req, res) => {
  const result = await register(req.body);
  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: result
  });
}));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@university.edu
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateUserLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await login(email, password);
  res.json({
    status: 'success',
    message: 'Login successful',
    data: result
  });
}));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: string
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({
      status: 'error',
      message: 'Refresh token is required'
    });
  }
  const result = await refreshToken(refreshToken);
  res.json({
    status: 'success',
    message: 'Token refreshed successfully',
    data: result
  });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User profile retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.userId);
  res.json({
    status: 'success',
    message: 'User profile retrieved successfully',
    data: user
  });
}));

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               profileData:
 *                 type: object
 *                 description: Role-specific profile data
 *                 example:
 *                   phoneNumber: "+1234567890"
 *                   specialization: "Advanced Computer Science"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const updatedUser = await updateProfile(req.userId, req.body);
  res.json({
    status: 'success',
    message: 'Profile updated successfully',
    data: updatedUser
  });
}));

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password
 *               confirmPassword:
 *                 type: string
 *                 description: Confirm new password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password is incorrect
 */
router.post('/change-password', authenticate, validatePasswordChange, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await changePassword(req.userId, currentPassword, newPassword);
  res.json({
    status: 'success',
    ...result
  });
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (client-side token removal)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logout successful
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // The client should remove the token from storage
  // In a production environment, you might want to implement token blacklisting
  res.json({
    status: 'success',
    message: 'Logout successful. Please remove the token from client storage.'
  });
}));

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [manager, facilitator, student]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       403:
 *         description: Access denied
 */
router.get('/users', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const { role, isActive, page = 1, limit = 20 } = req.query;
  const whereClause = {};
  if (role) whereClause.role = role;
  if (isActive !== undefined) whereClause.isActive = isActive === 'true';
  const offset = (page - 1) * limit;
  const { User, Manager, Facilitator, Student } = require('../models');
  const { count, rows: users } = await User.findAndCountAll({
    where: whereClause,
    include: [
      { model: Manager, as: 'managerProfile' },
      { model: Facilitator, as: 'facilitatorProfile' },
      { model: Student, as: 'studentProfile' }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });
  res.json({
    status: 'success',
    message: 'Users retrieved successfully',
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  });
}));

/**
 * @swagger
 * /api/auth/users/{id}/activate:
 *   patch:
 *     summary: Activate user account (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/activate', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const result = await activateUser(parseInt(req.params.id));
  res.json({
    status: 'success',
    ...result
  });
}));

/**
 * @swagger
 * /api/auth/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user account (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/deactivate', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const result = await deactivateUser(parseInt(req.params.id));
  res.json({
    status: 'success',
    ...result
  });
}));

module.exports = router;