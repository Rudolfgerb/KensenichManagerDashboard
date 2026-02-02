import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// DAILY TASK TRACKING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get today's and yesterday's tasks with completion status
router.get('/daily', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get all active goals
    const goals = await allAsync('SELECT id, title FROM goals WHERE status = ?', ['active']);

    // Get tasks for these goals
    const tasks = [];
    for (const goal of goals) {
      const goalTasks = await allAsync(
        'SELECT * FROM tasks WHERE goal_id = ? AND status != ?',
        [goal.id, 'done']
      );
      
      goalTasks.forEach(task => {
        tasks.push({
          ...task,
          goal_id: goal.id,
          goal_title: goal.title,
          is_completed: task.status === 'done',
          completion_date: task.completion_date || null
        });
      });
    }

    // Separate today and yesterday tasks
    const todayTasks = tasks.filter(task => 
      task.completion_date === today || !task.completion_date
    );

    const yesterdayTasks = tasks.filter(task => 
      task.completion_date === yesterdayStr
    );

    res.json({
      today: todayTasks,
      yesterday: yesterdayTasks,
      all: tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task completion history
router.get('/daily/history', async (req, res) => {
  try {
    const { days = 14 } = req.query;

    // Get completion history for the last N days
    const history = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Get all tasks completed on this date
      const completedTasks = await allAsync(
        'SELECT * FROM tasks WHERE completion_date = ?',
        [dateStr]
      );

      // Get all active tasks on this date (not completed before this date)
      const allTasks = await allAsync(
        'SELECT * FROM tasks WHERE (completion_date IS NULL OR completion_date >= ?) AND status != ?',
        [dateStr, 'done']
      );

      const completionRate = allTasks.length > 0 
        ? (completedTasks.length / allTasks.length) * 100 
        : 0;

      history.push({
        date: dateStr,
        completed_tasks: completedTasks.length,
        total_tasks: allTasks.length,
        completion_rate: Math.round(completionRate)
      });
    }

    // Sort by date (oldest first)
    history.sort((a, b) => a.date.localeCompare(b.date));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new daily task (standalone, not tied to a goal)
router.post('/daily', async (req, res) => {
  try {
    const { title, description, priority = 1, estimated_sessions = 1 } = req.body;
    const id = uuidv4();
    const created_at = new Date().toISOString();

    await runAsync(
      `INSERT INTO tasks (id, title, description, priority, estimated_sessions, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, priority, estimated_sessions, 'todo', created_at, created_at]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', id);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task completion status
router.put('/daily/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_completed } = req.body;

    const completion_date = is_completed ? new Date().toISOString().split('T')[0] : null;
    const status = is_completed ? 'done' : 'todo';

    await runAsync(
      'UPDATE tasks SET status = ?, completion_date = ?, updated_at = ? WHERE id = ?',
      [status, completion_date, new Date().toISOString(), id]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks by date range
router.get('/daily/range', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const tasks = await allAsync(
      'SELECT * FROM tasks WHERE completion_date BETWEEN ? AND ?',
      [start_date, end_date]
    );

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task statistics
router.get('/daily/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get all tasks completed in the date range
    const completedTasks = await allAsync(
      'SELECT * FROM tasks WHERE completion_date BETWEEN ? AND ?',
      [startDateStr, today.toISOString().split('T')[0]]
    );

    // Get all active tasks
    const allTasks = await allAsync('SELECT * FROM tasks WHERE status != ?', ['done']);

    const stats = {
      total_tasks: allTasks.length,
      completed_tasks: completedTasks.length,
      completion_rate: allTasks.length > 0 
        ? Math.round((completedTasks.length / allTasks.length) * 100) 
        : 0,
      perfect_days: completedTasks.filter(task => 
        task.completion_date === today.toISOString().split('T')[0]
      ).length,
      average_completion_time: 0 // Would need session data to calculate
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// EXISTING TASK ENDPOINTS (for compatibility)
// ═══════════════════════════════════════════════════════════════

// Get all tasks with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, goal_id, priority, parent_task_id } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (goal_id) {
      query += ' AND goal_id = ?';
      params.push(goal_id);
    }
    if (priority) {
      query += ' AND priority >= ?';
      params.push(parseInt(priority));
    }
    if (parent_task_id !== undefined) {
      if (parent_task_id === 'null' || parent_task_id === '') {
        query += ' AND parent_task_id IS NULL';
      } else {
        query += ' AND parent_task_id = ?';
        params.push(parent_task_id);
      }
    }

    query += ' ORDER BY priority DESC, order_index ASC, created_at DESC';
    const tasks = await allAsync(query, params);
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

// Get task statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const total = await getAsync('SELECT COUNT(*) as count FROM tasks');
    const byStatus = await allAsync(`
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);
    const byPriority = await allAsync(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      GROUP BY priority
      ORDER BY priority DESC
    `);
    const completedToday = await getAsync(`
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'completed' AND DATE(completed_at) = DATE('now')
    `);
    const completedThisWeek = await getAsync(`
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'completed' AND completed_at >= datetime('now', '-7 days')
    `);
    const completedThisMonth = await getAsync(`
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'completed' AND strftime('%Y-%m', completed_at) = strftime('%Y-%m', 'now')
    `);
    const avgCompletionTime = await getAsync(`
      SELECT AVG(julianday(completed_at) - julianday(created_at)) as avg_days
      FROM tasks
      WHERE status = 'completed' AND completed_at IS NOT NULL
    `);

    res.json({
      total: total.count,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s.count }), {}),
      byPriority: byPriority.reduce((acc, p) => ({ ...acc, [`p${p.priority}`]: p.count }), {}),
      completedToday: completedToday.count,
      completedThisWeek: completedThisWeek.count,
      completedThisMonth: completedThisMonth.count,
      avgCompletionDays: avgCompletionTime.avg_days ? Math.round(avgCompletionTime.avg_days * 10) / 10 : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single task with subtasks
router.get('/:id', async (req, res) => {
  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get subtasks (follow-up tasks)
    const subtasks = await allAsync(
      'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY order_index ASC, created_at ASC',
      [req.params.id]
    );

    // Get parent task if exists
    let parentTask = null;
    if (task.parent_task_id) {
      parentTask = await getAsync('SELECT id, title FROM tasks WHERE id = ?', task.parent_task_id);
    }

    // Get goal if linked
    let goal = null;
    if (task.goal_id) {
      goal = await getAsync('SELECT id, title, progress FROM goals WHERE id = ?', task.goal_id);
    }

    res.json({ ...task, subtasks, parentTask, goal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task chain (all ancestors and descendants)
router.get('/:id/chain', async (req, res) => {
  try {
    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all ancestors
    const ancestors = [];
    let currentParentId = task.parent_task_id;
    while (currentParentId) {
      const parent = await getAsync('SELECT * FROM tasks WHERE id = ?', currentParentId);
      if (parent) {
        ancestors.unshift(parent);
        currentParentId = parent.parent_task_id;
      } else {
        break;
      }
    }

    // Get all descendants recursively
    const getDescendants = async (parentId) => {
      const children = await allAsync(
        'SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY order_index ASC',
        [parentId]
      );
      for (const child of children) {
        child.subtasks = await getDescendants(child.id);
      }
      return children;
    };

    const descendants = await getDescendants(req.params.id);

    res.json({
      ancestors,
      current: task,
      descendants
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const {
      title, description, priority, estimated_sessions,
      category, due_date, goal_id, parent_task_id, tags
    } = req.body;
    const id = uuidv4();

    // Get next order index if parent task
    let orderIndex = 0;
    if (parent_task_id) {
      const maxOrder = await getAsync(
        'SELECT MAX(order_index) as max_order FROM tasks WHERE parent_task_id = ?',
        [parent_task_id]
      );
      orderIndex = (maxOrder.max_order || 0) + 1;
    }

    await runAsync(
      `INSERT INTO tasks (id, title, description, priority, estimated_sessions, category, due_date, goal_id, parent_task_id, order_index, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, priority || 0, estimated_sessions || 1,
       category || 'general', due_date || null, goal_id || null, parent_task_id || null, orderIndex, tags || null]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', id);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create subtask (follow-up task)
router.post('/:id/subtask', async (req, res) => {
  try {
    const parentId = req.params.id;
    const { title, description, priority, estimated_sessions } = req.body;
    const id = uuidv4();

    // Verify parent exists
    const parent = await getAsync('SELECT * FROM tasks WHERE id = ?', parentId);
    if (!parent) {
      return res.status(404).json({ error: 'Parent task not found' });
    }

    // Get next order index
    const maxOrder = await getAsync(
      'SELECT MAX(order_index) as max_order FROM tasks WHERE parent_task_id = ?',
      [parentId]
    );
    const orderIndex = (maxOrder.max_order || 0) + 1;

    await runAsync(
      `INSERT INTO tasks (id, title, description, priority, estimated_sessions, parent_task_id, goal_id, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, priority || parent.priority,
       estimated_sessions || 1, parentId, parent.goal_id, orderIndex]
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
    const { title, description, status, priority, estimated_sessions,
            category, due_date, goal_id, parent_task_id, order_index, tags } = req.body;

    // If marking as completed, set completed_at
    let completedAt = null;
    if (status === 'completed') {
      const current = await getAsync('SELECT status FROM tasks WHERE id = ?', req.params.id);
      if (current && current.status !== 'completed') {
        completedAt = new Date().toISOString();
      }
    }

    await runAsync(
      `UPDATE tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           estimated_sessions = COALESCE(?, estimated_sessions),
           category = COALESCE(?, category),
           due_date = COALESCE(?, due_date),
           goal_id = ?,
           parent_task_id = ?,
           order_index = COALESCE(?, order_index),
           tags = COALESCE(?, tags),
           completed_at = COALESCE(?, completed_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, status, priority, estimated_sessions,
       category, due_date, goal_id, parent_task_id, order_index, tags, completedAt, req.params.id]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', req.params.id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder tasks
router.put('/reorder', async (req, res) => {
  try {
    const { tasks } = req.body; // Array of { id, order_index }

    for (const t of tasks) {
      await runAsync(
        'UPDATE tasks SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [t.order_index, t.id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task (and optionally cascade to subtasks)
router.delete('/:id', async (req, res) => {
  try {
    const { cascade } = req.query;

    if (cascade === 'true') {
      // Delete all subtasks recursively
      const deleteSubtasks = async (parentId) => {
        const subtasks = await allAsync('SELECT id FROM tasks WHERE parent_task_id = ?', [parentId]);
        for (const sub of subtasks) {
          await deleteSubtasks(sub.id);
          await runAsync('DELETE FROM tasks WHERE id = ?', [sub.id]);
        }
      };
      await deleteSubtasks(req.params.id);
    } else {
      // Move subtasks to parent or make them root tasks
      const task = await getAsync('SELECT parent_task_id FROM tasks WHERE id = ?', req.params.id);
      await runAsync(
        'UPDATE tasks SET parent_task_id = ? WHERE parent_task_id = ?',
        [task?.parent_task_id || null, req.params.id]
      );
    }

    await runAsync('DELETE FROM tasks WHERE id = ?', req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
