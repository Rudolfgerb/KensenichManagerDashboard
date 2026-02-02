import { getToolDefinitions } from './agentTools.js';

/**
 * Build dynamic system prompt with current context
 */
export async function buildAgentContext(db) {
  // Get daily habits
  let habits = [];
  try {
    // Reset habits if new day
    await db.run(`
      UPDATE daily_habits
      SET checked_count = 0, completed = 0, last_reset = date('now')
      WHERE last_reset < date('now') OR last_reset IS NULL
    `);
    habits = await db.all('SELECT * FROM daily_habits');
  } catch (e) {
    console.log('Habits table not ready yet');
  }

  // Get pending tasks
  let pendingTasks = [];
  try {
    pendingTasks = await db.all(`
      SELECT * FROM tasks
      WHERE status IN ('todo', 'in_progress')
      ORDER BY priority DESC
      LIMIT 5
    `);
  } catch (e) {
    console.log('Tasks table not ready yet');
  }

  // Get active goals
  let activeGoals = [];
  try {
    activeGoals = await db.all(`
      SELECT * FROM goals
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 5
    `);
  } catch (e) {
    console.log('Goals table not ready yet');
  }

  // Get overdue followups
  let followups = [];
  try {
    followups = await db.all(`
      SELECT * FROM crm_contacts
      WHERE next_followup < datetime('now')
      AND next_followup IS NOT NULL
    `);
  } catch (e) {
    console.log('CRM table not ready yet');
  }

  // Get user facts
  let userFacts = [];
  try {
    userFacts = await db.all('SELECT * FROM ai_user_facts LIMIT 20');
  } catch (e) {
    console.log('User facts table not ready yet');
  }

  // Get session stats for today
  let todayStats = { count: 0, minutes: 0 };
  try {
    todayStats = await db.get(`
      SELECT COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as minutes
      FROM work_sessions
      WHERE date(started_at) = date('now') AND status = 'completed'
    `) || { count: 0, minutes: 0 };
  } catch (e) {
    console.log('Sessions table not ready yet');
  }

  // Build tool descriptions
  const tools = getToolDefinitions();
  const toolDescriptions = tools.map(t => {
    const params = Object.entries(t.parameters || {})
      .map(([name, info]) => `${name}${info.required ? '' : '?'}`)
      .join(', ');
    return `- ${t.name}(${params}) - ${t.description}`;
  }).join('\n');

  // Format habits section
  const habitsSection = habits.length > 0
    ? habits.map(h => {
        const progress = `${h.checked_count}/${h.target_count}`;
        const status = h.completed ? '✅' : '';
        return `  • ${h.title}: ${progress} ${status}`;
      }).join('\n')
    : '  Keine Habits definiert';

  // Format tasks section
  const tasksSection = pendingTasks.length > 0
    ? pendingTasks.map(t => {
        const stars = '★'.repeat(t.priority || 0);
        return `  • ${t.title} [${stars || '○'}]`;
      }).join('\n')
    : '  Keine offenen Tasks';

  // Format goals section
  const goalsSection = activeGoals.length > 0
    ? activeGoals.map(g => `  • ${g.title}: ${g.progress || 0}%`).join('\n')
    : '  Keine aktiven Ziele';

  // Format user facts section
  const factsSection = userFacts.length > 0
    ? userFacts.map(f => `- ${f.key}: ${f.value}`).join('\n')
    : 'Noch keine Informationen über den User gespeichert.';

  return `Du bist Bratan, der persönliche AI-Assistent im KensenichManager.
Du hilfst dem User bei Produktivität, Task-Management, Zielen und Business.

═══ ÜBER DEN USER ═══
${factsSection}

═══ AKTUELLER STATUS ═══

📊 Tägliche Habits:
${habitsSection}

📋 Offene Tasks (${pendingTasks.length}):
${tasksSection}

🎯 Aktive Ziele (${activeGoals.length}):
${goalsSection}

📞 Überfällige Follow-ups: ${followups.length}

⏱️ Heute: ${todayStats.count} Sessions (${todayStats.minutes} Min)

═══ VERFÜGBARE TOOLS ═══
Du kannst folgende Aktionen ausführen. Wenn der User nach Daten fragt oder Aktionen will, nutze die passenden Tools:

${toolDescriptions}

═══ TOOL CALLING ═══
Wenn du ein Tool ausführen willst, antworte mit diesem Format:
[TOOL_CALL: toolName({"param": "value"})]

Beispiele:
- User fragt "Wie viele Bewerbungen heute?" → [TOOL_CALL: getDailyHabits({})]
- User sagt "Erstelle Task Portfolio" → [TOOL_CALL: createTask({"title": "Portfolio aktualisieren", "priority": 3})]
- User sagt "Ich arbeite gerne morgens" → [TOOL_CALL: saveUserFact({"key": "Arbeitszeit-Präferenz", "value": "morgens", "category": "preference"})]

═══ REGELN ═══
- Antworte auf Deutsch
- Sei proaktiv und hilfsbereit
- Nutze Tools um Informationen abzurufen statt zu raten
- Merke dir wichtige Informationen über den User mit saveUserFact
- Bei komplexen Aktionen (Email, Calendar) nutze triggerN8nWorkflow
- Halte Antworten kurz und prägnant`;
}

/**
 * Extract tool calls from AI response
 */
export function extractToolCalls(response) {
  const toolCallRegex = /\[TOOL_CALL:\s*(\w+)\((.*?)\)\]/g;
  const calls = [];
  let match;

  while ((match = toolCallRegex.exec(response)) !== null) {
    try {
      const toolName = match[1];
      const paramsStr = match[2] || '{}';
      const params = JSON.parse(paramsStr);
      calls.push({ toolName, params });
    } catch (e) {
      console.error('Failed to parse tool call:', match[0], e);
    }
  }

  return calls;
}

/**
 * Remove tool call syntax from response for clean display
 */
export function cleanResponse(response) {
  return response.replace(/\[TOOL_CALL:\s*\w+\(.*?\)\]/g, '').trim();
}

export default { buildAgentContext, extractToolCalls, cleanResponse };
