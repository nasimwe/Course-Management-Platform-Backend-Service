/**
 * 404 Not Found middleware
 * This middleware handles requests to routes that don't exist
 */
const notFound = (req, res, next) => {
    const error = new Error(`Route not found - ${req.originalUrl}`);
    error.statusCode = 404;
    
    res.status(404).json({
      status: 'error',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
      availableEndpoints: {
        auth: {
          'POST /api/auth/register': 'Register a new user',
          'POST /api/auth/login': 'Login user',
          'POST /api/auth/logout': 'Logout user',
          'GET /api/auth/me': 'Get current user profile',
          'PUT /api/auth/me': 'Update current user profile',
          'POST /api/auth/change-password': 'Change password',
          'POST /api/auth/forgot-password': 'Request password reset',
          'POST /api/auth/reset-password': 'Reset password'
        },
        courseAllocations: {
          'GET /api/course-allocations': 'Get all course allocations',
          'POST /api/course-allocations': 'Create new course allocation',
          'GET /api/course-allocations/:id': 'Get specific course allocation',
          'PUT /api/course-allocations/:id': 'Update course allocation',
          'DELETE /api/course-allocations/:id': 'Delete course allocation',
          'GET /api/course-allocations/facilitator/:facilitatorId': 'Get allocations by facilitator',
          'GET /api/course-allocations/module/:moduleId': 'Get allocations by module'
        },
        facilitatorActivities: {
          'GET /api/facilitator-activities': 'Get all activity logs',
          'POST /api/facilitator-activities': 'Create new activity log',
          'GET /api/facilitator-activities/:id': 'Get specific activity log',
          'PUT /api/facilitator-activities/:id': 'Update activity log',
          'DELETE /api/facilitator-activities/:id': 'Delete activity log',
          'GET /api/facilitator-activities/facilitator/:facilitatorId': 'Get logs by facilitator',
          'GET /api/facilitator-activities/allocation/:allocationId': 'Get logs by allocation'
        },
        dashboard: {
          'GET /api/dashboard/stats': 'Get dashboard statistics',
          'GET /api/dashboard/facilitator-stats': 'Get facilitator statistics',
          'GET /api/dashboard/manager-stats': 'Get manager statistics'
        },
        general: {
          'GET /health': 'Health check endpoint',
          'GET /api-docs': 'API documentation (Swagger UI)'
        }
      }
    });
  };
  
  module.exports = notFound;