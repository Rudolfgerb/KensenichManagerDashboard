import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all pages (root level)
router.get('/', (req, res) => {
  try {
    const pages = db.prepare('SELECT * FROM pages WHERE parent_id IS NULL ORDER BY created_at DESC').all();
    const parsedPages = pages.map(page => ({
      ...page,
      blocks: page.blocks ? JSON.parse(page.blocks) : []
    }));
    res.json(parsedPages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single page
router.get('/:id', (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json({
      ...page,
      blocks: page.blocks ? JSON.parse(page.blocks) : []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get children of a page
router.get('/:id/children', (req, res) => {
  try {
    const children = db.prepare('SELECT * FROM pages WHERE parent_id = ? ORDER BY created_at ASC').all(req.params.id);
    const parsedChildren = children.map(page => ({
      ...page,
      blocks: page.blocks ? JSON.parse(page.blocks) : []
    }));
    res.json(parsedChildren);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create page
router.post('/', (req, res) => {
  try {
    const { title, parent_id, blocks } = req.body;
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO pages (id, parent_id, title, blocks)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, parent_id || null, title, JSON.stringify(blocks || []));

    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(id);
    res.status(201).json({
      ...page,
      blocks: JSON.parse(page.blocks)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update page
router.put('/:id', (req, res) => {
  try {
    const { title, blocks } = req.body;

    const stmt = db.prepare(`
      UPDATE pages
      SET title = COALESCE(?, title),
          blocks = COALESCE(?, blocks),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(title, blocks ? JSON.stringify(blocks) : null, req.params.id);

    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
    res.json({
      ...page,
      blocks: JSON.parse(page.blocks)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete page
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM pages WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
