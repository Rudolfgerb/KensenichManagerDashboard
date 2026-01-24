import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all SOPs
router.get('/', (req, res) => {
  try {
    const sops = db.prepare('SELECT * FROM sops ORDER BY updated_at DESC').all();
    const parsedSops = sops.map(sop => ({
      ...sop,
      steps: sop.steps ? JSON.parse(sop.steps) : [],
      created_from_sessions: sop.created_from_sessions ? JSON.parse(sop.created_from_sessions) : []
    }));
    res.json(parsedSops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single SOP
router.get('/:id', (req, res) => {
  try {
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }
    res.json({
      ...sop,
      steps: sop.steps ? JSON.parse(sop.steps) : [],
      created_from_sessions: sop.created_from_sessions ? JSON.parse(sop.created_from_sessions) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create SOP
router.post('/', (req, res) => {
  try {
    const { title, process_type, steps, created_from_sessions, ai_generated } = req.body;
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO sops (id, title, process_type, steps, created_from_sessions, ai_generated)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      title,
      process_type || null,
      JSON.stringify(steps || []),
      JSON.stringify(created_from_sessions || []),
      ai_generated ? 1 : 0
    );

    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id);
    res.status(201).json({
      ...sop,
      steps: JSON.parse(sop.steps),
      created_from_sessions: JSON.parse(sop.created_from_sessions)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update SOP
router.put('/:id', (req, res) => {
  try {
    const { title, process_type, steps } = req.body;

    const stmt = db.prepare(`
      UPDATE sops
      SET title = COALESCE(?, title),
          process_type = COALESCE(?, process_type),
          steps = COALESCE(?, steps),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      title,
      process_type,
      steps ? JSON.stringify(steps) : null,
      req.params.id
    );

    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
    res.json({
      ...sop,
      steps: JSON.parse(sop.steps),
      created_from_sessions: JSON.parse(sop.created_from_sessions)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete SOP
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM sops WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    res.json({ message: 'SOP deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
