import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

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

export default router;
