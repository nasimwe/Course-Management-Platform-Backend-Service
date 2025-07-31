const express = require('express');
const { authenticate, authorize, requireResourceAccess } = require('../middleware/auth');
const { validateCourseOffering, validateQueryFilters } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  CourseOffering, 
  Module, 
  Cohort, 
  Class, 
  Facilitator, 
  Manager, 
  Mode,
  User 
} = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Course Allocations
 *   description: Course allocation management
 */

/**
 * @swagger
 * /api/course-allocations:
 *   get:
 *     summary: Get all course allocations
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: moduleId
 *         schema:
 *           type: integer
 *         description: Filter by module ID
 *       - in: query
 *         name: cohortId
 *         schema:
 *           type: integer
 *         description: Filter by cohort ID
 *       - in: query
 *         name: classId
 *         schema:
 *           type: integer
 *         description: Filter by class ID
 *       - in: query
 *         name: facilitatorId
 *         schema:
 *           type: integer
 *         description: Filter by facilitator ID
 *       - in: query
 *         name: modeId
 *         schema:
 *           type: integer
 *         description: Filter by mode ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, active, completed, cancelled]
 *         description: Filter by status
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
 *         description: Course allocations retrieved successfully
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
 *                   example: Course allocations retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     allocations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CourseOffering'
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
  const { 
    moduleId, cohortId, classId, facilitatorId, modeId, status,
    page = 1, limit = 20 
  } = req.query;

  // Build filters
  const filters = {};
  if (moduleId) filters.moduleId = parseInt(moduleId);
  if (cohortId) filters.cohortId = parseInt(cohortId);
  if (classId) filters.classId = parseInt(classId);
  if (facilitatorId) filters.facilitatorId = parseInt(facilitatorId);
  if (modeId) filters.modeId = parseInt(modeId);
  if (status) filters.status = status;

  // For facilitators, only show their own allocations
  if (req.user.role === 'facilitator') {
    filters.facilitatorId = req.facilitatorProfile.id;
  }

  const offset = (page - 1) * limit;

  const { count, rows: allocations } = await CourseOffering.findAndCountAll({
    where: filters,
    include: [
      {
        model: Module,
        as: 'module'
      },
      {
        model: Cohort,
        as: 'cohort'
      },
      {
        model: Class,
        as: 'class'
      },
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      },
      {
        model: Manager,
        as: 'manager',
        include: [{ model: User, as: 'user' }]
      },
      {
        model: Mode,
        as: 'mode'
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });

  res.json({
    status: 'success',
    message: 'Course allocations retrieved successfully',
    data: {
      allocations,
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
 * /api/course-allocations:
 *   post:
 *     summary: Create a new course allocation
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moduleId
 *               - cohortId
 *               - classId
 *               - modeId
 *             properties:
 *               moduleId:
 *                 type: integer
 *                 example: 1
 *               cohortId:
 *                 type: integer
 *                 example: 1
 *               classId:
 *                 type: integer
 *                 example: 1
 *               modeId:
 *                 type: integer
 *                 example: 1
 *               facilitatorId:
 *                 type: integer
 *                 example: 1
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-05-15"
 *               maxEnrollment:
 *                 type: integer
 *                 example: 30
 *               schedule:
 *                 type: string
 *                 example: "Monday, Wednesday, Friday 10:00-12:00"
 *               location:
 *                 type: string
 *                 example: "Room 101 or Zoom Meeting ID: 123456789"
 *               notes:
 *                 type: string
 *                 example: "Special requirements or additional information"
 *     responses:
 *       201:
 *         description: Course allocation created successfully
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
 *                   example: Course allocation created successfully
 *                 data:
 *                   $ref: '#/components/schemas/CourseOffering'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/', authenticate, authorize('manager'), validateCourseOffering, asyncHandler(async (req, res) => {
  const allocationData = {
    ...req.body,
    managerId: req.managerProfile.id
  };

  // Check for existing allocation with same module, cohort, and class
  const existingAllocation = await CourseOffering.findOne({
    where: {
      moduleId: allocationData.moduleId,
      cohortId: allocationData.cohortId,
      classId: allocationData.classId
    }
  });

  if (existingAllocation) {
    return res.status(409).json({
      status: 'error',
      message: 'Course allocation already exists for this module, cohort, and class combination'
    });
  }

  // Verify that referenced entities exist
  const [module, cohort, classEntity, mode] = await Promise.all([
    Module.findByPk(allocationData.moduleId),
    Cohort.findByPk(allocationData.cohortId),
    Class.findByPk(allocationData.classId),
    Mode.findByPk(allocationData.modeId)
  ]);

  if (!module) {
    return res.status(400).json({
      status: 'error',
      message: 'Module not found'
    });
  }

  if (!cohort) {
    return res.status(400).json({
      status: 'error',
      message: 'Cohort not found'
    });
  }

  if (!classEntity) {
    return res.status(400).json({
      status: 'error',
      message: 'Class not found'
    });
  }

  if (!mode) {
    return res.status(400).json({
      status: 'error',
      message: 'Mode not found'
    });
  }

  // If facilitator is specified, verify they exist and are available
  if (allocationData.facilitatorId) {
    const facilitator = await Facilitator.findByPk(allocationData.facilitatorId);
    
    if (!facilitator) {
      return res.status(400).json({
        status: 'error',
        message: 'Facilitator not found'
      });
    }

    const canTakeMore = await facilitator.canTakeMoreCourses();
    if (!canTakeMore) {
      return res.status(400).json({
        status: 'error',
        message: 'Facilitator has reached maximum course load or is not available'
      });
    }
  }

  const allocation = await CourseOffering.create(allocationData);

  // Fetch the created allocation with all related data
  const createdAllocation = await CourseOffering.findByPk(allocation.id, {
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' },
      { 
        model: Facilitator, 
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      },
      { 
        model: Manager, 
        as: 'manager',
        include: [{ model: User, as: 'user' }]
      },
      { model: Mode, as: 'mode' }
    ]
  });

  res.status(201).json({
    status: 'success',
    message: 'Course allocation created successfully',
    data: createdAllocation
  });
}));

/**
 * @swagger
 * /api/course-allocations/{id}:
 *   get:
 *     summary: Get a specific course allocation
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course allocation ID
 *     responses:
 *       200:
 *         description: Course allocation retrieved successfully
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
 *                   example: Course allocation retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/CourseOffering'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Course allocation not found
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const allocationId = parseInt(req.params.id);

  const allocation = await CourseOffering.findByPk(allocationId, {
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' },
      { 
        model: Facilitator, 
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      },
      { 
        model: Manager, 
        as: 'manager',
        include: [{ model: User, as: 'user' }]
      },
      { model: Mode, as: 'mode' }
    ]
  });

  if (!allocation) {
    return res.status(404).json({
      status: 'error',
      message: 'Course allocation not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'facilitator' && 
      allocation.facilitatorId !== req.facilitatorProfile.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only access your own course allocations'
    });
  }

  res.json({
    status: 'success',
    message: 'Course allocation retrieved successfully',
    data: allocation
  });
}));

/**
 * @swagger
 * /api/course-allocations/{id}:
 *   put:
 *     summary: Update a course allocation
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course allocation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               facilitatorId:
 *                 type: integer
 *                 example: 1
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-05-15"
 *               maxEnrollment:
 *                 type: integer
 *                 example: 30
 *               status:
 *                 type: string
 *                 enum: [draft, scheduled, active, completed, cancelled]
 *                 example: scheduled
 *               schedule:
 *                 type: string
 *                 example: "Monday, Wednesday, Friday 10:00-12:00"
 *               location:
 *                 type: string
 *                 example: "Room 101 or Zoom Meeting ID: 123456789"
 *               notes:
 *                 type: string
 *                 example: "Updated requirements or information"
 *     responses:
 *       200:
 *         description: Course allocation updated successfully
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
 *                   example: Course allocation updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/CourseOffering'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Course allocation not found
 */
router.put('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const allocationId = parseInt(req.params.id);

  const allocation = await CourseOffering.findByPk(allocationId);

  if (!allocation) {
    return res.status(404).json({
      status: 'error',
      message: 'Course allocation not found'
    });
  }

  const updateData = req.body;

  // If updating facilitator, verify they exist and are available
  if (updateData.facilitatorId && updateData.facilitatorId !== allocation.facilitatorId) {
    const facilitator = await Facilitator.findByPk(updateData.facilitatorId);
    
    if (!facilitator) {
      return res.status(400).json({
        status: 'error',
        message: 'Facilitator not found'
      });
    }

    const canTakeMore = await facilitator.canTakeMoreCourses();
    if (!canTakeMore) {
      return res.status(400).json({
        status: 'error',
        message: 'Facilitator has reached maximum course load or is not available'
      });
    }
  }

  await allocation.update(updateData);

  // Fetch updated allocation with all related data
  const updatedAllocation = await CourseOffering.findByPk(allocationId, {
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' },
      { 
        model: Facilitator, 
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      },
      { 
        model: Manager, 
        as: 'manager',
        include: [{ model: User, as: 'user' }]
      },
      { model: Mode, as: 'mode' }
    ]
  });

  res.json({
    status: 'success',
    message: 'Course allocation updated successfully',
    data: updatedAllocation
  });
}));

/**
 * @swagger
 * /api/course-allocations/{id}:
 *   delete:
 *     summary: Delete a course allocation
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course allocation ID
 *     responses:
 *       200:
 *         description: Course allocation deleted successfully
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
 *                   example: Course allocation deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Course allocation not found
 */
router.delete('/:id', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const allocationId = parseInt(req.params.id);

  const allocation = await CourseOffering.findByPk(allocationId);

  if (!allocation) {
    return res.status(404).json({
      status: 'error',
      message: 'Course allocation not found'
    });
  }

  // Check if allocation has associated activity logs
  const { ActivityTracker } = require('../models');
  const hasActivityLogs = await ActivityTracker.count({
    where: { allocationId }
  });

  if (hasActivityLogs > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete allocation with existing activity logs. Set status to cancelled instead.'
    });
  }

  await allocation.destroy();

  res.json({
    status: 'success',
    message: 'Course allocation deleted successfully'
  });
}));

/**
 * @swagger
 * /api/course-allocations/facilitator/{facilitatorId}:
 *   get:
 *     summary: Get course allocations for a specific facilitator
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: facilitatorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Facilitator ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, active, completed, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Facilitator course allocations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/facilitator/:facilitatorId', authenticate, requireResourceAccess('facilitator'), asyncHandler(async (req, res) => {
  const facilitatorId = parseInt(req.params.facilitatorId);
  const { status } = req.query;

  const whereClause = { facilitatorId };
  if (status) whereClause.status = status;

  const allocations = await CourseOffering.findAll({
    where: whereClause,
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' },
      { model: Mode, as: 'mode' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    status: 'success',
    message: 'Facilitator course allocations retrieved successfully',
    data: allocations
  });
}));

/**
 * @swagger
 * /api/course-allocations/module/{moduleId}:
 *   get:
 *     summary: Get course allocations for a specific module
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module course allocations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/module/:moduleId', authenticate, asyncHandler(async (req, res) => {
  const moduleId = parseInt(req.params.moduleId);

  const allocations = await CourseOffering.findAll({
    where: { moduleId },
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' },
      { 
        model: Facilitator, 
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      },
      { model: Mode, as: 'mode' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    status: 'success',
    message: 'Module course allocations retrieved successfully',
    data: allocations
  });
}));

/**
 * @swagger
 * /api/course-allocations/unassigned:
 *   get:
 *     summary: Get unassigned course allocations (no facilitator)
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unassigned course allocations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/unassigned', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const allocations = await CourseOffering.findAll({
    where: { 
      facilitatorId: null,
      isActive: true 
    },
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' },
      { model: Mode, as: 'mode' }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    status: 'success',
    message: 'Unassigned course allocations retrieved successfully',
    data: allocations
  });
}));

/**
 * @swagger
 * /api/course-allocations/{id}/assign-facilitator:
 *   patch:
 *     summary: Assign facilitator to course allocation
 *     tags: [Course Allocations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course allocation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - facilitatorId
 *             properties:
 *               facilitatorId:
 *                 type: integer
 *                 description: Facilitator ID to assign
 *     responses:
 *       200:
 *         description: Facilitator assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Course allocation not found
 */
router.patch('/:id/assign-facilitator', authenticate, authorize('manager'),asyncHandler(async (req, res) => {
  const allocationId = parseInt(req.params.id);
  const { facilitatorId } = req.body;

  if (!facilitatorId) {
    return res.status(400).json({
      status: 'error',
      message: 'Facilitator ID is required'
    });
  }

  const allocation = await CourseOffering.findByPk(allocationId);

  if (!allocation) {
    return res.status(404).json({
      status: 'error',
      message: 'Course allocation not found'
    });
  }

  const facilitator = await Facilitator.findByPk(facilitatorId);

  if (!facilitator) {
    return res.status(400).json({
      status: 'error',
      message: 'Facilitator not found'
    });
  }

  const canTakeMore = await facilitator.canTakeMoreCourses();
  if (!canTakeMore) {
    return res.status(400).json({
      status: 'error',
      message: 'Facilitator has reached maximum course load or is not available'
    });
  }

  await allocation.assignFacilitator(facilitatorId);

  // Fetch updated allocation with all related data
  const updatedAllocation = await CourseOffering.findByPk(allocationId, {
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' },
      { 
        model: Facilitator, 
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      },
      { model: Mode, as: 'mode' }
    ]
  });

  res.json({
    status: 'success',
    message: 'Facilitator assigned successfully',
    data: updatedAllocation
  });
}));

module.exports = router;