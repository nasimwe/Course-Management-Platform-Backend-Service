const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validateMode, validateQueryFilters } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { Mode, CourseOffering } = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Modes
 *   description: Delivery mode management
 */

/**
 * @swagger
 * /api/modes:
 *   get:
 *     summary: Get all modes
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [online, in-person, hybrid]
 *         description: Filter by type
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
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Modes retrieved successfully
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
 *                   example: Modes retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     modes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Mode'
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
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, validateQueryFilters, asyncHandler(async (req, res) => {
  const { type, isActive, page = 1, limit = 20 } = req.query;

  const whereClause = {};
  if (type) whereClause.type = type;
  if (isActive !== undefined) whereClause.isActive = isActive === 'true';

  const offset = (page - 1) * limit;

  const { count, rows: modes } = await Mode.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['name', 'ASC']]
  });

  res.json({
    status: 'success',
    message: 'Modes retrieved successfully',
    data: {
      modes,
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
 * /api/modes:
 *   post:
 *     summary: Create a new mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Online"
 *               type:
 *                 type: string
 *                 enum: [online, in-person, hybrid]
 *                 example: "online"
 *               description:
 *                 type: string
 *                 example: "Fully online delivery with virtual lectures and assignments"
 *               requirements:
 *                 type: string
 *                 example: "Stable internet connection, computer with webcam"
 *               maxCapacity:
 *                 type: integer
 *                 example: 100
 *     responses:
 *       201:
 *         description: Mode created successfully
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
 *                   example: Mode created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Mode'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/', authenticate, authorize('manager'), validateMode, asyncHandler(async (req, res) => {
  const modeData = req.body;

  // Check if mode with same name already exists
  const existingMode = await Mode.findByName(modeData.name);
  if (existingMode) {
    return res.status(409).json({
      status: 'error',
      message: 'Mode with this name already exists'
    });
  }

  const mode = await Mode.create(modeData);

  res.status(201).json({
    status: 'success',
    message: 'Mode created successfully',
    data: mode
  });
}));

/**
 * @swagger
 * /api/modes/{id}:
 *   get:
 *     summary: Get a specific mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mode ID
 *     responses:
 *       200:
 *         description: Mode retrieved successfully
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
 *                   example: Mode retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Mode'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Mode not found
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const modeId = parseInt(req.params.id);

  const mode = await Mode.findByPk(modeId, {
    include: [{
      model: CourseOffering,
      as: 'courseOfferings',
      include: [
        { model: require('../models').Module, as: 'module' },
        { model: require('../models').Cohort, as: 'cohort' }
      ],
      limit: 10,
      order: [['createdAt', 'DESC']]
    }]
  });

  if (!mode) {
    return res.status(404).json({
      status: 'error',
      message: 'Mode not found'
    });
  }

  // Get usage statistics
  const currentUsage = await mode.getCurrentUsage();
  const hasCapacity = await mode.hasAvailableCapacity();
  const availableCapacity = await mode.getAvailableCapacity();

  res.json({
    status: 'success',
    message: 'Mode retrieved successfully',
    data: {
      ...mode.toJSON(),
      usageInfo: {
        currentUsage,
        hasCapacity,
        availableCapacity,
        capacityInfo: mode.getCapacityInfo()
      }
    }
  });
}));

/**
 * @swagger
 * /api/modes/{id}:
 *   put:
 *     summary: Update a mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mode ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Online Learning"
 *               type:
 *                 type: string
 *                 enum: [online, in-person, hybrid]
 *                 example: "online"
 *               description:
 *                 type: string
 *                 example: "Updated description for online learning mode"
 *               requirements:
 *                 type: string
 *                 example: "Updated requirements: stable internet, computer with webcam and microphone"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               maxCapacity:
 *                 type: integer
 *                 example: 150
 *     responses:
 *       200:
 *         description: Mode updated successfully
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
 *                   example: Mode updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Mode'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Mode not found
 */
router.put('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const modeId = parseInt(req.params.id);
  const updateData = req.body;

  const mode = await Mode.findByPk(modeId);

  if (!mode) {
    return res.status(404).json({
      status: 'error',
      message: 'Mode not found'
    });
  }

  // If updating name, check if new name already exists
  if (updateData.name && updateData.name !== mode.name) {
    const existingMode = await Mode.findByName(updateData.name);
    if (existingMode) {
      return res.status(409).json({
        status: 'error',
        message: 'Mode with this name already exists'
      });
    }
  }

  await mode.update(updateData);

  res.json({
    status: 'success',
    message: 'Mode updated successfully',
    data: mode
  });
}));

/**
 * @swagger
 * /api/modes/{id}:
 *   delete:
 *     summary: Delete a mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mode ID
 *     responses:
 *       200:
 *         description: Mode deleted successfully
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
 *                   example: Mode deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Mode not found
 */
router.delete('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const modeId = parseInt(req.params.id);

  const mode = await Mode.findByPk(modeId);

  if (!mode) {
    return res.status(404).json({
      status: 'error',
      message: 'Mode not found'
    });
  }

  // Check if mode has course offerings
  const offeringCount = await CourseOffering.count({
    where: { modeId }
  });

  if (offeringCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete mode with existing course offerings'
    });
  }

  await mode.destroy();

  res.json({
    status: 'success',
    message: 'Mode deleted successfully'
  });
}));

/**
 * @swagger
 * /api/modes/available:
 *   get:
 *     summary: Get modes with available capacity
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available modes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/available', authenticate, asyncHandler(async (req, res) => {
  const availableModes = await Mode.findAvailableModes();

  res.json({
    status: 'success',
    message: 'Available modes retrieved successfully',
    data: availableModes
  });
}));

/**
 * @swagger
 * /api/modes/type/{type}:
 *   get:
 *     summary: Get modes by type
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [online, in-person, hybrid]
 *         description: Mode type
 *     responses:
 *       200:
 *         description: Modes retrieved successfully by type
 *       401:
 *         description: Unauthorized
 */
router.get('/type/:type', authenticate, asyncHandler(async (req, res) => {
  const type = req.params.type;

  if (!['online', 'in-person', 'hybrid'].includes(type)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid mode type. Must be online, in-person, or hybrid'
    });
  }

  const modes = await Mode.findByType(type);

  res.json({
    status: 'success',
    message: `${type} modes retrieved successfully`,
    data: modes
  });
}));

module.exports = router;