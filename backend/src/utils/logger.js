/**
 * Logging Utility
 * Provides consistent logging across the application
 * In production, replace with Winston or Pino
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Format log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

/**
 * Logger class
 */
class Logger {
  error(message, meta = {}) {
    console.error(formatLog(LOG_LEVELS.ERROR, message, meta));
  }

  warn(message, meta = {}) {
    console.warn(formatLog(LOG_LEVELS.WARN, message, meta));
  }

  info(message, meta = {}) {
    console.log(formatLog(LOG_LEVELS.INFO, message, meta));
  }

  debug(message, meta = {}) {
    if (isDevelopment) {
      console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
  }

  /**
   * Log API request
   * @param {object} req - Express request object
   */
  logRequest(req) {
    this.info(`${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  /**
   * Log API response
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {number} duration - Request duration in ms
   */
  logResponse(req, res, duration) {
    this.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  }

  /**
   * Log database query
   * @param {string} query - SQL query
   * @param {array} params - Query parameters
   */
  logQuery(query, params = []) {
    if (isDevelopment) {
      this.debug('Database query', { query, params });
    }
  }
}

export const logger = new Logger();

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.logRequest(req);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logResponse(req, res, duration);
  });

  next();
};
