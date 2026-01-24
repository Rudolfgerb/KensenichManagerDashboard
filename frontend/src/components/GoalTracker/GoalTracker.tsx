import { useState, useEffect } from 'react';
import axios from 'axios';
import './GoalTracker.css';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  progress: number;
  metrics?: string;
  created_at: string;
}

export default function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  // const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'business',
    target_date: '',
    progress: 0
  });

  useEffect(() => {
    loadGoals();
  }, [filterStatus]);

  const loadGoals = async () => {
    try {
      const url = filterStatus === 'all'
        ? '/api/goals'
        : `/api/goals?status=${filterStatus}`;
      const res = await axios.get(url);
      setGoals(res.data);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const handleAddGoal = async () => {
    try {
      await axios.post('/api/goals', newGoal);
      setShowAddGoal(false);
      setNewGoal({
        title: '',
        description: '',
        category: 'business',
        target_date: '',
        progress: 0
      });
      loadGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleUpdateProgress = async (goalId: string, newProgress: number) => {
    try {
      const status = newProgress >= 100 ? 'completed' : 'active';
      await axios.put(`/api/goals/${goalId}`, { progress: newProgress, status });
      loadGoals();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleToggleStatus = async (goal: Goal) => {
    try {
      const newStatus = goal.status === 'active' ? 'paused' : 'active';
      await axios.put(`/api/goals/${goal.id}`, { status: newStatus });
      loadGoals();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'business': return '💼';
      case 'career': return '🎯';
      case 'personal': return '🌟';
      case 'health': return '💪';
      case 'mutuus': return '🚀';
      default: return '📌';
    }
  };

  const getDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const now = new Date();
    const target = new Date(targetDate);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="goal-tracker-container">
      <div className="goals-header">
        <h1>Ziele & Fortschritt</h1>
        <button className="btn btn-primary" onClick={() => setShowAddGoal(true)}>
          + Neues Ziel
        </button>
      </div>

      <div className="goals-filters">
        {['active', 'completed', 'paused', 'all'].map(status => (
          <button
            key={status}
            className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'active' ? 'Aktiv' : status === 'completed' ? 'Erreicht' : status === 'paused' ? 'Pausiert' : 'Alle'}
          </button>
        ))}
      </div>

      <div className="goals-grid">
        {goals.map(goal => {
          const daysRemaining = getDaysRemaining(goal.target_date);

          return (
            <div key={goal.id} className={`goal-card ${goal.status}`}>
              <div className="goal-header">
                <div className="goal-icon">{getCategoryIcon(goal.category)}</div>
                <div className="goal-title-area">
                  <h3>{goal.title}</h3>
                  {goal.category && <span className="category">{goal.category}</span>}
                </div>
                <button
                  className="toggle-btn"
                  onClick={() => handleToggleStatus(goal)}
                  title={goal.status === 'active' ? 'Pausieren' : 'Aktivieren'}
                >
                  {goal.status === 'active' ? '⏸️' : '▶️'}
                </button>
              </div>

              {goal.description && (
                <p className="goal-description">{goal.description}</p>
              )}

              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-label">Fortschritt</span>
                  <span className="progress-value">{goal.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress}
                  onChange={(e) => handleUpdateProgress(goal.id, parseInt(e.target.value))}
                  className="progress-slider"
                />
              </div>

              <div className="goal-footer">
                {goal.target_date && (
                  <div className="target-date">
                    <span className="date-icon">📅</span>
                    <span className="date-text">
                      {new Date(goal.target_date).toLocaleDateString('de-DE')}
                    </span>
                    {daysRemaining !== null && (
                      <span className={`days-remaining ${daysRemaining < 7 ? 'urgent' : ''}`}>
                        {daysRemaining > 0 ? `${daysRemaining}d` : daysRemaining === 0 ? 'Heute!' : 'Überfällig!'}
                      </span>
                    )}
                  </div>
                )}
                <span className={`status-badge ${goal.status}`}>{goal.status}</span>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="empty-state">
            <p>🎯 Keine Ziele gefunden</p>
            <button className="btn btn-secondary" onClick={() => setShowAddGoal(true)}>
              Erstes Ziel erstellen
            </button>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay" onClick={() => setShowAddGoal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Neues Ziel erstellen</h2>

            <div className="form-group">
              <label>Titel *</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                placeholder="z.B. Mutuus App launchen"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                placeholder="Was genau möchtest du erreichen?"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Kategorie</label>
              <select value={newGoal.category} onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}>
                <option value="business">💼 Business</option>
                <option value="career">🎯 Karriere</option>
                <option value="personal">🌟 Persönlich</option>
                <option value="health">💪 Gesundheit</option>
                <option value="mutuus">🚀 Mutuus</option>
              </select>
            </div>

            <div className="form-group">
              <label>Zieldatum</label>
              <input
                type="date"
                value={newGoal.target_date}
                onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAddGoal(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddGoal}
                disabled={!newGoal.title}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
