import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, runAsync, getAsync, allAsync } from '../db.js';

const router = express.Router();

// Promisified db methods
const dbWrapper = {
  run: (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),
  get: (sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  all: (sql, params) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  })
};

// Get all agents
router.get('/', async (req, res) => {
  try {
    const { hierarchy, active } = req.query;
    let query = 'SELECT * FROM ai_agents';
    const params = [];
    const conditions = [];

    if (hierarchy) {
      conditions.push('hierarchy = ?');
      params.push(hierarchy);
    }
    if (active !== undefined) {
      conditions.push('active = ?');
      params.push(active === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY hierarchy, created_at';
    const agents = await dbWrapper.all(query, params);

    // Transform to match frontend interface
    const transformedAgents = agents.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      systemPrompt: a.system_prompt,
      model: a.model,
      hierarchy: a.hierarchy,
      parentId: a.parent_id,
      active: a.active === 1,
      config: a.config ? JSON.parse(a.config) : null,
      createdAt: a.created_at
    }));

    res.json(transformedAgents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single agent
router.get('/:id', async (req, res) => {
  try {
    const agent = await dbWrapper.get('SELECT * FROM ai_agents WHERE id = ?', [req.params.id]);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.system_prompt,
      model: agent.model,
      hierarchy: agent.hierarchy,
      parentId: agent.parent_id,
      active: agent.active === 1,
      config: agent.config ? JSON.parse(agent.config) : null,
      createdAt: agent.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create agent
router.post('/', async (req, res) => {
  try {
    const { id, name, description, systemPrompt, model, hierarchy, parentId, active, config } = req.body;

    const agentId = id || uuidv4();
    await dbWrapper.run(`
      INSERT INTO ai_agents (id, name, description, system_prompt, model, hierarchy, parent_id, active, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        system_prompt = excluded.system_prompt,
        model = excluded.model,
        hierarchy = excluded.hierarchy,
        parent_id = excluded.parent_id,
        active = excluded.active,
        config = excluded.config,
        updated_at = CURRENT_TIMESTAMP
    `, [
      agentId,
      name,
      description || null,
      systemPrompt || null,
      model || 'llama3.2',
      hierarchy || 'worker',
      parentId || null,
      active !== false ? 1 : 0,
      config ? JSON.stringify(config) : null
    ]);

    res.json({
      id: agentId,
      name,
      description,
      systemPrompt,
      model: model || 'llama3.2',
      hierarchy: hierarchy || 'worker',
      parentId,
      active: active !== false,
      config
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update agent
router.put('/:id', async (req, res) => {
  try {
    const { name, description, systemPrompt, model, hierarchy, parentId, active, config } = req.body;

    await dbWrapper.run(`
      UPDATE ai_agents SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        system_prompt = COALESCE(?, system_prompt),
        model = COALESCE(?, model),
        hierarchy = COALESCE(?, hierarchy),
        parent_id = ?,
        active = COALESCE(?, active),
        config = COALESCE(?, config),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name,
      description,
      systemPrompt,
      model,
      hierarchy,
      parentId,
      active !== undefined ? (active ? 1 : 0) : null,
      config ? JSON.stringify(config) : null,
      req.params.id
    ]);

    const agent = await dbWrapper.get('SELECT * FROM ai_agents WHERE id = ?', [req.params.id]);
    res.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.system_prompt,
      model: agent.model,
      hierarchy: agent.hierarchy,
      parentId: agent.parent_id,
      active: agent.active === 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    // Update children to have no parent
    await dbWrapper.run('UPDATE ai_agents SET parent_id = NULL WHERE parent_id = ?', [req.params.id]);
    // Delete the agent
    await dbWrapper.run('DELETE FROM ai_agents WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get agent hierarchy tree
router.get('/hierarchy/tree', async (req, res) => {
  try {
    const agents = await dbWrapper.all('SELECT * FROM ai_agents ORDER BY hierarchy, created_at');

    const buildTree = (parentId = null) => {
      return agents
        .filter(a => a.parent_id === parentId)
        .map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          hierarchy: a.hierarchy,
          model: a.model,
          active: a.active === 1,
          children: buildTree(a.id)
        }));
    };

    res.json(buildTree());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
