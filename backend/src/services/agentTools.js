import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Tools for the AI Assistant
 * Each tool has a description, parameters, and handler function
 */

export const AGENT_TOOLS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Dashboard Tools
  // ═══════════════════════════════════════════════════════════════════════════

  getDailyHabits: {
    name: 'getDailyHabits',
    description: 'Ruft die täglichen Gewohnheiten und deren aktuellen Fortschritt ab',
    parameters: {},
    handler: async (db) => {
      const today = new Date().toISOString().split('T')[0];

      // Reset habits if it's a new day
      await db.run(`
        UPDATE daily_habits
        SET checked_count = 0, completed = 0, last_reset = date('now')
        WHERE last_reset < date('now') OR last_reset IS NULL
      `);

      const habits = await db.all('SELECT * FROM daily_habits ORDER BY created_at');
      return habits.map(h => ({
        id: h.id,
        title: h.title,
        targetCount: h.target_count,
        checkedCount: h.checked_count,
        completed: h.completed === 1
      }));
    }
  },

  updateHabitProgress: {
    name: 'updateHabitProgress',
    description: 'Aktualisiert den Fortschritt einer täglichen Gewohnheit',
    parameters: {
      habitId: { type: 'string', description: 'Die ID des Habits', required: true },
      count: { type: 'number', description: 'Die neue Anzahl der erledigten Einheiten', required: true }
    },
    handler: async (db, { habitId, count }) => {
      const habit = await db.get('SELECT * FROM daily_habits WHERE id = ?', [habitId]);
      if (!habit) {
        return { success: false, error: 'Habit nicht gefunden' };
      }

      const completed = count >= habit.target_count ? 1 : 0;
      await db.run(`
        UPDATE daily_habits
        SET checked_count = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [count, completed, habitId]);

      return {
        success: true,
        habit: habit.title,
        newCount: count,
        targetCount: habit.target_count,
        completed: completed === 1
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Task Tools
  // ═══════════════════════════════════════════════════════════════════════════

  getTasks: {
    name: 'getTasks',
    description: 'Ruft Tasks ab, optional gefiltert nach Status (todo, in_progress, completed)',
    parameters: {
      status: { type: 'string', description: 'Status-Filter (optional)', required: false }
    },
    handler: async (db, { status } = {}) => {
      let query = 'SELECT * FROM tasks';
      const params = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY priority DESC, created_at DESC LIMIT 20';

      const tasks = await db.all(query, params);
      return tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        dueDate: t.due_date
      }));
    }
  },

  createTask: {
    name: 'createTask',
    description: 'Erstellt einen neuen Task',
    parameters: {
      title: { type: 'string', description: 'Titel des Tasks', required: true },
      priority: { type: 'number', description: 'Priorität (0-5)', required: false },
      category: { type: 'string', description: 'Kategorie', required: false },
      description: { type: 'string', description: 'Beschreibung', required: false }
    },
    handler: async (db, { title, priority = 0, category = 'general', description = '' }) => {
      const id = uuidv4();
      await db.run(`
        INSERT INTO tasks (id, title, description, priority, category, status)
        VALUES (?, ?, ?, ?, ?, 'todo')
      `, [id, title, description, priority, category]);

      return {
        success: true,
        taskId: id,
        message: `Task "${title}" wurde erstellt`
      };
    }
  },

  updateTaskStatus: {
    name: 'updateTaskStatus',
    description: 'Aktualisiert den Status eines Tasks',
    parameters: {
      taskId: { type: 'string', description: 'Task ID', required: true },
      status: { type: 'string', description: 'Neuer Status (todo, in_progress, completed)', required: true }
    },
    handler: async (db, { taskId, status }) => {
      await db.run(`
        UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [status, taskId]);
      return { success: true, message: `Task-Status auf "${status}" geändert` };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Session Tools
  // ═══════════════════════════════════════════════════════════════════════════

  getSessionStats: {
    name: 'getSessionStats',
    description: 'Ruft Statistiken über Arbeitssessions ab (heute, diese Woche, gesamt)',
    parameters: {},
    handler: async (db) => {
      const today = await db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as minutes
        FROM work_sessions
        WHERE date(started_at) = date('now') AND status = 'completed'
      `);

      const thisWeek = await db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as minutes
        FROM work_sessions
        WHERE date(started_at) >= date('now', 'weekday 0', '-7 days') AND status = 'completed'
      `);

      const total = await db.get(`
        SELECT COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as minutes
        FROM work_sessions WHERE status = 'completed'
      `);

      return {
        today: { sessions: today.count, minutes: today.minutes },
        thisWeek: { sessions: thisWeek.count, minutes: thisWeek.minutes },
        total: { sessions: total.count, minutes: total.minutes }
      };
    }
  },

  startSession: {
    name: 'startSession',
    description: 'Startet eine neue Pomodoro-Arbeitssession für einen Task',
    parameters: {
      taskId: { type: 'string', description: 'ID des Tasks', required: true }
    },
    handler: async (db, { taskId }) => {
      // Check if there's already a running session
      const running = await db.get("SELECT * FROM work_sessions WHERE status = 'running'");
      if (running) {
        return { success: false, error: 'Es läuft bereits eine Session' };
      }

      const task = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!task) {
        return { success: false, error: 'Task nicht gefunden' };
      }

      const sessionId = uuidv4();
      await db.run(`
        INSERT INTO work_sessions (id, task_id, started_at, status, duration_minutes)
        VALUES (?, ?, CURRENT_TIMESTAMP, 'running', 30)
      `, [sessionId, taskId]);

      // Update task status
      await db.run("UPDATE tasks SET status = 'in_progress' WHERE id = ?", [taskId]);

      return {
        success: true,
        sessionId,
        taskTitle: task.title,
        message: `Session für "${task.title}" gestartet (30 Min)`
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CRM Tools
  // ═══════════════════════════════════════════════════════════════════════════

  getContacts: {
    name: 'getContacts',
    description: 'Ruft Kontakte aus dem CRM ab, optional gefiltert nach Typ (client, partner, lead)',
    parameters: {
      type: { type: 'string', description: 'Kontakttyp-Filter', required: false }
    },
    handler: async (db, { type } = {}) => {
      let query = 'SELECT * FROM crm_contacts';
      const params = [];

      if (type) {
        query += ' WHERE type = ?';
        params.push(type);
      }

      query += ' ORDER BY last_contact DESC LIMIT 20';
      const contacts = await db.all(query, params);

      return contacts.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        email: c.email,
        company: c.company,
        lastContact: c.last_contact,
        nextFollowup: c.next_followup
      }));
    }
  },

  getOverdueFollowups: {
    name: 'getOverdueFollowups',
    description: 'Ruft überfällige Follow-ups ab',
    parameters: {},
    handler: async (db) => {
      const followups = await db.all(`
        SELECT * FROM crm_contacts
        WHERE next_followup < datetime('now')
        AND next_followup IS NOT NULL
        ORDER BY next_followup ASC
      `);

      return followups.map(c => ({
        id: c.id,
        name: c.name,
        company: c.company,
        email: c.email,
        overdueBy: c.next_followup
      }));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Goal Tools
  // ═══════════════════════════════════════════════════════════════════════════

  getGoals: {
    name: 'getGoals',
    description: 'Ruft Ziele ab, optional gefiltert nach Status (active, completed, paused)',
    parameters: {
      status: { type: 'string', description: 'Status-Filter', required: false }
    },
    handler: async (db, { status } = {}) => {
      let query = 'SELECT * FROM goals';
      const params = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';
      const goals = await db.all(query, params);

      return goals.map(g => ({
        id: g.id,
        title: g.title,
        category: g.category,
        status: g.status,
        progress: g.progress,
        targetDate: g.target_date
      }));
    }
  },

  updateGoalProgress: {
    name: 'updateGoalProgress',
    description: 'Aktualisiert den Fortschritt eines Ziels (0-100%)',
    parameters: {
      goalId: { type: 'string', description: 'Ziel-ID', required: true },
      progress: { type: 'number', description: 'Neuer Fortschritt (0-100)', required: true }
    },
    handler: async (db, { goalId, progress }) => {
      const clampedProgress = Math.max(0, Math.min(100, progress));
      const status = clampedProgress === 100 ? 'completed' : 'active';

      await db.run(`
        UPDATE goals
        SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [clampedProgress, status, goalId]);

      return {
        success: true,
        newProgress: clampedProgress,
        status
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Memory Tools
  // ═══════════════════════════════════════════════════════════════════════════

  saveUserFact: {
    name: 'saveUserFact',
    description: 'Speichert eine Information über den User (Präferenz, Info, Routine)',
    parameters: {
      key: { type: 'string', description: 'Schlüssel/Name der Information', required: true },
      value: { type: 'string', description: 'Wert der Information', required: true },
      category: { type: 'string', description: 'Kategorie (preference, info, routine, goal)', required: false }
    },
    handler: async (db, { key, value, category = 'info' }) => {
      const id = uuidv4();
      await db.run(`
        INSERT INTO ai_user_facts (id, key, value, category, source)
        VALUES (?, ?, ?, ?, 'explicit')
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `, [id, key, value, category]);

      return { success: true, message: `"${key}" wurde gespeichert` };
    }
  },

  getUserFacts: {
    name: 'getUserFacts',
    description: 'Ruft gespeicherte Informationen über den User ab',
    parameters: {
      category: { type: 'string', description: 'Kategorie-Filter', required: false }
    },
    handler: async (db, { category } = {}) => {
      let query = 'SELECT * FROM ai_user_facts';
      const params = [];

      if (category) {
        query += ' WHERE category = ?';
        params.push(category);
      }

      const facts = await db.all(query, params);
      return facts.map(f => ({
        key: f.key,
        value: f.value,
        category: f.category
      }));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // n8n Integration
  // ═══════════════════════════════════════════════════════════════════════════

  triggerN8nWorkflow: {
    name: 'triggerN8nWorkflow',
    description: 'Triggert einen n8n Workflow für komplexe Aktionen (Email, Calendar, Social Media)',
    parameters: {
      workflowId: { type: 'string', description: 'ID/Name des Workflows', required: true },
      data: { type: 'object', description: 'Daten für den Workflow', required: false }
    },
    handler: async (db, { workflowId, data = {} }) => {
      const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';

      try {
        const response = await axios.post(
          `${n8nUrl}/webhook/${workflowId}`,
          data,
          { timeout: 30000 }
        );
        return {
          success: true,
          message: `Workflow "${workflowId}" wurde getriggert`,
          response: response.data
        };
      } catch (error) {
        return {
          success: false,
          error: `n8n nicht erreichbar oder Workflow "${workflowId}" nicht gefunden`
        };
      }
    }
  }
};

/**
 * Get tool definitions for the AI prompt
 */
export function getToolDefinitions() {
  return Object.values(AGENT_TOOLS).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
}

/**
 * Execute a tool by name
 */
export async function executeTool(toolName, params, db) {
  const tool = AGENT_TOOLS[toolName];
  if (!tool) {
    return { error: `Tool "${toolName}" not found` };
  }

  try {
    const result = await tool.handler(db, params);
    return result;
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { error: error.message };
  }
}

export default AGENT_TOOLS;
