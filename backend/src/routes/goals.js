import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all goals
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    let query = 'SELECT * FROM goals';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY target_date ASC NULLS LAST, created_at DESC';

    const goals = await allAsync(query, params);
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single goal
router.get('/:id', async (req, res) => {
  try {
    const goal = await getAsync('SELECT * FROM goals WHERE id = ?', req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create goal
router.post('/', async (req, res) => {
  try {
    const { title, description, category, target_date, metrics } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO goals (id, title, description, category, target_date, metrics)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, description, category, target_date, metrics]
    );

    const goal = await getAsync('SELECT * FROM goals WHERE id = ?', id);
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update goal
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, target_date, status, progress, metrics } = req.body;

    await runAsync(
      `UPDATE goals
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           target_date = COALESCE(?, target_date),
           status = COALESCE(?, status),
           progress = COALESCE(?, progress),
           metrics = COALESCE(?, metrics),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, category, target_date, status, progress, metrics, req.params.id]
    );

    const goal = await getAsync('SELECT * FROM goals WHERE id = ?', req.params.id);
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM goals WHERE id = ?', req.params.id);
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get goal statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await getAsync(`
      SELECT
        COUNT(*) as total_goals,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_goals,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_goals,
        AVG(progress) as avg_progress
      FROM goals
    `);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
