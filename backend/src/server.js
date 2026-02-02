import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import db, { initializeDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './utils/logger.js';
import { apiLimiter, aiLimiter, uploadLimiter } from './middleware/rateLimiter.js';

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
import agentsRoutes from './routes/agents.js';
import socialRoutes from './routes/social.js';
import emailRoutes from './routes/email.js';
import calendarRoutes from './routes/calendar.js';
import dealsRoutes from './routes/deals.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable for dev, enable in production
}));

// CORS Configuration - Allow multiple frontend ports
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow localhost on any port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }

    // Allow configured frontend URL
    const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (origin === allowedOrigin) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting - apply to all API routes
app.use('/api', apiLimiter);

// Stricter rate limiting for AI routes
app.use('/api/ai', aiLimiter);

// Rate limiting for upload routes
app.use('/api/content/archive', uploadLimiter);
app.use('/api/projects/*/assets/upload', uploadLimiter);

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
app.use('/api/agents', agentsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/deals', dealsRoutes);

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
