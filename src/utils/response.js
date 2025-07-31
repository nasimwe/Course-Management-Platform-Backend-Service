const logger = require('./logger');

/**
 * Standardized API response utility
 * Ensures consistent response format across all endpoints
 */
class ApiResponse {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data, message = 'Operation successful', statusCode = 200) {
    const response = {
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    };

    logger.info('API Success Response', {
      statusCode,
      message,
      dataType: typeof data,
      hasData: !!data
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code (default: 400)
   * @param {Object} details - Additional error details
   */
  static error(res, message = 'An error occurred', statusCode = 400, details = null) {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    if (process.env.NODE_ENV === 'development' && details?.stack) {
      response.stack = details.stack;
    }

    logger.error('API Error Response', {
      statusCode,
      message,
      details: details ? JSON.stringify(details) : null
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Array} errors - Validation errors array
   * @param {String} message - Error message
   */
  static validationError(res, errors, message = 'Validation failed') {
    const response = {
      status: 'error',
      message,
      errors: errors.map(error => ({
        field: error.path || error.param || error.field,
        message: error.msg || error.message,
        value: error.value,
        location: error.location
      })),
      timestamp: new Date().toISOString()
    };

    logger.warn('Validation Error', {
      message,
      errorCount: errors.length,
      fields: errors.map(e => e.path || e.param || e.field)
    });

    return res.status(400).json(response);
  }

  /**
   * Send unauthorized response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static unauthorized(res, message = 'Unauthorized access') {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    logger.warn('Unauthorized Access Attempt', { message });

    return res.status(401).json(response);
  }

  /**
   * Send forbidden response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static forbidden(res, message = 'Access forbidden') {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    logger.warn('Forbidden Access Attempt', { message });

    return res.status(403).json(response);
  }

  /**
   * Send not found response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static notFound(res, message = 'Resource not found') {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    logger.info('Resource Not Found', { message });

    return res.status(404).json(response);
  }

  /**
   * Send conflict response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static conflict(res, message = 'Resource conflict') {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    logger.warn('Resource Conflict', { message });

    return res.status(409).json(response);
  }

  /**
   * Send server error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Object} error - Error object
   */
  static serverError(res, message = 'Internal server error', error = null) {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development' && error) {
      response.error = {
        message: error.message,
        stack: error.stack
      };
    }

    logger.error('Server Error', {
      message,
      error: error ? error.message : null,
      stack: error ? error.stack : null
    });

    return res.status(500).json(response);
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination info
   * @param {String} message - Success message
   */
  static paginated(res, data, pagination, message = 'Data retrieved successfully') {
    const response = {
      status: 'success',
      message,
      data: {
        items: data,
        pagination: {
          page: parseInt(pagination.page),
          limit: parseInt(pagination.limit),
          total: pagination.total,
          pages: Math.ceil(pagination.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
          hasPrev: pagination.page > 1
        }
      },
      timestamp: new Date().toISOString()
    };

    logger.info('Paginated Response', {
      itemCount: data.length,
      page: pagination.page,
      total: pagination.total
    });

    return res.status(200).json(response);
  }

  /**
   * Send created response
   * @param {Object} res - Express response object
   * @param {Object} data - Created resource data
   * @param {String} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Send accepted response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {String} message - Success message
   */
  static accepted(res, data = null, message = 'Request accepted') {
    return this.success(res, data, message, 202);
  }

  /**
   * Send no content response
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    logger.info('No Content Response');
    return res.status(204).send();
  }

  /**
   * Send custom response
   * @param {Object} res - Express response object
   * @param {Number} statusCode - HTTP status code
   * @param {Object} data - Response data
   * @param {String} message - Response message
   */
  static custom(res, statusCode, data, message) {
    const response = {
      status: statusCode >= 200 && statusCode < 300 ? 'success' : 'error',
      message,
      data,
      timestamp: new Date().toISOString()
    };

    logger.info('Custom Response', {
      statusCode,
      message,
      status: response.status
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Handle async route errors
   * @param {Function} fn - Async route handler
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Express middleware for consistent error handling
   */
  static errorHandler() {
    return (err, req, res, next) => {
      // Log the error
      logger.error('Unhandled Error', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
      });

      // Handle specific error types
      if (err.name === 'ValidationError') {
        return this.validationError(res, err.errors || []);
      }

      if (err.name === 'UnauthorizedError' || err.status === 401) {
        return this.unauthorized(res, err.message);
      }

      if (err.status === 403) {
        return this.forbidden(res, err.message);
      }

      if (err.status === 404) {
        return this.notFound(res, err.message);
      }

      if (err.status === 409) {
        return this.conflict(res, err.message);
      }

      // Default to server error
      return this.serverError(res, err.message, err);
    };
  }

  /**
   * Rate limit exceeded response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static rateLimitExceeded(res, message = 'Too many requests, please try again later') {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
      retryAfter: '15 minutes'
    };

    logger.warn('Rate Limit Exceeded', { message });

    return res.status(429).json(response);
  }

  /**
   * Service unavailable response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static serviceUnavailable(res, message = 'Service temporarily unavailable') {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    logger.error('Service Unavailable', { message });

    return res.status(503).json(response);
  }
}

module.exports = ApiResponse;