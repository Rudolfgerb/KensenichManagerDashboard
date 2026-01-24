import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initializeDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './utils/logger.js';

// Routes
import taskRoutes from './routes/tasks.js';
import sessionRoutes from './routes/sessions.js';
import sopRoutes from './routes/sops.js';
import pageRoutes from './routes/pages.js';
import aiRoutes from './routes/ai.js';
import crmRoutes from './routes/crm.js';
import goalsRoutes from './routes/goals.js';
import terminalRoutes from './routes/terminal.js';
import jobsRoutes from './routes/jobs.js';
import mutuusRoutes from './routes/mutuus.js';
import salesPipelineRoutes from './routes/sales-pipeline.js';
import automationRoutes from './routes/automation.js';
import contentRoutes from './routes/content.js';
import dashboardRoutes from './routes/dashboard.js';
import contentProcessorRoutes from './routes/content-processor.js';
import projectsRoutes from './routes/projects.js';
import integrationsRoutes from './routes/integrations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // Request logging

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/sops', sopRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/mutuus', mutuusRoutes);
app.use('/api/sales-pipeline', salesPipelineRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', contentProcessorRoutes);
app.use('/api/files', contentProcessorRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/integrations', integrationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 KensenichManager Backend running on http://localhost:${PORT}`);
});
