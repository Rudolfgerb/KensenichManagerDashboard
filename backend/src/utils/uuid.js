/**
 * UUID Generation Utility
 * Standardizes UUID generation across the application
 */

import { randomUUID } from 'crypto';

/**
 * Generate a new UUID v4
 * @returns {string} UUID v4 string
 */
export const generateId = () => randomUUID();

/**
 * Validate UUID format
 * @param {string} id - UUID to validate
 * @returns {boolean} True if valid UUID
 */
export const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};
