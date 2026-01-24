import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/assets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp|pdf|mp4|webm|mov|ai|psd|sketch|fig|zip/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not allowed`), false);
    }
  }
});

// Get all projects
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM projects';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const projects = await allAsync(query, params);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single project with all details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await getAsync('SELECT * FROM projects WHERE id = ?', [id]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get branding assets
    const assets = await allAsync(
      'SELECT * FROM branding_assets WHERE project_id = ? ORDER BY asset_type, created_at DESC',
      [id]
    );

    // Get documents
    const documents = await allAsync(
      'SELECT * FROM project_documents WHERE project_id = ? ORDER BY document_type, created_at DESC',
      [id]
    );

    // Get milestones
    const milestones = await allAsync(
      'SELECT * FROM project_milestones WHERE project_id = ? ORDER BY target_date ASC',
      [id]
    );

    res.json({
      ...project,
      assets,
      documents,
      milestones
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      status = 'active',
      color = '#00ff88',
      icon,
      start_date,
      target_launch_date,
      website_url,
      repository_url,
      notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const id = randomUUID();

    await runAsync(
      `INSERT INTO projects (
        id, name, description, status, color, icon,
        start_date, target_launch_date, website_url, repository_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, status, color, icon, start_date, target_launch_date, website_url, repository_url, notes]
    );

    const project = await getAsync('SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      color,
      icon,
      start_date,
      target_launch_date,
      actual_launch_date,
      website_url,
      repository_url,
      notes
    } = req.body;

    await runAsync(
      `UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        start_date = COALESCE(?, start_date),
        target_launch_date = COALESCE(?, target_launch_date),
        actual_launch_date = COALESCE(?, actual_launch_date),
        website_url = COALESCE(?, website_url),
        repository_url = COALESCE(?, repository_url),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [name, description, status, color, icon, start_date, target_launch_date, actual_launch_date, website_url, repository_url, notes, id]
    );

    const project = await getAsync('SELECT * FROM projects WHERE id = ?', [id]);
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BRANDING ASSETS
// ============================================

// Get all assets for a project
router.get('/:id/assets', async (req, res) => {
  try {
    const { id } = req.params;
    const { asset_type } = req.query;

    let query = 'SELECT * FROM branding_assets WHERE project_id = ?';
    const params = [id];

    if (asset_type) {
      query += ' AND asset_type = ?';
      params.push(asset_type);
    }

    query += ' ORDER BY asset_type, is_primary DESC, created_at DESC';

    const assets = await allAsync(query, params);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add asset to project
router.post('/:id/assets', async (req, res) => {
  try {
    const { id: project_id } = req.params;
    const {
      asset_type,
      title,
      description,
      file_path,
      file_url,
      file_type,
      file_size,
      version = '1.0',
      tags,
      is_primary = 0
    } = req.body;

    if (!asset_type || !title) {
      return res.status(400).json({ error: 'Asset type and title are required' });
    }

    const asset_id = randomUUID();

    await runAsync(
      `INSERT INTO branding_assets (
        id, project_id, asset_type, title, description,
        file_path, file_url, file_type, file_size, version, tags, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [asset_id, project_id, asset_type, title, description, file_path, file_url, file_type, file_size, version, tags, is_primary]
    );

    const asset = await getAsync('SELECT * FROM branding_assets WHERE id = ?', [asset_id]);
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update asset
router.put('/:project_id/assets/:asset_id', async (req, res) => {
  try {
    const { asset_id } = req.params;
    const {
      title,
      description,
      file_path,
      file_url,
      version,
      tags,
      is_primary
    } = req.body;

    await runAsync(
      `UPDATE branding_assets SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        file_path = COALESCE(?, file_path),
        file_url = COALESCE(?, file_url),
        version = COALESCE(?, version),
        tags = COALESCE(?, tags),
        is_primary = COALESCE(?, is_primary),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, description, file_path, file_url, version, tags, is_primary, asset_id]
    );

    const asset = await getAsync('SELECT * FROM branding_assets WHERE id = ?', [asset_id]);
    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete asset
router.delete('/:project_id/assets/:asset_id', async (req, res) => {
  try {
    const { asset_id } = req.params;

    // Get asset to delete file if exists
    const asset = await getAsync('SELECT * FROM branding_assets WHERE id = ?', [asset_id]);
    if (asset && asset.file_path) {
      const filePath = path.join(__dirname, '../../uploads/assets', path.basename(asset.file_path));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await runAsync('DELETE FROM branding_assets WHERE id = ?', [asset_id]);
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload asset file
router.post('/:id/assets/upload', upload.single('file'), async (req, res) => {
  try {
    const { id: project_id } = req.params;
    const { asset_type, title, description, version = '1.0', is_primary = 0 } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!asset_type || !title) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Asset type and title are required' });
    }

    const asset_id = randomUUID();
    const file_url = `/uploads/assets/${req.file.filename}`;

    await runAsync(
      `INSERT INTO branding_assets (
        id, project_id, asset_type, title, description,
        file_path, file_url, file_type, file_size, version, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset_id,
        project_id,
        asset_type,
        title,
        description,
        req.file.path,
        file_url,
        req.file.mimetype,
        req.file.size,
        version,
        is_primary
      ]
    );

    const asset = await getAsync('SELECT * FROM branding_assets WHERE id = ?', [asset_id]);
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error uploading asset:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROJECT DOCUMENTS
// ============================================

// Get all documents for a project
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type } = req.query;

    let query = 'SELECT * FROM project_documents WHERE project_id = ?';
    const params = [id];

    if (document_type) {
      query += ' AND document_type = ?';
      params.push(document_type);
    }

    query += ' ORDER BY document_type, created_at DESC';

    const documents = await allAsync(query, params);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add document to project
router.post('/:id/documents', async (req, res) => {
  try {
    const { id: project_id } = req.params;
    const {
      document_type,
      title,
      content,
      file_path,
      file_url,
      version = '1.0',
      status = 'draft',
      last_edited_by
    } = req.body;

    if (!document_type || !title) {
      return res.status(400).json({ error: 'Document type and title are required' });
    }

    const doc_id = randomUUID();

    await runAsync(
      `INSERT INTO project_documents (
        id, project_id, document_type, title, content,
        file_path, file_url, version, status, last_edited_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc_id, project_id, document_type, title, content, file_path, file_url, version, status, last_edited_by]
    );

    const document = await getAsync('SELECT * FROM project_documents WHERE id = ?', [doc_id]);
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update document
router.put('/:project_id/documents/:doc_id', async (req, res) => {
  try {
    const { doc_id } = req.params;
    const {
      title,
      content,
      file_path,
      file_url,
      version,
      status,
      last_edited_by
    } = req.body;

    await runAsync(
      `UPDATE project_documents SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        file_path = COALESCE(?, file_path),
        file_url = COALESCE(?, file_url),
        version = COALESCE(?, version),
        status = COALESCE(?, status),
        last_edited_by = COALESCE(?, last_edited_by),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, content, file_path, file_url, version, status, last_edited_by, doc_id]
    );

    const document = await getAsync('SELECT * FROM project_documents WHERE id = ?', [doc_id]);
    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:project_id/documents/:doc_id', async (req, res) => {
  try {
    const { doc_id } = req.params;
    await runAsync('DELETE FROM project_documents WHERE id = ?', [doc_id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROJECT MILESTONES
// ============================================

// Get all milestones for a project
router.get('/:id/milestones', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    let query = 'SELECT * FROM project_milestones WHERE project_id = ?';
    const params = [id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY target_date ASC';

    const milestones = await allAsync(query, params);
    res.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add milestone to project
router.post('/:id/milestones', async (req, res) => {
  try {
    const { id: project_id } = req.params;
    const {
      title,
      description,
      target_date,
      status = 'pending',
      progress = 0,
      priority = 0
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Milestone title is required' });
    }

    const milestone_id = randomUUID();

    await runAsync(
      `INSERT INTO project_milestones (
        id, project_id, title, description, target_date, status, progress, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [milestone_id, project_id, title, description, target_date, status, progress, priority]
    );

    const milestone = await getAsync('SELECT * FROM project_milestones WHERE id = ?', [milestone_id]);
    res.status(201).json(milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update milestone
router.put('/:project_id/milestones/:milestone_id', async (req, res) => {
  try {
    const { milestone_id } = req.params;
    const {
      title,
      description,
      target_date,
      completed_date,
      status,
      progress,
      priority
    } = req.body;

    await runAsync(
      `UPDATE project_milestones SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        target_date = COALESCE(?, target_date),
        completed_date = COALESCE(?, completed_date),
        status = COALESCE(?, status),
        progress = COALESCE(?, progress),
        priority = COALESCE(?, priority),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [title, description, target_date, completed_date, status, progress, priority, milestone_id]
    );

    const milestone = await getAsync('SELECT * FROM project_milestones WHERE id = ?', [milestone_id]);
    res.json(milestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete milestone
router.delete('/:project_id/milestones/:milestone_id', async (req, res) => {
  try {
    const { milestone_id } = req.params;
    await runAsync('DELETE FROM project_milestones WHERE id = ?', [milestone_id]);
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROJECT STATS
// ============================================

// Get project statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const assetCount = await getAsync(
      'SELECT COUNT(*) as count FROM branding_assets WHERE project_id = ?',
      [id]
    );

    const documentCount = await getAsync(
      'SELECT COUNT(*) as count FROM project_documents WHERE project_id = ?',
      [id]
    );

    const milestoneStats = await getAsync(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM project_milestones WHERE project_id = ?`,
      [id]
    );

    res.json({
      assets: assetCount.count || 0,
      documents: documentCount.count || 0,
      milestones: milestoneStats || { total: 0, completed: 0, in_progress: 0, pending: 0 }
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
