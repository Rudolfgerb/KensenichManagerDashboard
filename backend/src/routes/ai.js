import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { db, runAsync, getAsync, allAsync } from '../db.js';
import { buildAgentContext, extractToolCalls, cleanResponse } from '../services/agentContext.js';
import { executeTool, getToolDefinitions } from '../services/agentTools.js';

dotenv.config();

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Promisified db methods for services
const dbWrapper = {
  run: (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),
  get: (sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  all: (sql, params) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  })
};

// Configuration for AI provider
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini'; // 'gemini' or 'ollama'
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

// Gemini model name - use gemini-1.5-flash (gemini-pro is deprecated)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Helper function to generate AI response
async function generateAIResponse(prompt) {
  if (AI_PROVIDER === 'ollama') {
    // Use Ollama
    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });
    return response.data.response;
  } else {
    // Use Gemini
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}

// Chat with AI (supports both Gemini and Ollama)
router.post('/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    const systemPrompt = `You are Kense, a personal AI assistant for the KensenichManager app.
You help with task management, productivity, content creation, and business management.
${context ? `Context: ${JSON.stringify(context)}` : ''}
Be concise, helpful, and proactive with a mystical edge.`;

    // Build conversation history
    const conversationHistory = messages.map(msg => {
      return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    }).join('\n');

    const lastMessage = messages[messages.length - 1];
    const fullPrompt = `${systemPrompt}\n\n${conversationHistory}\n\nAssistant:`;

    const text = await generateAIResponse(fullPrompt);

    res.json({
      message: text,
      provider: AI_PROVIDER,
      model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : GEMINI_MODEL
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate session summary
router.post('/summarize-session', async (req, res) => {
  try {
    const { documentation, taskTitle } = req.body;
    const prompt = `Task: ${taskTitle}\n\nDocumentation: ${documentation}\n\nCreate a brief summary (2-3 sentences) of what was accomplished in this work session.`;

    const summary = await generateAIResponse(prompt);
    res.json({ summary });
  } catch (error) {
    console.error('Summarize session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze productivity patterns
router.post('/analyze-productivity', async (req, res) => {
  try {
    const { sessions } = req.body;
    const prompt = `Analyze these work sessions and provide productivity insights:\n\n${JSON.stringify(sessions, null, 2)}\n\nProvide:\n1. Patterns you notice\n2. Suggestions for improvement\n3. Best performing times/tasks`;

    const analysis = await generateAIResponse(prompt);
    res.json({ analysis });
  } catch (error) {
    console.error('Analyze productivity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate SOP from sessions
router.post('/generate-sop', async (req, res) => {
  try {
    if (!genAI && AI_PROVIDER !== 'ollama') {
      return res.status(500).json({ error: 'AI provider not configured' });
    }

    const { sessions, processName } = req.body;
    const prompt = `Based on these work sessions, create a Standard Operating Procedure (SOP) for "${processName}":\n\n${JSON.stringify(sessions, null, 2)}\n\nFormat as:\n1. Title\n2. Steps (numbered list)\n3. Estimated time\n4. Tips and best practices`;

    const sop = await generateAIResponse(prompt);
    res.json({ sop });
  } catch (error) {
    console.error('Generate SOP error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current AI provider configuration
router.get('/config', (req, res) => {
  res.json({
    provider: AI_PROVIDER,
    ollamaUrl: OLLAMA_API_URL,
    ollamaModel: OLLAMA_MODEL,
    geminiConfigured: !!genAI
  });
});

// Test Ollama connection
router.get('/test-ollama', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`);
    res.json({
      success: true,
      models: response.data.models || [],
      message: 'Ollama is running and available'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: `Cannot connect to Ollama at ${OLLAMA_API_URL}. Make sure Ollama is running.`
    });
  }
});

// Text to speech (using Web Speech API on frontend instead)
router.post('/speak', async (req, res) => {
  res.status(501).json({
    error: 'Use browser Web Speech API for TTS',
    suggestion: 'window.speechSynthesis.speak()'
  });
});

// Speech to text (using Web Speech API on frontend instead)
router.post('/transcribe', async (req, res) => {
  res.status(501).json({
    error: 'Use browser Web Speech API for STT',
    suggestion: 'webkitSpeechRecognition or SpeechRecognition'
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT CHAT WITH TOOL CALLING
// ═══════════════════════════════════════════════════════════════════════════

router.post('/agent/chat', async (req, res) => {
  try {
    const { messages, conversationId } = req.body;

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = uuidv4();
      await dbWrapper.run(
        'INSERT INTO ai_conversations (id, title) VALUES (?, ?)',
        [convId, 'Neue Konversation']
      );
    }

    // Build context-aware system prompt
    const systemPrompt = await buildAgentContext(dbWrapper);

    // Build conversation history
    const conversationHistory = messages.map(msg => {
      return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    }).join('\n');

    const fullPrompt = `${systemPrompt}\n\n${conversationHistory}\n\nAssistant:`;

    // Get AI response
    let aiResponse = await generateAIResponse(fullPrompt);

    // Check for tool calls
    const toolCalls = extractToolCalls(aiResponse);
    let toolResults = [];

    if (toolCalls.length > 0) {
      // Execute tools
      for (const call of toolCalls) {
        const result = await executeTool(call.toolName, call.params, dbWrapper);
        toolResults.push({
          tool: call.toolName,
          params: call.params,
          result
        });
      }

      // If tools were called, get a follow-up response with results
      const toolResultsPrompt = toolResults.map(tr =>
        `Tool ${tr.tool} returned: ${JSON.stringify(tr.result)}`
      ).join('\n');

      const followUpPrompt = `${fullPrompt}\n\n${cleanResponse(aiResponse)}\n\n[Tool Results]\n${toolResultsPrompt}\n\nBased on these tool results, provide a helpful response to the user:\n\nAssistant:`;

      aiResponse = await generateAIResponse(followUpPrompt);
    }

    // Clean response from any remaining tool call syntax
    const cleanedResponse = cleanResponse(aiResponse);

    // Save messages to conversation
    const userMsg = messages[messages.length - 1];
    await dbWrapper.run(
      'INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      [uuidv4(), convId, 'user', userMsg.content]
    );
    await dbWrapper.run(
      'INSERT INTO ai_messages (id, conversation_id, role, content, tool_name, tool_result) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), convId, 'assistant', cleanedResponse,
       toolResults.length > 0 ? toolResults.map(t => t.tool).join(',') : null,
       toolResults.length > 0 ? JSON.stringify(toolResults) : null]
    );

    // Update conversation title from first message
    if (messages.length === 1) {
      const title = userMsg.content.substring(0, 50) + (userMsg.content.length > 50 ? '...' : '');
      await dbWrapper.run(
        'UPDATE ai_conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, convId]
      );
    }

    res.json({
      message: cleanedResponse,
      conversationId: convId,
      toolsUsed: toolResults.map(t => t.tool),
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      provider: AI_PROVIDER
    });
  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION MEMORY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Get all conversations
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await dbWrapper.all(
      'SELECT * FROM ai_conversations ORDER BY updated_at DESC LIMIT 50'
    );
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation with messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await dbWrapper.get(
      'SELECT * FROM ai_conversations WHERE id = ?',
      [req.params.id]
    );
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await dbWrapper.all(
      'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json({ ...conversation, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new conversation
router.post('/conversations', async (req, res) => {
  try {
    const id = uuidv4();
    const { title } = req.body;
    await dbWrapper.run(
      'INSERT INTO ai_conversations (id, title) VALUES (?, ?)',
      [id, title || 'Neue Konversation']
    );
    res.json({ id, title: title || 'Neue Konversation' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    await dbWrapper.run('DELETE FROM ai_conversations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// USER FACTS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Get all user facts
router.get('/facts', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM ai_user_facts';
    const params = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';
    const facts = await dbWrapper.all(query, params);
    res.json(facts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save user fact
router.post('/facts', async (req, res) => {
  try {
    const { key, value, category } = req.body;
    const id = uuidv4();

    await dbWrapper.run(`
      INSERT INTO ai_user_facts (id, key, value, category, source)
      VALUES (?, ?, ?, ?, 'explicit')
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        updated_at = CURRENT_TIMESTAMP
    `, [id, key, value, category || 'info']);

    res.json({ success: true, id, key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user fact
router.delete('/facts/:id', async (req, res) => {
  try {
    await dbWrapper.run('DELETE FROM ai_user_facts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DAILY HABITS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Get daily habits
router.get('/habits', async (req, res) => {
  try {
    // Check if we need to reset (new day)
    const habitsToReset = await dbWrapper.all(`
      SELECT * FROM daily_habits
      WHERE last_reset < date('now') OR last_reset IS NULL
    `);

    // Save yesterday's progress to history before reset
    for (const habit of habitsToReset) {
      if (habit.checked_count > 0 || habit.completed) {
        const historyDate = habit.last_reset || new Date().toISOString().split('T')[0];
        await dbWrapper.run(`
          INSERT OR REPLACE INTO daily_habits_history
          (id, habit_id, habit_title, date, target_count, checked_count, completed)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          `${habit.id}-${historyDate}`,
          habit.id,
          habit.title,
          historyDate,
          habit.target_count,
          habit.checked_count,
          habit.completed
        ]);
      }
    }

    // Now reset for new day
    if (habitsToReset.length > 0) {
      await dbWrapper.run(`
        UPDATE daily_habits
        SET checked_count = 0, completed = 0, last_reset = date('now')
        WHERE last_reset < date('now') OR last_reset IS NULL
      `);
    }

    const habits = await dbWrapper.all('SELECT * FROM daily_habits ORDER BY created_at');
    res.json(habits.map(h => ({
      id: h.id,
      title: h.title,
      targetCount: h.target_count,
      checkedCount: h.checked_count,
      completed: h.completed === 1
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update habit progress
router.put('/habits/:id', async (req, res) => {
  try {
    const { checkedCount, title, targetCount } = req.body;
    const habit = await dbWrapper.get('SELECT * FROM daily_habits WHERE id = ?', [req.params.id]);

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    // Determine if we need to update title/targetCount or just progress
    let updateFields = 'updated_at = CURRENT_TIMESTAMP';
    let updateParams = [];

    if (checkedCount !== undefined) {
      const completed = checkedCount >= (targetCount || habit.target_count) ? 1 : 0;
      updateFields += ', checked_count = ?, completed = ?';
      updateParams.push(checkedCount, completed);
    }

    if (title !== undefined && title !== habit.title) {
      updateFields += ', title = ?';
      updateParams.push(title);
    }

    if (targetCount !== undefined && targetCount !== habit.target_count) {
      updateFields += ', target_count = ?';
      updateParams.push(targetCount);
    }

    updateParams.push(req.params.id);

    await dbWrapper.run(`
      UPDATE daily_habits
      SET ${updateFields}
      WHERE id = ?
    `, updateParams);

    // Get updated habit
    const updatedHabit = await dbWrapper.get('SELECT * FROM daily_habits WHERE id = ?', [req.params.id]);

    res.json({
      id: updatedHabit.id,
      title: updatedHabit.title,
      targetCount: updatedHabit.target_count,
      checkedCount: updatedHabit.checked_count,
      completed: updatedHabit.completed === 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get habits history
router.get('/habits/history', async (req, res) => {
  try {
    const { days = 30, habitId } = req.query;

    let query = `
      SELECT * FROM daily_habits_history
      WHERE date >= date('now', '-${parseInt(days)} days')
    `;
    const params = [];

    if (habitId) {
      query += ' AND habit_id = ?';
      params.push(habitId);
    }

    query += ' ORDER BY date DESC';

    const history = await dbWrapper.all(query, params);
    res.json(history.map(h => ({
      id: h.id,
      habitId: h.habit_id,
      habitTitle: h.habit_title,
      date: h.date,
      targetCount: h.target_count,
      checkedCount: h.checked_count,
      completed: h.completed === 1
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get habits statistics
router.get('/habits/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Total completed days per habit
    const completedStats = await dbWrapper.all(`
      SELECT habit_id, habit_title,
             COUNT(*) as total_days,
             SUM(completed) as completed_days,
             SUM(checked_count) as total_count,
             AVG(checked_count) as avg_count
      FROM daily_habits_history
      WHERE date >= date('now', '-${parseInt(days)} days')
      GROUP BY habit_id
    `);

    // Current streak per habit
    const habits = await dbWrapper.all('SELECT * FROM daily_habits');
    const streaks = [];

    for (const habit of habits) {
      const history = await dbWrapper.all(`
        SELECT date, completed FROM daily_habits_history
        WHERE habit_id = ?
        ORDER BY date DESC
        LIMIT ${parseInt(days)}
      `, [habit.id]);

      let streak = 0;
      for (const day of history) {
        if (day.completed) {
          streak++;
        } else {
          break;
        }
      }

      streaks.push({
        habitId: habit.id,
        habitTitle: habit.title,
        currentStreak: streak
      });
    }

    res.json({
      completionStats: completedStats.map(s => ({
        habitId: s.habit_id,
        habitTitle: s.habit_title,
        totalDays: s.total_days,
        completedDays: s.completed_days,
        totalCount: s.total_count,
        avgCount: Math.round(s.avg_count * 10) / 10,
        completionRate: Math.round((s.completed_days / s.total_days) * 100)
      })),
      streaks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new habit
router.post('/habits', async (req, res) => {
  try {
    const { title, targetCount = 5 } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = uuidv4();
    await dbWrapper.run(`
      INSERT INTO daily_habits (id, title, target_count, last_reset)
      VALUES (?, ?, ?, date('now'))
    `, [id, title, targetCount]);

    res.json({
      id,
      title,
      targetCount,
      checkedCount: 0,
      completed: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete habit
router.delete('/habits/:id', async (req, res) => {
  try {
    await dbWrapper.run('DELETE FROM daily_habits WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available tools
router.get('/tools', (req, res) => {
  res.json(getToolDefinitions());
});

export default router;
