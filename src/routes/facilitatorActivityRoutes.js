const express = require('express');
const { authenticate, authorize, requireResourceAccess } = require('../middleware/auth');
const { validateActivityTracker, validateQueryFilters } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { queueManagerAlert } = require('../services/notificationService');
const { 
  ActivityTracker, 
  CourseOffering, 
  Facilitator, 
  Module, 
  Cohort, 
  Class, 
  User 
} = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Facilitator Activities
 *   description: Facilitator activity tracking and management
 */

/**
 * @swagger
 * /api/facilitator-activities:
 *   get:
 *     summary: Get all activity logs
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: allocationId
 *         schema:
 *           type: integer
 *         description: Filter by allocation ID
 *       - in: query
 *         name: facilitatorId
 *         schema:
 *           type: integer
 *         description: Filter by facilitator ID
 *       - in: query
 *         name: weekNumber
 *         schema:
 *           type: integer
 *         description: Filter by week number
 *       - in: query
 *         name: isSubmitted
 *         schema:
 *           type: boolean
 *         description: Filter by submission status
 *       - in: query
 *         name: formativeOneGrading
 *         schema:
 *           type: string
 *           enum: [Done, Pending, Not Started]
 *         description: Filter by formative one grading status
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
 *         description: Activity logs retrieved successfully
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
 *                   example: Activity logs retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityTracker'
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
    allocationId, facilitatorId, weekNumber, isSubmitted,
    formativeOneGrading, formativeTwoGrading, summativeGrading,
    page = 1, limit = 20 
  } = req.query;

  // Build filters
  const filters = {};
  if (allocationId) filters.allocationId = parseInt(allocationId);
  if (facilitatorId) filters.facilitatorId = parseInt(facilitatorId);
  if (weekNumber) filters.weekNumber = parseInt(weekNumber);
  if (isSubmitted !== undefined) {
    filters.submittedAt = isSubmitted === 'true' ? 
      { [require('sequelize').Op.ne]: null } : 
      { [require('sequelize').Op.eq]: null };
  }
  if (formativeOneGrading) filters.formativeOneGrading = formativeOneGrading;
  if (formativeTwoGrading) filters.formativeTwoGrading = formativeTwoGrading;
  if (summativeGrading) filters.summativeGrading = summativeGrading;

  // For facilitators, only show their own activities
  if (req.user.role === 'facilitator') {
    filters.facilitatorId = req.facilitatorProfile.id;
  }

  const offset = (page - 1) * limit;

  const { count, rows: activities } = await ActivityTracker.findAndCountAll({
    where: filters,
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [
          { model: Module, as: 'module' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' }
        ]
      },
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['weekNumber', 'ASC'], ['createdAt', 'DESC']]
  });

  res.json({
    status: 'success',
    message: 'Activity logs retrieved successfully',
    data: {
      activities,
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
 * /api/facilitator-activities:
 *   post:
 *     summary: Create a new activity log
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - allocationId
 *               - weekNumber
 *             properties:
 *               allocationId:
 *                 type: integer
 *                 example: 1
 *               weekNumber:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 1
 *               attendance:
 *                 type: array
 *                 items:
 *                   type: boolean
 *                 maxItems: 7
 *                 example: [true, true, false, true, true]
 *               formativeOneGrading:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Pending"
 *               formativeTwoGrading:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Not Started"
 *               summativeGrading:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Not Started"
 *               courseModeration:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Pending"
 *               intranetSync:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Done"
 *               gradeBookStatus:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Pending"
 *               notes:
 *                 type: string
 *                 example: "Week 1 went well. Students were engaged."
 *     responses:
 *       201:
 *         description: Activity log created successfully
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
 *                   example: Activity log created successfully
 *                 data:
 *                   $ref: '#/components/schemas/ActivityTracker'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post('/', authenticate, authorize(['facilitator', 'manager']), validateActivityTracker, asyncHandler(async (req, res) => {
  const activityData = {
    ...req.body,
    facilitatorId: req.user.role === 'facilitator' ? req.facilitatorProfile.id : req.body.facilitatorId
  };

  // Verify allocation exists and belongs to facilitator (if facilitator is creating)
  const allocation = await CourseOffering.findByPk(activityData.allocationId);
  
  if (!allocation) {
    return res.status(400).json({
      status: 'error',
      message: 'Course allocation not found'
    });
  }

  if (req.user.role === 'facilitator' && allocation.facilitatorId !== req.facilitatorProfile.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only create activity logs for your own course allocations'
    });
  }

  // Check if activity log already exists for this allocation and week
  const existingActivity = await ActivityTracker.findOne({
    where: {
      allocationId: activityData.allocationId,
      weekNumber: activityData.weekNumber
    }
  });

  if (existingActivity) {
    return res.status(409).json({
      status: 'error',
      message: 'Activity log already exists for this allocation and week'
    });
  }

  const activity = await ActivityTracker.create(activityData);

  // Fetch the created activity with all related data
  const createdActivity = await ActivityTracker.findByPk(activity.id, {
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [
          { model: Module, as: 'module' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' }
        ]
      },
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      }
    ]
  });

  res.status(201).json({
    status: 'success',
    message: 'Activity log created successfully',
    data: createdActivity
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/{id}:
 *   get:
 *     summary: Get a specific activity log
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity log ID
 *     responses:
 *       200:
 *         description: Activity log retrieved successfully
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
 *                   example: Activity log retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/ActivityTracker'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Activity log not found
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const activityId = parseInt(req.params.id);

  const activity = await ActivityTracker.findByPk(activityId, {
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [
          { model: Module, as: 'module' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' }
        ]
      },
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      }
    ]
  });

  if (!activity) {
    return res.status(404).json({
      status: 'error',
      message: 'Activity log not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'facilitator' && 
      activity.facilitatorId !== req.facilitatorProfile.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only access your own activity logs'
    });
  }

  res.json({
    status: 'success',
    message: 'Activity log retrieved successfully',
    data: activity
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/{id}:
 *   put:
 *     summary: Update an activity log
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity log ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attendance:
 *                 type: array
 *                 items:
 *                   type: boolean
 *                 maxItems: 7
 *                 example: [true, true, true, true, true]
 *               formativeOneGrading:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Done"
 *               formativeTwoGrading:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Pending"
 *               summativeGrading:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Not Started"
 *               courseModeration:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Done"
 *               intranetSync:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Done"
 *               gradeBookStatus:
 *                 type: string
 *                 enum: [Done, Pending, Not Started]
 *                 example: "Done"
 *               notes:
 *                 type: string
 *                 example: "Updated notes for week 1"
 *     responses:
 *       200:
 *         description: Activity log updated successfully
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
 *                   example: Activity log updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/ActivityTracker'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Activity log not found
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const activityId = parseInt(req.params.id);

  const activity = await ActivityTracker.findByPk(activityId);

  if (!activity) {
    return res.status(404).json({
      status: 'error',
      message: 'Activity log not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'facilitator' && 
      activity.facilitatorId !== req.facilitatorProfile.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only update your own activity logs'
    });
  }

  // If already submitted and it's late, trigger alert
  const wasSubmitted = activity.submittedAt !== null;
  
  await activity.update(req.body);

  // If this is a late submission, alert managers
  if (!wasSubmitted && activity.isOverdue()) {
    const facilitator = await Facilitator.findByPk(activity.facilitatorId, {
      include: [{ model: User, as: 'user' }]
    });
    
    const allocation = await CourseOffering.findByPk(activity.allocationId, {
      include: [{ model: Module, as: 'module' }]
    });

    await queueManagerAlert('late-submission', {
      facilitatorName: facilitator.user.getFullName(),
      courseName: allocation.module.getFullName(),
      weekNumber: activity.weekNumber,
      submissionTime: new Date().toISOString()
    });
  }

  // Fetch updated activity with all related data
  const updatedActivity = await ActivityTracker.findByPk(activityId, {
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [
          { model: Module, as: 'module' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' }
        ]
      },
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      }
    ]
  });

  res.json({
    status: 'success',
    message: 'Activity log updated successfully',
    data: updatedActivity
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/{id}/submit:
 *   patch:
 *     summary: Submit an activity log
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity log ID
 *     responses:
 *       200:
 *         description: Activity log submitted successfully
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
 *                   example: Activity log submitted successfully
 *                 data:
 *                   $ref: '#/components/schemas/ActivityTracker'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Activity log not found
 */
router.patch('/:id/submit', authenticate, authorize(['facilitator', 'manager']), asyncHandler(async (req, res) => {
  const activityId = parseInt(req.params.id);

  const activity = await ActivityTracker.findByPk(activityId);

  if (!activity) {
    return res.status(404).json({
      status: 'error',
      message: 'Activity log not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'facilitator' && 
      activity.facilitatorId !== req.facilitatorProfile.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only submit your own activity logs'
    });
  }

  if (activity.submittedAt) {
    return res.status(400).json({
      status: 'error',
      message: 'Activity log has already been submitted'
    });
  }

  await activity.submit();

  // Check if submission is late and alert managers
  if (activity.isOverdue()) {
    const facilitator = await Facilitator.findByPk(activity.facilitatorId, {
      include: [{ model: User, as: 'user' }]
    });
    
    const allocation = await CourseOffering.findByPk(activity.allocationId, {
      include: [{ model: Module, as: 'module' }]
    });

    await queueManagerAlert('late-submission', {
      facilitatorName: facilitator.user.getFullName(),
      courseName: allocation.module.getFullName(),
      weekNumber: activity.weekNumber,
      submissionTime: activity.submittedAt
    });
  }

  const updatedActivity = await ActivityTracker.findByPk(activityId, {
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [
          { model: Module, as: 'module' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' }
        ]
      },
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      }
    ]
  });

  res.json({
    status: 'success',
    message: 'Activity log submitted successfully',
    data: updatedActivity
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/facilitator/{facilitatorId}:
 *   get:
 *     summary: Get activity logs for a specific facilitator
 *     tags: [Facilitator Activities]
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
 *         name: weekNumber
 *         schema:
 *           type: integer
 *         description: Filter by week number
 *       - in: query
 *         name: allocationId
 *         schema:
 *           type: integer
 *         description: Filter by allocation ID
 *     responses:
 *       200:
 *         description: Facilitator activity logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/facilitator/:facilitatorId', authenticate, requireResourceAccess('facilitator'), asyncHandler(async (req, res) => {
  const facilitatorId = parseInt(req.params.facilitatorId);
  const { weekNumber, allocationId } = req.query;

  const whereClause = { facilitatorId };
  if (weekNumber) whereClause.weekNumber = parseInt(weekNumber);
  if (allocationId) whereClause.allocationId = parseInt(allocationId);

  const activities = await ActivityTracker.findAll({
    where: whereClause,
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [
          { model: Module, as: 'module' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' }
        ]
      }
    ],
    order: [['weekNumber', 'ASC'], ['createdAt', 'DESC']]
  });

  res.json({
    status: 'success',
    message: 'Facilitator activity logs retrieved successfully',
    data: activities
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/allocation/{allocationId}:
 *   get:
 *     summary: Get activity logs for a specific course allocation
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: allocationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Course allocation ID
 *     responses:
 *       200:
 *         description: Allocation activity logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/allocation/:allocationId', authenticate, asyncHandler(async (req, res) => {
  const allocationId = parseInt(req.params.allocationId);

  // Check if user can access this allocation
  const allocation = await CourseOffering.findByPk(allocationId);
  if (!allocation) {
    return res.status(404).json({
      status: 'error',
      message: 'Course allocation not found'
    });
  }

  if (req.user.role === 'facilitator' && 
      allocation.facilitatorId !== req.facilitatorProfile.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only access activity logs for your own course allocations'
    });
  }

  const activities = await ActivityTracker.findAll({
    where: { allocationId },
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [
          { model: Module, as: 'module' },
          { model: Cohort, as: 'cohort' },
          { model: Class, as: 'class' }
        ]
      },
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }]
      }
    ],
    order: [['weekNumber', 'ASC']]
  });

  res.json({
    status: 'success',
    message: 'Allocation activity logs retrieved successfully',
    data: activities
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/overdue:
 *   get:
 *     summary: Get overdue activity logs
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue activity logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/overdue', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const overdueActivities = await ActivityTracker.findOverdue();

  res.json({
    status: 'success',
    message: 'Overdue activity logs retrieved successfully',
    data: overdueActivities
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/statistics:
 *   get:
 *     summary: Get activity tracker statistics
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity statistics retrieved successfully
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
 *                   example: Activity statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     submitted:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 *                     submissionRate:
 *                       type: number
 *                     taskStats:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/statistics', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const statistics = await ActivityTracker.getStatistics();

  res.json({
    status: 'success',
    message: 'Activity statistics retrieved successfully',
    data: statistics
  });
}));

/**
 * @swagger
 * /api/facilitator-activities/{id}:
 *   delete:
 *     summary: Delete an activity log
 *     tags: [Facilitator Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity log ID
 *     responses:
 *       200:
 *         description: Activity log deleted successfully
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
 *                   example: Activity log deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Activity log not found
 */
router.delete('/:id', authenticate, authorize(['facilitator', 'manager']), asyncHandler(async (req, res) => {
  const activityId = parseInt(req.params.id);

  const activity = await ActivityTracker.findByPk(activityId);

  if (!activity) {
    return res.status(404).json({
      status: 'error',
      message: 'Activity log not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'facilitator' && 
      activity.facilitatorId !== req.facilitatorProfile.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You can only delete your own activity logs'
    });
  }

  // Don't allow deletion if already submitted (unless manager)
  if (activity.submittedAt && req.user.role === 'facilitator') {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete submitted activity log'
    });
  }

  await activity.destroy();

  res.json({
    status: 'success',
    message: 'Activity log deleted successfully'
  });
}));

module.exports = router;