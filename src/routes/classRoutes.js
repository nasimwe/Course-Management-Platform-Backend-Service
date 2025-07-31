const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validateClass, validateQueryFilters } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { Class } = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class management
 */

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get all classes
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: trimester
 *         schema:
 *           type: string
 *           enum: [T1, T2, T3]
 *         description: Filter by trimester
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
 *         description: Classes retrieved successfully
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
 *                   example: Classes retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     classes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Class'
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
  const { year, trimester, isActive, page = 1, limit = 20 } = req.query;

  const whereClause = {};
  if (year) whereClause.year = parseInt(year);
  if (trimester) whereClause.trimester = trimester;
  if (isActive !== undefined) whereClause.isActive = isActive === 'true';

  const offset = (page - 1) * limit;

  const { count, rows: classes } = await Class.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['year', 'DESC'], ['trimester', 'ASC']]
  });

  res.json({
    status: 'success',
    message: 'Classes retrieved successfully',
    data: {
      classes,
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
 * /api/classes:
 *   post:
 *     summary: Create a new class
 *     tags: [Classes]
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
 *               - startDate
 *               - endDate
 *               - trimester
 *             properties:
 *               name:
 *                 type: string
 *                 example: "2024S"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-05-15"
 *               trimester:
 *                 type: string
 *                 enum: [T1, T2, T3]
 *                 example: "T1"
 *               year:
 *                 type: integer
 *                 example: 2024
 *               graduationDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-30"
 *               description:
 *                 type: string
 *                 example: "Spring 2024 class"
 *     responses:
 *       201:
 *         description: Class created successfully
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
 *                   example: Class created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Class'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/', authenticate, authorize('manager'), validateClass, asyncHandler(async (req, res) => {
  const classData = req.body;

  // Check if class with same name already exists
  const existingClass = await Class.findByName(classData.name);
  if (existingClass) {
    return res.status(409).json({
      status: 'error',
      message: 'Class with this name already exists'
    });
  }

  const newClass = await Class.create(classData);

  res.status(201).json({
    status: 'success',
    message: 'Class created successfully',
    data: newClass
  });
}));

/**
 * @swagger
 * /api/classes/{id}:
 *   get:
 *     summary: Get a specific class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Class ID
 *     responses:
 *       200:
 *         description: Class retrieved successfully
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
 *                   example: Class retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Class'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Class not found
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const classId = parseInt(req.params.id);

  const classEntity = await Class.findByPk(classId, {
    include: [{
      model: require('../models').CourseOffering,
      as: 'courseOfferings',
      include: [
        { model: require('../models').Module, as: 'module' },
        { model: require('../models').Cohort, as: 'cohort' }
      ]
    }]
  });

  if (!classEntity) {
    return res.status(404).json({
      status: 'error',
      message: 'Class not found'
    });
  }

  res.json({
    status: 'success',
    message: 'Class retrieved successfully',
    data: classEntity
  });
}));

/**
 * @swagger
 * /api/classes/{id}:
 *   put:
 *     summary: Update a class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Class ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "2024S"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-05-15"
 *               trimester:
 *                 type: string
 *                 enum: [T1, T2, T3]
 *                 example: "T1"
 *               year:
 *                 type: integer
 *                 example: 2024
 *               graduationDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-30"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               description:
 *                 type: string
 *                 example: "Updated Spring 2024 class"
 *     responses:
 *       200:
 *         description: Class updated successfully
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
 *                   example: Class updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Class'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Class not found
 */
router.put('/:id', authenticate, authorize('manager') , asyncHandler(async (req, res) => {
  const classId = parseInt(req.params.id);
  const updateData = req.body;

  const classEntity = await Class.findByPk(classId);

  if (!classEntity) {
    return res.status(404).json({
      status: 'error',
      message: 'Class not found'
    });
  }

  // If updating name, check if new name already exists
  if (updateData.name && updateData.name !== classEntity.name) {
    const existingClass = await Class.findByName(updateData.name);
    if (existingClass) {
      return res.status(409).json({
        status: 'error',
        message: 'Class with this name already exists'
      });
    }
  }

  await classEntity.update(updateData);

  res.json({
    status: 'success',
    message: 'Class updated successfully',
    data: classEntity
  });
}));

/**
 * @swagger
 * /api/classes/{id}:
 *   delete:
 *     summary: Delete a class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Class ID
 *     responses:
 *       200:
 *         description: Class deleted successfully
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
 *                   example: Class deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Class not found
 */
router.delete('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const classId = parseInt(req.params.id);

  const classEntity = await Class.findByPk(classId);

  if (!classEntity) {
    return res.status(404).json({
      status: 'error',
      message: 'Class not found'
    });
  }

  // Check if class has course offerings
  const courseOfferingCount = await require('../models').CourseOffering.count({
    where: { classId }
  });

  if (courseOfferingCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete class with existing course offerings'
    });
  }

  await classEntity.destroy();

  res.json({
    status: 'success',
    message: 'Class deleted successfully'
  });
}));

/**
 * @swagger
 * /api/classes/current:
 *   get:
 *     summary: Get currently active classes
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current classes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/current', authenticate, asyncHandler(async (req, res) => {
  const currentClasses = await Class.findCurrent();

  res.json({
    status: 'success',
    message: 'Current classes retrieved successfully',
    data: currentClasses
  });
}));

/**
 * @swagger
 * /api/classes/upcoming:
 *   get:
 *     summary: Get upcoming classes
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming classes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/upcoming', authenticate, asyncHandler(async (req, res) => {
  const upcomingClasses = await Class.findUpcoming();

  res.json({
    status: 'success',
    message: 'Upcoming classes retrieved successfully',
    data: upcomingClasses
  });
}));

module.exports = router;