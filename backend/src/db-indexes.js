/**
 * Database Indexes
 * Performance optimization through strategic indexing
 */

import { promisify } from 'util';

/**
 * Safely create an index, ignoring errors if column or table doesn't exist
 */
async function safeCreateIndex(runAsync, indexQuery, indexName) {
  try {
    await runAsync(indexQuery);
  } catch (error) {
    // Ignore errors for non-existent columns/tables (backward compatibility)
    if (error.code === 'SQLITE_ERROR' &&
        (error.message.includes('no such column') || error.message.includes('no such table'))) {
      console.log(`⚠️  Skipping ${indexName} - ${error.message.includes('table') ? 'table' : 'column'} doesn't exist`);
    } else {
      throw error;
    }
  }
}

/**
 * Create database indexes for better query performance
 * @param {sqlite3.Database} db - SQLite database instance
 */
export async function createIndexes(db) {
  const runAsync = promisify(db.run.bind(db));

  try {
    console.log('Creating database indexes...');

    // Tasks indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)', 'idx_tasks_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)', 'idx_tasks_priority');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)', 'idx_tasks_category');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)', 'idx_tasks_due_date');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)', 'idx_tasks_created_at');

    // Work sessions indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON work_sessions(task_id)', 'idx_sessions_task_id');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_sessions_status ON work_sessions(status)', 'idx_sessions_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON work_sessions(started_at)', 'idx_sessions_started_at');

    // CRM contacts indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_contacts_type ON crm_contacts(type)', 'idx_contacts_type');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_contacts_next_followup ON crm_contacts(next_followup)', 'idx_contacts_next_followup');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON crm_contacts(last_contact)', 'idx_contacts_last_contact');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON crm_contacts(created_at)', 'idx_contacts_created_at');

    // Communication log indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_comm_contact_id ON communication_log(contact_id)', 'idx_comm_contact_id');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_comm_type ON communication_log(type)', 'idx_comm_type');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_comm_sent_at ON communication_log(sent_at)', 'idx_comm_sent_at');

    // Goals indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status)', 'idx_goals_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category)', 'idx_goals_category');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date)', 'idx_goals_target_date');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at)', 'idx_goals_created_at');

    // Projects indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)', 'idx_projects_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at)', 'idx_projects_created_at');

    // Branding assets indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_assets_project_id ON branding_assets(project_id)', 'idx_assets_project_id');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON branding_assets(asset_type)', 'idx_assets_asset_type');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_assets_is_primary ON branding_assets(is_primary)', 'idx_assets_is_primary');

    // Project documents indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_docs_project_id ON project_documents(project_id)', 'idx_docs_project_id');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_docs_document_type ON project_documents(document_type)', 'idx_docs_document_type');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_docs_status ON project_documents(status)', 'idx_docs_status');

    // Project milestones indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON project_milestones(project_id)', 'idx_milestones_project_id');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_milestones_status ON project_milestones(status)', 'idx_milestones_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON project_milestones(target_date)', 'idx_milestones_target_date');

    // Content ideas indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_content_status ON content_ideas(status)', 'idx_content_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_content_platform ON content_ideas(platform)', 'idx_content_platform');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_content_created_at ON content_ideas(created_at)', 'idx_content_created_at');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_content_publish_date ON content_ideas(scheduled_publish_date)', 'idx_content_publish_date');

    // Content elements indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_elements_idea_id ON content_elements(idea_id)', 'idx_elements_idea_id');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_elements_element_type ON content_elements(element_type)', 'idx_elements_element_type');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_elements_status ON content_elements(status)', 'idx_elements_status');

    // Sales pipeline indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON sales_pipeline(stage)', 'idx_pipeline_stage');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_pipeline_status ON sales_pipeline(status)', 'idx_pipeline_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_pipeline_contact_id ON sales_pipeline(contact_id)', 'idx_pipeline_contact_id');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_pipeline_expected_close ON sales_pipeline(expected_close_date)', 'idx_pipeline_expected_close');

    // Job applications indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_applications(status)', 'idx_jobs_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_jobs_applied_date ON job_applications(applied_date)', 'idx_jobs_applied_date');

    // Mutuus milestones indexes
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_mutuus_status ON mutuus_milestones(status)', 'idx_mutuus_status');
    await safeCreateIndex(runAsync, 'CREATE INDEX IF NOT EXISTS idx_mutuus_target_date ON mutuus_milestones(target_date)', 'idx_mutuus_target_date');

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}
