import { useState, useEffect } from 'react';
import axios from 'axios';
import './GoalTracker.css';

interface GoalTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: number; // 0=low, 1=normal, 2=high, 3=critical
  difficulty: number; // 1=easy, 2=medium, 3=hard
  goal_id: string;
  parent_task_id?: string;
  due_date?: string;
  estimated_sessions: number;
  tags?: string;
  order_index: number;
  created_at: string;
  completed_at?: string;
  subtasks?: GoalTask[];
  depends_on?: string;
  depends_on_parsed?: string[];
  is_blocked?: boolean;
  blocking_tasks?: { id: string; title: string }[];
}

interface TaskStats {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  critical_tasks: number;
  high_priority_tasks: number;
  hard_tasks: number;
  medium_tasks: number;
  completion_history: { date: string; completed_count: number }[];
  session_stats: {
    avg_session_duration: number;
    total_time_spent: number;
    total_sessions: number;
  };
}

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

const PRIORITY_CONFIG = {
  0: { label: 'Niedrig', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.2)' },
  1: { label: 'Normal', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
  2: { label: 'Hoch', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.2)' },
  3: { label: 'Kritisch', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' }
};

const DIFFICULTY_CONFIG = {
  1: { label: 'Einfach', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.2)', icon: '⚡' },
  2: { label: 'Mittel', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.2)', icon: '⚡⚡' },
  3: { label: 'Schwer', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)', icon: '⚡⚡⚡' }
};

export default function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<GoalTask | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats'>('tasks');
  const [showCompleted, setShowCompleted] = useState(false);

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'business',
    target_date: '',
    progress: 0
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 1,
    difficulty: 1,
    parent_task_id: '',
    due_date: '',
    estimated_sessions: 1,
    depends_on: [] as string[]
  });
  const [allTasksFlat, setAllTasksFlat] = useState<GoalTask[]>([]);

  useEffect(() => {
    loadGoals();
  }, [filterStatus]);

  useEffect(() => {
    if (selectedGoal) {
      loadTasks(selectedGoal.id);
      loadTaskStats(selectedGoal.id);
    }
  }, [selectedGoal, showCompleted]);

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

  const loadTasks = async (goalId: string) => {
    try {
      const res = await axios.get(`/api/goals/${goalId}/tasks?include_completed=${showCompleted}`);
      setTasks(res.data);
      // Flatten tasks for dependency selection
      const flattenTasks = (taskList: GoalTask[]): GoalTask[] => {
        return taskList.reduce((acc: GoalTask[], task) => {
          acc.push(task);
          if (task.subtasks) {
            acc.push(...flattenTasks(task.subtasks));
          }
          return acc;
        }, []);
      };
      setAllTasksFlat(flattenTasks(res.data));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTaskStats = async (goalId: string) => {
    try {
      const res = await axios.get(`/api/goals/${goalId}/tasks/stats`);
      setTaskStats(res.data);
    } catch (error) {
      console.error('Error loading task stats:', error);
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

  const handleAddTask = async () => {
    if (!selectedGoal) return;
    try {
      const taskData = {
        ...newTask,
        depends_on: newTask.depends_on.length > 0 ? newTask.depends_on : undefined
      };
      await axios.post(`/api/goals/${selectedGoal.id}/tasks`, taskData);
      setShowAddTask(false);
      setNewTask({
        title: '',
        description: '',
        priority: 1,
        difficulty: 1,
        parent_task_id: '',
        due_date: '',
        estimated_sessions: 1,
        depends_on: []
      });
      loadTasks(selectedGoal.id);
      loadTaskStats(selectedGoal.id);
      loadGoals();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedGoal || !editingTask) return;
    try {
      await axios.put(`/api/goals/${selectedGoal.id}/tasks/${editingTask.id}`, editingTask);
      setEditingTask(null);
      loadTasks(selectedGoal.id);
      loadTaskStats(selectedGoal.id);
      loadGoals();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleToggleTaskStatus = async (task: GoalTask) => {
    if (!selectedGoal) return;

    // Check if task is blocked when trying to complete
    if (task.status !== 'done' && task.is_blocked) {
      const blockerNames = task.blocking_tasks?.map(b => b.title).join(', ');
      alert(`Task ist blockiert! Zuerst erledigen: ${blockerNames}`);
      return;
    }

    const newStatus = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done';
    try {
      await axios.put(`/api/goals/${selectedGoal.id}/tasks/${task.id}`, { status: newStatus });
      loadTasks(selectedGoal.id);
      loadTaskStats(selectedGoal.id);
      loadGoals();
    } catch (error: any) {
      if (error.response?.data?.blockers) {
        alert(`Blockierende Tasks: ${error.response.data.blockers.join(', ')}`);
      } else {
        console.error('Error toggling task status:', error);
      }
    }
  };

  // Direkt als erledigt markieren (Checkbox) mit Bestätigung
  const handleCompleteTask = async (task: GoalTask) => {
    if (!selectedGoal) return;

    if (task.is_blocked) {
      const blockerNames = task.blocking_tasks?.map(b => b.title).join(', ');
      alert(`Task ist blockiert! Zuerst erledigen: ${blockerNames}`);
      return;
    }

    // Bestätigungsabfrage
    if (!confirm(`"${task.title}" als erledigt markieren?`)) return;

    try {
      await axios.put(`/api/goals/${selectedGoal.id}/tasks/${task.id}`, { status: 'done' });
      loadTasks(selectedGoal.id);
      loadTaskStats(selectedGoal.id);
      loadGoals();
    } catch (error: any) {
      if (error.response?.data?.blockers) {
        alert(`Blockierende Tasks: ${error.response.data.blockers.join(', ')}`);
      } else {
        console.error('Error completing task:', error);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedGoal || !confirm('Task wirklich löschen?')) return;
    try {
      await axios.delete(`/api/goals/${selectedGoal.id}/tasks/${taskId}`);
      loadTasks(selectedGoal.id);
      loadTaskStats(selectedGoal.id);
      loadGoals();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleStartSession = async (task: GoalTask) => {
    try {
      // Start a session with this task
      await axios.post('/api/sessions/start', { task_id: task.id });
      // Update task status to in_progress
      if (selectedGoal && task.status === 'todo') {
        await axios.put(`/api/goals/${selectedGoal.id}/tasks/${task.id}`, { status: 'in_progress' });
        loadTasks(selectedGoal.id);
      }
      alert('Session gestartet! Wechsle zum Dashboard für den Timer.');
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // const handleUpdateProgress = async (goalId: string, newProgress: number) => {
  //   try {
  //     const status = newProgress >= 100 ? 'completed' : 'active';
  //     await axios.put(`/api/goals/${goalId}`, { progress: newProgress, status });
  //     loadGoals();
  //   } catch (error) {
  //     console.error('Error updating progress:', error);
  //   }
  // };

  const handleToggleStatus = async (goal: Goal) => {
    try {
      const newStatus = goal.status === 'active' ? 'paused' : 'active';
      await axios.put(`/api/goals/${goal.id}`, { status: newStatus });
      loadGoals();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Ziel und alle zugehörigen Tasks wirklich löschen?')) return;
    try {
      await axios.delete(`/api/goals/${goalId}`);
      if (selectedGoal?.id === goalId) {
        setSelectedGoal(null);
        setTasks([]);
        setTaskStats(null);
      }
      loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
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

  const getTaskBorderColor = (task: GoalTask) => {
    const priorityColor = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.color || '#6b7280';
    return priorityColor;
  };

  const renderTask = (task: GoalTask, depth: number = 0) => {
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
    const difficultyConfig = DIFFICULTY_CONFIG[task.difficulty as keyof typeof DIFFICULTY_CONFIG];

    return (
      <div key={task.id} style={{ marginLeft: depth * 24 }}>
        <div
          className={`goal-task-item ${task.status} ${task.is_blocked ? 'blocked' : ''}`}
          style={{
            borderLeftColor: task.is_blocked ? '#6b7280' : getTaskBorderColor(task),
            borderLeftWidth: '4px',
            borderLeftStyle: 'solid',
            opacity: task.is_blocked ? 0.7 : 1
          }}
        >
          <div className="task-checkbox-area">
            <label className={`task-checkbox-label ${task.status} ${task.is_blocked ? 'blocked' : ''}`}>
              <input
                type="checkbox"
                checked={task.status === 'done'}
                disabled={task.is_blocked}
                onChange={() => {
                  if (task.status === 'done') {
                    handleToggleTaskStatus(task);
                  } else if (!task.is_blocked) {
                    // Direkt auf done setzen
                    handleCompleteTask(task);
                  }
                }}
                className="task-checkbox-input"
              />
              <span
                className={`task-checkbox-custom ${task.status} ${task.is_blocked ? 'blocked' : ''}`}
                title={task.is_blocked ? `Blockiert durch: ${task.blocking_tasks?.map(b => b.title).join(', ')}` : task.status === 'done' ? 'Klicken zum Zurücksetzen' : 'Klicken zum Abhaken'}
              >
                {task.is_blocked ? '🔒' : task.status === 'done' ? '✓' : ''}
              </span>
            </label>
          </div>

          <div className="task-content">
            <div className="task-title-row">
              <span className={`task-title ${task.status === 'done' ? 'completed' : ''} ${task.is_blocked ? 'blocked' : ''}`}>
                {task.title}
              </span>
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="subtask-count">🔗 {task.subtasks.length}</span>
              )}
              {task.is_blocked && (
                <span className="blocked-badge" title={`Wartet auf: ${task.blocking_tasks?.map(b => b.title).join(', ')}`}>
                  🔒 Blockiert
                </span>
              )}
              {task.depends_on_parsed && task.depends_on_parsed.length > 0 && !task.is_blocked && (
                <span className="chain-badge">⛓️ Kette</span>
              )}
            </div>

            {task.is_blocked && task.blocking_tasks && task.blocking_tasks.length > 0 && (
              <p className="blocking-info">
                ⏳ Wartet auf: {task.blocking_tasks.map(b => b.title).join(', ')}
              </p>
            )}

            {task.description && (
              <p className="task-description">{task.description}</p>
            )}

            <div className="task-meta">
              <span
                className="task-priority-badge"
                style={{ backgroundColor: priorityConfig.bgColor, color: priorityConfig.color }}
              >
                {priorityConfig.label}
              </span>
              <span
                className="task-difficulty-badge"
                style={{ backgroundColor: difficultyConfig.bgColor, color: difficultyConfig.color }}
              >
                {difficultyConfig.icon} {difficultyConfig.label}
              </span>
              {task.due_date && (
                <span className="task-due-date">
                  📅 {new Date(task.due_date).toLocaleDateString('de-DE')}
                </span>
              )}
              {task.estimated_sessions > 0 && (
                <span className="task-sessions">
                  🕐 {task.estimated_sessions} Session{task.estimated_sessions > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="task-actions">
            {task.status !== 'done' && !task.is_blocked && (
              <button
                className="task-action-btn start"
                onClick={() => handleStartSession(task)}
                title="Session starten"
              >
                ▶️
              </button>
            )}
            <button
              className="task-action-btn edit"
              onClick={() => setEditingTask(task)}
              title="Bearbeiten"
            >
              ✏️
            </button>
            <button
              className="task-action-btn add-chain"
              onClick={() => {
                setNewTask({ ...newTask, depends_on: [task.id], parent_task_id: '' });
                setShowAddTask(true);
              }}
              title="Folge-Task (Kette)"
            >
              ⛓️
            </button>
            <button
              className="task-action-btn add-sub"
              onClick={() => {
                setNewTask({ ...newTask, parent_task_id: task.id, depends_on: [] });
                setShowAddTask(true);
              }}
              title="Subtask hinzufügen"
            >
              ➕
            </button>
            <button
              className="task-action-btn delete"
              onClick={() => handleDeleteTask(task.id)}
              title="Löschen"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Render subtasks */}
        {task.subtasks && task.subtasks.map(subtask => renderTask(subtask, depth + 1))}
      </div>
    );
  };

  const renderStats = () => {
    if (!taskStats) return null;

    return (
      <div className="task-stats-container">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{taskStats.total_tasks}</div>
            <div className="stat-label">Gesamt Tasks</div>
          </div>
          <div className="stat-card completed">
            <div className="stat-value">{taskStats.completed_tasks}</div>
            <div className="stat-label">Erledigt</div>
          </div>
          <div className="stat-card in-progress">
            <div className="stat-value">{taskStats.in_progress_tasks}</div>
            <div className="stat-label">In Arbeit</div>
          </div>
          <div className="stat-card todo">
            <div className="stat-value">{taskStats.todo_tasks}</div>
            <div className="stat-label">Offen</div>
          </div>
        </div>

        <div className="stats-details">
          <div className="stats-section">
            <h4>Fortschritt</h4>
            <div className="progress-bar large">
              <div
                className="progress-fill"
                style={{ width: `${taskStats.completion_rate || 0}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(taskStats.completion_rate || 0)}% erledigt</span>
          </div>

          <div className="stats-section">
            <h4>Nach Priorität</h4>
            <div className="priority-breakdown">
              <div className="priority-item">
                <span className="dot critical"></span>
                <span>Kritisch: {taskStats.critical_tasks}</span>
              </div>
              <div className="priority-item">
                <span className="dot high"></span>
                <span>Hoch: {taskStats.high_priority_tasks}</span>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <h4>Nach Schwierigkeit</h4>
            <div className="difficulty-breakdown">
              <div className="difficulty-item">
                <span className="dot hard"></span>
                <span>Schwer: {taskStats.hard_tasks}</span>
              </div>
              <div className="difficulty-item">
                <span className="dot medium"></span>
                <span>Mittel: {taskStats.medium_tasks}</span>
              </div>
            </div>
          </div>

          {taskStats.session_stats && (
            <div className="stats-section">
              <h4>Session Statistiken</h4>
              <div className="session-stats">
                <p>🕐 Gesamt: {Math.round(taskStats.session_stats.total_time_spent || 0)} Min</p>
                <p>📊 Sessions: {taskStats.session_stats.total_sessions || 0}</p>
                <p>⌀ Dauer: {Math.round(taskStats.session_stats.avg_session_duration || 0)} Min</p>
              </div>
            </div>
          )}

          {taskStats.completion_history && taskStats.completion_history.length > 0 && (
            <div className="stats-section">
              <h4>Letzte Erledigungen</h4>
              <div className="completion-history">
                {taskStats.completion_history.map((day, idx) => (
                  <div key={idx} className="history-item">
                    <span className="history-date">
                      {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="history-count">{day.completed_count} Tasks</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="goal-tracker-container">
      <div className="goals-header">
        <h1>Ziele & Tasks</h1>
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

      <div className="goals-layout">
        {/* Goals List */}
        <div className="goals-sidebar">
          <h3>Ziele</h3>
          <div className="goals-list">
            {goals.map(goal => {
              const daysRemaining = getDaysRemaining(goal.target_date);

              return (
                <div
                  key={goal.id}
                  className={`goal-list-item ${goal.status} ${selectedGoal?.id === goal.id ? 'selected' : ''}`}
                  onClick={() => setSelectedGoal(goal)}
                >
                  <div className="goal-list-header">
                    <span className="goal-icon">{getCategoryIcon(goal.category)}</span>
                    <span className="goal-name">{goal.title}</span>
                    <div className="goal-list-actions">
                      <button
                        className="mini-btn"
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(goal); }}
                        title={goal.status === 'active' ? 'Pausieren' : 'Aktivieren'}
                      >
                        {goal.status === 'active' ? '⏸️' : '▶️'}
                      </button>
                      <button
                        className="mini-btn danger"
                        onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                        title="Löschen"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="goal-list-progress">
                    <div className="mini-progress-bar">
                      <div className="mini-progress-fill" style={{ width: `${goal.progress}%` }}></div>
                    </div>
                    <span className="progress-text">{goal.progress}%</span>
                  </div>
                  {daysRemaining !== null && (
                    <span className={`days-badge ${daysRemaining < 7 ? 'urgent' : ''}`}>
                      {daysRemaining > 0 ? `${daysRemaining}d` : daysRemaining === 0 ? 'Heute!' : 'Überfällig'}
                    </span>
                  )}
                </div>
              );
            })}

            {goals.length === 0 && (
              <div className="empty-goals">
                <p>Keine Ziele gefunden</p>
              </div>
            )}
          </div>
        </div>

        {/* Goal Detail / Tasks */}
        <div className="goal-detail-area">
          {selectedGoal ? (
            <>
              <div className="goal-detail-header">
                <div className="goal-detail-title">
                  <span className="goal-icon large">{getCategoryIcon(selectedGoal.category)}</span>
                  <div>
                    <h2>{selectedGoal.title}</h2>
                    {selectedGoal.description && (
                      <p className="goal-detail-desc">{selectedGoal.description}</p>
                    )}
                  </div>
                </div>
                <div className="goal-detail-meta">
                  <span className={`status-badge ${selectedGoal.status}`}>{selectedGoal.status}</span>
                  {selectedGoal.target_date && (
                    <span className="target-date">
                      📅 {new Date(selectedGoal.target_date).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
              </div>

              <div className="goal-tabs">
                <button
                  className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tasks')}
                >
                  📋 Tasks
                </button>
                <button
                  className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stats')}
                >
                  📊 Statistik
                </button>
              </div>

              {activeTab === 'tasks' ? (
                <div className="tasks-area">
                  <div className="tasks-toolbar">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(true)}>
                      + Neuer Task
                    </button>
                    <label className="show-completed-toggle">
                      <input
                        type="checkbox"
                        checked={showCompleted}
                        onChange={(e) => setShowCompleted(e.target.checked)}
                      />
                      Erledigte anzeigen
                    </label>
                  </div>

                  <div className="tasks-list">
                    {tasks.length > 0 ? (
                      tasks.map(task => renderTask(task))
                    ) : (
                      <div className="empty-tasks">
                        <p>🎯 Noch keine Tasks für dieses Ziel</p>
                        <button className="btn btn-secondary" onClick={() => setShowAddTask(true)}>
                          Ersten Task erstellen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                renderStats()
              )}
            </>
          ) : (
            <div className="no-goal-selected">
              <p>👈 Wähle ein Ziel aus der Liste</p>
              <p>oder erstelle ein neues Ziel</p>
            </div>
          )}
        </div>
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

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => { setShowAddTask(false); setNewTask({ ...newTask, parent_task_id: '', depends_on: [] }); }}>
          <div className="modal task-modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {newTask.parent_task_id ? 'Subtask hinzufügen' : newTask.depends_on.length > 0 ? '⛓️ Folge-Task erstellen' : 'Neuer Task'}
            </h2>

            {newTask.depends_on.length > 0 && (
              <div className="chain-info">
                <span className="chain-icon">⛓️</span>
                <span>Wird ausführbar nach: {allTasksFlat.filter(t => newTask.depends_on.includes(t.id)).map(t => t.title).join(', ')}</span>
              </div>
            )}

            <div className="form-group">
              <label>Titel *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Was soll erledigt werden?"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Weitere Details..."
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Priorität</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: parseInt(e.target.value)})}
                >
                  <option value={0}>🟢 Niedrig</option>
                  <option value={1}>🔵 Normal</option>
                  <option value={2}>🟡 Hoch</option>
                  <option value={3}>🔴 Kritisch</option>
                </select>
              </div>

              <div className="form-group">
                <label>Schwierigkeit</label>
                <select
                  value={newTask.difficulty}
                  onChange={(e) => setNewTask({...newTask, difficulty: parseInt(e.target.value)})}
                >
                  <option value={1}>⚡ Einfach</option>
                  <option value={2}>⚡⚡ Mittel</option>
                  <option value={3}>⚡⚡⚡ Schwer</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fällig am</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Geschätzte Sessions</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newTask.estimated_sessions}
                  onChange={(e) => setNewTask({...newTask, estimated_sessions: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            {/* Task Chain / Dependencies */}
            {!newTask.parent_task_id && allTasksFlat.length > 0 && (
              <div className="form-group">
                <label>⛓️ Abhängig von (Task-Kette)</label>
                <div className="dependency-select">
                  {allTasksFlat.filter(t => t.status !== 'done').map(task => (
                    <label key={task.id} className="dependency-option">
                      <input
                        type="checkbox"
                        checked={newTask.depends_on.includes(task.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTask({...newTask, depends_on: [...newTask.depends_on, task.id]});
                          } else {
                            setNewTask({...newTask, depends_on: newTask.depends_on.filter(id => id !== task.id)});
                          }
                        }}
                      />
                      <span className="dependency-title">{task.title}</span>
                      <span className={`dependency-status ${task.status}`}>
                        {task.status === 'todo' ? '○' : task.status === 'in_progress' ? '◐' : '✓'}
                      </span>
                    </label>
                  ))}
                </div>
                <small className="form-hint">Dieser Task wird erst ausführbar, wenn alle ausgewählten Tasks erledigt sind.</small>
              </div>
            )}

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => { setShowAddTask(false); setNewTask({ ...newTask, parent_task_id: '', depends_on: [] }); }}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddTask}
                disabled={!newTask.title}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal task-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Task bearbeiten</h2>

            <div className="form-group">
              <label>Titel *</label>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({...editingTask, status: e.target.value as GoalTask['status']})}
                >
                  <option value="todo">📋 Offen</option>
                  <option value="in_progress">🔄 In Arbeit</option>
                  <option value="done">✅ Erledigt</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priorität</label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({...editingTask, priority: parseInt(e.target.value)})}
                >
                  <option value={0}>🟢 Niedrig</option>
                  <option value={1}>🔵 Normal</option>
                  <option value={2}>🟡 Hoch</option>
                  <option value={3}>🔴 Kritisch</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Schwierigkeit</label>
                <select
                  value={editingTask.difficulty}
                  onChange={(e) => setEditingTask({...editingTask, difficulty: parseInt(e.target.value)})}
                >
                  <option value={1}>⚡ Einfach</option>
                  <option value={2}>⚡⚡ Mittel</option>
                  <option value={3}>⚡⚡⚡ Schwer</option>
                </select>
              </div>

              <div className="form-group">
                <label>Fällig am</label>
                <input
                  type="date"
                  value={editingTask.due_date || ''}
                  onChange={(e) => setEditingTask({...editingTask, due_date: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Geschätzte Sessions</label>
              <input
                type="number"
                min={1}
                max={20}
                value={editingTask.estimated_sessions}
                onChange={(e) => setEditingTask({...editingTask, estimated_sessions: parseInt(e.target.value) || 1})}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setEditingTask(null)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateTask}
                disabled={!editingTask.title}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
