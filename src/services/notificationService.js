const Queue = require('bull');
const nodemailer = require('nodemailer');
const redisClient = require('../config/redis');
const { ActivityTracker, CourseOffering, User, Facilitator, Manager } = require('../models');

// Redis connection configuration for Bull
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0
};

// Create queues
const emailQueue = new Queue('email notifications', { redis: redisConfig });
const reminderQueue = new Queue('reminder notifications', { redis: redisConfig });
const alertQueue = new Queue('alert notifications', { redis: redisConfig });

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Setup email queue processor
 */
const setupEmailProcessor = () => {
  emailQueue.process('send-email', async (job) => {
    const { to, subject, text, html, type } = job.data;
    
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@coursemanagement.com',
        to,
        subject,
        text,
        html: html || text
      };

      const result = await emailTransporter.sendMail(mailOptions);
      
      // Log email delivery
      await logNotification({
        type: 'email',
        recipient: to,
        subject,
        status: 'sent',
        messageId: result.messageId,
        emailType: type
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      // Log email failure
      await logNotification({
        type: 'email',
        recipient: to,
        subject,
        status: 'failed',
        error: error.message,
        emailType: type
      });
      
      throw error;
    }
  });
};

/**
 * Setup reminder queue processor
 */
const setupReminderProcessor = () => {
  reminderQueue.process('facilitator-reminder', async (job) => {
    const { facilitatorId, weekNumber, allocationId } = job.data;
    
    try {
      const facilitator = await Facilitator.findByPk(facilitatorId, {
        include: ['user']
      });
      
      const allocation = await CourseOffering.findByPk(allocationId, {
        include: ['module', 'cohort', 'class']
      });

      if (!facilitator || !allocation) {
        throw new Error('Facilitator or allocation not found');
      }

      const subject = 'Activity Log Submission Reminder';
      const text = `
        Dear ${facilitator.user.firstName},
        
        This is a reminder to submit your activity log for:
        
        Course: ${allocation.module.code} - ${allocation.module.name}
        Cohort: ${allocation.cohort.name}
        Class: ${allocation.class.name}
        Week: ${weekNumber}
        
        Please log into the system and submit your weekly activity report.
        
        Deadline: End of week + 2 days grace period
        
        Best regards,
        Course Management System
      `;

      // Queue email
      await queueEmail({
        to: facilitator.user.email,
        subject,
        text,
        type: 'reminder'
      });

      await logNotification({
        type: 'reminder',
        recipient: facilitator.user.email,
        subject,
        status: 'queued',
        facilitatorId,
        allocationId,
        weekNumber
      });

      return { success: true };
    } catch (error) {
      console.error('Reminder processing error:', error);
      throw error;
    }
  });
};

/**
 * Setup alert queue processor
 */
const setupAlertProcessor = () => {
  alertQueue.process('manager-alert', async (job) => {
    const { type, data } = job.data;
    
    try {
      // Get all managers
      const managers = await Manager.findAll({
        include: ['user'],
        where: { '$user.isActive$': true }
      });

      for (const manager of managers) {
        let subject, text;
        
        switch (type) {
          case 'overdue-submission':
            subject = 'Overdue Activity Log Submission Alert';
            text = generateOverdueAlert(data);
            break;
          case 'late-submission':
            subject = 'Late Activity Log Submission Alert';
            text = generateLateSubmissionAlert(data);
            break;
          case 'critical-deadline':
            subject = 'Critical Deadline Alert';
            text = generateCriticalDeadlineAlert(data);
            break;
          default:
            continue;
        }

        // Queue email for each manager
        await queueEmail({
          to: manager.user.email,
          subject,
          text,
          type: 'alert'
        });
      }

      await logNotification({
        type: 'alert',
        recipient: 'all-managers',
        subject: `${type} alert`,
        status: 'queued',
        alertType: type,
        data: JSON.stringify(data)
      });

      return { success: true };
    } catch (error) {
      console.error('Alert processing error:', error);
      throw error;
    }
  });
};

/**
 * Initialize notification queues and processors
 */
const setupQueues = () => {
  setupEmailProcessor();
  setupReminderProcessor();
  setupAlertProcessor();
  scheduleRecurringJobs();
};

/**
 * Queue an email notification
 */
const queueEmail = async (emailData, options = {}) => {
  const jobOptions = {
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 10,
    removeOnFail: 5
  };

  return await emailQueue.add('send-email', emailData, jobOptions);
};

/**
 * Queue a facilitator reminder
 */
const queueFacilitatorReminder = async (facilitatorId, weekNumber, allocationId, delay = 0) => {
  const jobOptions = {
    delay,
    attempts: 2,
    removeOnComplete: 5,
    removeOnFail: 3
  };

  return await reminderQueue.add('facilitator-reminder', {
    facilitatorId,
    weekNumber,
    allocationId
  }, jobOptions);
};

/**
 * Queue a manager alert
 */
const queueManagerAlert = async (type, data, delay = 0) => {
  const jobOptions = {
    delay,
    attempts: 2,
    removeOnComplete: 5,
    removeOnFail: 3
  };

  return await alertQueue.add('manager-alert', {
    type,
    data
  }, jobOptions);
};

/**
 * Schedule recurring notification jobs
 */
const scheduleRecurringJobs = () => {
  // Daily check for overdue submissions (runs at 9 AM every day)
  reminderQueue.add('daily-overdue-check', {}, {
    repeat: { cron: '0 9 * * *' },
    removeOnComplete: 1,
    removeOnFail: 1
  });

  // Weekly reminder for upcoming deadlines (runs every Monday at 10 AM)
  reminderQueue.add('weekly-deadline-reminder', {}, {
    repeat: { cron: '0 10 * * 1' },
    removeOnComplete: 1,
    removeOnFail: 1
  });

  // Process recurring jobs
  reminderQueue.process('daily-overdue-check', async (job) => {
    await checkOverdueSubmissions();
  });

  reminderQueue.process('weekly-deadline-reminder', async (job) => {
    await sendWeeklyDeadlineReminders();
  });
};

/**
 * Check for overdue submissions and send alerts
 */
const checkOverdueSubmissions = async () => {
  try {
    const overdueActivities = await ActivityTracker.findOverdue();
    
    if (overdueActivities.length > 0) {
      // Group by facilitator
      const facilitatorGroups = {};
      overdueActivities.forEach(activity => {
        if (!facilitatorGroups[activity.facilitatorId]) {
          facilitatorGroups[activity.facilitatorId] = [];
        }
        facilitatorGroups[activity.facilitatorId].push(activity);
      });

      // Send alerts to managers
      await queueManagerAlert('overdue-submission', {
        count: overdueActivities.length,
        facilitators: Object.keys(facilitatorGroups).length,
        details: facilitatorGroups
      });

      // Send reminders to facilitators
      for (const [facilitatorId, activities] of Object.entries(facilitatorGroups)) {
        for (const activity of activities) {
          await queueFacilitatorReminder(
            parseInt(facilitatorId),
            activity.weekNumber,
            activity.allocationId
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking overdue submissions:', error);
  }
};

/**
 * Send weekly deadline reminders
 */
const sendWeeklyDeadlineReminders = async () => {
  try {
    // Find activities due soon (within next 3 days)
    const upcomingDeadlines = await ActivityTracker.findPendingSubmission();
    
    const filteredDeadlines = upcomingDeadlines.filter(activity => {
      const deadline = activity.getDeadline();
      const now = new Date();
      const daysUntilDeadline = (deadline - now) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline <= 3 && daysUntilDeadline > 0;
    });

    for (const activity of filteredDeadlines) {
      await queueFacilitatorReminder(
        activity.facilitatorId,
        activity.weekNumber,
        activity.allocationId
      );
    }

    if (filteredDeadlines.length > 0) {
      await queueManagerAlert('critical-deadline', {
        count: filteredDeadlines.length,
        deadline: '3 days'
      });
    }
  } catch (error) {
    console.error('Error sending weekly deadline reminders:', error);
  }
};

/**
 * Generate overdue alert text
 */
const generateOverdueAlert = (data) => {
  return `
    Alert: Overdue Activity Log Submissions
    
    There are ${data.count} overdue activity log submissions from ${data.facilitators} facilitator(s).
    
    Please follow up with the respective facilitators to ensure compliance with reporting requirements.
    
    You can view detailed information in the Course Management System dashboard.
    
    Best regards,
    Course Management System
  `;
};

/**
 * Generate late submission alert text
 */
const generateLateSubmissionAlert = (data) => {
  return `
    Alert: Late Activity Log Submission
    
    An activity log has been submitted after the deadline:
    
    Facilitator: ${data.facilitatorName}
    Course: ${data.courseName}
    Week: ${data.weekNumber}
    Submitted: ${data.submissionTime}
    
    Please review the submission and take appropriate action if necessary.
    
    Best regards,
    Course Management System
  `;
};

/**
 * Generate critical deadline alert text
 */
const generateCriticalDeadlineAlert = (data) => {
  return `
    Alert: Critical Deadline Approaching
    
    ${data.count} activity log submissions are due within ${data.deadline}.
    
    Please ensure facilitators are aware of upcoming deadlines.
    
    Best regards,
    Course Management System
  `;
};

/**
 * Log notification to Redis for tracking
 */
const logNotification = async (notificationData) => {
  try {
    const logKey = `notification_log:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const logData = {
      ...notificationData,
      timestamp: new Date().toISOString()
    };
    
    await redisClient.setEx(logKey, 604800, JSON.stringify(logData)); // Keep for 7 days
    
    // Also add to a list for recent notifications
    await redisClient.lPush('recent_notifications', JSON.stringify(logData));
    await redisClient.lTrim('recent_notifications', 0, 99); // Keep last 100
    
  } catch (error) {
    console.error('Error logging notification:', error);
  }
};

/**
 * Get recent notifications
 */
const getRecentNotifications = async (limit = 20) => {
  try {
    const notifications = await redisClient.lRange('recent_notifications', 0, limit - 1);
    return notifications.map(n => JSON.parse(n));
  } catch (error) {
    console.error('Error getting recent notifications:', error);
    return [];
  }
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
  try {
    const emailStats = await emailQueue.getJobCounts();
    const reminderStats = await reminderQueue.getJobCounts();
    const alertStats = await alertQueue.getJobCounts();

    return {
      email: emailStats,
      reminder: reminderStats,
      alert: alertStats,
      total: {
        active: emailStats.active + reminderStats.active + alertStats.active,
        waiting: emailStats.waiting + reminderStats.waiting + alertStats.waiting,
        completed: emailStats.completed + reminderStats.completed + alertStats.completed,
        failed: emailStats.failed + reminderStats.failed + alertStats.failed
      }
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
};

/**
 * Clean up old jobs
 */
const cleanupJobs = async () => {
  try {
    await emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove completed jobs older than 24 hours
    await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 7 days
    
    await reminderQueue.clean(24 * 60 * 60 * 1000, 'completed');
    await reminderQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
    
    await alertQueue.clean(24 * 60 * 60 * 1000, 'completed');
    await alertQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
    
    console.log('Queue cleanup completed');
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
  }
};

// Export all functions and queues
module.exports = {
  emailQueue,
  reminderQueue,
  alertQueue,
  setupQueues,
  setupEmailProcessor,
  setupReminderProcessor,
  setupAlertProcessor,
  queueEmail,
  queueFacilitatorReminder,
  queueManagerAlert,
  getRecentNotifications,
  getQueueStats,
  cleanupJobs,
  logNotification,
  scheduleRecurringJobs,
  checkOverdueSubmissions,
  sendWeeklyDeadlineReminders,
  generateOverdueAlert,
  generateLateSubmissionAlert,
  generateCriticalDeadlineAlert
};