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

// Get sessions history grouped by date
router.get('/history', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const sessions = await allAsync(`
      SELECT s.*, t.title as task_title
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.started_at >= datetime('now', '-${parseInt(days)} days')
      ORDER BY s.started_at DESC
    `);

    // Group by date
    const groupedByDate = {};
    sessions.forEach(session => {
      const date = session.started_at.split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          sessions: [],
          totalMinutes: 0,
          completedCount: 0
        };
      }
      groupedByDate[date].sessions.push(session);
      groupedByDate[date].totalMinutes += session.duration_minutes || 0;
      if (session.status === 'completed') {
        groupedByDate[date].completedCount++;
      }
    });

    // Convert to array sorted by date desc
    const history = Object.values(groupedByDate).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed stats (weekly/monthly breakdown)
router.get('/stats/detailed', async (req, res) => {
  try {
    // Daily stats for last 7 days
    const dailyStats = await allAsync(`
      SELECT
        DATE(started_at) as date,
        COUNT(*) as session_count,
        SUM(duration_minutes) as total_minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_sessions
      WHERE started_at >= datetime('now', '-7 days')
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `);

    // Weekly stats for last 4 weeks
    const weeklyStats = await allAsync(`
      SELECT
        strftime('%Y-W%W', started_at) as week,
        COUNT(*) as session_count,
        SUM(duration_minutes) as total_minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_sessions
      WHERE started_at >= datetime('now', '-28 days')
      GROUP BY strftime('%Y-W%W', started_at)
      ORDER BY week DESC
    `);

    // Top tasks by time spent
    const topTasks = await allAsync(`
      SELECT
        t.id,
        t.title,
        COUNT(s.id) as session_count,
        SUM(s.duration_minutes) as total_minutes
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.started_at >= datetime('now', '-30 days')
      GROUP BY t.id
      ORDER BY total_minutes DESC
      LIMIT 10
    `);

    // Status breakdown (instead of category)
    const statusStats = await allAsync(`
      SELECT
        s.status,
        COUNT(s.id) as session_count,
        SUM(s.duration_minutes) as total_minutes
      FROM work_sessions s
      WHERE s.started_at >= datetime('now', '-30 days')
      GROUP BY s.status
      ORDER BY total_minutes DESC
    `);

    // Productivity by hour of day
    const hourlyStats = await allAsync(`
      SELECT
        strftime('%H', started_at) as hour,
        COUNT(*) as session_count,
        SUM(duration_minutes) as total_minutes
      FROM work_sessions
      WHERE started_at >= datetime('now', '-30 days')
      GROUP BY strftime('%H', started_at)
      ORDER BY hour
    `);

    res.json({
      daily: dailyStats,
      weekly: weeklyStats,
      topTasks,
      statusBreakdown: statusStats,
      hourly: hourlyStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get productivity summary
router.get('/stats/summary', async (req, res) => {
  try {
    // Today
    const today = await getAsync(`
      SELECT
        COUNT(*) as sessions,
        COALESCE(SUM(duration_minutes), 0) as minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_sessions
      WHERE DATE(started_at) = DATE('now')
    `);

    // This week
    const thisWeek = await getAsync(`
      SELECT
        COUNT(*) as sessions,
        COALESCE(SUM(duration_minutes), 0) as minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_sessions
      WHERE started_at >= datetime('now', 'weekday 0', '-7 days')
    `);

    // This month
    const thisMonth = await getAsync(`
      SELECT
        COUNT(*) as sessions,
        COALESCE(SUM(duration_minutes), 0) as minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_sessions
      WHERE strftime('%Y-%m', started_at) = strftime('%Y-%m', 'now')
    `);

    // All time
    const allTime = await getAsync(`
      SELECT
        COUNT(*) as sessions,
        COALESCE(SUM(duration_minutes), 0) as minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_sessions
    `);

    // Streak (consecutive days with at least one session)
    const streakDays = await allAsync(`
      SELECT DISTINCT DATE(started_at) as date
      FROM work_sessions
      ORDER BY date DESC
      LIMIT 60
    `);

    let streak = 0;
    const todayDate = new Date().toISOString().split('T')[0];
    let checkDate = new Date(todayDate);

    for (const day of streakDays) {
      const dayDate = day.date;
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (dayDate === expectedDate) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dayDate < expectedDate) {
        // If today has no sessions yet, check if yesterday continues streak
        if (streak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          if (dayDate === checkDate.toISOString().split('T')[0]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    res.json({
      today: {
        sessions: today.sessions,
        minutes: today.minutes,
        hours: Math.round(today.minutes / 60 * 10) / 10,
        completed: today.completed
      },
      thisWeek: {
        sessions: thisWeek.sessions,
        minutes: thisWeek.minutes,
        hours: Math.round(thisWeek.minutes / 60 * 10) / 10,
        completed: thisWeek.completed
      },
      thisMonth: {
        sessions: thisMonth.sessions,
        minutes: thisMonth.minutes,
        hours: Math.round(thisMonth.minutes / 60 * 10) / 10,
        completed: thisMonth.completed
      },
      allTime: {
        sessions: allTime.sessions,
        minutes: allTime.minutes,
        hours: Math.round(allTime.minutes / 60 * 10) / 10,
        completed: allTime.completed
      },
      currentStreak: streak
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
