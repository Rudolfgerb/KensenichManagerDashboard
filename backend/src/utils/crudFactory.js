/**
 * CRUD Factory
 * Generates standard CRUD routes to reduce code duplication
 */

import { Router } from 'express';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { generateId } from './uuid.js';
import { now } from './dates.js';
import { logger } from './logger.js';

/**
 * Create a CRUD router for a given table
 *
 * @param {object} db - Database instance with promisified methods
 * @param {string} tableName - Name of the database table
 * @param {object} options - Configuration options
 * @param {array} options.createFields - Fields allowed for creation
 * @param {array} options.updateFields - Fields allowed for updates
 * @param {string} options.orderBy - Default ORDER BY clause
 * @param {object} options.validation - Validation middleware for routes
 * @param {function} options.beforeCreate - Hook before creation
 * @param {function} options.beforeUpdate - Hook before update
 * @param {function} options.beforeDelete - Hook before deletion
 * @param {object} options.customRoutes - Additional custom routes
 * @returns {Router} Express router with CRUD operations
 */
export function createCRUDRouter(db, tableName, options = {}) {
  const router = Router();

  const {
    createFields = [],
    updateFields = [],
    orderBy = 'created_at DESC',
    validation = {},
    beforeCreate = null,
    beforeUpdate = null,
    beforeDelete = null,
    customRoutes = {},
    allowDelete = true,
    searchFields = []
  } = options;

  const { getAsync, allAsync, runAsync } = db;

  /**
   * GET all records
   * Supports pagination, filtering, and search
   */
  router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 100, search, ...filters } = req.query;

    let query = `SELECT * FROM ${tableName}`;
    const params = [];
    const conditions = [];

    // Add search functionality
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => `${field} LIKE ?`).join(' OR ');
      conditions.push(`(${searchConditions})`);
      searchFields.forEach(() => params.push(`%${search}%`));
    }

    // Add filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ${orderBy}`;

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    logger.logQuery(query, params);
    const items = await allAsync(query, params);

    res.json(items);
  }));

  /**
   * GET single record by ID
   */
  router.get('/:id', validation.get || [], asyncHandler(async (req, res) => {
    const { id } = req.params;

    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    logger.logQuery(query, [id]);
    const item = await getAsync(query, [id]);

    if (!item) {
      throw new APIError(`${tableName.replace('_', ' ')} not found`, 404);
    }

    res.json(item);
  }));

  /**
   * POST create new record
   */
  router.post('/', validation.create || [], asyncHandler(async (req, res) => {
    const id = generateId();
    const timestamp = now();

    // Extract allowed fields
    const data = {};
    createFields.forEach(field => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    // Add metadata
    data.id = id;
    data.created_at = timestamp;
    data.updated_at = timestamp;

    // Before create hook
    if (beforeCreate) {
      await beforeCreate(data, req);
    }

    // Build INSERT query
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const values = fields.map(field => data[field]);

    logger.logQuery(query, values);
    await runAsync(query, values);

    // Fetch created record
    const created = await getAsync(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);

    logger.info(`Created ${tableName} record`, { id });
    res.status(201).json(created);
  }));

  /**
   * PUT update record by ID
   */
  router.put('/:id', validation.update || [], asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if record exists
    const existing = await getAsync(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    if (!existing) {
      throw new APIError(`${tableName.replace('_', ' ')} not found`, 404);
    }

    // Extract allowed fields
    const data = {};
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    if (Object.keys(data).length === 0) {
      throw new APIError('No valid fields to update', 400);
    }

    // Update timestamp
    data.updated_at = now();

    // Before update hook
    if (beforeUpdate) {
      await beforeUpdate(data, existing, req);
    }

    // Build UPDATE query
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    const values = [...fields.map(field => data[field]), id];

    logger.logQuery(query, values);
    await runAsync(query, values);

    // Fetch updated record
    const updated = await getAsync(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);

    logger.info(`Updated ${tableName} record`, { id });
    res.json(updated);
  }));

  /**
   * DELETE record by ID
   */
  if (allowDelete) {
    router.delete('/:id', validation.delete || [], asyncHandler(async (req, res) => {
      const { id } = req.params;

      // Check if record exists
      const existing = await getAsync(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
      if (!existing) {
        throw new APIError(`${tableName.replace('_', ' ')} not found`, 404);
      }

      // Before delete hook
      if (beforeDelete) {
        await beforeDelete(existing, req);
      }

      const query = `DELETE FROM ${tableName} WHERE id = ?`;
      logger.logQuery(query, [id]);
      await runAsync(query, [id]);

      logger.info(`Deleted ${tableName} record`, { id });
      res.json({ message: 'Deleted successfully', id });
    }));
  }

  // Add custom routes
  for (const [path, handler] of Object.entries(customRoutes)) {
    const [method, route] = path.split(' ');
    router[method.toLowerCase()](route, asyncHandler(handler));
  }

  return router;
}

/**
 * Helper to create standard validation object
 * @param {object} validators - Validation middleware
 * @returns {object} Validation object for CRUD factory
 */
export function createValidation(validators) {
  return {
    get: validators.get || [],
    create: validators.create || [],
    update: validators.update || [],
    delete: validators.delete || []
  };
}
