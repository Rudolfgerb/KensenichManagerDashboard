import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AIAssistant.css';

const API_URL = 'http://localhost:3001/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface LLMModel {
  id: string;
  name: string;
  provider: 'ollama' | 'lmstudio' | 'gemini' | 'openai';
  icon: string;
}

const AVAILABLE_MODELS: LLMModel[] = [
  { id: 'gemini', name: 'Google Gemini', provider: 'gemini', icon: '✨' },
  { id: 'ollama-llama3.2', name: 'Llama 3.2', provider: 'ollama', icon: '🦙' },
  { id: 'ollama-mistral', name: 'Mistral', provider: 'ollama', icon: '🌪️' },
  { id: 'ollama-codellama', name: 'CodeLlama', provider: 'ollama', icon: '💻' },
  { id: 'ollama-phi3', name: 'Phi-3', provider: 'ollama', icon: '🔬' },
  { id: 'ollama-qwen2.5', name: 'Qwen 2.5', provider: 'ollama', icon: '🐉' },
  { id: 'lmstudio', name: 'LM Studio', provider: 'lmstudio', icon: '🖥️' },
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMModel>(AVAILABLE_MODELS[0]);
  // const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isLmStudioConnected, setIsLmStudioConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<HTMLDivElement>(null);

  // Load saved model preference and conversations
  useEffect(() => {
    const savedModel = localStorage.getItem('bratanSelectedModel');
    if (savedModel) {
      const model = AVAILABLE_MODELS.find(m => m.id === savedModel);
      if (model) setSelectedModel(model);
    }
    checkConnections();
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/ai/conversations`);
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const response = await axios.get(`${API_URL}/ai/conversations/${convId}`);
      const conv = response.data;
      setConversationId(convId);
      setMessages(conv.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        toolsUsed: m.tool_name ? m.tool_name.split(',') : undefined
      })));
      setShowConversations(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    greetUser();
    setShowConversations(false);
  };

  // Check Ollama and LM Studio connections
  const checkConnections = async () => {
    const ollamaConfig = localStorage.getItem('ollamaConfig');
    const config = ollamaConfig ? JSON.parse(ollamaConfig) : { ollamaUrl: 'http://localhost:11434', lmStudioUrl: 'http://localhost:1234' };

    try {
      const response = await axios.get(`${config.ollamaUrl}/api/tags`, { timeout: 3000 });
      if (response.data?.models) {
        setOllamaModels(response.data.models.map((m: any) => m.name));
        setIsOllamaConnected(true);
      }
    } catch {
      setIsOllamaConnected(false);
    }

    try {
      await axios.get(`${config.lmStudioUrl}/v1/models`, { timeout: 3000 });
      setIsLmStudioConnected(true);
    } catch {
      setIsLmStudioConnected(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
      if (conversationsRef.current && !conversationsRef.current.contains(event.target as Node)) {
        setShowConversations(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelSelect = (model: LLMModel) => {
    setSelectedModel(model);
    localStorage.setItem('bratanSelectedModel', model.id);
    setShowModelSelector(false);
  };

  useEffect(() => {
    const greeted = localStorage.getItem('kenseGreeted');
    if (!greeted) {
      setTimeout(() => {
        setIsOpen(true);
        greetUser();
        localStorage.setItem('kenseGreeted', 'true');
      }, 1500);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const greetUser = () => {
    const greetings = [
      "Yo! 💀🔮 Willkommen im KensenichManager. Ich bin Bratan, dein AI-Assistent mit Zugriff auf deine Daten!",
      "Hey! 👋 Bratan hier. Ich kann deine Tasks, Habits und Goals direkt abrufen und bearbeiten!",
      "Servus! 🚀 Frag mich nach deinen Habits, Tasks oder lass mich Aktionen für dich ausführen!"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setMessages([{ role: 'assistant', content: randomGreeting }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ];

    setMessages(newMessages);
    setIsLoading(true);
    setToolStatus(null);

    try {
      let responseText = '';
      let toolsUsed: string[] = [];

      // Use Agent endpoint for Gemini (has tool calling)
      if (selectedModel.provider === 'gemini') {
        setToolStatus('Verarbeite...');
        const response = await axios.post(`${API_URL}/ai/agent/chat`, {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId
        }, { timeout: 120000 });

        responseText = response.data.message;
        toolsUsed = response.data.toolsUsed || [];

        if (!conversationId && response.data.conversationId) {
          setConversationId(response.data.conversationId);
          loadConversations();
        }

        if (toolsUsed.length > 0) {
          setToolStatus(`Tools: ${toolsUsed.join(', ')}`);
          setTimeout(() => setToolStatus(null), 3000);
        } else {
          setToolStatus(null);
        }
      } else if (selectedModel.provider === 'ollama') {
        const ollamaConfig = localStorage.getItem('ollamaConfig');
        const config = ollamaConfig ? JSON.parse(ollamaConfig) : { ollamaUrl: 'http://localhost:11434' };
        const modelName = selectedModel.id.replace('ollama-', '');

        const response = await axios.post(`${config.ollamaUrl}/api/generate`, {
          model: modelName,
          prompt: newMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\nAssistant:',
          stream: false
        }, { timeout: 60000 });

        responseText = response.data.response;
      } else if (selectedModel.provider === 'lmstudio') {
        const ollamaConfig = localStorage.getItem('ollamaConfig');
        const config = ollamaConfig ? JSON.parse(ollamaConfig) : { lmStudioUrl: 'http://localhost:1234' };

        const response = await axios.post(`${config.lmStudioUrl}/v1/chat/completions`, {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7,
          max_tokens: 2048
        }, { timeout: 60000 });

        responseText = response.data.choices[0].message.content;
      }

      setMessages([
        ...newMessages,
        { role: 'assistant', content: responseText, toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined }
      ]);
    } catch (error: any) {
      console.error('AI chat error:', error);
      const errorMsg = selectedModel.provider === 'ollama'
        ? `Ollama nicht erreichbar. Ist "${selectedModel.name}" installiert?`
        : selectedModel.provider === 'lmstudio'
        ? 'LM Studio nicht erreichbar.'
        : 'Sorry, da ist etwas schiefgelaufen. Versuch es nochmal!';

      setMessages([
        ...newMessages,
        { role: 'assistant', content: errorMsg }
      ]);
      setToolStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        className="ai-assistant-toggle"
        onClick={() => setIsOpen(true)}
        title="Bratan AI Assistant"
      >
        <div className="robot-icon">
          <div className="robot-head">
            <div className="robot-antenna"></div>
            <div className="robot-eyes">
              <div className="robot-eye left"></div>
              <div className="robot-eye right"></div>
            </div>
            <div className="robot-mouth"></div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className={`ai-assistant-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="ai-assistant-header">
        <div className="ai-header-left">
          <div className="robot-avatar">
            <div className="robot-head-small">
              <div className="robot-antenna-small"></div>
              <div className="robot-eyes-small">
                <div className="robot-eye-small left"></div>
                <div className="robot-eye-small right"></div>
              </div>
              <div className="robot-mouth-small"></div>
            </div>
          </div>
          <div className="ai-header-info">
            <h3>Bratan</h3>
            <span className="status">
              <span className="status-dot"></span>
              <span className="model-badge">{selectedModel.icon} {selectedModel.name}</span>
            </span>
          </div>
        </div>
        <div className="ai-header-actions">
          {/* Conversations Button */}
          <div className="conversations-wrapper" ref={conversationsRef}>
            <button
              className="header-btn"
              onClick={() => setShowConversations(!showConversations)}
              title="Konversationen"
            >
              💬
            </button>
            {showConversations && (
              <div className="conversations-dropdown">
                <div className="conversations-header">
                  <span>Konversationen</span>
                  <button className="new-conv-btn" onClick={startNewConversation}>+ Neu</button>
                </div>
                <div className="conversations-list">
                  {conversations.length === 0 ? (
                    <div className="no-conversations">Keine Konversationen</div>
                  ) : (
                    conversations.slice(0, 10).map(conv => (
                      <button
                        key={conv.id}
                        className={`conversation-item ${conversationId === conv.id ? 'active' : ''}`}
                        onClick={() => loadConversation(conv.id)}
                      >
                        <span className="conv-title">{conv.title}</span>
                        <span className="conv-date">
                          {new Date(conv.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Model Selector */}
          <div className="model-selector-wrapper" ref={modelSelectorRef}>
            <button
              className="header-btn settings-btn"
              onClick={() => setShowModelSelector(!showModelSelector)}
              title="Modell wählen"
            >
              ⚙️
            </button>
            {showModelSelector && (
              <div className="model-selector-dropdown">
                <div className="model-dropdown-header">
                  <span>🤖 LLM Modell</span>
                  <span className="current-model">{selectedModel.icon} {selectedModel.name}</span>
                </div>
                <div className="model-list">
                  {AVAILABLE_MODELS.map(model => {
                    const isDisabled =
                      (model.provider === 'ollama' && !isOllamaConnected) ||
                      (model.provider === 'lmstudio' && !isLmStudioConnected);

                    return (
                      <button
                        key={model.id}
                        className={`model-option ${selectedModel.id === model.id ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && handleModelSelect(model)}
                        disabled={isDisabled}
                      >
                        <span className="model-icon">{model.icon}</span>
                        <span className="model-name">{model.name}</span>
                        {selectedModel.id === model.id && <span className="model-check">✓</span>}
                        {isDisabled && <span className="model-status">Offline</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="model-dropdown-footer">
                  <div className="connection-status">
                    <span className={`status-indicator ${isOllamaConnected ? 'online' : 'offline'}`}>
                      🦙 Ollama {isOllamaConnected ? '✓' : '✗'}
                    </span>
                    <span className={`status-indicator ${isLmStudioConnected ? 'online' : 'offline'}`}>
                      🖥️ LM Studio {isLmStudioConnected ? '✓' : '✗'}
                    </span>
                  </div>
                  <button className="refresh-btn" onClick={checkConnections}>
                    🔄 Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            className="header-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '□' : '_'}
          </button>
          <button
            className="header-btn close-btn"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="ai-assistant-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message ${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="message-avatar">
                    <div className="robot-mini">🤖</div>
                  </div>
                )}
                <div className="message-content">
                  {msg.content}
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="tools-used">
                      🔧 {msg.toolsUsed.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">
                  <div className="robot-mini">🤖</div>
                </div>
                <div className="message-content typing">
                  <span></span><span></span><span></span>
                  {toolStatus && <div className="tool-status">{toolStatus}</div>}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-assistant-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Frag nach deinen Habits, Tasks, Goals..."
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  );
}
