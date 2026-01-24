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
