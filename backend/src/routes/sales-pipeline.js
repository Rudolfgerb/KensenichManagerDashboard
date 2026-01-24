import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runAsync, getAsync, allAsync } from '../db.js';

const router = express.Router();

// ========================================
// PIPELINE STAGES
// ========================================

// Get all pipeline stages
router.get('/stages', async (req, res) => {
  try {
    const stages = await allAsync(
      'SELECT * FROM sales_pipeline_stages ORDER BY position ASC'
    );
    res.json(stages);
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
});

// Create custom stage
router.post('/stages', async (req, res) => {
  try {
    const { name, position, color } = req.body;
    const id = uuidv4();

    await runAsync(
      `INSERT INTO sales_pipeline_stages (id, name, position, color)
       VALUES (?, ?, ?, ?)`,
      [id, name, position || 999, color || '#00ff88']
    );

    const stage = await getAsync('SELECT * FROM sales_pipeline_stages WHERE id = ?', [id]);
    res.status(201).json(stage);
  } catch (error) {
    console.error('Error creating stage:', error);
    res.status(500).json({ error: 'Failed to create stage' });
  }
});

// ========================================
// PIPELINE CONTACTS
// ========================================

// Get all pipeline contacts (with contact details)
router.get('/contacts', async (req, res) => {
  try {
    const { stage_id } = req.query;

    let query = `
      SELECT
        pc.*,
        c.name, c.email, c.phone, c.company, c.type,
        s.name as stage_name, s.color as stage_color
      FROM sales_pipeline_contacts pc
      JOIN crm_contacts c ON pc.contact_id = c.id
      JOIN sales_pipeline_stages s ON pc.stage_id = s.id
    `;

    if (stage_id) {
      query += ' WHERE pc.stage_id = ?';
      const contacts = await allAsync(query + ' ORDER BY pc.updated_at DESC', [stage_id]);
      return res.json(contacts);
    }

    const contacts = await allAsync(query + ' ORDER BY s.position ASC, pc.updated_at DESC');
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching pipeline contacts:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline contacts' });
  }
});

// Get single pipeline contact with full details
router.get('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await getAsync(`
      SELECT
        pc.*,
        c.name, c.email, c.phone, c.company, c.type, c.notes as contact_notes,
        s.name as stage_name, s.color as stage_color
      FROM sales_pipeline_contacts pc
      JOIN crm_contacts c ON pc.contact_id = c.id
      JOIN sales_pipeline_stages s ON pc.stage_id = s.id
      WHERE pc.id = ?
    `, [id]);

    if (!contact) {
      return res.status(404).json({ error: 'Pipeline contact not found' });
    }

    // Get activities
    const activities = await allAsync(
      'SELECT * FROM pipeline_activities WHERE pipeline_contact_id = ? ORDER BY created_at DESC',
      [id]
    );

    // Get documents
    const documents = await allAsync(
      'SELECT * FROM pipeline_documents WHERE pipeline_contact_id = ? ORDER BY uploaded_at DESC',
      [id]
    );

    res.json({
      ...contact,
      activities,
      documents
    });
  } catch (error) {
    console.error('Error fetching pipeline contact:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline contact' });
  }
});

// Add contact to pipeline
router.post('/contacts', async (req, res) => {
  try {
    const {
      contact_id,
      stage_id,
      potential_value,
      probability,
      notes,
      next_action,
      next_action_date
    } = req.body;

    if (!contact_id || !stage_id) {
      return res.status(400).json({ error: 'contact_id and stage_id are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await runAsync(`
      INSERT INTO sales_pipeline_contacts (
        id, contact_id, stage_id, potential_value, probability,
        notes, last_interaction, next_action, next_action_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, contact_id, stage_id, potential_value || 0, probability || 50,
      notes, now, next_action, next_action_date
    ]);

    // Log activity
    await runAsync(`
      INSERT INTO pipeline_activities (id, pipeline_contact_id, activity_type, description)
      VALUES (?, ?, ?, ?)
    `, [uuidv4(), id, 'added_to_pipeline', 'Contact added to sales pipeline']);

    const contact = await getAsync(`
      SELECT
        pc.*,
        c.name, c.email, c.phone, c.company,
        s.name as stage_name, s.color as stage_color
      FROM sales_pipeline_contacts pc
      JOIN crm_contacts c ON pc.contact_id = c.id
      JOIN sales_pipeline_stages s ON pc.stage_id = s.id
      WHERE pc.id = ?
    `, [id]);

    res.status(201).json(contact);
  } catch (error) {
    console.error('Error adding contact to pipeline:', error);
    res.status(500).json({ error: 'Failed to add contact to pipeline' });
  }
});

// Update pipeline contact
router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      stage_id,
      potential_value,
      probability,
      notes,
      next_action,
      next_action_date,
      won_date,
      lost_date,
      lost_reason
    } = req.body;

    const updates = [];
    const values = [];

    if (stage_id !== undefined) { updates.push('stage_id = ?'); values.push(stage_id); }
    if (potential_value !== undefined) { updates.push('potential_value = ?'); values.push(potential_value); }
    if (probability !== undefined) { updates.push('probability = ?'); values.push(probability); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (next_action !== undefined) { updates.push('next_action = ?'); values.push(next_action); }
    if (next_action_date !== undefined) { updates.push('next_action_date = ?'); values.push(next_action_date); }
    if (won_date !== undefined) { updates.push('won_date = ?'); values.push(won_date); }
    if (lost_date !== undefined) { updates.push('lost_date = ?'); values.push(lost_date); }
    if (lost_reason !== undefined) { updates.push('lost_reason = ?'); values.push(lost_reason); }

    updates.push('last_interaction = ?');
    values.push(new Date().toISOString());
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);

    await runAsync(
      `UPDATE sales_pipeline_contacts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const contact = await getAsync(`
      SELECT
        pc.*,
        c.name, c.email, c.phone, c.company,
        s.name as stage_name, s.color as stage_color
      FROM sales_pipeline_contacts pc
      JOIN crm_contacts c ON pc.contact_id = c.id
      JOIN sales_pipeline_stages s ON pc.stage_id = s.id
      WHERE pc.id = ?
    `, [id]);

    res.json(contact);
  } catch (error) {
    console.error('Error updating pipeline contact:', error);
    res.status(500).json({ error: 'Failed to update pipeline contact' });
  }
});

// Move contact to different stage
router.post('/contacts/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage_id } = req.body;

    if (!stage_id) {
      return res.status(400).json({ error: 'stage_id is required' });
    }

    // Get old stage info
    const oldContact = await getAsync(`
      SELECT pc.*, s.name as old_stage_name
      FROM sales_pipeline_contacts pc
      JOIN sales_pipeline_stages s ON pc.stage_id = s.id
      WHERE pc.id = ?
    `, [id]);

    // Get new stage info
    const newStage = await getAsync(
      'SELECT name FROM sales_pipeline_stages WHERE id = ?',
      [stage_id]
    );

    // Update stage
    await runAsync(
      `UPDATE sales_pipeline_contacts
       SET stage_id = ?, last_interaction = ?, updated_at = ?
       WHERE id = ?`,
      [stage_id, new Date().toISOString(), new Date().toISOString(), id]
    );

    // Log activity
    await runAsync(`
      INSERT INTO pipeline_activities (id, pipeline_contact_id, activity_type, description, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [
      uuidv4(),
      id,
      'stage_changed',
      `Moved from "${oldContact.old_stage_name}" to "${newStage.name}"`,
      JSON.stringify({ from: oldContact.stage_id, to: stage_id })
    ]);

    const contact = await getAsync(`
      SELECT
        pc.*,
        c.name, c.email, c.phone, c.company,
        s.name as stage_name, s.color as stage_color
      FROM sales_pipeline_contacts pc
      JOIN crm_contacts c ON pc.contact_id = c.id
      JOIN sales_pipeline_stages s ON pc.stage_id = s.id
      WHERE pc.id = ?
    `, [id]);

    res.json(contact);
  } catch (error) {
    console.error('Error moving contact:', error);
    res.status(500).json({ error: 'Failed to move contact' });
  }
});

// Delete pipeline contact
router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM sales_pipeline_contacts WHERE id = ?', [id]);
    res.json({ message: 'Pipeline contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting pipeline contact:', error);
    res.status(500).json({ error: 'Failed to delete pipeline contact' });
  }
});

// ========================================
// MESSAGE TEMPLATES
// ========================================

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const { category, type } = req.query;

    let query = 'SELECT * FROM message_templates';
    const conditions = [];
    const values = [];

    if (category) {
      conditions.push('category = ?');
      values.push(category);
    }
    if (type) {
      conditions.push('type = ?');
      values.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const templates = await allAsync(query, values);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await getAsync('SELECT * FROM message_templates WHERE id = ?', [id]);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    const { name, type, subject, content, variables, category } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'name and content are required' });
    }

    const id = uuidv4();

    await runAsync(`
      INSERT INTO message_templates (id, name, type, subject, content, variables, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name,
      type || 'email',
      subject,
      content,
      variables ? JSON.stringify(variables) : null,
      category || 'partner_outreach'
    ]);

    const template = await getAsync('SELECT * FROM message_templates WHERE id = ?', [id]);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, subject, content, variables, category } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (subject !== undefined) { updates.push('subject = ?'); values.push(subject); }
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (variables !== undefined) { updates.push('variables = ?'); values.push(JSON.stringify(variables)); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);

    await runAsync(
      `UPDATE message_templates SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const template = await getAsync('SELECT * FROM message_templates WHERE id = ?', [id]);
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM message_templates WHERE id = ?', [id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Use template (increment usage counter)
router.post('/templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    const { success } = req.body;

    const updates = ['usage_count = usage_count + 1'];
    if (success) {
      updates.push('success_count = success_count + 1');
    }

    await runAsync(
      `UPDATE message_templates SET ${updates.join(', ')} WHERE id = ?`,
      [id]
    );

    const template = await getAsync('SELECT * FROM message_templates WHERE id = ?', [id]);
    res.json(template);
  } catch (error) {
    console.error('Error using template:', error);
    res.status(500).json({ error: 'Failed to use template' });
  }
});

// Render template with variables
router.post('/templates/:id/render', async (req, res) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const template = await getAsync('SELECT * FROM message_templates WHERE id = ?', [id]);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let renderedSubject = template.subject || '';
    let renderedContent = template.content || '';

    // Replace variables in format {{variable_name}}
    if (variables) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        renderedSubject = renderedSubject.replace(regex, variables[key]);
        renderedContent = renderedContent.replace(regex, variables[key]);
      });
    }

    res.json({
      subject: renderedSubject,
      content: renderedContent
    });
  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({ error: 'Failed to render template' });
  }
});

// ========================================
// PIPELINE ACTIVITIES
// ========================================

// Add activity to pipeline contact
router.post('/contacts/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, description, metadata } = req.body;

    if (!activity_type || !description) {
      return res.status(400).json({ error: 'activity_type and description are required' });
    }

    const activityId = uuidv4();

    await runAsync(`
      INSERT INTO pipeline_activities (id, pipeline_contact_id, activity_type, description, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [activityId, id, activity_type, description, metadata ? JSON.stringify(metadata) : null]);

    // Update last_interaction
    await runAsync(
      'UPDATE sales_pipeline_contacts SET last_interaction = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );

    const activity = await getAsync('SELECT * FROM pipeline_activities WHERE id = ?', [activityId]);
    res.status(201).json(activity);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// ========================================
// ANALYTICS & STATS
// ========================================

// Get pipeline statistics
router.get('/stats', async (req, res) => {
  try {
    // Total contacts in pipeline
    const totalContacts = await getAsync(
      'SELECT COUNT(*) as count FROM sales_pipeline_contacts'
    );

    // Contacts by stage
    const byStage = await allAsync(`
      SELECT
        s.id, s.name, s.color, s.position,
        COUNT(pc.id) as count,
        SUM(pc.potential_value) as total_value
      FROM sales_pipeline_stages s
      LEFT JOIN sales_pipeline_contacts pc ON s.id = pc.stage_id
      GROUP BY s.id
      ORDER BY s.position ASC
    `);

    // Total pipeline value
    const totalValue = await getAsync(
      'SELECT SUM(potential_value) as total FROM sales_pipeline_contacts'
    );

    // Weighted pipeline value (value * probability / 100)
    const weightedValue = await getAsync(
      'SELECT SUM(potential_value * probability / 100.0) as weighted FROM sales_pipeline_contacts'
    );

    // Won deals (last 30 days)
    const wonDeals = await getAsync(`
      SELECT
        COUNT(*) as count,
        SUM(potential_value) as value
      FROM sales_pipeline_contacts
      WHERE stage_id = 'stage-won'
      AND won_date >= datetime('now', '-30 days')
    `);

    // Conversion rate
    const conversionRate = await getAsync(`
      SELECT
        (SELECT COUNT(*) FROM sales_pipeline_contacts WHERE stage_id = 'stage-won') * 100.0 /
        NULLIF((SELECT COUNT(*) FROM sales_pipeline_contacts), 0) as rate
    `);

    // Average time in pipeline (for won deals)
    const avgTimeInPipeline = await getAsync(`
      SELECT AVG(julianday(won_date) - julianday(created_at)) as avg_days
      FROM sales_pipeline_contacts
      WHERE won_date IS NOT NULL
    `);

    // Upcoming actions (next 7 days)
    const upcomingActions = await allAsync(`
      SELECT
        pc.id, pc.next_action, pc.next_action_date,
        c.name, c.company,
        s.name as stage_name
      FROM sales_pipeline_contacts pc
      JOIN crm_contacts c ON pc.contact_id = c.id
      JOIN sales_pipeline_stages s ON pc.stage_id = s.id
      WHERE pc.next_action_date IS NOT NULL
      AND pc.next_action_date <= datetime('now', '+7 days')
      ORDER BY pc.next_action_date ASC
    `);

    res.json({
      total_contacts: totalContacts.count,
      by_stage: byStage,
      total_value: totalValue.total || 0,
      weighted_value: weightedValue.weighted || 0,
      won_deals_30d: {
        count: wonDeals.count || 0,
        value: wonDeals.value || 0
      },
      conversion_rate: conversionRate.rate || 0,
      avg_time_in_pipeline: avgTimeInPipeline.avg_days || 0,
      upcoming_actions: upcomingActions
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
