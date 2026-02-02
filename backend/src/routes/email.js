import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { promisify } from 'util';

const router = express.Router();
const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

// ═══ Email Accounts ═══

// GET all email accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await allAsync(`
      SELECT id, provider, email_address, display_name, last_sync, sync_enabled, is_default, created_at
      FROM email_accounts
      ORDER BY is_default DESC, created_at DESC
    `);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    res.status(500).json({ error: 'Failed to fetch email accounts' });
  }
});

// POST create email account
router.post('/accounts', async (req, res) => {
  try {
    const { provider, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, username } = req.body;
    const id = uuidv4();

    await runAsync(`
      INSERT INTO email_accounts (id, provider, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, username)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, provider, email_address, display_name, imap_host, imap_port || 993, smtp_host, smtp_port || 587, username]);

    res.status(201).json({ id, message: 'Email account created' });
  } catch (error) {
    console.error('Error creating email account:', error);
    res.status(500).json({ error: 'Failed to create email account' });
  }
});

// DELETE email account
router.delete('/accounts/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM email_accounts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Email account deleted' });
  } catch (error) {
    console.error('Error deleting email account:', error);
    res.status(500).json({ error: 'Failed to delete email account' });
  }
});

// ═══ Email Messages ═══

// GET all emails (inbox view)
router.get('/messages', async (req, res) => {
  try {
    const { folder = 'inbox', contact_id, unread, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT e.*, c.name as contact_name
      FROM crm_emails e
      LEFT JOIN crm_contacts c ON e.contact_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (folder && folder !== 'all') {
      query += ' AND e.folder = ?';
      params.push(folder);
    }
    if (contact_id) {
      query += ' AND e.contact_id = ?';
      params.push(contact_id);
    }
    if (unread === 'true') {
      query += ' AND e.is_read = 0';
    }

    query += ' ORDER BY COALESCE(e.received_at, e.sent_at, e.created_at) DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const emails = await allAsync(query, params);

    // Parse JSON fields
    emails.forEach(email => {
      try {
        email.to_addresses = JSON.parse(email.to_addresses || '[]');
        email.cc_addresses = JSON.parse(email.cc_addresses || '[]');
        email.attachments = JSON.parse(email.attachments || '[]');
      } catch (e) {}
    });

    res.json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// GET single email with tracking events
router.get('/messages/:id', async (req, res) => {
  try {
    const email = await getAsync(`
      SELECT e.*, c.name as contact_name, c.email as contact_email
      FROM crm_emails e
      LEFT JOIN crm_contacts c ON e.contact_id = c.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Get tracking events
    const trackingEvents = await allAsync(`
      SELECT * FROM email_tracking_events
      WHERE email_id = ?
      ORDER BY occurred_at DESC
    `, [req.params.id]);

    // Parse JSON fields
    try {
      email.to_addresses = JSON.parse(email.to_addresses || '[]');
      email.cc_addresses = JSON.parse(email.cc_addresses || '[]');
      email.attachments = JSON.parse(email.attachments || '[]');
    } catch (e) {}

    res.json({ ...email, tracking_events: trackingEvents });
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// POST create/send email
router.post('/messages', async (req, res) => {
  try {
    const {
      contact_id,
      to_addresses,
      cc_addresses,
      bcc_addresses,
      subject,
      body_text,
      body_html,
      template_id,
      scheduled_at,
      track_opens = true,
      track_clicks = true
    } = req.body;

    const id = uuidv4();
    const tracking_pixel_id = track_opens ? uuidv4() : null;
    const status = scheduled_at ? 'scheduled' : 'sent';
    const sent_at = scheduled_at ? null : new Date().toISOString();

    // If tracking opens, inject pixel into HTML
    let finalHtml = body_html;
    if (track_opens && body_html && tracking_pixel_id) {
      const pixelUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/email/tracking/pixel/${tracking_pixel_id}`;
      finalHtml = body_html.replace('</body>', `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" /></body>`);
    }

    await runAsync(`
      INSERT INTO crm_emails (
        id, contact_id, direction, from_address, to_addresses, cc_addresses, bcc_addresses,
        subject, body_text, body_html, template_id, status, scheduled_at, sent_at,
        tracking_pixel_id, folder
      ) VALUES (?, ?, 'outgoing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
    `, [
      id, contact_id, 'noreply@kensenichmanager.local',
      JSON.stringify(to_addresses || []),
      JSON.stringify(cc_addresses || []),
      JSON.stringify(bcc_addresses || []),
      subject, body_text, finalHtml, template_id, status, scheduled_at, sent_at,
      tracking_pixel_id
    ]);

    // Log tracking event
    if (status === 'sent') {
      await runAsync(`
        INSERT INTO email_tracking_events (id, email_id, event_type)
        VALUES (?, ?, 'sent')
      `, [uuidv4(), id]);
    }

    // Update contact last_activity_date
    if (contact_id) {
      await runAsync(`
        UPDATE crm_contacts SET last_activity_date = CURRENT_TIMESTAMP, last_contact = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [contact_id]);
    }

    res.status(201).json({
      id,
      tracking_pixel_id,
      tracking_pixel_url: tracking_pixel_id
        ? `${process.env.API_URL || 'http://localhost:3001'}/api/email/tracking/pixel/${tracking_pixel_id}`
        : null,
      message: status === 'sent' ? 'Email sent' : 'Email scheduled'
    });
  } catch (error) {
    console.error('Error creating email:', error);
    res.status(500).json({ error: 'Failed to create email' });
  }
});

// POST reply to email
router.post('/messages/:id/reply', async (req, res) => {
  try {
    const originalEmail = await getAsync('SELECT * FROM crm_emails WHERE id = ?', [req.params.id]);
    if (!originalEmail) {
      return res.status(404).json({ error: 'Original email not found' });
    }

    const { body_text, body_html } = req.body;
    const id = uuidv4();
    const tracking_pixel_id = uuidv4();

    await runAsync(`
      INSERT INTO crm_emails (
        id, contact_id, thread_id, in_reply_to, direction, from_address, to_addresses,
        subject, body_text, body_html, status, sent_at, tracking_pixel_id, folder
      ) VALUES (?, ?, ?, ?, 'outgoing', ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP, ?, 'sent')
    `, [
      id, originalEmail.contact_id,
      originalEmail.thread_id || originalEmail.id,
      originalEmail.message_id,
      'noreply@kensenichmanager.local',
      originalEmail.from_address,
      `Re: ${originalEmail.subject}`,
      body_text, body_html, tracking_pixel_id
    ]);

    res.status(201).json({ id, message: 'Reply sent' });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// PUT mark as read/unread
router.put('/messages/:id/read', async (req, res) => {
  try {
    const { is_read = true } = req.body;
    await runAsync('UPDATE crm_emails SET is_read = ? WHERE id = ?', [is_read ? 1 : 0, req.params.id]);
    res.json({ message: 'Email updated' });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// PUT star/unstar email
router.put('/messages/:id/star', async (req, res) => {
  try {
    const { is_starred = true } = req.body;
    await runAsync('UPDATE crm_emails SET is_starred = ? WHERE id = ?', [is_starred ? 1 : 0, req.params.id]);
    res.json({ message: 'Email updated' });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// PUT archive/move email
router.put('/messages/:id/folder', async (req, res) => {
  try {
    const { folder } = req.body;
    await runAsync('UPDATE crm_emails SET folder = ?, is_archived = ? WHERE id = ?',
      [folder, folder === 'archive' ? 1 : 0, req.params.id]);
    res.json({ message: 'Email moved' });
  } catch (error) {
    console.error('Error moving email:', error);
    res.status(500).json({ error: 'Failed to move email' });
  }
});

// DELETE email (move to trash or permanent delete)
router.delete('/messages/:id', async (req, res) => {
  try {
    const { permanent = false } = req.query;

    if (permanent === 'true') {
      await runAsync('DELETE FROM crm_emails WHERE id = ?', [req.params.id]);
    } else {
      await runAsync('UPDATE crm_emails SET folder = "trash" WHERE id = ?', [req.params.id]);
    }

    res.json({ message: 'Email deleted' });
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// ═══ Email Tracking ═══

// GET tracking pixel (1x1 transparent GIF)
router.get('/tracking/pixel/:trackingPixelId', async (req, res) => {
  try {
    const { trackingPixelId } = req.params;

    // Find email by tracking pixel
    const email = await getAsync(
      'SELECT id FROM crm_emails WHERE tracking_pixel_id = ?',
      [trackingPixelId]
    );

    if (email) {
      // Log open event
      await runAsync(`
        INSERT INTO email_tracking_events (id, email_id, event_type, ip_address, user_agent)
        VALUES (?, ?, 'opened', ?, ?)
      `, [uuidv4(), email.id, req.ip, req.headers['user-agent']]);

      // Update open count
      await runAsync(
        'UPDATE crm_emails SET open_count = open_count + 1 WHERE id = ?',
        [email.id]
      );
    }

    // Return 1x1 transparent GIF
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(gif);
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Still return the pixel to not break email rendering
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.send(gif);
  }
});

// GET link click tracking (redirect)
router.get('/tracking/click/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;

    const linkData = await getAsync(
      'SELECT email_id, original_url FROM email_tracked_links WHERE id = ?',
      [linkId]
    );

    if (linkData) {
      // Log click event
      await runAsync(`
        INSERT INTO email_tracking_events (id, email_id, event_type, event_data, ip_address, user_agent)
        VALUES (?, ?, 'clicked', ?, ?, ?)
      `, [uuidv4(), linkData.email_id, JSON.stringify({ url: linkData.original_url }), req.ip, req.headers['user-agent']]);

      // Update click counts
      await runAsync('UPDATE email_tracked_links SET click_count = click_count + 1 WHERE id = ?', [linkId]);
      await runAsync('UPDATE crm_emails SET click_count = click_count + 1 WHERE id = ?', [linkData.email_id]);

      res.redirect(linkData.original_url);
    } else {
      res.status(404).send('Link not found');
    }
  } catch (error) {
    console.error('Error tracking link click:', error);
    res.status(500).send('Error');
  }
});

// GET tracking events for an email
router.get('/tracking/:emailId', async (req, res) => {
  try {
    const events = await allAsync(`
      SELECT * FROM email_tracking_events
      WHERE email_id = ?
      ORDER BY occurred_at DESC
    `, [req.params.emailId]);

    const email = await getAsync(`
      SELECT open_count, click_count, replied FROM crm_emails WHERE id = ?
    `, [req.params.emailId]);

    res.json({
      events,
      summary: {
        open_count: email?.open_count || 0,
        click_count: email?.click_count || 0,
        replied: email?.replied === 1
      }
    });
  } catch (error) {
    console.error('Error fetching tracking events:', error);
    res.status(500).json({ error: 'Failed to fetch tracking events' });
  }
});

// POST create tracked link
router.post('/tracking/link', async (req, res) => {
  try {
    const { email_id, original_url } = req.body;
    const id = uuidv4();

    await runAsync(`
      INSERT INTO email_tracked_links (id, email_id, original_url)
      VALUES (?, ?, ?)
    `, [id, email_id, original_url]);

    const trackingUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/email/tracking/click/${id}`;
    res.json({ id, tracking_url: trackingUrl });
  } catch (error) {
    console.error('Error creating tracked link:', error);
    res.status(500).json({ error: 'Failed to create tracked link' });
  }
});

// ═══ Email Templates ═══

// GET all templates
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM message_templates WHERE type = "email"';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY usage_count DESC, created_at DESC';
    const templates = await allAsync(query, params);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST preview template with variables
router.post('/templates/:id/preview', async (req, res) => {
  try {
    const template = await getAsync('SELECT * FROM message_templates WHERE id = ?', [req.params.id]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { variables = {} } = req.body;
    let content = template.content;
    let subject = template.subject;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
      if (subject) subject = subject.replace(regex, value);
    });

    res.json({ subject, content });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// ═══ Email Stats ═══

// GET email statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAsync(`
      SELECT
        COUNT(*) as total_emails,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as received,
        SUM(CASE WHEN is_read = 0 AND folder = 'inbox' THEN 1 ELSE 0 END) as unread,
        SUM(open_count) as total_opens,
        SUM(click_count) as total_clicks,
        SUM(CASE WHEN replied = 1 THEN 1 ELSE 0 END) as total_replies
      FROM crm_emails
    `);

    const recentActivity = await allAsync(`
      SELECT
        DATE(COALESCE(sent_at, received_at, created_at)) as date,
        COUNT(*) as count,
        direction
      FROM crm_emails
      WHERE COALESCE(sent_at, received_at, created_at) >= date('now', '-30 days')
      GROUP BY date, direction
      ORDER BY date DESC
    `);

    res.json({ ...stats, recent_activity: recentActivity });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
});

export default router;
