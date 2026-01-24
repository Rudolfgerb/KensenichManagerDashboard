import { useState, useEffect, useRef } from 'react';
import { chatWithAI } from '../../services/api';
import './AIAssistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-open and greet on first visit
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
      "Yo! 💀🔮 Willkommen im KensenichManager. Ich bin dein AI-Assistent und helfe dir produktiv zu bleiben!",
      "Hey! 👋 Kense hier. Lass uns zusammen deine Produktivität auf das nächste Level bringen!",
      "Servus! 🚀 Bereit durchzustarten? Ich bin hier um dir zu helfen!"
    ];

    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    setMessages([{
      role: 'assistant',
      content: randomGreeting
    }]);
    // setHasGreeted(true);
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

    try {
      const response = await chatWithAI(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        { app: 'BratanDrillManager' }
      );

      setMessages([
        ...newMessages,
        { role: 'assistant', content: response.data.message }
      ]);
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry Bratan, da ist etwas schiefgelaufen. Versuch es nochmal!' }
      ]);
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
              Online
            </span>
          </div>
        </div>
        <div className="ai-header-actions">
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
              placeholder="Frag Bratan was du willst..."
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
