import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
  // Get all milestones
  router.get('/milestones', (req, res) => {
    const { status } = req.query;

    let sql = 'SELECT * FROM mutuus_milestones ORDER BY target_date ASC, created_at DESC';
    const params = [];

    if (status && status !== 'all') {
      sql = 'SELECT * FROM mutuus_milestones WHERE status = ? ORDER BY target_date ASC, created_at DESC';
      params.push(status);
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // Get single milestone
  router.get('/milestones/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM mutuus_milestones WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Milestone not found' });
      }
      res.json(row);
    });
  });

  // Create new milestone
  router.post('/milestones', (req, res) => {
    const {
      title,
      description,
      target_date,
      status = 'pending',
      progress = 0,
      dependencies
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO mutuus_milestones (
        id, title, description, target_date, status, progress, dependencies
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      title,
      description || null,
      target_date || null,
      status,
      progress,
      dependencies ? JSON.stringify(dependencies) : null
    ];

    db.run(sql, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM mutuus_milestones WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(row);
      });
    });
  });

  // Update milestone
  router.put('/milestones/:id', (req, res) => {
    const { id } = req.params;
    const {
      title,
      description,
      target_date,
      status,
      progress,
      dependencies
    } = req.body;

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (target_date !== undefined) {
      updates.push('target_date = ?');
      params.push(target_date);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      params.push(progress);
    }
    if (dependencies !== undefined) {
      updates.push('dependencies = ?');
      params.push(dependencies ? JSON.stringify(dependencies) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE mutuus_milestones SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Milestone not found' });
      }

      db.get('SELECT * FROM mutuus_milestones WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(row);
      });
    });
  });

  // Delete milestone
  router.delete('/milestones/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM mutuus_milestones WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Milestone not found' });
      }
      res.json({ message: 'Milestone deleted successfully' });
    });
  });

  // Get statistics
  router.get('/stats/overview', (req, res) => {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        ROUND(AVG(progress), 2) as avg_progress
      FROM mutuus_milestones
    `;

    db.get(sql, [], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(row);
    });
  });

export default router;
