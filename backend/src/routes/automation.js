import express from 'express';
import { db, runAsync, getAsync, allAsync } from '../db.js';

const router = express.Router();

// Placeholder for future Automation functionality
router.get('/', async (req, res) => {
  res.json({ message: 'Automation API - Coming Soon' });
});

export default router;
