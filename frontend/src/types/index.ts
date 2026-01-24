export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: number;
  estimated_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface WorkSession {
  id: string;
  task_id: string;
  task_title?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes: number;
  status: 'running' | 'completed' | 'stopped';
  documentation?: string;
  ai_summary?: string;
  created_at: string;
}

export interface SOP {
  id: string;
  title: string;
  process_type?: string;
  steps: string[];
  created_from_sessions: string[];
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  parent_id?: string;
  title: string;
  blocks: Block[];
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  type: 'text' | 'heading' | 'task' | 'table' | 'checklist';
  content: string;
  metadata?: Record<string, any>;
}

export interface ContentIdea {
  id: string;
  title: string;
  description?: string;
  platform?: string;
  category?: string;
  status: 'idea' | 'in_progress' | 'ready' | 'published';
  priority: number;
  thumbnail_url?: string;
  notes?: string;
  target_date?: string;
  published_date?: string;
  created_at: string;
  updated_at: string;
  elements?: ContentElement[];
  images?: ContentImage[];
}

export interface ContentElement {
  id: string;
  content_id: string;
  element_type: 'hook' | 'caption' | 'text' | 'voiceover' | 'script' |
                 'transitions' | 'animations' | 'stickers' | 'videos' | 'music' | 'custom';
  title?: string;
  content?: string;
  file_path?: string;
  file_url?: string;
  status: 'missing' | 'draft' | 'ready' | 'approved';
  notes?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ContentArchive {
  id: string;
  title: string;
  element_type: string;
  content?: string;
  file_path?: string;
  file_url?: string;
  tags?: string;
  usage_count: number;
  last_used?: string;
  platform?: string;
  category?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  images?: ContentImage[];
}

export interface ContentImage {
  id: string;
  content_id?: string;
  archive_id?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  width?: number;
  height?: number;
  alt_text?: string;
  tags?: string;
  uploaded_at: string;
}

export interface ContentStats {
  total: number;
  ideas: number;
  in_progress: number;
  ready: number;
  published: number;
}

// Project Management Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  color?: string;
  icon?: string;
  start_date?: string;
  target_launch_date?: string;
  actual_launch_date?: string;
  website_url?: string;
  repository_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  assets?: BrandingAsset[];
  documents?: ProjectDocument[];
  milestones?: ProjectMilestone[];
}

export interface BrandingAsset {
  id: string;
  project_id: string;
  asset_type: 'logo' | 'color_palette' | 'typography' | 'icon' | 'image' | 'video' | 'template' | 'other';
  title: string;
  description?: string;
  file_path?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  version: string;
  tags?: string;
  is_primary: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: 'prd' | 'pitch_deck' | 'business_plan' | 'roadmap' | 'design_spec' | 'other';
  title: string;
  content?: string;
  file_path?: string;
  file_url?: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  last_edited_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_date?: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  assets: number;
  documents: number;
  milestones: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
}

// CRM Types
export interface Contact {
  id: string;
  name: string;
  type: 'client' | 'partner' | 'lead' | 'other';
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  last_contact?: string;
  next_followup?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface Communication {
  id: string;
  contact_id: string;
  type: 'email' | 'call' | 'meeting' | 'message';
  subject?: string;
  content?: string;
  direction: 'incoming' | 'outgoing';
  status: 'sent' | 'received' | 'scheduled';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

// Goal Tracking Types
export interface Goal {
  id: string;
  title: string;
  description?: string;
  category?: 'business' | 'career' | 'personal' | 'health' | 'other';
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  progress: number;
  metrics?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
  abandoned: number;
  average_progress: number;
}

// Sales Pipeline Types
export interface Deal {
  id: string;
  contact_id?: string;
  contact_name?: string;
  title: string;
  description?: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  actual_close_date?: string;
  status: 'active' | 'won' | 'lost';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  variables?: string;
  created_at: string;
  updated_at: string;
}

export interface Automation {
  id: string;
  name: string;
  trigger_type: 'contact_added' | 'deal_stage_change' | 'followup_due' | 'manual';
  action_type: 'send_email' | 'create_task' | 'update_deal' | 'notify';
  config: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Job Search Types
export interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  applied_date?: string;
  interview_date?: string;
  notes?: string;
  salary_range?: string;
  job_url?: string;
  contact_person?: string;
  created_at: string;
  updated_at: string;
}

// Mutuus Launch Types
export interface MutuusMilestone {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  dependencies?: string;
  created_at: string;
  updated_at: string;
}

// Integration Types
export interface Integration {
  id: string;
  name: string;
  category?: string;
  api_key?: string;
  config?: string;
  connected: number;
  created_at: string;
  updated_at: string;
}

// Dashboard Stats Types
export interface SessionStats {
  total_sessions: number;
  total_minutes: number;
  sessions_today: number;
  minutes_today: number;
  sessions_this_week: number;
  minutes_this_week: number;
  average_session_length: number;
}

export interface DashboardStats {
  sessions: SessionStats;
  tasks: {
    total: number;
    todo: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  goals: GoalStats;
  content: ContentStats;
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  crm: {
    total_contacts: number;
    overdue_followups: number;
    recent_communications: number;
  };
}

// API Response Types
export interface APIResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    stack?: string;
    details?: any;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// AI Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIContext {
  current_task?: string;
  active_sessions?: number;
  recent_activity?: string[];
  [key: string]: any;
}

// Theme Types
export type ThemeMode = 'dark' | 'light';

export interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

// Form Data Types
export interface CreateTaskDTO {
  title: string;
  description?: string;
  priority?: number;
  category?: string;
  estimated_sessions?: number;
  due_date?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority?: number;
  category?: string;
}

export interface CreateContactDTO {
  name: string;
  type?: 'client' | 'partner' | 'lead' | 'other';
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  next_followup?: string;
}

export interface CreateGoalDTO {
  title: string;
  description?: string;
  category?: 'business' | 'career' | 'personal' | 'health' | 'other';
  target_date?: string;
  progress?: number;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  status?: 'active' | 'paused' | 'completed' | 'archived';
  color?: string;
  icon?: string;
  website_url?: string;
  repository_url?: string;
}

export interface StartSessionDTO {
  task_id: string;
  duration_minutes?: number;
}

export interface CompleteSessionDTO {
  documentation?: string;
}
