const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logFile = process.env.LOG_FILE || path.join(__dirname, '../logs/app.log');
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Ensure logs directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    if (process.env.NODE_ENV === 'development') {
      // Pretty print for development
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${
        Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : ''
      }`;
    }

    // JSON format for production
    return JSON.stringify(logEntry);
  }

  writeToFile(formattedMessage) {
    try {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Always write to file
    this.writeToFile(formattedMessage);

    // Console output based on environment
    if (process.env.NODE_ENV !== 'test') {
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // HTTP request logging middleware
  httpLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const { method, url, ip } = req;
      const userAgent = req.get('User-Agent') || '';

      // Log request
      this.info('HTTP Request', {
        method,
        url,
        ip,
        userAgent,
        userId: req.userId || null
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = Date.now() - start;
        const { statusCode } = res;
        
        // Log response
        logger.info('HTTP Response', {
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          ip,
          userId: req.userId || null
        });

        originalEnd.apply(this, args);
      };

      next();
    };
  }

  // Error logging middleware
  errorLogger() {
    return (err, req, res, next) => {
      this.error('Application Error', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userId: req.userId || null,
        body: req.body,
        query: req.query,
        params: req.params
      });

      next(err);
    };
  }

  // Database query logging
  dbLogger() {
    return (queryString, options) => {
      if (process.env.DB_LOGGING === 'true') {
        this.debug('Database Query', {
          query: queryString,
          duration: options?.benchmark ? `${options.benchmark}ms` : null
        });
      }
    };
  }

  // Security event logging
  securityLog(event, details = {}) {
    this.warn('Security Event', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Performance monitoring
  performanceLog(operation, duration, metadata = {}) {
    const level = duration > 1000 ? 'warn' : 'info';
    this.log(level, 'Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...metadata
    });
  }

  // Audit logging for sensitive operations
  auditLog(action, userId, resource, details = {}) {
    this.info('Audit Log', {
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Log rotation (simple implementation)
  rotateLogs() {
    try {
      const stats = fs.statSync(this.logFile);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (stats.size > maxSize) {
        const rotatedFile = `${this.logFile}.${Date.now()}`;
        fs.renameSync(this.logFile, rotatedFile);
        this.info('Log file rotated', { rotatedFile });

        // Keep only last 5 log files
        const logDir = path.dirname(this.logFile);
        const logFiles = fs.readdirSync(logDir)
          .filter(file => file.startsWith(path.basename(this.logFile)))
          .sort();

        if (logFiles.length > 5) {
          const filesToDelete = logFiles.slice(0, logFiles.length - 5);
          filesToDelete.forEach(file => {
            fs.unlinkSync(path.join(logDir, file));
          });
        }
      }
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Set up log rotation interval (daily)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    logger.rotateLogs();
  }, 24 * 60 * 60 * 1000); // 24 hours
}

module.exports = logger;