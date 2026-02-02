import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runAsync, getAsync, allAsync } from '../db.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/assets');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

// ==================== CONTENT IDEAS ====================

// Get all content ideas
router.get('/ideas', async (req, res) => {
  try {
    const { status, platform, category } = req.query;

    let query = 'SELECT * FROM content_ideas WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const ideas = await allAsync(query, params);
    res.json(ideas);
  } catch (error) {
    console.error('Error fetching content ideas:', error);
    res.status(500).json({ error: 'Failed to fetch content ideas' });
  }
});

// Get single content idea with all elements
router.get('/ideas/:id', async (req, res) => {
  try {
    const idea = await getAsync('SELECT * FROM content_ideas WHERE id = ?', [req.params.id]);

    if (!idea) {
      return res.status(404).json({ error: 'Content idea not found' });
    }

    // Get all elements for this content
    const elements = await allAsync(
      'SELECT * FROM content_elements WHERE content_id = ? ORDER BY order_index',
      [req.params.id]
    );

    // Get images
    const images = await allAsync(
      'SELECT * FROM content_images WHERE content_id = ? ORDER BY uploaded_at DESC',
      [req.params.id]
    );

    res.json({
      ...idea,
      elements,
      images
    });
  } catch (error) {
    console.error('Error fetching content idea:', error);
    res.status(500).json({ error: 'Failed to fetch content idea' });
  }
});

// Create content idea
router.post('/ideas', async (req, res) => {
  try {
    const {
      title,
      description,
      platform,
      category,
      priority,
      thumbnail_url,
      notes,
      target_date,
      elements = [] // Optional: Create elements together with idea
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO content_ideas (
        id, title, description, platform, category,
        priority, thumbnail_url, notes, target_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, title, description || null, platform || null, category || null,
        priority || 0, thumbnail_url || null, notes || null, target_date || null]);

    // Create default elements if not provided
    const defaultElementTypes = [
      'hook', 'caption', 'text', 'voiceover', 'script',
      'transitions', 'animations', 'stickers', 'videos', 'music'
    ];

    const elementsToCreate = elements.length > 0 ? elements :
      defaultElementTypes.map((type, index) => ({
        element_type: type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        order_index: index
      }));

    for (const element of elementsToCreate) {
      const elementId = uuidv4();
      await runAsync(`
        INSERT INTO content_elements (
          id, content_id, element_type, title, content,
          file_path, file_url, status, notes, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        elementId,
        id,
        element.element_type,
        element.title || element.element_type,
        element.content || null,
        element.file_path || null,
        element.file_url || null,
        element.status || 'missing',
        element.notes || null,
        element.order_index || 0
      ]);
    }

    const created = await getAsync('SELECT * FROM content_ideas WHERE id = ?', [id]);
    const createdElements = await allAsync(
      'SELECT * FROM content_elements WHERE content_id = ? ORDER BY order_index',
      [id]
    );

    res.status(201).json({
      ...created,
      elements: createdElements
    });
  } catch (error) {
    console.error('Error creating content idea:', error);
    res.status(500).json({ error: 'Failed to create content idea' });
  }
});

// Update content idea
router.put('/ideas/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      platform,
      category,
      status,
      priority,
      thumbnail_url,
      notes,
      target_date,
      published_date
    } = req.body;

    await runAsync(`
      UPDATE content_ideas SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        platform = COALESCE(?, platform),
        category = COALESCE(?, category),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        thumbnail_url = COALESCE(?, thumbnail_url),
        notes = COALESCE(?, notes),
        target_date = COALESCE(?, target_date),
        published_date = COALESCE(?, published_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, platform, category, status, priority,
        thumbnail_url, notes, target_date, published_date, req.params.id]);

    const updated = await getAsync('SELECT * FROM content_ideas WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating content idea:', error);
    res.status(500).json({ error: 'Failed to update content idea' });
  }
});

// Delete content idea
router.delete('/ideas/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM content_ideas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Content idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting content idea:', error);
    res.status(500).json({ error: 'Failed to delete content idea' });
  }
});

// Get content statistics
router.get('/ideas/stats/overview', async (req, res) => {
  try {
    const stats = await getAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'idea' THEN 1 ELSE 0 END) as ideas,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
      FROM content_ideas
    `);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({ error: 'Failed to fetch content stats' });
  }
});

// ==================== CONTENT ELEMENTS ====================

// Get all elements for a content
router.get('/ideas/:id/elements', async (req, res) => {
  try {
    const elements = await allAsync(
      'SELECT * FROM content_elements WHERE content_id = ? ORDER BY order_index',
      [req.params.id]
    );
    res.json(elements);
  } catch (error) {
    console.error('Error fetching content elements:', error);
    res.status(500).json({ error: 'Failed to fetch content elements' });
  }
});

// Create content element
router.post('/ideas/:id/elements', async (req, res) => {
  try {
    const {
      element_type,
      title,
      content,
      file_path,
      file_url,
      status,
      notes,
      order_index
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO content_elements (
        id, content_id, element_type, title, content,
        file_path, file_url, status, notes, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, req.params.id, element_type, title || null, content || null,
        file_path || null, file_url || null, status || 'missing',
        notes || null, order_index || 0]);

    const created = await getAsync('SELECT * FROM content_elements WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating content element:', error);
    res.status(500).json({ error: 'Failed to create content element' });
  }
});

// Update content element
router.put('/elements/:id', async (req, res) => {
  try {
    const {
      element_type,
      title,
      content,
      file_path,
      file_url,
      status,
      notes,
      order_index
    } = req.body;

    await runAsync(`
      UPDATE content_elements SET
        element_type = COALESCE(?, element_type),
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        file_path = COALESCE(?, file_path),
        file_url = COALESCE(?, file_url),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        order_index = COALESCE(?, order_index),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [element_type, title, content, file_path, file_url, status, notes, order_index, req.params.id]);

    const updated = await getAsync('SELECT * FROM content_elements WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating content element:', error);
    res.status(500).json({ error: 'Failed to update content element' });
  }
});

// Delete content element
router.delete('/elements/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM content_elements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Content element deleted successfully' });
  } catch (error) {
    console.error('Error deleting content element:', error);
    res.status(500).json({ error: 'Failed to delete content element' });
  }
});

// ==================== CONTENT ARCHIVE ====================

// Get all archived content/assets
router.get('/archive', async (req, res) => {
  try {
    const { element_type, platform, category, tags } = req.query;

    let query = 'SELECT * FROM content_archive WHERE 1=1';
    const params = [];

    if (element_type) {
      query += ' AND element_type = ?';
      params.push(element_type);
    }
    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (tags) {
      query += ' AND tags LIKE ?';
      params.push(`%${tags}%`);
    }

    query += ' ORDER BY last_used DESC, created_at DESC';

    const archive = await allAsync(query, params);
    res.json(archive);
  } catch (error) {
    console.error('Error fetching content archive:', error);
    res.status(500).json({ error: 'Failed to fetch content archive' });
  }
});

// Get single archived item
router.get('/archive/:id', async (req, res) => {
  try {
    const item = await getAsync('SELECT * FROM content_archive WHERE id = ?', [req.params.id]);

    if (!item) {
      return res.status(404).json({ error: 'Archived item not found' });
    }

    // Get images
    const images = await allAsync(
      'SELECT * FROM content_images WHERE archive_id = ? ORDER BY uploaded_at DESC',
      [req.params.id]
    );

    res.json({
      ...item,
      images
    });
  } catch (error) {
    console.error('Error fetching archived item:', error);
    res.status(500).json({ error: 'Failed to fetch archived item' });
  }
});

// Create archived item
router.post('/archive', upload.single('file'), async (req, res) => {
  try {
    const {
      title,
      element_type,
      content,
      tags,
      platform,
      category,
      notes
    } = req.body;

    let file_path = null;
    let file_url = null;

    // Handle file upload
    if (req.file) {
      file_path = req.file.path;
      file_url = `/uploads/assets/${req.file.filename}`;
    }

    const id = uuidv4();

    await runAsync(`
      INSERT INTO content_archive (
        id, title, element_type, content, file_path, file_url,
        tags, platform, category, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, title, element_type, content || null, file_path || null,
        file_url || null, tags || null, platform || null, category || null, notes || null]);

    const created = await getAsync('SELECT * FROM content_archive WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating archived item:', error);
    res.status(500).json({ error: 'Failed to create archived item' });
  }
});

// Update archived item
router.put('/archive/:id', async (req, res) => {
  try {
    const {
      title,
      element_type,
      content,
      file_path,
      file_url,
      tags,
      platform,
      category,
      notes
    } = req.body;

    await runAsync(`
      UPDATE content_archive SET
        title = COALESCE(?, title),
        element_type = COALESCE(?, element_type),
        content = COALESCE(?, content),
        file_path = COALESCE(?, file_path),
        file_url = COALESCE(?, file_url),
        tags = COALESCE(?, tags),
        platform = COALESCE(?, platform),
        category = COALESCE(?, category),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, element_type, content, file_path, file_url, tags,
        platform, category, notes, req.params.id]);

    const updated = await getAsync('SELECT * FROM content_archive WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating archived item:', error);
    res.status(500).json({ error: 'Failed to update archived item' });
  }
});

// Delete archived item
router.delete('/archive/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM content_archive WHERE id = ?', [req.params.id]);
    res.json({ message: 'Archived item deleted successfully' });
  } catch (error) {
    console.error('Error deleting archived item:', error);
    res.status(500).json({ error: 'Failed to delete archived item' });
  }
});

// Increment usage count when reusing an asset
router.post('/archive/:id/use', async (req, res) => {
  try {
    await runAsync(`
      UPDATE content_archive SET
        usage_count = usage_count + 1,
        last_used = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    const updated = await getAsync('SELECT * FROM content_archive WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating usage count:', error);
    res.status(500).json({ error: 'Failed to update usage count' });
  }
});

// ==================== IMAGES ====================

// Upload image (metadata only - actual file upload handled by frontend)
router.post('/images', async (req, res) => {
  try {
    const {
      content_id,
      archive_id,
      file_name,
      file_path,
      file_size,
      width,
      height,
      alt_text,
      tags
    } = req.body;

    const id = uuidv4();

    await runAsync(`
      INSERT INTO content_images (
        id, content_id, archive_id, file_name, file_path, file_size,
        width, height, alt_text, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, content_id || null, archive_id || null, file_name, file_path,
        file_size || null, width || null, height || null, alt_text || null, tags || null]);

    const created = await getAsync('SELECT * FROM content_images WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get images for content
router.get('/ideas/:id/images', async (req, res) => {
  try {
    const images = await allAsync(
      'SELECT * FROM content_images WHERE content_id = ? ORDER BY uploaded_at DESC',
      [req.params.id]
    );
    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete image
router.delete('/images/:id', async (req, res) => {
  try {
    await runAsync('DELETE FROM content_images WHERE id = ?', [req.params.id]);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
