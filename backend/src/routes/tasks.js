import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await allAsync('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending tasks (for task selection modal)
router.get('/pending', async (req, res) => {
  try {
    const tasks = await allAsync(
      "SELECT * FROM tasks WHERE status != 'completed' ORDER BY priority DESC, created_at ASC"
    );
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, estimated_sessions } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO tasks (id, title, description, priority, estimated_sessions)
       VALUES (?, ?, ?, ?, ?)`,
      [id, title, description || null, priority || 0, estimated_sessions || 1]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', id);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, estimated_sessions } = req.body;

    await runAsync(
      `UPDATE tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           estimated_sessions = COALESCE(?, estimated_sessions),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, status, priority, estimated_sessions, req.params.id]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', req.params.id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM tasks WHERE id = ?', req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
