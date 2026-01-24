/**
 * Date Utility Functions
 * Standardizes date handling across the application
 */

/**
 * Get current timestamp as ISO string
 * @returns {string} ISO 8601 formatted date string
 */
export const now = () => new Date().toISOString();

/**
 * Calculate duration between two dates in minutes
 * @param {string|Date} start - Start date
 * @param {string|Date} end - End date
 * @returns {number} Duration in minutes
 */
export const calculateDuration = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate - startDate) / (1000 * 60));
};

/**
 * Format date for database storage
 * @param {string|Date} date - Date to format
 * @returns {string} ISO 8601 formatted date string
 */
export const formatForDB = (date) => {
  if (!date) return null;
  return new Date(date).toISOString();
};

/**
 * Check if a date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPast = (date) => {
  return new Date(date) < new Date();
};

/**
 * Check if a date is overdue (past and not today)
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if overdue
 */
export const isOverdue = (date) => {
  if (!date) return false;
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate < today;
};

/**
 * Add days to a date
 * @param {string|Date} date - Base date
 * @param {number} days - Number of days to add
 * @returns {string} ISO 8601 formatted date string
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
};

/**
 * Get start of day
 * @param {string|Date} date - Date
 * @returns {string} ISO 8601 formatted date string
 */
export const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result.toISOString();
};

/**
 * Get end of day
 * @param {string|Date} date - Date
 * @returns {string} ISO 8601 formatted date string
 */
export const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result.toISOString();
};
