import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await allAsync(`
      SELECT s.*, t.title as task_title
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      ORDER BY s.started_at DESC
    `);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAsync(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(duration_minutes) as total_minutes,
        AVG(duration_minutes) as avg_duration,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
      FROM work_sessions
    `);

    const today = await getAsync(`
      SELECT COUNT(*) as sessions_today
      FROM work_sessions
      WHERE DATE(started_at) = DATE('now')
    `);

    res.json({ ...stats, ...today });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start a new session
router.post('/start', async (req, res) => {
  try {
    const { task_id } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'task_id is required' });
    }

    // Verify task exists
    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', task_id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const id = uuidv4();
    const started_at = new Date().toISOString();

    await runAsync(
      `INSERT INTO work_sessions (id, task_id, started_at, status)
       VALUES (?, ?, ?, 'running')`,
      [id, task_id, started_at]
    );

    // Update task status to in_progress
    await runAsync("UPDATE tasks SET status = 'in_progress' WHERE id = ?", task_id);

    const session = await getAsync(`
      SELECT s.*, t.title as task_title
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.id = ?
    `, id);

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete a session (with documentation)
router.post('/:id/complete', async (req, res) => {
  try {
    const { documentation } = req.body;
    const sessionId = req.params.id;

    const session = await getAsync('SELECT * FROM work_sessions WHERE id = ?', sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const ended_at = new Date().toISOString();
    const started = new Date(session.started_at);
    const ended = new Date(ended_at);
    const duration_minutes = Math.round((ended - started) / 1000 / 60);

    await runAsync(
      `UPDATE work_sessions
       SET ended_at = ?,
           duration_minutes = ?,
           status = 'completed',
           documentation = ?
       WHERE id = ?`,
      [ended_at, duration_minutes, documentation || null, sessionId]
    );

    const updatedSession = await getAsync(`
      SELECT s.*, t.title as task_title
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.id = ?
    `, sessionId);

    res.json(updatedSession);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop a session (without completing the task)
router.post('/:id/stop', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const session = await getAsync('SELECT * FROM work_sessions WHERE id = ?', sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const ended_at = new Date().toISOString();
    const started = new Date(session.started_at);
    const ended = new Date(ended_at);
    const duration_minutes = Math.round((ended - started) / 1000 / 60);

    await runAsync(
      `UPDATE work_sessions
       SET ended_at = ?,
           duration_minutes = ?,
           status = 'stopped'
       WHERE id = ?`,
      [ended_at, duration_minutes, sessionId]
    );

    const updatedSession = await getAsync(`
      SELECT s.*, t.title as task_title
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.id = ?
    `, sessionId);

    res.json(updatedSession);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current running session
router.get('/current', async (req, res) => {
  try {
    const session = await getAsync(`
      SELECT s.*, t.title as task_title
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.status = 'running'
      ORDER BY s.started_at DESC
      LIMIT 1
    `);

    res.json(session || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
