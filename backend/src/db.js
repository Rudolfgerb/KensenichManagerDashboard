import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';
import { createIndexes } from './db-indexes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bratandrillmanager.db');
const db = new sqlite3.Database(dbPath);

// Promisify database methods
const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

// Initialize database schema
export async function initializeDatabase() {
  try {
    // Enable foreign keys
    await runAsync('PRAGMA foreign_keys = ON');

    // Tasks table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority INTEGER DEFAULT 0,
        estimated_sessions INTEGER DEFAULT 1,
        category TEXT DEFAULT 'general',
        tags TEXT,
        due_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Work Sessions table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        started_at DATETIME NOT NULL,
        ended_at DATETIME,
        duration_minutes INTEGER DEFAULT 30,
        status TEXT DEFAULT 'running',
        documentation TEXT,
        ai_summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // SOPs (Standard Operating Procedures) table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS sops (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        process_type TEXT,
        steps TEXT,
        created_from_sessions TEXT,
        ai_generated INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pages table (for Notion-like workspace)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        title TEXT NOT NULL,
        blocks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
      )
    `);

    // AI Memories table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reminders table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        trigger_type TEXT NOT NULL,
        trigger_data TEXT,
        message TEXT,
        triggered INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // Job Applications table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        position TEXT NOT NULL,
        status TEXT DEFAULT 'applied',
        applied_date DATETIME,
        interview_date DATETIME,
        notes TEXT,
        salary_range TEXT,
        job_url TEXT,
        contact_person TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mutuus Launch Milestones table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS mutuus_milestones (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        target_date DATETIME,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        dependencies TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // CRM Contacts table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS crm_contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'client',
        email TEXT,
        phone TEXT,
        company TEXT,
        notes TEXT,
        last_contact DATETIME,
        next_followup DATETIME,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Communication Log table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS communication_log (
        id TEXT PRIMARY KEY,
        contact_id TEXT,
        type TEXT NOT NULL,
        subject TEXT,
        content TEXT,
        direction TEXT DEFAULT 'outgoing',
        status TEXT DEFAULT 'sent',
        scheduled_at DATETIME,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL
      )
    `);

    // Goals table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        target_date DATETIME,
        status TEXT DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        metrics TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales Pipeline Stages table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS sales_pipeline_stages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position INTEGER NOT NULL,
        color TEXT DEFAULT '#00ff88',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales Pipeline Contacts table (Partner Tracking)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS sales_pipeline_contacts (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        stage_id TEXT NOT NULL,
        potential_value REAL DEFAULT 0,
        probability INTEGER DEFAULT 50,
        notes TEXT,
        last_interaction DATETIME,
        next_action TEXT,
        next_action_date DATETIME,
        won_date DATETIME,
        lost_date DATETIME,
        lost_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (stage_id) REFERENCES sales_pipeline_stages(id) ON DELETE RESTRICT
      )
    `);

    // Message Templates table (für Anschreiben)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'email',
        subject TEXT,
        content TEXT NOT NULL,
        variables TEXT,
        category TEXT DEFAULT 'partner_outreach',
        usage_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pipeline Documents table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS pipeline_documents (
        id TEXT PRIMARY KEY,
        pipeline_contact_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        description TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_contact_id) REFERENCES sales_pipeline_contacts(id) ON DELETE CASCADE
      )
    `);

    // Automation Rules table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_conditions TEXT,
        action_type TEXT NOT NULL,
        action_data TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Automation Logs table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        pipeline_contact_id TEXT,
        action_taken TEXT,
        result TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE,
        FOREIGN KEY (pipeline_contact_id) REFERENCES sales_pipeline_contacts(id) ON DELETE SET NULL
      )
    `);

    // Pipeline Activity Log table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS pipeline_activities (
        id TEXT PRIMARY KEY,
        pipeline_contact_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        description TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pipeline_contact_id) REFERENCES sales_pipeline_contacts(id) ON DELETE CASCADE
      )
    `);

    // Content Ideas table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS content_ideas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        platform TEXT,
        category TEXT,
        status TEXT DEFAULT 'idea',
        priority INTEGER DEFAULT 0,
        thumbnail_url TEXT,
        notes TEXT,
        target_date DATETIME,
        published_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Content Elements table (für einzelne Komponenten)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS content_elements (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL,
        element_type TEXT NOT NULL,
        title TEXT,
        content TEXT,
        file_path TEXT,
        file_url TEXT,
        status TEXT DEFAULT 'missing',
        notes TEXT,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (content_id) REFERENCES content_ideas(id) ON DELETE CASCADE
      )
    `);

    // Content Archive table (Wiederverwendbare Assets)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS content_archive (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        element_type TEXT NOT NULL,
        content TEXT,
        file_path TEXT,
        file_url TEXT,
        tags TEXT,
        usage_count INTEGER DEFAULT 0,
        last_used DATETIME,
        platform TEXT,
        category TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Content Images table (Bildverwaltung)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS content_images (
        id TEXT PRIMARY KEY,
        content_id TEXT,
        archive_id TEXT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        alt_text TEXT,
        tags TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (content_id) REFERENCES content_ideas(id) ON DELETE CASCADE,
        FOREIGN KEY (archive_id) REFERENCES content_archive(id) ON DELETE CASCADE
      )
    `);

    // Calendar Events table (Termine)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        event_type TEXT DEFAULT 'meeting',
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        location TEXT,
        attendees TEXT,
        reminder_minutes INTEGER DEFAULT 15,
        status TEXT DEFAULT 'scheduled',
        related_contact_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (related_contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL
      )
    `);

    // Notifications table (Email, System Updates, etc.)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        priority TEXT DEFAULT 'normal',
        is_read INTEGER DEFAULT 0,
        related_entity_type TEXT,
        related_entity_id TEXT,
        action_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Applications/Processes table (Anträge & laufende Prozesse)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        application_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        submitted_date DATETIME,
        expected_response_date DATETIME,
        response_date DATETIME,
        outcome TEXT,
        institution TEXT,
        reference_number TEXT,
        documents TEXT,
        notes TEXT,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Application Updates/Timeline table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS application_updates (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        update_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);

    // Projects table (Multi-Projekt-Management)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        color TEXT DEFAULT '#00ff88',
        icon TEXT,
        start_date DATETIME,
        target_launch_date DATETIME,
        actual_launch_date DATETIME,
        website_url TEXT,
        repository_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Branding Assets table (Projekt-spezifische Assets)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS branding_assets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT,
        file_url TEXT,
        file_type TEXT,
        file_size INTEGER,
        version TEXT DEFAULT '1.0',
        tags TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Project Documents table (PRD, Pitch Deck, etc.)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        file_path TEXT,
        file_url TEXT,
        version TEXT DEFAULT '1.0',
        status TEXT DEFAULT 'draft',
        last_edited_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Project Milestones table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target_date DATETIME,
        completed_date DATETIME,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Insert default pipeline stages
    const stages = [
      { id: 'stage-lead', name: 'Lead', position: 1, color: '#3b82f6' },
      { id: 'stage-contacted', name: 'Contacted', position: 2, color: '#8b5cf6' },
      { id: 'stage-qualified', name: 'Qualified', position: 3, color: '#6366f1' },
      { id: 'stage-proposal', name: 'Proposal Sent', position: 4, color: '#06b6d4' },
      { id: 'stage-negotiation', name: 'Negotiation', position: 5, color: '#f59e0b' },
      { id: 'stage-won', name: 'Won', position: 6, color: '#00ff88' },
      { id: 'stage-lost', name: 'Lost', position: 7, color: '#ef4444' }
    ];

    for (const stage of stages) {
      await runAsync(`
        INSERT OR IGNORE INTO sales_pipeline_stages (id, name, position, color)
        VALUES (?, ?, ?, ?)
      `, [stage.id, stage.name, stage.position, stage.color]);
    }

    // Integrations table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        api_key TEXT,
        config TEXT,
        connected INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database initialized successfully');

    // Create indexes for performance
    await createIndexes(db);
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export { db, runAsync, getAsync, allAsync };
export default db;
