const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validateModule,validateQueryFilters } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { Module, CourseOffering } = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Module (Course) management
 */

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Get all modules
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [foundation, intermediate, advanced]
 *         description: Filter by level
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: credits
 *         schema:
 *           type: integer
 *         description: Filter by number of credits
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or code
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
 *         description: Modules retrieved successfully
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
 *                   example: Modules retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     modules:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Module'
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
  const { department, level, isActive, credits, search, page = 1, limit = 20 } = req.query;

  const whereClause = {};
  
  if (department) {
    whereClause.department = { [require('sequelize').Op.like]: `%${department}%` };
  }
  if (level) whereClause.level = level;
  if (isActive !== undefined) whereClause.isActive = isActive === 'true';
  if (credits) whereClause.credits = parseInt(credits);
  
  if (search) {
    whereClause[require('sequelize').Op.or] = [
      { name: { [require('sequelize').Op.like]: `%${search}%` } },
      { code: { [require('sequelize').Op.like]: `%${search}%` } }
    ];
  }

  const offset = (page - 1) * limit;

  const { count, rows: modules } = await Module.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['code', 'ASC']]
  });

  res.json({
    status: 'success',
    message: 'Modules retrieved successfully',
    data: {
      modules,
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
 * /api/modules:
 *   post:
 *     summary: Create a new module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - credits
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CS101"
 *               name:
 *                 type: string
 *                 example: "Introduction to Computer Science"
 *               description:
 *                 type: string
 *                 example: "An introductory course covering fundamental concepts of computer science"
 *               credits:
 *                 type: integer
 *                 example: 3
 *               prerequisites:
 *                 type: string
 *                 example: "Basic mathematics"
 *               department:
 *                 type: string
 *                 example: "Computer Science"
 *               level:
 *                 type: string
 *                 enum: [foundation, intermediate, advanced]
 *                 example: "foundation"
 *               maxEnrollment:
 *                 type: integer
 *                 example: 30
 *     responses:
 *       201:
 *         description: Module created successfully
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
 *                   example: Module created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Module'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/', authenticate, authorize('manager'), validateModule, asyncHandler(async (req, res) => {
  const moduleData = req.body;

  // Check if module with same code already exists
  const existingModule = await Module.findByCode(moduleData.code);
  if (existingModule) {
    return res.status(409).json({
      status: 'error',
      message: 'Module with this code already exists'
    });
  }

  const module = await Module.create(moduleData);

  res.status(201).json({
    status: 'success',
    message: 'Module created successfully',
    data: module
  });
}));

/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Get a specific module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module retrieved successfully
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
 *                   example: Module retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Module'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Module not found
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const moduleId = parseInt(req.params.id);

  const module = await Module.findByPk(moduleId, {
    include: [{
      model: CourseOffering,
      as: 'offerings',
      include: [
        { model: require('../models').Cohort, as: 'cohort' },
        { model: require('../models').Class, as: 'class' },
        { model: require('../models').Facilitator, as: 'facilitator', 
          include: [{ model: require('../models').User, as: 'user' }]
        }
      ]
    }]
  });

  if (!module) {
    return res.status(404).json({
      status: 'error',
      message: 'Module not found'
    });
  }

  // Get enrollment information
  const currentEnrollment = await module.getCurrentEnrollment();
  const availableSpots = await module.getAvailableSpots();

  res.json({
    status: 'success',
    message: 'Module retrieved successfully',
    data: {
      ...module.toJSON(),
      enrollmentInfo: {
        current: currentEnrollment,
        available: availableSpots,
        maximum: module.maxEnrollment
      }
    }
  });
}));

/**
 * @swagger
 * /api/modules/{id}:
 *   put:
 *     summary: Update a module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CS101"
 *               name:
 *                 type: string
 *                 example: "Introduction to Computer Science - Updated"
 *               description:
 *                 type: string
 *                 example: "Updated description of the course"
 *               credits:
 *                 type: integer
 *                 example: 4
 *               prerequisites:
 *                 type: string
 *                 example: "Basic mathematics and logic"
 *               department:
 *                 type: string
 *                 example: "Computer Science"
 *               level:
 *                 type: string
 *                 enum: [foundation, intermediate, advanced]
 *                 example: "foundation"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               maxEnrollment:
 *                 type: integer
 *                 example: 35
 *     responses:
 *       200:
 *         description: Module updated successfully
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
 *                   example: Module updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Module'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Module not found
 */
router.put('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const moduleId = parseInt(req.params.id);
  const updateData = req.body;

  const module = await Module.findByPk(moduleId);

  if (!module) {
    return res.status(404).json({
      status: 'error',
      message: 'Module not found'
    });
  }

  // If updating code, check if new code already exists
  if (updateData.code && updateData.code !== module.code) {
    const existingModule = await Module.findByCode(updateData.code);
    if (existingModule) {
      return res.status(409).json({
        status: 'error',
        message: 'Module with this code already exists'
      });
    }
  }

  await module.update(updateData);

  res.json({
    status: 'success',
    message: 'Module updated successfully',
    data: module
  });
}));

/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module deleted successfully
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
 *                   example: Module deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Module not found
 */
router.delete('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const moduleId = parseInt(req.params.id);

  const module = await Module.findByPk(moduleId);

  if (!module) {
    return res.status(404).json({
      status: 'error',
      message: 'Module not found'
    });
  }

  // Check if module has course offerings
  const offeringCount = await CourseOffering.count({
    where: { moduleId }
  });

  if (offeringCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete module with existing course offerings'
    });
  }

  await module.destroy();

  res.json({
    status: 'success',
    message: 'Module deleted successfully'
  });
}));

/**
 * @swagger
 * /api/modules/search/{term}:
 *   get:
 *     summary: Search modules by name or code
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: term
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/search/:term', authenticate, asyncHandler(async (req, res) => {
  const searchTerm = req.params.term;

  const modules = await Module.searchByName(searchTerm);

  res.json({
    status: 'success',
    message: 'Search results retrieved successfully',
    data: modules
  });
}));

/**
 * @swagger
 * /api/modules/department/{department}:
 *   get:
 *     summary: Get modules by department
 *     tags: [Modules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: department
 *         required: true
 *         schema:
 *           type: string
 *         description: Department name
 *     responses:
 *       200:
 *         description: Department modules retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/department/:department', authenticate, asyncHandler(async (req, res) => {
  const department = req.params.department;

  const modules = await Module.findByDepartment(department);

  res.json({
    status: 'success',
    message: 'Department modules retrieved successfully',
    data: modules
  });
}));

module.exports = router;