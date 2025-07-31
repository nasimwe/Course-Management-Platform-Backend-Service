const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCohort, validateQueryFilters } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { Cohort, Student } = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cohorts
 *   description: Cohort management
 */

/**
 * @swagger
 * /api/cohorts:
 *   get:
 *     summary: Get all cohorts
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, completed, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: intakePeriod
 *         schema:
 *           type: string
 *           enum: [HT1, HT2, FT]
 *         description: Filter by intake period
 *       - in: query
 *         name: program
 *         schema:
 *           type: string
 *         description: Filter by program
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
 *         description: Cohorts retrieved successfully
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
 *                   example: Cohorts retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     cohorts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Cohort'
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
  const { status, intakePeriod, program, page = 1, limit = 20 } = req.query;

  const whereClause = {};
  if (status) whereClause.status = status;
  if (intakePeriod) whereClause.intakePeriod = intakePeriod;
  if (program) whereClause.program = { [require('sequelize').Op.like]: `%${program}%` };

  const offset = (page - 1) * limit;

  const { count, rows: cohorts } = await Cohort.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['startDate', 'DESC']]
  });

  res.json({
    status: 'success',
    message: 'Cohorts retrieved successfully',
    data: {
      cohorts,
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
 * /api/cohorts:
 *   post:
 *     summary: Create a new cohort
 *     tags: [Cohorts]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "2024 Fall Intake"
 *               code:
 *                 type: string
 *                 example: "FAL2024HT1"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-09-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-30"
 *               program:
 *                 type: string
 *                 example: "Computer Science"
 *               intakePeriod:
 *                 type: string
 *                 enum: [HT1, HT2, FT]
 *                 example: "HT1"
 *               maxCapacity:
 *                 type: integer
 *                 example: 30
 *               description:
 *                 type: string
 *                 example: "First half-term intake for Fall 2024"
 *     responses:
 *       201:
 *         description: Cohort created successfully
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
 *                   example: Cohort created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Cohort'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/', authenticate, authorize('manager'), validateCohort, asyncHandler(async (req, res) => {
  const cohortData = req.body;

  // Check if cohort with same code already exists
  if (cohortData.code) {
    const existingCohort = await Cohort.findByCode(cohortData.code);
    if (existingCohort) {
      return res.status(409).json({
        status: 'error',
        message: 'Cohort with this code already exists'
      });
    }
  }

  const cohort = await Cohort.create(cohortData);

  res.status(201).json({
    status: 'success',
    message: 'Cohort created successfully',
    data: cohort
  });
}));

/**
 * @swagger
 * /api/cohorts/{id}:
 *   get:
 *     summary: Get a specific cohort
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cohort ID
 *     responses:
 *       200:
 *         description: Cohort retrieved successfully
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
 *                   example: Cohort retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Cohort'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cohort not found
 */
router.get('/:id', authenticate,asyncHandler(async (req, res) => {
  const cohortId = parseInt(req.params.id);

  const cohort = await Cohort.findByPk(cohortId, {
    include: [
      {
        model: Student,
        as: 'students',
        include: [{ model: require('../models').User, as: 'user' }]
      },
      {
        model: require('../models').CourseOffering,
        as: 'courseOfferings',
        include: [{ model: require('../models').Module, as: 'module' }]
      }
    ]
  });

  if (!cohort) {
    return res.status(404).json({
      status: 'error',
      message: 'Cohort not found'
    });
  }

  res.json({
    status: 'success',
    message: 'Cohort retrieved successfully',
    data: cohort
  });
}));

/**
 * @swagger
 * /api/cohorts/{id}:
 *   put:
 *     summary: Update a cohort
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cohort ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "2024 Fall Intake Updated"
 *               code:
 *                 type: string
 *                 example: "FAL2024HT1"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-09-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-06-30"
 *               program:
 *                 type: string
 *                 example: "Computer Science"
 *               intakePeriod:
 *                 type: string
 *                 enum: [HT1, HT2, FT]
 *                 example: "HT1"
 *               maxCapacity:
 *                 type: integer
 *                 example: 35
 *               status:
 *                 type: string
 *                 enum: [planning, active, completed, cancelled]
 *                 example: "active"
 *               description:
 *                 type: string
 *                 example: "Updated first half-term intake for Fall 2024"
 *     responses:
 *       200:
 *         description: Cohort updated successfully
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
 *                   example: Cohort updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Cohort'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Cohort not found
 */
router.put('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const cohortId = parseInt(req.params.id);
  const updateData = req.body;

  const cohort = await Cohort.findByPk(cohortId);

  if (!cohort) {
    return res.status(404).json({
      status: 'error',
      message: 'Cohort not found'
    });
  }

  // If updating code, check if new code already exists
  if (updateData.code && updateData.code !== cohort.code) {
    const existingCohort = await Cohort.findByCode(updateData.code);
    if (existingCohort) {
      return res.status(409).json({
        status: 'error',
        message: 'Cohort with this code already exists'
      });
    }
  }

  await cohort.update(updateData);

  res.json({
    status: 'success',
    message: 'Cohort updated successfully',
    data: cohort
  });
}));

/**
 * @swagger
 * /api/cohorts/{id}:
 *   delete:
 *     summary: Delete a cohort
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cohort ID
 *     responses:
 *       200:
 *         description: Cohort deleted successfully
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
 *                   example: Cohort deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Cohort not found
 */
router.delete('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const cohortId = parseInt(req.params.id);

  const cohort = await Cohort.findByPk(cohortId);

  if (!cohort) {
    return res.status(404).json({
      status: 'error',
      message: 'Cohort not found'
    });
  }

  // Check if cohort has students
  const studentCount = await Student.count({
    where: { cohortId }
  });

  if (studentCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete cohort with enrolled students'
    });
  }

  // Check if cohort has course offerings
  const courseOfferingCount = await require('../models').CourseOffering.count({
    where: { cohortId }
  });

  if (courseOfferingCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete cohort with existing course offerings'
    });
  }

  await cohort.destroy();

  res.json({
    status: 'success',
    message: 'Cohort deleted successfully'
  });
}));

/**
 * @swagger
 * /api/cohorts/{id}/update-enrollment:
 *   patch:
 *     summary: Update cohort enrollment count
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cohort ID
 *     responses:
 *       200:
 *         description: Enrollment count updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Cohort not found
 */
router.patch('/:id/update-enrollment', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const cohortId = parseInt(req.params.id);

  const cohort = await Cohort.findByPk(cohortId);

  if (!cohort) {
    return res.status(404).json({
      status: 'error',
      message: 'Cohort not found'
    });
  }

  const newCount = await cohort.updateEnrollmentCount();

  res.json({
    status: 'success',
    message: 'Enrollment count updated successfully',
    data: {
      cohortId: cohort.id,
      currentEnrollment: newCount
    }
  });
}));

/**
 * @swagger
 * /api/cohorts/active:
 *   get:
 *     summary: Get active cohorts
 *     tags: [Cohorts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active cohorts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/active', authenticate, asyncHandler(async (req, res) => {
  const activeCohorts = await Cohort.findActive();

  res.json({
    status: 'success',
    message: 'Active cohorts retrieved successfully',
    data: activeCohorts
  });
}));

module.exports = router;