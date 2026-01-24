/**
 * Error Handling Middleware
 * Provides consistent error handling across the application
 */

/**
 * Async handler wrapper
 * Catches promise rejections and passes them to error middleware
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'APIError';
  }
}

/**
 * Error response formatter
 * Formats errors consistently based on environment
 */
export const formatError = (err, env = 'development') => {
  const error = {
    message: err.message || 'Internal Server Error',
    ...(env === 'development' && {
      stack: err.stack,
      details: err.details
    })
  };

  return error;
};

/**
 * Global error handling middleware
 * Should be registered after all routes
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const env = process.env.NODE_ENV || 'development';

  // Log error (in production, use proper logger like Winston)
  console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`);
  if (env === 'development') {
    console.error(err.stack);
  }

  // Send error response
  res.status(statusCode).json({
    error: formatError(err, env)
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new APIError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Validation error handler
 * Formats validation errors from express-validator or Joi
 */
export const handleValidationError = (errors) => {
  const details = errors.map(err => ({
    field: err.path || err.param,
    message: err.msg || err.message
  }));

  throw new APIError(
    'Validation failed',
    400,
    details
  );
};
