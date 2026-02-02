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
        difficulty INTEGER DEFAULT 1,
        estimated_sessions INTEGER DEFAULT 1,
        category TEXT DEFAULT 'general',
        tags TEXT,
        due_date DATETIME,
        goal_id TEXT,
        parent_task_id TEXT,
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
      )
    `);

    // Add new columns if they don't exist (for existing databases)
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN goal_id TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN parent_task_id TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN completed_at DATETIME');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN difficulty INTEGER DEFAULT 1');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN due_date DATETIME');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN estimated_sessions INTEGER DEFAULT 1');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT "general"');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN tags TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN depends_on TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE tasks ADD COLUMN completion_date DATE');
    } catch (e) { /* Column may already exist */ }

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

    // ═══ AI Agent Memory Tables ═══

    // AI Conversations table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Messages table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT,
        tool_name TEXT,
        tool_result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      )
    `);

    // AI User Facts table (Episodic Memory)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS ai_user_facts (
        id TEXT PRIMARY KEY,
        category TEXT DEFAULT 'info',
        key TEXT UNIQUE,
        value TEXT,
        source TEXT DEFAULT 'explicit',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily Habits table (für Agent Tool Access)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS daily_habits (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        target_count INTEGER DEFAULT 5,
        checked_count INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        last_reset DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily Habits History table (speichert vergangene Tage)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS daily_habits_history (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL,
        habit_title TEXT NOT NULL,
        date DATE NOT NULL,
        target_count INTEGER NOT NULL,
        checked_count INTEGER NOT NULL,
        completed INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (habit_id) REFERENCES daily_habits(id) ON DELETE CASCADE,
        UNIQUE(habit_id, date)
      )
    `);

    // Insert default habits if empty
    const habitsExist = await getAsync('SELECT COUNT(*) as count FROM daily_habits');
    if (habitsExist.count === 0) {
      const defaultHabits = [
        { id: 'habit-1', title: 'Bewerbungen schreiben', target_count: 5 },
        { id: 'habit-2', title: 'Outreach Kontakt anfragen / Nachrichten', target_count: 5 },
        { id: 'habit-3', title: 'Sätze Hantel Training', target_count: 5 }
      ];
      for (const habit of defaultHabits) {
        await runAsync(`
          INSERT INTO daily_habits (id, title, target_count, last_reset)
          VALUES (?, ?, ?, date('now'))
        `, [habit.id, habit.title, habit.target_count]);
      }
    }

    // AI Agents table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS ai_agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT,
        model TEXT DEFAULT 'llama3.2',
        hierarchy TEXT DEFAULT 'worker',
        parent_id TEXT,
        active INTEGER DEFAULT 1,
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
      )
    `);

    // Social Media Profiles table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS social_profiles (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        username TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        connected INTEGER DEFAULT 0,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        posts INTEGER DEFAULT 0,
        engagement_rate REAL DEFAULT 0,
        last_sync DATETIME,
        profile_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Social Media Metrics table (for historical data)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS social_metrics (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        metric_date DATE NOT NULL,
        followers INTEGER DEFAULT 0,
        following INTEGER DEFAULT 0,
        posts INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        engagement_rate REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES social_profiles(id) ON DELETE CASCADE
      )
    `);

    // Insert default social profiles if empty
    const profilesExist = await getAsync('SELECT COUNT(*) as count FROM social_profiles');
    if (profilesExist.count === 0) {
      const defaultProfiles = [
        { id: 'profile-instagram', platform: 'Instagram' },
        { id: 'profile-youtube', platform: 'YouTube' },
        { id: 'profile-tiktok', platform: 'TikTok' },
        { id: 'profile-twitter', platform: 'Twitter/X' },
        { id: 'profile-linkedin', platform: 'LinkedIn' },
        { id: 'profile-facebook', platform: 'Facebook' }
      ];
      for (const profile of defaultProfiles) {
        await runAsync(`
          INSERT INTO social_profiles (id, platform)
          VALUES (?, ?)
        `, [profile.id, profile.platform]);
      }
    }

    // ═══ CRM Enhancement Tables ═══

    // Email Accounts table (for IMAP/SMTP/OAuth integration)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        email_address TEXT NOT NULL UNIQUE,
        display_name TEXT,
        imap_host TEXT,
        imap_port INTEGER DEFAULT 993,
        smtp_host TEXT,
        smtp_port INTEGER DEFAULT 587,
        username TEXT,
        encrypted_password TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        last_sync DATETIME,
        sync_enabled INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // CRM Emails table (sent/received emails with tracking)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS crm_emails (
        id TEXT PRIMARY KEY,
        email_account_id TEXT,
        contact_id TEXT,
        message_id TEXT UNIQUE,
        thread_id TEXT,
        in_reply_to TEXT,
        direction TEXT NOT NULL,
        from_address TEXT NOT NULL,
        to_addresses TEXT NOT NULL,
        cc_addresses TEXT,
        bcc_addresses TEXT,
        subject TEXT,
        body_text TEXT,
        body_html TEXT,
        attachments TEXT,
        status TEXT DEFAULT 'draft',
        scheduled_at DATETIME,
        sent_at DATETIME,
        received_at DATETIME,
        is_read INTEGER DEFAULT 0,
        is_starred INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        folder TEXT DEFAULT 'inbox',
        tracking_pixel_id TEXT UNIQUE,
        template_id TEXT,
        open_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        replied INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (email_account_id) REFERENCES email_accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
      )
    `);

    // Email Tracking Events table (opens, clicks, replies)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS email_tracking_events (
        id TEXT PRIMARY KEY,
        email_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        geo_location TEXT,
        occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (email_id) REFERENCES crm_emails(id) ON DELETE CASCADE
      )
    `);

    // Email Tracked Links table (for click tracking)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS email_tracked_links (
        id TEXT PRIMARY KEY,
        email_id TEXT NOT NULL,
        original_url TEXT NOT NULL,
        click_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (email_id) REFERENCES crm_emails(id) ON DELETE CASCADE
      )
    `);

    // Calendar Attendees table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS calendar_attendees (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        contact_id TEXT,
        email TEXT NOT NULL,
        name TEXT,
        status TEXT DEFAULT 'pending',
        is_organizer INTEGER DEFAULT 0,
        response_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL
      )
    `);

    // Calendar Reminders table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS calendar_reminders (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        reminder_type TEXT NOT NULL,
        minutes_before INTEGER NOT NULL,
        sent INTEGER DEFAULT 0,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE
      )
    `);

    // Calendar Sync Accounts table (Google Calendar, Outlook)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS calendar_sync_accounts (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        email TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        calendar_id TEXT,
        sync_direction TEXT DEFAULT 'both',
        last_sync DATETIME,
        sync_token TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // CRM Deals table (HubSpot-style deal management)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS crm_deals (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        stage_id TEXT NOT NULL,
        deal_value REAL DEFAULT 0,
        currency TEXT DEFAULT 'EUR',
        probability INTEGER DEFAULT 50,
        expected_close_date DATETIME,
        actual_close_date DATETIME,
        deal_source TEXT,
        deal_type TEXT,
        priority TEXT DEFAULT 'medium',
        owner_id TEXT,
        status TEXT DEFAULT 'open',
        lost_reason TEXT,
        lost_reason_details TEXT,
        tags TEXT,
        custom_fields TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE,
        FOREIGN KEY (stage_id) REFERENCES sales_pipeline_stages(id) ON DELETE RESTRICT
      )
    `);

    // Deal Line Items table (products/services per deal)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS deal_line_items (
        id TEXT PRIMARY KEY,
        deal_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price REAL NOT NULL,
        discount_percent REAL DEFAULT 0,
        total_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE
      )
    `);

    // Deal Activities table (timeline)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS deal_activities (
        id TEXT PRIMARY KEY,
        deal_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        title TEXT,
        description TEXT,
        related_entity_type TEXT,
        related_entity_id TEXT,
        metadata TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE
      )
    `);

    // CRM Tasks table (linked to contacts/deals)
    await runAsync(`
      CREATE TABLE IF NOT EXISTS crm_tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        task_type TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'pending',
        due_date DATETIME,
        due_time TEXT,
        contact_id TEXT,
        deal_id TEXT,
        assigned_to TEXT,
        reminder_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL
      )
    `);

    // Contact Scores table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS contact_scores (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL UNIQUE,
        engagement_score INTEGER DEFAULT 0,
        fit_score INTEGER DEFAULT 0,
        overall_score INTEGER DEFAULT 0,
        last_activity_date DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE
      )
    `);

    // Contact Score History table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS contact_score_history (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        score_type TEXT NOT NULL,
        score_change INTEGER NOT NULL,
        new_total INTEGER NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE CASCADE
      )
    `);

    // Add new columns to crm_contacts for CRM enhancement
    try {
      await runAsync('ALTER TABLE crm_contacts ADD COLUMN lifecycle_stage TEXT DEFAULT "lead"');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE crm_contacts ADD COLUMN engagement_score INTEGER DEFAULT 0');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE crm_contacts ADD COLUMN fit_score INTEGER DEFAULT 0');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE crm_contacts ADD COLUMN owner_id TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE crm_contacts ADD COLUMN preferred_contact_method TEXT DEFAULT "email"');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE crm_contacts ADD COLUMN last_activity_date DATETIME');
    } catch (e) { /* Column may already exist */ }

    // Add new columns to calendar_events for enhanced features
    try {
      await runAsync('ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE calendar_events ADD COLUMN sync_account_id TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE calendar_events ADD COLUMN recurrence_rule TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE calendar_events ADD COLUMN video_link TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await runAsync('ALTER TABLE calendar_events ADD COLUMN related_deal_id TEXT');
    } catch (e) { /* Column may already exist */ }

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
