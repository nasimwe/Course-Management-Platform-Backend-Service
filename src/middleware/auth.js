const jwt = require('jsonwebtoken');
const { User, Manager, Facilitator, Student } = require('../models');

/**
 * Verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No authorization header provided.'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user with profile information
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Manager,
          as: 'managerProfile'
        },
        {
          model: Facilitator,
          as: 'facilitatorProfile'
        },
        {
          model: Student,
          as: 'studentProfile'
        }
      ]
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Add user info to request object
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;

    // Add role-specific profile
    switch (user.role) {
      case 'manager':
        req.managerProfile = user.managerProfile;
        break;
      case 'facilitator':
        req.facilitatorProfile = user.facilitatorProfile;
        break;
      case 'student':
        req.studentProfile = user.studentProfile;
        break;
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired. Please login again.'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication.'
    });
  }
};

/**
 * Check if user has required role(s)
 * @param {string|string[]} roles - Required role(s)
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required.'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

/**
 * Check if manager has required access level
 * @param {string|string[]} levels - Required access level(s)
 */
const requireManagerAccess = (levels) => {
  return (req, res, next) => {
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        status: 'error',
        message: 'Manager access required.'
      });
    }

    if (!req.managerProfile) {
      return res.status(403).json({
        status: 'error',
        message: 'Manager profile not found.'
      });
    }

    const allowedLevels = Array.isArray(levels) ? levels : [levels];
    
    if (!allowedLevels.includes(req.managerProfile.accessLevel)) {
      return res.status(403).json({
        status: 'error',
        message: `Insufficient manager access level. Required: ${allowedLevels.join(', ')}. Your level: ${req.managerProfile.accessLevel}`
      });
    }

    next();
  };
};

/**
 * Check if user can access specific resource
 * For facilitators: can only access their own resources
 * For managers: can access based on access level
 */
const requireResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      
      if (user.role === 'manager') {
        // Managers can access resources based on their access level
        if (user.managerProfile.accessLevel === 'admin') {
          return next(); // Admin managers can access everything
        }
        if (user.managerProfile.accessLevel === 'senior') {
          return next(); // Senior managers can access department resources
        }
        // Standard managers have limited access but still allowed
        return next();
      }

      if (user.role === 'facilitator') {
        // Facilitators can only access their own resources
        const facilitatorId = req.params.facilitatorId || req.body.facilitatorId || req.query.facilitatorId;
        
        if (facilitatorId && parseInt(facilitatorId) !== user.facilitatorProfile?.id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only access your own resources.'
          });
        }
        return next();
      }

      if (user.role === 'student') {
        // Students have very limited access
        const studentId = req.params.studentId || req.body.studentId || req.query.studentId;
        
        if (studentId && parseInt(studentId) !== user.studentProfile?.id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only access your own resources.'
          });
        }
        return next();
      }

      return res.status(403).json({
        status: 'error',
        message: 'Access denied.'
      });

    } catch (error) {
      console.error('Resource access check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error checking resource access.'
      });
    }
  };
};

/**
 * Optional authentication - adds user info if token is present but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next(); // No token, continue without user info
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next(); // No token, continue without user info
    }

    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Manager, as: 'managerProfile' },
        { model: Facilitator, as: 'facilitatorProfile' },
        { model: Student, as: 'studentProfile' }
      ]
    });

    if (user && user.isActive) {
      req.user = user;
      req.userId = user.id;
      req.userRole = user.role;

      switch (user.role) {
        case 'manager':
          req.managerProfile = user.managerProfile;
          break;
        case 'facilitator':
          req.facilitatorProfile = user.facilitatorProfile;
          break;
        case 'student':
          req.studentProfile = user.studentProfile;
          break;
      }
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
};

/**
 * Check if user owns the resource or has permission to access it
 */
const requireOwnership = (resourceModel, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      const resourceId = req.params[resourceIdParam];

      if (user.role === 'manager' && user.managerProfile.accessLevel === 'admin') {
        return next(); // Admin managers can access everything
      }

      // Find the resource and check ownership
      const { CourseOffering, ActivityTracker } = require('../models');
      
      let resource;
      if (resourceModel === 'CourseOffering') {
        resource = await CourseOffering.findByPk(resourceId);
        if (user.role === 'facilitator' && resource?.facilitatorId !== user.facilitatorProfile?.id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only access your own course allocations.'
          });
        }
      } else if (resourceModel === 'ActivityTracker') {
        resource = await ActivityTracker.findByPk(resourceId);
        if (user.role === 'facilitator' && resource?.facilitatorId !== user.facilitatorProfile?.id) {
          return res.status(403).json({
            status: 'error',
            message: 'You can only access your own activity logs.'
          });
        }
      }

      if (!resource) {
        return res.status(404).json({
          status: 'error',
          message: 'Resource not found.'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error checking resource ownership.'
      });
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  requireManagerAccess,
  requireResourceAccess,
  optionalAuth,
  requireOwnership
};