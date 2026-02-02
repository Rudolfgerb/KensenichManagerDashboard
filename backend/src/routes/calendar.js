import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { promisify } from 'util';

const router = express.Router();
const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

// ═══ Calendar Events ═══

// GET all events (with date range filter)
router.get('/events', async (req, res) => {
  try {
    const { start, end, contact_id, deal_id, event_type } = req.query;

    let query = `
      SELECT e.*, c.name as contact_name,
        (SELECT COUNT(*) FROM calendar_attendees WHERE event_id = e.id) as attendee_count
      FROM calendar_events e
      LEFT JOIN crm_contacts c ON e.related_contact_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (start) {
      query += ' AND e.start_time >= ?';
      params.push(start);
    }
    if (end) {
      query += ' AND e.start_time <= ?';
      params.push(end);
    }
    if (contact_id) {
      query += ' AND e.related_contact_id = ?';
      params.push(contact_id);
    }
    if (deal_id) {
      query += ' AND e.related_deal_id = ?';
      params.push(deal_id);
    }
    if (event_type) {
      query += ' AND e.event_type = ?';
      params.push(event_type);
    }

    query += ' ORDER BY e.start_time ASC';

    const events = await allAsync(query, params);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET single event with attendees and reminders
router.get('/events/:id', async (req, res) => {
  try {
    const event = await getAsync(`
      SELECT e.*, c.name as contact_name, c.email as contact_email
      FROM calendar_events e
      LEFT JOIN crm_contacts c ON e.related_contact_id = c.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const attendees = await allAsync(`
      SELECT a.*, c.name as contact_name
      FROM calendar_attendees a
      LEFT JOIN crm_contacts c ON a.contact_id = c.id
      WHERE a.event_id = ?
    `, [req.params.id]);

    const reminders = await allAsync(`
      SELECT * FROM calendar_reminders WHERE event_id = ?
    `, [req.params.id]);

    res.json({ ...event, attendees, reminders });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST create event
router.post('/events', async (req, res) => {
  try {
    const {
      title,
      description,
      event_type = 'meeting',
      start_time,
      end_time,
      location,
      video_link,
      reminder_minutes = 15,
      related_contact_id,
      related_deal_id,
      attendees = [],
      reminders = [15]
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO calendar_events (
        id, title, description, event_type, start_time, end_time,
        location, video_link, reminder_minutes, related_contact_id, related_deal_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `, [id, title, description, event_type, start_time, end_time, location, video_link, reminder_minutes, related_contact_id, related_deal_id]);

    // Add attendees
    for (const attendee of attendees) {
      await runAsync(`
        INSERT INTO calendar_attendees (id, event_id, contact_id, email, name, is_organizer)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [uuidv4(), id, attendee.contact_id, attendee.email, attendee.name, attendee.is_organizer ? 1 : 0]);
    }

    // Add reminders
    for (const minutes of reminders) {
      await runAsync(`
        INSERT INTO calendar_reminders (id, event_id, reminder_type, minutes_before)
        VALUES (?, ?, 'notification', ?)
      `, [uuidv4(), id, minutes]);
    }

    // Update contact last_activity
    if (related_contact_id) {
      await runAsync(`
        UPDATE crm_contacts SET last_activity_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [related_contact_id]);
    }

    res.status(201).json({ id, message: 'Event created' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT update event
router.put('/events/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      event_type,
      start_time,
      end_time,
      location,
      video_link,
      reminder_minutes,
      related_contact_id,
      related_deal_id,
      status
    } = req.body;

    await runAsync(`
      UPDATE calendar_events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_type = COALESCE(?, event_type),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        location = COALESCE(?, location),
        video_link = COALESCE(?, video_link),
        reminder_minutes = COALESCE(?, reminder_minutes),
        related_contact_id = COALESCE(?, related_contact_id),
        related_deal_id = COALESCE(?, related_deal_id),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, event_type, start_time, end_time, location, video_link, reminder_minutes, related_contact_id, related_deal_id, status, req.params.id]);

    res.json({ message: 'Event updated' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE event
router.delete('/events/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM calendar_events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ═══ Attendees ═══

// POST add attendee to event
router.post('/events/:id/attendees', async (req, res) => {
  try {
    const { contact_id, email, name, is_organizer = false } = req.body;
    const id = uuidv4();

    await runAsync(`
      INSERT INTO calendar_attendees (id, event_id, contact_id, email, name, is_organizer)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, req.params.id, contact_id, email, name, is_organizer ? 1 : 0]);

    res.status(201).json({ id, message: 'Attendee added' });
  } catch (error) {
    console.error('Error adding attendee:', error);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

// PUT update attendee response (RSVP)
router.put('/events/:eventId/attendees/:attendeeId/respond', async (req, res) => {
  try {
    const { status } = req.body; // 'accepted', 'declined', 'tentative'

    await runAsync(`
      UPDATE calendar_attendees SET status = ?, response_time = CURRENT_TIMESTAMP
      WHERE id = ? AND event_id = ?
    `, [status, req.params.attendeeId, req.params.eventId]);

    res.json({ message: 'Response recorded' });
  } catch (error) {
    console.error('Error updating attendee response:', error);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// DELETE attendee from event
router.delete('/events/:eventId/attendees/:attendeeId', async (req, res) => {
  try {
    await runAsync('DELETE FROM calendar_attendees WHERE id = ? AND event_id = ?',
      [req.params.attendeeId, req.params.eventId]);
    res.json({ message: 'Attendee removed' });
  } catch (error) {
    console.error('Error removing attendee:', error);
    res.status(500).json({ error: 'Failed to remove attendee' });
  }
});

// ═══ Reminders ═══

// GET pending reminders (for notification system)
router.get('/reminders/pending', async (req, res) => {
  try {
    const reminders = await allAsync(`
      SELECT r.*, e.title as event_title, e.start_time, e.location
      FROM calendar_reminders r
      JOIN calendar_events e ON r.event_id = e.id
      WHERE r.sent = 0
        AND e.status = 'scheduled'
        AND datetime(e.start_time, '-' || r.minutes_before || ' minutes') <= datetime('now')
        AND datetime(e.start_time) > datetime('now')
      ORDER BY e.start_time ASC
    `);
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching pending reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST add reminder to event
router.post('/events/:id/reminders', async (req, res) => {
  try {
    const { reminder_type = 'notification', minutes_before } = req.body;
    const id = uuidv4();

    await runAsync(`
      INSERT INTO calendar_reminders (id, event_id, reminder_type, minutes_before)
      VALUES (?, ?, ?, ?)
    `, [id, req.params.id, reminder_type, minutes_before]);

    res.status(201).json({ id, message: 'Reminder added' });
  } catch (error) {
    console.error('Error adding reminder:', error);
    res.status(500).json({ error: 'Failed to add reminder' });
  }
});

// PUT mark reminder as sent
router.put('/reminders/:id/sent', async (req, res) => {
  try {
    await runAsync(`
      UPDATE calendar_reminders SET sent = 1, sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);
    res.json({ message: 'Reminder marked as sent' });
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// ═══ Availability ═══

// GET available time slots
router.get('/availability', async (req, res) => {
  try {
    const { date, duration_minutes = 30 } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    // Get events for the day
    const events = await allAsync(`
      SELECT start_time, end_time FROM calendar_events
      WHERE DATE(start_time) = DATE(?)
        AND status = 'scheduled'
      ORDER BY start_time
    `, [date]);

    // Generate available slots (9 AM - 6 PM)
    const slots = [];
    const dayStart = new Date(`${date}T09:00:00`);
    const dayEnd = new Date(`${date}T18:00:00`);

    let currentSlot = new Date(dayStart);
    const duration = parseInt(duration_minutes) * 60 * 1000;

    while (currentSlot.getTime() + duration <= dayEnd.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + duration);

      // Check if slot conflicts with any event
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time || eventStart.getTime() + 30 * 60 * 1000);
        return (currentSlot < eventEnd && slotEnd > eventStart);
      });

      if (!hasConflict) {
        slots.push({
          start: currentSlot.toISOString(),
          end: slotEnd.toISOString()
        });
      }

      // Move to next 30-minute slot
      currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000);
    }

    res.json(slots);
  } catch (error) {
    console.error('Error calculating availability:', error);
    res.status(500).json({ error: 'Failed to calculate availability' });
  }
});

// ═══ Google Calendar Sync ═══

// GET sync accounts
router.get('/sync-accounts', async (req, res) => {
  try {
    const accounts = await allAsync(`
      SELECT id, provider, email, last_sync, sync_direction, is_active, created_at
      FROM calendar_sync_accounts
      ORDER BY created_at DESC
    `);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching sync accounts:', error);
    res.status(500).json({ error: 'Failed to fetch sync accounts' });
  }
});

// POST connect Google Calendar (OAuth start)
router.post('/sync-accounts/google/connect', async (req, res) => {
  try {
    // In production, this would redirect to Google OAuth
    // For now, return placeholder for OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(400).json({
        error: 'Google Calendar not configured',
        message: 'Set GOOGLE_CLIENT_ID in environment variables'
      });
    }

    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/calendar/oauth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    res.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Error starting Google auth:', error);
    res.status(500).json({ error: 'Failed to start Google authentication' });
  }
});

// GET Google OAuth callback
router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // In production, exchange code for tokens
    // const tokens = await exchangeCodeForTokens(code);

    // For now, create placeholder account
    const id = uuidv4();
    await runAsync(`
      INSERT INTO calendar_sync_accounts (id, provider, email, sync_direction, is_active)
      VALUES (?, 'google', 'pending@google.com', 'both', 1)
    `, [id]);

    // Redirect back to app
    res.redirect('/integrations?tab=calendar&connected=true');
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

// DELETE disconnect sync account
router.delete('/sync-accounts/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM calendar_sync_accounts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sync account disconnected' });
  } catch (error) {
    console.error('Error disconnecting sync account:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// POST force sync
router.post('/sync-accounts/:id/sync', async (req, res) => {
  try {
    const account = await getAsync('SELECT * FROM calendar_sync_accounts WHERE id = ?', [req.params.id]);

    if (!account) {
      return res.status(404).json({ error: 'Sync account not found' });
    }

    // In production, this would trigger actual sync
    await runAsync(`
      UPDATE calendar_sync_accounts SET last_sync = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    res.json({ message: 'Sync completed', last_sync: new Date().toISOString() });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    res.status(500).json({ error: 'Failed to sync' });
  }
});

// ═══ Calendar Stats ═══

// GET calendar statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAsync(`
      SELECT
        COUNT(*) as total_events,
        SUM(CASE WHEN status = 'scheduled' AND start_time > datetime('now') THEN 1 ELSE 0 END) as upcoming,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN DATE(start_time) = DATE('now') THEN 1 ELSE 0 END) as today
      FROM calendar_events
    `);

    const upcomingEvents = await allAsync(`
      SELECT e.*, c.name as contact_name
      FROM calendar_events e
      LEFT JOIN crm_contacts c ON e.related_contact_id = c.id
      WHERE e.status = 'scheduled' AND e.start_time > datetime('now')
      ORDER BY e.start_time ASC
      LIMIT 5
    `);

    res.json({ ...stats, upcoming_events: upcomingEvents });
  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
