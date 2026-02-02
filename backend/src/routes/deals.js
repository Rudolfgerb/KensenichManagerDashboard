import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { promisify } from 'util';

const router = express.Router();
const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

// ═══ Deals ═══

// GET all deals (with filters)
router.get('/', async (req, res) => {
  try {
    const { stage_id, status, contact_id, priority, search } = req.query;

    let query = `
      SELECT d.*,
        c.name as contact_name, c.company as contact_company, c.email as contact_email,
        s.name as stage_name, s.color as stage_color, s.position as stage_position,
        (SELECT SUM(total_price) FROM deal_line_items WHERE deal_id = d.id) as calculated_value
      FROM crm_deals d
      JOIN crm_contacts c ON d.contact_id = c.id
      JOIN sales_pipeline_stages s ON d.stage_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (stage_id) {
      query += ' AND d.stage_id = ?';
      params.push(stage_id);
    }
    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }
    if (contact_id) {
      query += ' AND d.contact_id = ?';
      params.push(contact_id);
    }
    if (priority) {
      query += ' AND d.priority = ?';
      params.push(priority);
    }
    if (search) {
      query += ' AND (d.title LIKE ? OR c.name LIKE ? OR c.company LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY s.position ASC, d.deal_value DESC';

    const deals = await allAsync(query, params);
    res.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET deals by stage (for Kanban board)
router.get('/by-stage', async (req, res) => {
  try {
    const stages = await allAsync(`
      SELECT * FROM sales_pipeline_stages
      WHERE id NOT IN ('stage-won', 'stage-lost')
      ORDER BY position ASC
    `);

    const result = [];

    for (const stage of stages) {
      const deals = await allAsync(`
        SELECT d.*, c.name as contact_name, c.company as contact_company
        FROM crm_deals d
        JOIN crm_contacts c ON d.contact_id = c.id
        WHERE d.stage_id = ? AND d.status = 'open'
        ORDER BY d.deal_value DESC
      `, [stage.id]);

      result.push({
        ...stage,
        deals,
        total_value: deals.reduce((sum, d) => sum + (d.deal_value || 0), 0),
        count: deals.length
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching deals by stage:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET single deal with activities and line items
router.get('/:id', async (req, res) => {
  try {
    const deal = await getAsync(`
      SELECT d.*,
        c.name as contact_name, c.company as contact_company, c.email as contact_email, c.phone as contact_phone,
        s.name as stage_name, s.color as stage_color
      FROM crm_deals d
      JOIN crm_contacts c ON d.contact_id = c.id
      JOIN sales_pipeline_stages s ON d.stage_id = s.id
      WHERE d.id = ?
    `, [req.params.id]);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const lineItems = await allAsync(`
      SELECT * FROM deal_line_items WHERE deal_id = ? ORDER BY created_at ASC
    `, [req.params.id]);

    const activities = await allAsync(`
      SELECT * FROM deal_activities WHERE deal_id = ? ORDER BY created_at DESC LIMIT 50
    `, [req.params.id]);

    // Parse tags
    try {
      deal.tags = JSON.parse(deal.tags || '[]');
      deal.custom_fields = JSON.parse(deal.custom_fields || '{}');
    } catch (e) {}

    res.json({ ...deal, line_items: lineItems, activities });
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// POST create deal
router.post('/', async (req, res) => {
  try {
    const {
      contact_id,
      title,
      description,
      stage_id = 'stage-lead',
      deal_value = 0,
      currency = 'EUR',
      probability = 50,
      expected_close_date,
      deal_source,
      deal_type,
      priority = 'medium',
      tags = [],
      line_items = []
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO crm_deals (
        id, contact_id, title, description, stage_id, deal_value, currency,
        probability, expected_close_date, deal_source, deal_type, priority, tags, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `, [id, contact_id, title, description, stage_id, deal_value, currency,
        probability, expected_close_date, deal_source, deal_type, priority, JSON.stringify(tags)]);

    // Add line items
    let totalValue = 0;
    for (const item of line_items) {
      const itemTotal = (item.quantity || 1) * item.unit_price * (1 - (item.discount_percent || 0) / 100);
      totalValue += itemTotal;

      await runAsync(`
        INSERT INTO deal_line_items (id, deal_id, product_name, description, quantity, unit_price, discount_percent, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), id, item.product_name, item.description, item.quantity || 1, item.unit_price, item.discount_percent || 0, itemTotal]);
    }

    // Update deal value from line items if provided
    if (line_items.length > 0) {
      await runAsync('UPDATE crm_deals SET deal_value = ? WHERE id = ?', [totalValue, id]);
    }

    // Log activity
    await runAsync(`
      INSERT INTO deal_activities (id, deal_id, activity_type, title, description)
      VALUES (?, ?, 'deal_created', 'Deal erstellt', ?)
    `, [uuidv4(), id, `Deal "${title}" wurde erstellt mit Wert ${deal_value} ${currency}`]);

    // Update contact last_activity
    await runAsync(`
      UPDATE crm_contacts SET last_activity_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [contact_id]);

    res.status(201).json({ id, message: 'Deal created' });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// PUT update deal
router.put('/:id', async (req, res) => {
  try {
    const {
      title, description, stage_id, deal_value, currency, probability,
      expected_close_date, deal_source, deal_type, priority, tags
    } = req.body;

    // Check if stage changed for activity log
    const oldDeal = await getAsync('SELECT stage_id FROM crm_deals WHERE id = ?', [req.params.id]);

    await runAsync(`
      UPDATE crm_deals SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        stage_id = COALESCE(?, stage_id),
        deal_value = COALESCE(?, deal_value),
        currency = COALESCE(?, currency),
        probability = COALESCE(?, probability),
        expected_close_date = COALESCE(?, expected_close_date),
        deal_source = COALESCE(?, deal_source),
        deal_type = COALESCE(?, deal_type),
        priority = COALESCE(?, priority),
        tags = COALESCE(?, tags),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, stage_id, deal_value, currency, probability,
        expected_close_date, deal_source, deal_type, priority,
        tags ? JSON.stringify(tags) : null, req.params.id]);

    // Log stage change
    if (stage_id && oldDeal && stage_id !== oldDeal.stage_id) {
      const newStage = await getAsync('SELECT name FROM sales_pipeline_stages WHERE id = ?', [stage_id]);
      await runAsync(`
        INSERT INTO deal_activities (id, deal_id, activity_type, title, metadata)
        VALUES (?, ?, 'stage_change', ?, ?)
      `, [uuidv4(), req.params.id, `Stage geändert zu ${newStage?.name}`,
          JSON.stringify({ from: oldDeal.stage_id, to: stage_id })]);
    }

    res.json({ message: 'Deal updated' });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// POST move deal to stage
router.post('/:id/move', async (req, res) => {
  try {
    const { stage_id } = req.body;

    const deal = await getAsync('SELECT stage_id, title FROM crm_deals WHERE id = ?', [req.params.id]);
    const newStage = await getAsync('SELECT name FROM sales_pipeline_stages WHERE id = ?', [stage_id]);

    await runAsync(`
      UPDATE crm_deals SET stage_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [stage_id, req.params.id]);

    // Log activity
    await runAsync(`
      INSERT INTO deal_activities (id, deal_id, activity_type, title, metadata)
      VALUES (?, ?, 'stage_change', ?, ?)
    `, [uuidv4(), req.params.id, `Verschoben zu ${newStage?.name}`,
        JSON.stringify({ from: deal.stage_id, to: stage_id })]);

    res.json({ message: 'Deal moved' });
  } catch (error) {
    console.error('Error moving deal:', error);
    res.status(500).json({ error: 'Failed to move deal' });
  }
});

// POST mark deal as won
router.post('/:id/win', async (req, res) => {
  try {
    const { notes } = req.body;

    await runAsync(`
      UPDATE crm_deals SET
        status = 'won',
        stage_id = 'stage-won',
        actual_close_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    // Log activity
    await runAsync(`
      INSERT INTO deal_activities (id, deal_id, activity_type, title, description)
      VALUES (?, ?, 'deal_won', 'Deal gewonnen!', ?)
    `, [uuidv4(), req.params.id, notes]);

    res.json({ message: 'Deal marked as won' });
  } catch (error) {
    console.error('Error marking deal as won:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// POST mark deal as lost
router.post('/:id/lose', async (req, res) => {
  try {
    const { lost_reason, lost_reason_details } = req.body;

    await runAsync(`
      UPDATE crm_deals SET
        status = 'lost',
        stage_id = 'stage-lost',
        lost_reason = ?,
        lost_reason_details = ?,
        actual_close_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [lost_reason, lost_reason_details, req.params.id]);

    // Log activity
    await runAsync(`
      INSERT INTO deal_activities (id, deal_id, activity_type, title, description, metadata)
      VALUES (?, ?, 'deal_lost', 'Deal verloren', ?, ?)
    `, [uuidv4(), req.params.id, lost_reason_details, JSON.stringify({ reason: lost_reason })]);

    res.json({ message: 'Deal marked as lost' });
  } catch (error) {
    console.error('Error marking deal as lost:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// DELETE deal
router.delete('/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM crm_deals WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deal deleted' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// ═══ Line Items ═══

// GET line items for deal
router.get('/:id/items', async (req, res) => {
  try {
    const items = await allAsync(`
      SELECT * FROM deal_line_items WHERE deal_id = ? ORDER BY created_at ASC
    `, [req.params.id]);
    res.json(items);
  } catch (error) {
    console.error('Error fetching line items:', error);
    res.status(500).json({ error: 'Failed to fetch line items' });
  }
});

// POST add line item
router.post('/:id/items', async (req, res) => {
  try {
    const { product_name, description, quantity = 1, unit_price, discount_percent = 0 } = req.body;
    const id = uuidv4();
    const total_price = quantity * unit_price * (1 - discount_percent / 100);

    await runAsync(`
      INSERT INTO deal_line_items (id, deal_id, product_name, description, quantity, unit_price, discount_percent, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, req.params.id, product_name, description, quantity, unit_price, discount_percent, total_price]);

    // Update deal total value
    const totalValue = await getAsync(`
      SELECT SUM(total_price) as total FROM deal_line_items WHERE deal_id = ?
    `, [req.params.id]);

    await runAsync('UPDATE crm_deals SET deal_value = ? WHERE id = ?',
      [totalValue?.total || 0, req.params.id]);

    res.status(201).json({ id, total_price, message: 'Line item added' });
  } catch (error) {
    console.error('Error adding line item:', error);
    res.status(500).json({ error: 'Failed to add line item' });
  }
});

// PUT update line item
router.put('/:dealId/items/:itemId', async (req, res) => {
  try {
    const { product_name, description, quantity, unit_price, discount_percent } = req.body;

    // Calculate new total if values provided
    let total_price = null;
    if (quantity !== undefined && unit_price !== undefined) {
      total_price = quantity * unit_price * (1 - (discount_percent || 0) / 100);
    }

    await runAsync(`
      UPDATE deal_line_items SET
        product_name = COALESCE(?, product_name),
        description = COALESCE(?, description),
        quantity = COALESCE(?, quantity),
        unit_price = COALESCE(?, unit_price),
        discount_percent = COALESCE(?, discount_percent),
        total_price = COALESCE(?, total_price)
      WHERE id = ? AND deal_id = ?
    `, [product_name, description, quantity, unit_price, discount_percent, total_price,
        req.params.itemId, req.params.dealId]);

    // Recalculate deal total
    const totalValue = await getAsync(`
      SELECT SUM(total_price) as total FROM deal_line_items WHERE deal_id = ?
    `, [req.params.dealId]);

    await runAsync('UPDATE crm_deals SET deal_value = ? WHERE id = ?',
      [totalValue?.total || 0, req.params.dealId]);

    res.json({ message: 'Line item updated' });
  } catch (error) {
    console.error('Error updating line item:', error);
    res.status(500).json({ error: 'Failed to update line item' });
  }
});

// DELETE line item
router.delete('/:dealId/items/:itemId', async (req, res) => {
  try {
    await runAsync('DELETE FROM deal_line_items WHERE id = ? AND deal_id = ?',
      [req.params.itemId, req.params.dealId]);

    // Recalculate deal total
    const totalValue = await getAsync(`
      SELECT SUM(total_price) as total FROM deal_line_items WHERE deal_id = ?
    `, [req.params.dealId]);

    await runAsync('UPDATE crm_deals SET deal_value = ? WHERE id = ?',
      [totalValue?.total || 0, req.params.dealId]);

    res.json({ message: 'Line item deleted' });
  } catch (error) {
    console.error('Error deleting line item:', error);
    res.status(500).json({ error: 'Failed to delete line item' });
  }
});

// ═══ Activities ═══

// GET activities for deal
router.get('/:id/activities', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const activities = await allAsync(`
      SELECT * FROM deal_activities
      WHERE deal_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [req.params.id, parseInt(limit)]);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// POST add activity/note
router.post('/:id/activities', async (req, res) => {
  try {
    const { activity_type = 'note', title, description, metadata } = req.body;
    const id = uuidv4();

    await runAsync(`
      INSERT INTO deal_activities (id, deal_id, activity_type, title, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, req.params.id, activity_type, title, description, metadata ? JSON.stringify(metadata) : null]);

    res.status(201).json({ id, message: 'Activity added' });
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// ═══ Stats & Forecast ═══

// GET pipeline statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const overview = await getAsync(`
      SELECT
        COUNT(*) as total_deals,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_deals,
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won_deals,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost_deals,
        SUM(CASE WHEN status = 'open' THEN deal_value ELSE 0 END) as pipeline_value,
        SUM(CASE WHEN status = 'won' THEN deal_value ELSE 0 END) as won_value,
        AVG(CASE WHEN status = 'won' THEN deal_value ELSE NULL END) as avg_deal_value
      FROM crm_deals
    `);

    const byStage = await allAsync(`
      SELECT s.id, s.name, s.color, s.position,
        COUNT(d.id) as deal_count,
        COALESCE(SUM(d.deal_value), 0) as total_value,
        COALESCE(AVG(d.probability), 0) as avg_probability
      FROM sales_pipeline_stages s
      LEFT JOIN crm_deals d ON s.id = d.stage_id AND d.status = 'open'
      GROUP BY s.id
      ORDER BY s.position
    `);

    const winRate = await getAsync(`
      SELECT
        CAST(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS FLOAT) /
        NULLIF(SUM(CASE WHEN status IN ('won', 'lost') THEN 1 ELSE 0 END), 0) * 100 as win_rate
      FROM crm_deals
    `);

    res.json({
      ...overview,
      win_rate: winRate?.win_rate || 0,
      by_stage: byStage
    });
  } catch (error) {
    console.error('Error fetching deal stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET revenue forecast
router.get('/stats/forecast', async (req, res) => {
  try {
    // Weighted pipeline (value * probability)
    const weighted = await allAsync(`
      SELECT
        strftime('%Y-%m', expected_close_date) as month,
        SUM(deal_value * probability / 100) as weighted_value,
        SUM(deal_value) as total_value,
        COUNT(*) as deal_count
      FROM crm_deals
      WHERE status = 'open' AND expected_close_date IS NOT NULL
      GROUP BY month
      ORDER BY month
    `);

    // Won deals by month (for comparison)
    const actual = await allAsync(`
      SELECT
        strftime('%Y-%m', actual_close_date) as month,
        SUM(deal_value) as total_value,
        COUNT(*) as deal_count
      FROM crm_deals
      WHERE status = 'won'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json({ forecast: weighted, actual: actual.reverse() });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

export default router;
