import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Terminal.css';

interface TerminalLine {
  type: 'command' | 'output' | 'error';
  content: string;
}

export default function Terminal() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: 'output', content: '💀🔮 KensenichManager Terminal v1.0' },
    { type: 'output', content: 'Erlaubte Commands: ls, pwd, cat, echo, claude, gemini, npm, node, git' },
    { type: 'output', content: 'Tipp: Nutze "claude" oder "gemini" für AI CLIs' },
    { type: 'output', content: '' }
  ]);
  const [input, setInput] = useState('');
  const [cwd] = useState('/home/pi2/Desktop');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [history]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    setHistory(prev => [...prev, { type: 'command', content: `$ ${command}` }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/terminal/execute', {
        command,
        cwd
      });

      if (res.data.success) {
        const output = res.data.stdout || res.data.stderr || '';
        if (output) {
          setHistory(prev => [...prev, {
            type: res.data.stderr ? 'error' : 'output',
            content: output
          }]);
        }
      } else {
        setHistory(prev => [...prev, {
          type: 'error',
          content: res.data.error || 'Command failed'
        }]);
      }
    } catch (error: any) {
      setHistory(prev => [...prev, {
        type: 'error',
        content: error.response?.data?.error || error.message || 'Unknown error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    }
  };

  const handleClear = () => {
    setHistory([
      { type: 'output', content: '🤖 Terminal cleared' },
      { type: 'output', content: '' }
    ]);
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-icon">💻</span>
          <h2>Terminal</h2>
        </div>
        <div className="terminal-controls">
          <span className="cwd-display">📁 {cwd}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>

      <div className="terminal-window" ref={terminalRef}>
        <div className="terminal-output">
          {history.map((line, idx) => (
            <div key={idx} className={`terminal-line ${line.type}`}>
              <pre>{line.content}</pre>
            </div>
          ))}
          {isLoading && (
            <div className="terminal-line loading">
              <span className="loader">⏳ Executing...</span>
            </div>
          )}
        </div>

        <div className="terminal-input-line">
          <span className="prompt">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="terminal-input"
            disabled={isLoading}
            autoFocus
          />
        </div>
      </div>

      <div className="terminal-footer">
        <div className="quick-commands">
          <button onClick={() => executeCommand('ls -la')}>ls -la</button>
          <button onClick={() => executeCommand('pwd')}>pwd</button>
          <button onClick={() => executeCommand('git status')}>git status</button>
        </div>
      </div>
    </div>
  );
}
