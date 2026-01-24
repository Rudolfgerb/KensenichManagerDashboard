/**
 * Input Validation Middleware
 * Uses express-validator for request validation
 */

import { body, param, query, validationResult } from 'express-validator';
import { handleValidationError } from './errorHandler.js';

/**
 * Validation result checker
 * Checks for validation errors and throws if found
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return handleValidationError(errors.array());
  }
  next();
};

/**
 * UUID validation
 */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidUUID = (value) => uuidRegex.test(value);

/**
 * Task Validation Rules
 */
export const validateCreateTask = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('priority')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Priority must be between 0 and 5'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category must not exceed 50 characters'),
  body('estimated_sessions')
    .optional()
    .isInt({ min: 1 }).withMessage('Estimated sessions must be a positive integer'),
  body('due_date')
    .optional()
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date'),
  validate
];

export const validateUpdateTask = [
  param('id').custom(isValidUUID).withMessage('Invalid task ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('priority')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Priority must be between 0 and 5'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'completed', 'archived']).withMessage('Invalid status'),
  validate
];

/**
 * Contact Validation Rules
 */
export const validateCreateContact = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('type')
    .optional()
    .isIn(['client', 'partner', 'lead', 'other']).withMessage('Invalid contact type'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Phone number contains invalid characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name must not exceed 100 characters'),
  body('next_followup')
    .optional()
    .isISO8601().withMessage('Next followup must be a valid ISO 8601 date'),
  validate
];

export const validateUpdateContact = [
  param('id').custom(isValidUUID).withMessage('Invalid contact ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('type')
    .optional()
    .isIn(['client', 'partner', 'lead', 'other']).withMessage('Invalid contact type'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address'),
  validate
];

/**
 * Goal Validation Rules
 */
export const validateCreateGoal = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('category')
    .optional()
    .isIn(['business', 'career', 'personal', 'health', 'other']).withMessage('Invalid category'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('target_date')
    .optional()
    .isISO8601().withMessage('Target date must be a valid ISO 8601 date'),
  validate
];

export const validateUpdateGoal = [
  param('id').custom(isValidUUID).withMessage('Invalid goal ID'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'paused', 'abandoned']).withMessage('Invalid status'),
  validate
];

/**
 * Project Validation Rules
 */
export const validateCreateProject = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['active', 'paused', 'completed', 'archived']).withMessage('Invalid status'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code'),
  body('website_url')
    .optional()
    .trim()
    .isURL().withMessage('Website URL must be a valid URL'),
  body('repository_url')
    .optional()
    .trim()
    .isURL().withMessage('Repository URL must be a valid URL'),
  validate
];

/**
 * Session Validation Rules
 */
export const validateStartSession = [
  body('task_id')
    .notEmpty().withMessage('Task ID is required')
    .custom(isValidUUID).withMessage('Invalid task ID'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  validate
];

export const validateCompleteSession = [
  param('id').custom(isValidUUID).withMessage('Invalid session ID'),
  body('documentation')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Documentation must not exceed 5000 characters'),
  validate
];

/**
 * Communication Log Validation Rules
 */
export const validateCommunication = [
  body('type')
    .isIn(['email', 'call', 'meeting', 'message']).withMessage('Invalid communication type'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Subject must not exceed 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 }).withMessage('Content must not exceed 10000 characters'),
  body('direction')
    .optional()
    .isIn(['incoming', 'outgoing']).withMessage('Direction must be incoming or outgoing'),
  validate
];

/**
 * Generic ID parameter validation
 */
export const validateId = [
  param('id').custom(isValidUUID).withMessage('Invalid ID format'),
  validate
];

/**
 * Pagination validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate
];
