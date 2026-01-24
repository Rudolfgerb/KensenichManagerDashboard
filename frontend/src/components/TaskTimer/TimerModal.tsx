import { useState, useEffect, useRef } from 'react';
import { startSession, stopSession, completeSession } from '../../services/api';
import type { Task, WorkSession } from '../../types';
import './TaskTimer.css';

interface TimerModalProps {
  task: Task;
  onComplete: (session: WorkSession) => void;
  onStop: () => void;
}

const TIMER_DURATION = 30 * 60; // 30 minutes in seconds

export default function TimerModal({ task, onComplete, onStop }: TimerModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Start session on mount
    initSession();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, secondsLeft]);

  const initSession = async () => {
    try {
      const session = await startSession({ task_id: task.id });
      setSessionId(session.id);
      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Fehler beim Starten der Session');
      onStop();
    }
  };

  const handleTimerEnd = async () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Auto-complete with empty documentation
    // User will add documentation in next modal
    try {
      const session = await completeSession(sessionId, { documentation: '' });
      onComplete(session);
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Session wirklich vorzeitig beenden?')) {
      return;
    }

    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    try {
      await stopSession(sessionId);
      onStop();
    } catch (error) {
      console.error('Failed to stop session:', error);
      onStop();
    }
  };

  const handleFinish = async () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    try {
      const session = await completeSession(sessionId, { documentation: '' });
      onComplete(session);
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((TIMER_DURATION - secondsLeft) / TIMER_DURATION) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="modal-overlay">
      <div className="modal timer-modal">
        <h2>{task.title}</h2>

        <div className="timer-container">
          <svg className="timer-circle" viewBox="0 0 260 260">
            <circle
              cx="130"
              cy="130"
              r="120"
              fill="none"
              stroke="#2a2a2a"
              strokeWidth="8"
            />
            <circle
              cx="130"
              cy="130"
              r="120"
              fill="none"
              stroke="#00ff88"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 130 130)"
              className="timer-progress"
            />
          </svg>

          <div className="timer-display">
            <div className="time">{formatTime(secondsLeft)}</div>
            <div className="label">
              {secondsLeft === 0 ? 'Fertig!' : isRunning ? 'Läuft...' : 'Pausiert'}
            </div>
          </div>
        </div>

        <div className="timer-info">
          <div className="info-item">
            <span className="info-label">Fortschritt</span>
            <span className="info-value">{Math.round(progress)}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">Verbleibend</span>
            <span className="info-value">{Math.ceil(secondsLeft / 60)} min</span>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn btn-danger" onClick={handleStop}>
            Stop
          </button>
          <button
            className="btn btn-primary"
            onClick={handleFinish}
            disabled={secondsLeft === TIMER_DURATION}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
