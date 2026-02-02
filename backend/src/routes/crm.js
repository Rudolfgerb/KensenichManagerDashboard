import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all contacts
router.get('/contacts', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM crm_contacts';
    let params = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY last_contact DESC NULLS LAST, created_at DESC';

    const contacts = await allAsync(query, params);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single contact
router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await getAsync('SELECT * FROM crm_contacts WHERE id = ?', req.params.id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get communication history
    const communications = await allAsync(
      'SELECT * FROM communication_log WHERE contact_id = ? ORDER BY created_at DESC',
      req.params.id
    );

    res.json({ ...contact, communications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create contact
router.post('/contacts', async (req, res) => {
  try {
    const { name, type, email, phone, company, notes, tags } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO crm_contacts (id, name, type, email, phone, company, notes, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, type || 'client', email, phone, company, notes, tags]
    );

    const contact = await getAsync('SELECT * FROM crm_contacts WHERE id = ?', id);
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update contact
router.put('/contacts/:id', async (req, res) => {
  try {
    const { name, type, email, phone, company, notes, last_contact, next_followup, tags } = req.body;

    await runAsync(
      `UPDATE crm_contacts
       SET name = COALESCE(?, name),
           type = COALESCE(?, type),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           company = COALESCE(?, company),
           notes = COALESCE(?, notes),
           last_contact = COALESCE(?, last_contact),
           next_followup = COALESCE(?, next_followup),
           tags = COALESCE(?, tags),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, type, email, phone, company, notes, last_contact, next_followup, tags, req.params.id]
    );

    const contact = await getAsync('SELECT * FROM crm_contacts WHERE id = ?', req.params.id);
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contact
router.delete('/contacts/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM crm_contacts WHERE id = ?', req.params.id);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log communication
router.post('/contacts/:id/communication', async (req, res) => {
  try {
    const { type, subject, content, direction, status } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO communication_log (id, contact_id, type, subject, content, direction, status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, type, subject, content, direction || 'outgoing', status || 'sent', new Date().toISOString()]
    );

    // Update last contact
    await runAsync(
      'UPDATE crm_contacts SET last_contact = CURRENT_TIMESTAMP WHERE id = ?',
      req.params.id
    );

    const communication = await getAsync('SELECT * FROM communication_log WHERE id = ?', id);
    res.status(201).json(communication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get follow-ups
router.get('/followups', async (req, res) => {
  try {
    const contacts = await allAsync(
      `SELECT * FROM crm_contacts
       WHERE next_followup IS NOT NULL
       AND next_followup <= datetime('now', '+7 days')
       ORDER BY next_followup ASC`
    );
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══ CRM Tasks ═══

// Get all CRM tasks
router.get('/tasks', async (req, res) => {
  try {
    const { status, contact_id, deal_id } = req.query;

    let query = `
      SELECT t.*, c.name as contact_name, d.title as deal_title
      FROM crm_tasks t
      LEFT JOIN crm_contacts c ON t.contact_id = c.id
      LEFT JOIN crm_deals d ON t.deal_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (contact_id) {
      query += ' AND t.contact_id = ?';
      params.push(contact_id);
    }
    if (deal_id) {
      query += ' AND t.deal_id = ?';
      params.push(deal_id);
    }

    query += ' ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';

    const tasks = await allAsync(query, params);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single CRM task
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await getAsync(`
      SELECT t.*, c.name as contact_name, d.title as deal_title
      FROM crm_tasks t
      LEFT JOIN crm_contacts c ON t.contact_id = c.id
      LEFT JOIN crm_deals d ON t.deal_id = d.id
      WHERE t.id = ?
    `, req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create CRM task
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, task_type, priority, due_date, contact_id, deal_id, assigned_to, reminder_at } = req.body;
    const id = uuidv4();

    await runAsync(`
      INSERT INTO crm_tasks (id, title, description, task_type, priority, due_date, contact_id, deal_id, assigned_to, reminder_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, title, description, task_type || 'todo', priority || 'normal', due_date, contact_id, deal_id, assigned_to, reminder_at]);

    const task = await getAsync('SELECT * FROM crm_tasks WHERE id = ?', id);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update CRM task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { title, description, task_type, priority, status, due_date, contact_id, deal_id } = req.body;

    await runAsync(`
      UPDATE crm_tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        task_type = COALESCE(?, task_type),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        due_date = COALESCE(?, due_date),
        contact_id = COALESCE(?, contact_id),
        deal_id = COALESCE(?, deal_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, task_type, priority, status, due_date, contact_id, deal_id, req.params.id]);

    const task = await getAsync('SELECT * FROM crm_tasks WHERE id = ?', req.params.id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete CRM task
router.post('/tasks/:id/complete', async (req, res) => {
  try {
    await runAsync(`
      UPDATE crm_tasks SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, req.params.id);

    const task = await getAsync('SELECT * FROM crm_tasks WHERE id = ?', req.params.id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete CRM task
router.delete('/tasks/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM crm_tasks WHERE id = ?', req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
