import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runAsync, getAsync, allAsync } from '../db.js';

const router = express.Router();

// ==================== CALENDAR EVENTS ====================

// Get upcoming events (next 7 days)
router.get('/events/upcoming', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const events = await allAsync(`
      SELECT * FROM calendar_events
      WHERE start_time >= ? AND start_time <= ?
      AND status != 'cancelled'
      ORDER BY start_time ASC
      LIMIT 10
    `, [now, weekFromNow]);

    res.json(events);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Get events for today
router.get('/events/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await allAsync(`
      SELECT * FROM calendar_events
      WHERE start_time >= ? AND start_time < ?
      AND status != 'cancelled'
      ORDER BY start_time ASC
    `, [today.toISOString(), tomorrow.toISOString()]);

    res.json(events);
  } catch (error) {
    console.error('Error fetching today events:', error);
    res.status(500).json({ error: 'Failed to fetch today events' });
  }
});

// Create event
router.post('/events', async (req, res) => {
  try {
    const {
      title,
      description,
      event_type,
      start_time,
      end_time,
      location,
      attendees,
      reminder_minutes,
      related_contact_id
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO calendar_events (
        id, title, description, event_type, start_time, end_time,
        location, attendees, reminder_minutes, related_contact_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, title, description || null, event_type || 'meeting', start_time,
        end_time || null, location || null, attendees || null,
        reminder_minutes || 15, related_contact_id || null]);

    const created = await getAsync('SELECT * FROM calendar_events WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event status
router.put('/events/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    await runAsync(`
      UPDATE calendar_events SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, req.params.id]);

    const updated = await getAsync('SELECT * FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating event status:', error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
});

// ==================== NOTIFICATIONS ====================

// Get unread notifications
router.get('/notifications/unread', async (req, res) => {
  try {
    const notifications = await allAsync(`
      SELECT * FROM notifications
      WHERE is_read = 0
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at DESC
      LIMIT 20
    `);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

// Get recent notifications
router.get('/notifications/recent', async (req, res) => {
  try {
    const notifications = await allAsync(`
      SELECT * FROM notifications
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({ error: 'Failed to fetch recent notifications' });
  }
});

// Create notification
router.post('/notifications', async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      priority,
      related_entity_type,
      related_entity_id,
      action_url
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO notifications (
        id, type, title, message, priority,
        related_entity_type, related_entity_id, action_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, type, title, message || null, priority || 'normal',
        related_entity_type || null, related_entity_id || null, action_url || null]);

    const created = await getAsync('SELECT * FROM notifications WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    const updated = await getAsync('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all as read
router.put('/notifications/mark-all-read', async (req, res) => {
  try {
    await runAsync('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// ==================== APPLICATIONS/PROCESSES ====================

// Get active applications
router.get('/applications/active', async (req, res) => {
  try {
    const applications = await allAsync(`
      SELECT * FROM applications
      WHERE status IN ('pending', 'in_progress', 'waiting_for_info', 'under_review')
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        expected_response_date ASC,
        last_update DESC
      LIMIT 10
    `);

    res.json(applications);
  } catch (error) {
    console.error('Error fetching active applications:', error);
    res.status(500).json({ error: 'Failed to fetch active applications' });
  }
});

// Get all applications
router.get('/applications', async (req, res) => {
  try {
    const { status, type } = req.query;

    let query = 'SELECT * FROM applications WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND application_type = ?';
      params.push(type);
    }

    query += ' ORDER BY last_update DESC';

    const applications = await allAsync(query, params);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get application with updates
router.get('/applications/:id', async (req, res) => {
  try {
    const application = await getAsync('SELECT * FROM applications WHERE id = ?', [req.params.id]);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updates = await allAsync(`
      SELECT * FROM application_updates
      WHERE application_id = ?
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({
      ...application,
      updates
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Create application
router.post('/applications', async (req, res) => {
  try {
    const {
      title,
      application_type,
      status,
      priority,
      submitted_date,
      expected_response_date,
      institution,
      reference_number,
      documents,
      notes
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO applications (
        id, title, application_type, status, priority,
        submitted_date, expected_response_date, institution,
        reference_number, documents, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, title, application_type, status || 'pending', priority || 'normal',
        submitted_date || null, expected_response_date || null, institution || null,
        reference_number || null, documents || null, notes || null]);

    const created = await getAsync('SELECT * FROM applications WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Update application
router.put('/applications/:id', async (req, res) => {
  try {
    const {
      title,
      status,
      priority,
      expected_response_date,
      response_date,
      outcome,
      notes
    } = req.body;

    await runAsync(`
      UPDATE applications SET
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        expected_response_date = COALESCE(?, expected_response_date),
        response_date = COALESCE(?, response_date),
        outcome = COALESCE(?, outcome),
        notes = COALESCE(?, notes),
        last_update = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, status, priority, expected_response_date, response_date,
        outcome, notes, req.params.id]);

    const updated = await getAsync('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Add application update
router.post('/applications/:id/updates', async (req, res) => {
  try {
    const { update_type, title, description } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO application_updates (
        id, application_id, update_type, title, description
      ) VALUES (?, ?, ?, ?, ?)
    `, [id, req.params.id, update_type, title, description || null]);

    // Update last_update timestamp on application
    await runAsync(`
      UPDATE applications
      SET last_update = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    const created = await getAsync('SELECT * FROM application_updates WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding application update:', error);
    res.status(500).json({ error: 'Failed to add application update' });
  }
});

// ==================== DASHBOARD OVERVIEW ====================

// Get comprehensive statistics across all modules
router.get('/stats/global', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // ===== TASKS =====
    const taskStats = await getAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo
      FROM tasks
    `);

    const tasksCompletedPeriod = await getAsync(`
      SELECT COUNT(*) as count FROM tasks
      WHERE status = 'completed' AND completed_at >= datetime('now', '-${days} days')
    `);

    const tasksByPriority = await allAsync(`
      SELECT priority, COUNT(*) as count
      FROM tasks WHERE status != 'completed'
      GROUP BY priority ORDER BY priority DESC
    `);

    // ===== GOALS =====
    const goalStats = await getAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        AVG(CASE WHEN status = 'active' THEN progress ELSE NULL END) as avg_progress
      FROM goals
    `);

    // ===== SESSIONS =====
    const sessionStats = await getAsync(`
      SELECT
        COUNT(*) as total,
        SUM(duration_minutes) as total_minutes,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_sessions
    `);

    const sessionsInPeriod = await getAsync(`
      SELECT
        COUNT(*) as count,
        SUM(duration_minutes) as minutes
      FROM work_sessions
      WHERE started_at >= datetime('now', '-${days} days')
    `);

    // ===== CONTENT =====
    const contentStats = await getAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'idea' THEN 1 ELSE 0 END) as ideas
      FROM content_ideas
    `);

    const contentInPeriod = await getAsync(`
      SELECT COUNT(*) as count FROM content_ideas
      WHERE status = 'published' AND updated_at >= datetime('now', '-${days} days')
    `);

    // ===== JOBS =====
    const jobStats = await getAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offers,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted
      FROM job_applications
    `);

    // ===== CRM =====
    const crmStats = await getAsync(`
      SELECT
        COUNT(*) as total_contacts,
        SUM(CASE WHEN type = 'client' THEN 1 ELSE 0 END) as clients,
        SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END) as partners,
        SUM(CASE WHEN type = 'lead' THEN 1 ELSE 0 END) as leads
      FROM crm_contacts
    `);

    // ===== HABITS =====
    const habitStats = await getAsync(`
      SELECT
        COUNT(*) as total_entries,
        SUM(completed) as completed_count,
        AVG(CAST(checked_count AS FLOAT) / CAST(target_count AS FLOAT)) as avg_completion_rate
      FROM daily_habits_history
      WHERE date >= date('now', '-${days} days')
    `);

    // ===== DAILY BREAKDOWN (last 7 days) =====
    const dailyBreakdown = await allAsync(`
      SELECT
        DATE(started_at) as date,
        COUNT(*) as sessions,
        SUM(duration_minutes) as minutes
      FROM work_sessions
      WHERE started_at >= datetime('now', '-7 days')
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `);

    // ===== PRODUCTIVITY SCORE =====
    const productivityData = await getAsync(`
      SELECT
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at >= datetime('now', '-7 days')) as tasks_completed,
        (SELECT SUM(duration_minutes) FROM work_sessions WHERE started_at >= datetime('now', '-7 days')) as work_minutes,
        (SELECT COUNT(*) FROM daily_habits_history WHERE completed = 1 AND date >= date('now', '-7 days')) as habits_completed
    `);

    // Calculate a simple productivity score (0-100)
    const tasksScore = Math.min((productivityData.tasks_completed || 0) * 10, 30);
    const workScore = Math.min(((productivityData.work_minutes || 0) / 60 / 7) * 10, 40); // Hours per day avg
    const habitsScore = Math.min((productivityData.habits_completed || 0) * 5, 30);
    const productivityScore = Math.round(tasksScore + workScore + habitsScore);

    res.json({
      period: days,
      tasks: {
        total: taskStats.total,
        completed: taskStats.completed,
        inProgress: taskStats.in_progress,
        todo: taskStats.todo,
        completedInPeriod: tasksCompletedPeriod.count,
        byPriority: tasksByPriority
      },
      goals: {
        total: goalStats.total,
        completed: goalStats.completed,
        active: goalStats.active,
        avgProgress: Math.round((goalStats.avg_progress || 0) * 10) / 10
      },
      sessions: {
        total: sessionStats.total,
        totalHours: Math.round((sessionStats.total_minutes || 0) / 60 * 10) / 10,
        completed: sessionStats.completed,
        periodSessions: sessionsInPeriod.count,
        periodHours: Math.round((sessionsInPeriod.minutes || 0) / 60 * 10) / 10
      },
      content: {
        total: contentStats.total,
        published: contentStats.published,
        inProgress: contentStats.in_progress,
        ideas: contentStats.ideas,
        publishedInPeriod: contentInPeriod.count
      },
      jobs: {
        total: jobStats.total,
        applied: jobStats.applied,
        interviews: jobStats.interviews,
        offers: jobStats.offers,
        accepted: jobStats.accepted
      },
      crm: {
        totalContacts: crmStats.total_contacts,
        clients: crmStats.clients,
        partners: crmStats.partners,
        leads: crmStats.leads
      },
      habits: {
        entriesInPeriod: habitStats.total_entries || 0,
        completedInPeriod: habitStats.completed_count || 0,
        avgCompletionRate: Math.round((habitStats.avg_completion_rate || 0) * 100)
      },
      dailyBreakdown,
      productivityScore
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global stats' });
  }
});

// Get activity timeline (recent activities across all modules)
router.get('/activity/timeline', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const activities = [];

    // Recent completed tasks
    const completedTasks = await allAsync(`
      SELECT id, title, 'task_completed' as type, completed_at as timestamp
      FROM tasks
      WHERE status = 'completed' AND completed_at IS NOT NULL
      ORDER BY completed_at DESC LIMIT 5
    `);
    activities.push(...completedTasks.map(t => ({ ...t, icon: '✅', module: 'Tasks' })));

    // Recent sessions
    const recentSessions = await allAsync(`
      SELECT s.id, t.title, 'session_completed' as type, s.ended_at as timestamp, s.duration_minutes
      FROM work_sessions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.status = 'completed'
      ORDER BY s.ended_at DESC LIMIT 5
    `);
    activities.push(...recentSessions.map(s => ({
      ...s,
      icon: '⏱️',
      module: 'Sessions',
      title: `${s.title} (${s.duration_minutes} min)`
    })));

    // Recent content published
    const publishedContent = await allAsync(`
      SELECT id, title, 'content_published' as type, updated_at as timestamp, platform
      FROM content_ideas
      WHERE status = 'published'
      ORDER BY updated_at DESC LIMIT 5
    `);
    activities.push(...publishedContent.map(c => ({
      ...c,
      icon: '📝',
      module: 'Content',
      title: `${c.title} (${c.platform || 'N/A'})`
    })));

    // Recent goals completed
    const completedGoals = await allAsync(`
      SELECT id, title, 'goal_completed' as type, updated_at as timestamp
      FROM goals
      WHERE status = 'completed'
      ORDER BY updated_at DESC LIMIT 5
    `);
    activities.push(...completedGoals.map(g => ({ ...g, icon: '🎯', module: 'Goals' })));

    // Recent job applications
    const recentJobs = await allAsync(`
      SELECT id, company || ' - ' || position as title, 'job_applied' as type, applied_date as timestamp, status
      FROM job_applications
      ORDER BY applied_date DESC LIMIT 5
    `);
    activities.push(...recentJobs.map(j => ({ ...j, icon: '💼', module: 'Jobs' })));

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error fetching activity timeline:', error);
    res.status(500).json({ error: 'Failed to fetch activity timeline' });
  }
});

// Get dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's events
    const todayEvents = await allAsync(`
      SELECT COUNT(*) as count FROM calendar_events
      WHERE start_time >= ? AND start_time < ?
      AND status != 'cancelled'
    `, [today.toISOString(), tomorrow.toISOString()]);

    // Unread notifications
    const unreadNotifications = await getAsync(`
      SELECT COUNT(*) as count FROM notifications
      WHERE is_read = 0
    `);

    // Active applications
    const activeApplications = await allAsync(`
      SELECT COUNT(*) as count FROM applications
      WHERE status IN ('pending', 'in_progress', 'waiting_for_info', 'under_review')
    `);

    // Urgent items
    const urgentNotifications = await getAsync(`
      SELECT COUNT(*) as count FROM notifications
      WHERE is_read = 0 AND priority = 'urgent'
    `);

    res.json({
      events_today: todayEvents[0]?.count || 0,
      unread_notifications: unreadNotifications?.count || 0,
      active_applications: activeApplications[0]?.count || 0,
      urgent_items: urgentNotifications?.count || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

export default router;
