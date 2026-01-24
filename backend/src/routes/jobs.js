import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
  // Get all job applications
  router.get('/', (req, res) => {
    const { status } = req.query;

    let sql = 'SELECT * FROM job_applications ORDER BY applied_date DESC, created_at DESC';
    const params = [];

    if (status && status !== 'all') {
      sql = 'SELECT * FROM job_applications WHERE status = ? ORDER BY applied_date DESC, created_at DESC';
      params.push(status);
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // Get single job application
  router.get('/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM job_applications WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json(row);
    });
  });

  // Create new job application
  router.post('/', (req, res) => {
    const {
      company,
      position,
      status = 'applied',
      applied_date,
      interview_date,
      notes,
      salary_range,
      job_url,
      contact_person
    } = req.body;

    if (!company || !position) {
      return res.status(400).json({ error: 'Company and position are required' });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO job_applications (
        id, company, position, status, applied_date, interview_date,
        notes, salary_range, job_url, contact_person
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      company,
      position,
      status,
      applied_date || null,
      interview_date || null,
      notes || null,
      salary_range || null,
      job_url || null,
      contact_person || null
    ];

    db.run(sql, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM job_applications WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(row);
      });
    });
  });

  // Update job application
  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
      company,
      position,
      status,
      applied_date,
      interview_date,
      notes,
      salary_range,
      job_url,
      contact_person
    } = req.body;

    const updates = [];
    const params = [];

    if (company !== undefined) {
      updates.push('company = ?');
      params.push(company);
    }
    if (position !== undefined) {
      updates.push('position = ?');
      params.push(position);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (applied_date !== undefined) {
      updates.push('applied_date = ?');
      params.push(applied_date);
    }
    if (interview_date !== undefined) {
      updates.push('interview_date = ?');
      params.push(interview_date);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (salary_range !== undefined) {
      updates.push('salary_range = ?');
      params.push(salary_range);
    }
    if (job_url !== undefined) {
      updates.push('job_url = ?');
      params.push(job_url);
    }
    if (contact_person !== undefined) {
      updates.push('contact_person = ?');
      params.push(contact_person);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE job_applications SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      db.get('SELECT * FROM job_applications WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(row);
      });
    });
  });

  // Delete job application
  router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM job_applications WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json({ message: 'Application deleted successfully' });
    });
  });

  // Get statistics
  router.get('/stats/overview', (req, res) => {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offer,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM job_applications
    `;

    db.get(sql, [], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(row);
    });
  });

export default router;
