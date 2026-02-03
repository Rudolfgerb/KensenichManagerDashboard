import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES FIRST (before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get goal statistics (MUST be before /:id)
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

// ═══════════════════════════════════════════════════════════════
// MAIN GOALS CRUD
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// GOAL TASKS ENDPOINTS (parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Get all tasks for a specific goal (including subtasks hierarchy)
router.get('/:goalId/tasks', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { include_completed } = req.query;

    let query = `
      SELECT * FROM tasks
      WHERE goal_id = ?
    `;

    if (include_completed !== 'true') {
      query += ` AND status != 'done'`;
    }

    query += ` ORDER BY order_index ASC, created_at ASC`;

    const tasks = await allAsync(query, [goalId]);

    // Parse depends_on and calculate blocked status
    const taskMap = new Map();
    tasks.forEach(task => {
      task.subtasks = [];
      task.depends_on_parsed = task.depends_on ? JSON.parse(task.depends_on) : [];
      taskMap.set(task.id, task);
    });

    // Calculate blocked status for each task
    tasks.forEach(task => {
      if (task.depends_on_parsed.length > 0) {
        const blockers = task.depends_on_parsed
          .map(depId => taskMap.get(depId))
          .filter(dep => dep && dep.status !== 'done');
        task.is_blocked = blockers.length > 0;
        task.blocking_tasks = blockers.map(b => ({ id: b.id, title: b.title }));
      } else {
        task.is_blocked = false;
        task.blocking_tasks = [];
      }
    });

    // Build task hierarchy
    const rootTasks = [];
    tasks.forEach(task => {
      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        taskMap.get(task.parent_task_id).subtasks.push(task);
      } else if (!task.parent_task_id) {
        rootTasks.push(task);
      } else {
        rootTasks.push(task);
      }
    });

    res.json(rootTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task statistics for a goal
router.get('/:goalId/tasks/stats', async (req, res) => {
  try {
    const { goalId } = req.params;

    const stats = await getAsync(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
        AVG(CASE WHEN status = 'done' THEN 1 ELSE 0 END) * 100 as completion_rate,
        SUM(CASE WHEN priority = 3 THEN 1 ELSE 0 END) as critical_tasks,
        SUM(CASE WHEN priority = 2 THEN 1 ELSE 0 END) as high_priority_tasks,
        SUM(CASE WHEN difficulty = 3 THEN 1 ELSE 0 END) as hard_tasks,
        SUM(CASE WHEN difficulty = 2 THEN 1 ELSE 0 END) as medium_tasks
      FROM tasks
      WHERE goal_id = ?
    `, [goalId]);

    // Get completion history (last 7 days)
    const completionHistory = await allAsync(`
      SELECT
        DATE(completed_at) as date,
        COUNT(*) as completed_count
      FROM tasks
      WHERE goal_id = ? AND status = 'done' AND completed_at IS NOT NULL
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
      LIMIT 7
    `, [goalId]);

    // Get average session time per task
    const sessionStats = await getAsync(`
      SELECT
        AVG(ws.duration_minutes) as avg_session_duration,
        SUM(ws.duration_minutes) as total_time_spent,
        COUNT(ws.id) as total_sessions
      FROM work_sessions ws
      INNER JOIN tasks t ON ws.task_id = t.id
      WHERE t.goal_id = ?
    `, [goalId]);

    res.json({
      ...stats,
      completion_history: completionHistory,
      session_stats: sessionStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder tasks (must be before /:goalId/tasks/:taskId)
router.put('/:goalId/tasks/reorder', async (req, res) => {
  try {
    const { goalId } = req.params;
    const { taskOrders } = req.body; // Array of { id, order_index, parent_task_id }

    for (const order of taskOrders) {
      await runAsync(
        'UPDATE tasks SET order_index = ?, parent_task_id = ? WHERE id = ? AND goal_id = ?',
        [order.order_index, order.parent_task_id || null, order.id, goalId]
      );
    }

    res.json({ message: 'Tasks reordered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a task for a goal
router.post('/:goalId/tasks', async (req, res) => {
  try {
    const { goalId } = req.params;
    const {
      title,
      description,
      priority = 0,
      difficulty = 1,
      parent_task_id,
      due_date,
      estimated_sessions = 1,
      tags,
      category = 'general',
      depends_on
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Verify goal exists
    const goal = await getAsync('SELECT id FROM goals WHERE id = ?', goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Get max order_index for ordering
    const maxOrder = await getAsync(`
      SELECT MAX(order_index) as max_order
      FROM tasks
      WHERE goal_id = ? AND (parent_task_id IS NULL OR parent_task_id = ?)
    `, [goalId, parent_task_id || null]);

    const order_index = (maxOrder?.max_order || 0) + 1;
    const id = uuidv4();

    // Handle depends_on as JSON string
    const dependsOnStr = depends_on ? JSON.stringify(depends_on) : null;

    await runAsync(
      `INSERT INTO tasks (id, title, description, priority, difficulty, goal_id, parent_task_id, due_date, estimated_sessions, tags, category, order_index, depends_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, priority, difficulty, goalId, parent_task_id || null, due_date, estimated_sessions, tags, category, order_index, dependsOnStr]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', id);

    // Update goal progress based on task completion
    await updateGoalProgress(goalId);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a goal task
router.put('/:goalId/tasks/:taskId', async (req, res) => {
  try {
    const { goalId, taskId } = req.params;
    const {
      title,
      description,
      status,
      priority,
      difficulty,
      parent_task_id,
      due_date,
      estimated_sessions,
      tags,
      order_index,
      depends_on,
      completion_date
    } = req.body;

    // Check if marking as done - verify dependencies are completed
    let completed_at = null;
    if (status === 'done') {
      const currentTask = await getAsync('SELECT status, depends_on FROM tasks WHERE id = ?', taskId);

      // Check if blocking tasks are completed
      if (currentTask?.depends_on) {
        const deps = JSON.parse(currentTask.depends_on);
        if (deps.length > 0) {
          const blockers = await allAsync(
            `SELECT id, title FROM tasks WHERE id IN (${deps.map(() => '?').join(',')}) AND status != 'done'`,
            deps
          );
          if (blockers.length > 0) {
            return res.status(400).json({
              error: 'Blockierende Tasks müssen zuerst erledigt werden',
              blockers: blockers.map(b => b.title)
            });
          }
        }
      }

      if (currentTask && currentTask.status !== 'done') {
        completed_at = new Date().toISOString();
      }
    }

    // Handle depends_on update
    const dependsOnStr = depends_on !== undefined ? (depends_on ? JSON.stringify(depends_on) : null) : undefined;

    // Handle completion_date for daily task tracker
    let finalCompletionDate = completion_date;
    if (status === 'done' && !completion_date) {
      finalCompletionDate = new Date().toISOString().split('T')[0];
    } else if (status !== 'done' && completion_date === null) {
      finalCompletionDate = null;
    }

    await runAsync(
      `UPDATE tasks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           priority = COALESCE(?, priority),
           difficulty = COALESCE(?, difficulty),
           parent_task_id = COALESCE(?, parent_task_id),
           due_date = COALESCE(?, due_date),
           estimated_sessions = COALESCE(?, estimated_sessions),
           tags = COALESCE(?, tags),
           order_index = COALESCE(?, order_index),
           completed_at = COALESCE(?, completed_at),
           depends_on = COALESCE(?, depends_on),
           completion_date = COALESCE(?, completion_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND goal_id = ?`,
      [title, description, status, priority, difficulty, parent_task_id, due_date, estimated_sessions, tags, order_index, completed_at, dependsOnStr, finalCompletionDate, taskId, goalId]
    );

    const task = await getAsync('SELECT * FROM tasks WHERE id = ?', taskId);

    // Update goal progress
    await updateGoalProgress(goalId);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a goal task
router.delete('/:goalId/tasks/:taskId', async (req, res) => {
  try {
    const { goalId, taskId } = req.params;

    // Delete task and its subtasks (cascade)
    await runAsync('DELETE FROM tasks WHERE id = ? AND goal_id = ?', [taskId, goalId]);

    // Update goal progress
    await updateGoalProgress(goalId);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// SINGLE GOAL ROUTES (must be after all /tasks routes)
// ═══════════════════════════════════════════════════════════════

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
    // Also delete all tasks associated with this goal
    await runAsync('DELETE FROM tasks WHERE goal_id = ?', req.params.id);
    await runAsync('DELETE FROM goals WHERE id = ?', req.params.id);
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Helper function to update goal progress based on tasks
async function updateGoalProgress(goalId) {
  const stats = await getAsync(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
    FROM tasks
    WHERE goal_id = ?
  `, [goalId]);

  if (stats && stats.total > 0) {
    const progress = Math.round((stats.completed / stats.total) * 100);
    const status = progress >= 100 ? 'completed' : 'active';

    await runAsync(
      'UPDATE goals SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [progress, status, goalId]
    );
  }
}

export default router;
