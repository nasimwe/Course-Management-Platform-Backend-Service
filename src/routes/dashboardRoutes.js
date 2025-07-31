const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getQueueStats, getRecentNotifications } = require('../services/notificationService');
const { Sequelize, Op } = require('sequelize');
const { 
  User, Manager, Facilitator, Student, Module, Cohort, Class, Mode,
  CourseOffering, ActivityTracker
} = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and overview data
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get general dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                   example: Dashboard statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         managers:
 *                           type: integer
 *                         facilitators:
 *                           type: integer
 *                         students:
 *                           type: integer
 *                     courses:
 *                       type: object
 *                       properties:
 *                         totalModules:
 *                           type: integer
 *                         activeCourseOfferings:
 *                           type: integer
 *                         unassignedOfferings:
 *                           type: integer
 *                     activities:
 *                       type: object
 *                       properties:
 *                         totalLogs:
 *                           type: integer
 *                         submittedLogs:
 *                           type: integer
 *                         overdueLogs:
 *                           type: integer
 *                         submissionRate:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  // Get user statistics
  const userStats = await User.findAll({
    attributes: [
      'role',
      'isActive',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    group: ['role', 'isActive'],
    raw: true
  });

  // Process user stats
  const users = {
    total: 0,
    active: 0,
    managers: 0,
    facilitators: 0,
    students: 0
  };

  userStats.forEach(stat => {
    users.total += parseInt(stat.count);
    if (stat.isActive) {
      users.active += parseInt(stat.count);
      users[`${stat.role}s`] += parseInt(stat.count);
    }
  });

  // Get course statistics
  const [totalModules, activeCourseOfferings, unassignedOfferings] = await Promise.all([
    Module.count({ where: { isActive: true } }),
    CourseOffering.count({ where: { isActive: true } }),
    CourseOffering.count({ where: { facilitatorId: null, isActive: true } })
  ]);

  const courses = {
    totalModules,
    activeCourseOfferings,
    unassignedOfferings
  };

  // Get activity statistics (only for managers)
  let activities = null;
  if (req.user.role === 'manager') {
    const activityStats = await ActivityTracker.getStatistics();
    activities = activityStats;
  }

  // Get cohort statistics
  const cohortStats = await Cohort.findAll({
    attributes: [
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  const cohorts = {};
  cohortStats.forEach(stat => {
    cohorts[stat.status] = parseInt(stat.count);
  });

  // Get recent activities (based on user role)
  let recentActivities = [];
  if (req.user.role === 'facilitator') {
    recentActivities = await ActivityTracker.findAll({
      where: { facilitatorId: req.facilitatorProfile.id },
      include: [
        {
          model: CourseOffering,
          as: 'allocation',
          include: [{ model: Module, as: 'module' }]
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5
    });
  } else if (req.user.role === 'manager') {
    recentActivities = await ActivityTracker.findAll({
      include: [
        {
          model: CourseOffering,
          as: 'allocation',
          include: [{ model: Module, as: 'module' }]
        },
        {
          model: Facilitator,
          as: 'facilitator',
          include: [{ model: User, as: 'user' }]
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });
  }

  res.json({
    status: 'success',
    message: 'Dashboard statistics retrieved successfully',
    data: {
      users,
      courses,
      activities,
      cohorts,
      recentActivities
    }
  });
}));

/**
 * @swagger
 * /api/dashboard/facilitator-stats:
 *   get:
 *     summary: Get facilitator-specific dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Facilitator dashboard statistics retrieved successfully
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
 *                   example: Facilitator dashboard statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     courseLoad:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         maximum:
 *                           type: integer
 *                         percentage:
 *                           type: number
 *                         status:
 *                           type: string
 *                     assignments:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                     activities:
 *                       type: object
 *                       properties:
 *                         submitted:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         overdue:
 *                           type: integer
 *                     upcomingDeadlines:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Facilitator only
 */
router.get('/facilitator-stats', authenticate, authorize('facilitator'), asyncHandler(async (req, res) => {
  const facilitatorId = req.facilitatorProfile.id;

  // Get facilitator's course load
  const facilitator = await Facilitator.findByPk(facilitatorId);
  const currentLoad = await facilitator.getCurrentCourseLoad();
  const maxLoad = facilitator.maxCourseLoad;
  const loadPercentage = (currentLoad / maxLoad) * 100;
  const loadStatus = await facilitator.getAvailabilityStatus();

  const courseLoad = {
    current: currentLoad,
    maximum: maxLoad,
    percentage: loadPercentage,
    status: loadStatus
  };

  // Get assignment statistics
  const assignmentStats = await CourseOffering.findAll({
    attributes: [
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: { facilitatorId },
    group: ['status'],
    raw: true
  });

  const assignments = {
    total: 0,
    active: 0,
    completed: 0,
    scheduled: 0,
    draft: 0
  };

  assignmentStats.forEach(stat => {
    assignments.total += parseInt(stat.count);
    assignments[stat.status] = parseInt(stat.count);
  });

  // Get activity log statistics
  const activityStats = await ActivityTracker.findAll({
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
      [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN submittedAt IS NOT NULL THEN 1 ELSE 0 END')), 'submitted'],
      [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN submittedAt IS NULL THEN 1 ELSE 0 END')), 'pending']
    ],
    where: { facilitatorId },
    raw: true
  });

  const activities = {
    submitted: parseInt(activityStats[0].submitted) || 0,
    pending: parseInt(activityStats[0].pending) || 0,
    total: parseInt(activityStats[0].total) || 0
  };

  // Get overdue activities
  const overdueActivities = await ActivityTracker.findAll({
    where: { 
      facilitatorId,
      submittedAt: null
    },
    include: [
      {
        model: CourseOffering,
        as: 'allocation',
        include: [{ model: Module, as: 'module' }]
      }
    ]
  });

  activities.overdue = overdueActivities.filter(activity => activity.isOverdue()).length;

  // Get upcoming deadlines (next 7 days)
  const upcomingDeadlines = overdueActivities
    .filter(activity => {
      const deadline = activity.getDeadline();
      const now = new Date();
      const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 7;
    })
    .map(activity => ({
      id: activity.id,
      weekNumber: activity.weekNumber,
      courseName: activity.allocation.module.getFullName(),
      deadline: activity.getDeadline(),
      daysUntilDeadline: Math.ceil((activity.getDeadline() - new Date()) / (1000 * 60 * 60 * 24))
    }))
    .sort((a, b) => a.deadline - b.deadline);

  // Get recent course offerings
  const recentOfferings = await CourseOffering.findAll({
    where: { facilitatorId },
    include: [
      { model: Module, as: 'module' },
      { model: Cohort, as: 'cohort' },
      { model: Class, as: 'class' }
    ],
    order: [['updatedAt', 'DESC']],
    limit: 5
  });

  res.json({
    status: 'success',
    message: 'Facilitator dashboard statistics retrieved successfully',
    data: {
      courseLoad,
      assignments,
      activities,
      upcomingDeadlines,
      recentOfferings
    }
  });
}));

/**
 * @swagger
 * /api/dashboard/manager-stats:
 *   get:
 *     summary: Get manager-specific dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manager dashboard statistics retrieved successfully
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
 *                   example: Manager dashboard statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     facilitatorOverview:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         available:
 *                           type: integer
 *                         overloaded:
 *                           type: integer
 *                         averageLoad:
 *                           type: number
 *                     submissionCompliance:
 *                       type: object
 *                       properties:
 *                         totalLogs:
 *                           type: integer
 *                         submittedOnTime:
 *                           type: integer
 *                         submittedLate:
 *                           type: integer
 *                         overdue:
 *                           type: integer
 *                         complianceRate:
 *                           type: number
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Manager only
 */
router.get('/manager-stats', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  // Get facilitator overview
  const facilitators = await Facilitator.findAll({
    include: [
      { model: User, as: 'user', where: { isActive: true } },
      { model: CourseOffering, as: 'courseOfferings', where: { isActive: true }, required: false }
    ]
  });

  let totalFacilitators = facilitators.length;
  let availableFacilitators = 0;
  let overloadedFacilitators = 0;
  let totalLoad = 0;

  for (const facilitator of facilitators) {
    const currentLoad = await facilitator.getCurrentCourseLoad();
    totalLoad += currentLoad;
    
    if (currentLoad < facilitator.maxCourseLoad * 0.8) {
      availableFacilitators++;
    }
    
    if (currentLoad >= facilitator.maxCourseLoad) {
      overloadedFacilitators++;
    }
  }

  const facilitatorOverview = {
    total: totalFacilitators,
    available: availableFacilitators,
    overloaded: overloadedFacilitators,
    averageLoad: totalFacilitators > 0 ? (totalLoad / totalFacilitators).toFixed(2) : 0
  };

  // Get submission compliance statistics
  const allActivities = await ActivityTracker.findAll({
    include: [
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user', where: { isActive: true } }]
      }
    ]
  });

  let submittedOnTime = 0;
  let submittedLate = 0;
  let overdue = 0;

  allActivities.forEach(activity => {
    if (activity.submittedAt) {
      if (activity.isOverdue()) {
        submittedLate++;
      } else {
        submittedOnTime++;
      }
    } else {
      if (activity.isOverdue()) {
        overdue++;
      }
    }
  });

  const totalLogs = allActivities.length;
  const complianceRate = totalLogs > 0 ? ((submittedOnTime / totalLogs) * 100).toFixed(2) : 0;

  const submissionCompliance = {
    totalLogs,
    submittedOnTime,
    submittedLate,
    overdue,
    complianceRate: parseFloat(complianceRate)
  };

  // Get current alerts and issues
  const alerts = [];

  // Check for unassigned course offerings
  const unassignedCount = await CourseOffering.count({
    where: { facilitatorId: null, isActive: true }
  });

  if (unassignedCount > 0) {
    alerts.push({
      type: 'warning',
      title: 'Unassigned Course Offerings',
      message: `${unassignedCount} course offering(s) need facilitator assignment`,
      count: unassignedCount,
      action: 'Assign facilitators to course offerings'
    });
  }

  // Check for overdue submissions
  if (overdue > 0) {
    alerts.push({
      type: 'danger',
      title: 'Overdue Submissions',
      message: `${overdue} activity log(s) are overdue`,
      count: overdue,
      action: 'Follow up with facilitators'
    });
  }

  // Check for facilitators at capacity
  if (overloadedFacilitators > 0) {
    alerts.push({
      type: 'warning',
      title: 'Overloaded Facilitators',
      message: `${overloadedFacilitators} facilitator(s) at or above maximum course load`,
      count: overloadedFacilitators,
      action: 'Review facilitator workload distribution'
    });
  }

  // Get department-specific statistics (if manager has department)
  let departmentStats = null;
  if (req.managerProfile.department) {
    const departmentFacilitators = await Facilitator.findAll({
      include: [
        { 
          model: User, 
          as: 'user', 
          where: { isActive: true }
        }
      ],
      // Note: In a real application, you might want to add department filtering
      // This is a simplified version
    });

    departmentStats = {
      facilitators: departmentFacilitators.length,
      // Add more department-specific metrics as needed
    };
  }

  // Get notification queue statistics
  const queueStats = await getQueueStats();

  res.json({
    status: 'success',
    message: 'Manager dashboard statistics retrieved successfully',
    data: {
      facilitatorOverview,
      submissionCompliance,
      alerts,
      departmentStats,
      queueStats
    }
  });
}));

/**
 * @swagger
 * /api/dashboard/performance-metrics:
 *   get:
 *     summary: Get performance metrics and trends
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter]
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Manager only
 */
router.get('/performance-metrics', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;

  // Calculate date range based on period
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default: // month
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get submission trends
  const submissionTrends = await ActivityTracker.findAll({
    attributes: [
      [Sequelize.fn('DATE', Sequelize.col('submittedAt')), 'date'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      submittedAt: {
        [Op.between]: [startDate, now]
      }
    },
    group: [Sequelize.fn('DATE', Sequelize.col('submittedAt'))],
    order: [[Sequelize.fn('DATE', Sequelize.col('submittedAt')), 'ASC']],
    raw: true
  });

  // Get completion rates by task type
  const taskCompletionRates = {};
  const taskFields = [
    'formativeOneGrading',
    'formativeTwoGrading',
    'summativeGrading',
    'courseModeration',
    'intranetSync',
    'gradeBookStatus'
  ];

  for (const field of taskFields) {
    const stats = await ActivityTracker.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
        [Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN ${field} = 'Done' THEN 1 ELSE 0 END`)), 'completed']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, now]
        }
      },
      raw: true
    });

    const total = parseInt(stats[0].total) || 0;
    const completed = parseInt(stats[0].completed) || 0;
    
    taskCompletionRates[field] = {
      total,
      completed,
      rate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
    };
  }

  // Get facilitator performance rankings
  const facilitatorPerformance = await ActivityTracker.findAll({
    attributes: [
      'facilitatorId',
      [Sequelize.fn('COUNT', Sequelize.col('ActivityTracker.id')), 'totalLogs'],
      [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN submittedAt IS NOT NULL THEN 1 ELSE 0 END')), 'submittedLogs']
    ],
    include: [
      {
        model: Facilitator,
        as: 'facilitator',
        include: [{ model: User, as: 'user' }],
        attributes: []
      }
    ],
    where: {
      createdAt: {
        [Op.between]: [startDate, now]
      }
    },
    group: ['facilitatorId', 'facilitator.id', 'facilitator.user.id'],
    having: Sequelize.literal('COUNT(ActivityTracker.id) > 0'),
    order: [[Sequelize.literal('(SUM(CASE WHEN submittedAt IS NOT NULL THEN 1 ELSE 0 END) / COUNT(ActivityTracker.id))'), 'DESC']],
    raw: true
  });

  // Calculate performance scores
  const performanceData = facilitatorPerformance.map(perf => {
    const submissionRate = perf.totalLogs > 0 ? (perf.submittedLogs / perf.totalLogs) * 100 : 0;
    return {
      facilitatorId: perf.facilitatorId,
      totalLogs: parseInt(perf.totalLogs),
      submittedLogs: parseInt(perf.submittedLogs),
      submissionRate: submissionRate.toFixed(2)
    };
  });

  res.json({
    status: 'success',
    message: 'Performance metrics retrieved successfully',
    data: {
      period,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      },
      submissionTrends,
      taskCompletionRates,
      facilitatorPerformance: performanceData
    }
  });
}));

/**
 * @swagger
 * /api/dashboard/notifications:
 *   get:
 *     summary: Get recent notifications
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of notifications to retrieve
 *     responses:
 *       200:
 *         description: Recent notifications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Manager only
 */
router.get('/notifications', authenticate, authorize('manager'), asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const notifications = await getRecentNotifications(parseInt(limit));

  res.json({
    status: 'success',
    message: 'Recent notifications retrieved successfully',
    data: notifications
  });
}));

module.exports = router;