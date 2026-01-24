import { useState } from 'react';
import { completeSession, summarizeSession } from '../../services/api';
import type { Task, WorkSession } from '../../types';
import './Documentation.css';

interface DocumentationModalProps {
  session: WorkSession;
  task: Task;
  onComplete: () => void;
}

export default function DocumentationModal({ session, task, onComplete }: DocumentationModalProps) {
  const [documentation, setDocumentation] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleVoiceInput = () => {
    // Check for browser support
    const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert('Spracherkennung wird in diesem Browser nicht unterstützt.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDocumentation((prev) => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      alert('Fehler bei der Spracherkennung: ' + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleGenerateSummary = async () => {
    if (!documentation.trim()) {
      alert('Bitte erst Dokumentation eingeben');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const result = await summarizeSession(documentation, task.title);
      setAiSummary(result.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('Fehler beim Generieren der Zusammenfassung');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSave = async () => {
    try {
      await completeSession(session.id, { documentation });
      onComplete();
    } catch (error) {
      console.error('Failed to save documentation:', error);
      alert('Fehler beim Speichern der Dokumentation');
    }
  };

  const handleSkip = () => {
    if (documentation.trim() && !window.confirm('Dokumentation verwerfen?')) {
      return;
    }
    onComplete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal documentation-modal">
        <h2>Session Dokumentation</h2>

        <div className="session-summary">
          <div className="summary-item">
            <span className="label">Task:</span>
            <span className="value">{task.title}</span>
          </div>
          <div className="summary-item">
            <span className="label">Dauer:</span>
            <span className="value">{session.duration_minutes} Minuten</span>
          </div>
        </div>

        <div className="form-group">
          <label>Was hast du in den letzten {session.duration_minutes} Minuten geschafft?</label>
          <textarea
            value={documentation}
            onChange={(e) => setDocumentation(e.target.value)}
            placeholder="Beschreibe kurz was du erreicht hast..."
            rows={6}
            autoFocus
          />
        </div>

        <div className="voice-controls">
          <button
            className={`btn btn-secondary voice-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceInput}
            disabled={isListening}
          >
            {isListening ? (
              <>
                <span className="pulse">🎤</span> Höre zu...
              </>
            ) : (
              <>
                🎤 Spracheingabe
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleGenerateSummary}
            disabled={!documentation.trim() || isGeneratingSummary}
          >
            {isGeneratingSummary ? '⏳ Generiere...' : '✨ AI Zusammenfassung'}
          </button>
        </div>

        {aiSummary && (
          <div className="ai-summary">
            <h4>AI Zusammenfassung:</h4>
            <p>{aiSummary}</p>
          </div>
        )}

        <div className="documentation-tips">
          <h4>💡 Tipps für gute Dokumentation:</h4>
          <ul>
            <li>Was war das Hauptziel?</li>
            <li>Was wurde konkret erreicht?</li>
            <li>Gab es Hindernisse oder Learnings?</li>
            <li>Was sind die nächsten Schritte?</li>
          </ul>
        </div>

        <div className="modal-buttons">
          <button className="btn btn-secondary" onClick={handleSkip}>
            Überspringen
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!documentation.trim()}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
