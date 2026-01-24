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

export default router;
