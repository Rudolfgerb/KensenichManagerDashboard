import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TaskSelection from '../TaskTimer/TaskSelection';
import TimerModal from '../TaskTimer/TimerModal';
import DocumentationModal from '../TaskDocumentation/DocumentationModal';
import { DailyTaskTracker } from '../DailyTaskTracker';
import type { Task, WorkSession } from '../../types';
import './Dashboard.css';

// Daily Habit Interface
interface DailyHabit {
  id: string;
  title: string;
  targetCount: number;
  checkedCount: number;
  completed: boolean;
}

// Performance History Entry
interface PerformanceEntry {
  date: string;
  habitsCompleted: number;
  totalHabits: number;
  completionRate: number;
  streak: number;
}

// Get today's date string
const getTodayDateString = () => new Date().toISOString().split('T')[0];

export default function Dashboard() {
  const navigate = useNavigate();
  const [showTaskSelection, setShowTaskSelection] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);

  // Stats from different modules
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [contentStats, setContentStats] = useState<any>(null);
  const [goalStats, setGoalStats] = useState<any>(null);
  const [crmStats, setCrmStats] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<WorkSession[]>([]);
  const [recentContent, setRecentContent] = useState<any[]>([]);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);

  // New dashboard widgets
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [activeApplications, setActiveApplications] = useState<any[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);

  // Ticker data
  const [tickerGoals, setTickerGoals] = useState<any[]>([]);
  const [tickerTasks, setTickerTasks] = useState<any[]>([]);

  // Daily Habits State
  const [dailyHabits, setDailyHabits] = useState<DailyHabit[]>([
    { id: '1', title: 'Bewerbungen schreiben', targetCount: 5, checkedCount: 0, completed: false },
    { id: '2', title: 'Outreach Kontakt anfragen / Nachrichten', targetCount: 5, checkedCount: 0, completed: false },
    { id: '3', title: 'Sätze Hantel Training', targetCount: 5, checkedCount: 0, completed: false }
  ]);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCount, setEditCount] = useState(5);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceEntry[]>([]);
  const [lastResetDate, setLastResetDate] = useState<string>(getTodayDateString());
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCount, setNewHabitCount] = useState(5);

  // Load habits from backend API on mount
  useEffect(() => {
    loadHabitsFromBackend();
    loadHabitsHistoryFromBackend();
  }, []);

  // Load habits from backend
  const loadHabitsFromBackend = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/ai/habits');
      if (response.data && response.data.length > 0) {
        setDailyHabits(response.data);
      }
    } catch (error) {
      console.log('Failed to load habits from backend, using defaults');
    }
  };

  // Load habits history from backend
  const loadHabitsHistoryFromBackend = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/ai/habits/history?days=14');
      if (response.data && response.data.length > 0) {
        // Group by date and count completed habits
        const historyByDate = new Map<string, { completed: number; total: number }>();

        response.data.forEach((entry: any) => {
          const existing = historyByDate.get(entry.date) || { completed: 0, total: 0 };
          historyByDate.set(entry.date, {
            completed: existing.completed + (entry.completed ? 1 : 0),
            total: existing.total + 1
          });
        });

        // Convert to array sorted by date and calculate additional stats
        const historyArray: PerformanceEntry[] = Array.from(historyByDate.entries())
          .map(([date, data], index, array) => {
            const completionRate = array.length > 0 ? (data.completed / data.total) * 100 : 0;
            
            // Calculate streak (consecutive days with completion)
            let streak = 0;
            if (data.completed === data.total && data.total > 0) {
              // Look back to find consecutive completed days
              streak = 1;
              for (let i = index - 1; i >= 0; i--) {
                const prevEntry = array[i];
                if (prevEntry[1].completed === prevEntry[1].total && prevEntry[1].total > 0) {
                  streak++;
                } else {
                  break;
                }
              }
            }
            
            return {
              date,
              habitsCompleted: data.completed,
              totalHabits: data.total,
              completionRate,
              streak
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

        setPerformanceHistory(historyArray);
      }
    } catch (error) {
      console.log('Failed to load habits history from backend');
      // Fallback to localStorage if backend not available
      const savedHistory = localStorage.getItem('performanceHistory');
      if (savedHistory) {
        setPerformanceHistory(JSON.parse(savedHistory));
      }
    }
  };

  // The backend now handles daily reset and history saving automatically
  // Just reload habits when date changes
  useEffect(() => {
    const today = getTodayDateString();
    if (lastResetDate !== today) {
      // Reload from backend - it will save history and reset automatically
      loadHabitsFromBackend();
      loadHabitsHistoryFromBackend();
      setLastResetDate(today);
    }
  }, [lastResetDate]);

  // Handle checkbox toggle - saves to backend
  const toggleHabitCheck = async (habitId: string, index: number) => {
    const habit = dailyHabits.find(h => h.id === habitId);
    if (!habit) return;

    const newCheckedCount = index < habit.checkedCount ? index : index + 1;
    const completed = newCheckedCount >= habit.targetCount;

    // Update local state immediately for responsiveness
    setDailyHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return { ...h, checkedCount: newCheckedCount, completed };
      }
      return h;
    }));

    // Save to backend
    try {
      await axios.put(`http://localhost:3001/api/ai/habits/${habitId}`, {
        checkedCount: newCheckedCount
      });

      // Check if all completed
      const updatedHabits = dailyHabits.map(h =>
        h.id === habitId ? { ...h, checkedCount: newCheckedCount, completed } : h
      );
      if (updatedHabits.every(h => h.completed || (h.id === habitId && completed))) {
        console.log('🎉 All daily habits completed!');
      }
    } catch (error) {
      console.error('Failed to save habit to backend:', error);
    }
  };

  // Start editing a habit
  const startEditHabit = (habit: DailyHabit) => {
    setEditingHabit(habit.id);
    setEditTitle(habit.title);
    setEditCount(habit.targetCount);
  };

  // Save habit edit - also saves to backend
  const saveHabitEdit = async () => {
    if (editingHabit && editTitle.trim()) {
      const habit = dailyHabits.find(h => h.id === editingHabit);
      if (!habit) return;

      const newTargetCount = Math.max(1, Math.min(10, editCount));
      const newCheckedCount = Math.min(habit.checkedCount, newTargetCount);

      // Update local state
      setDailyHabits(prev => prev.map(h => {
        if (h.id === editingHabit) {
          return {
            ...h,
            title: editTitle.trim(),
            targetCount: newTargetCount,
            checkedCount: newCheckedCount,
            completed: newCheckedCount >= newTargetCount
          };
        }
        return h;
      }));

      // Save to backend with full habit data
      try {
        await axios.put(`http://localhost:3001/api/ai/habits/${editingHabit}`, {
          title: editTitle.trim(),
          targetCount: newTargetCount,
          checkedCount: newCheckedCount
        });
      } catch (error) {
        console.error('Failed to save habit edit:', error);
        // Revert local state if backend save fails
        setDailyHabits(dailyHabits);
      }

      setEditingHabit(null);
    }
  };

  // Add new habit function
  const addNewHabit = async () => {
    if (!newHabitTitle.trim() || dailyHabits.length >= 9) return;

    const newTargetCount = Math.max(1, Math.min(10, newHabitCount));
    const newHabitId = (dailyHabits.length + 1).toString();

    const newHabit: DailyHabit = {
      id: newHabitId,
      title: newHabitTitle.trim(),
      targetCount: newTargetCount,
      checkedCount: 0,
      completed: false
    };

    // Update local state
    setDailyHabits([...dailyHabits, newHabit]);

    // Save to backend
    try {
      await axios.post('http://localhost:3001/api/ai/habits', newHabit);
      console.log('New habit added successfully');
    } catch (error) {
      console.error('Failed to save new habit to backend:', error);
      // Revert local state if backend save fails
      setDailyHabits(dailyHabits);
    }

    // Reset form and close modal
    setNewHabitTitle('');
    setNewHabitCount(5);
    setShowAddHabitModal(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingHabit(null);
    setEditTitle('');
    setEditCount(5);
  };

  useEffect(() => {
    loadAllDashboardData();
  }, []);

  const loadAllDashboardData = async () => {
    try {
      // Sessions Stats
      const sessionsRes = await axios.get('http://localhost:3001/api/sessions');
      const statsRes = await axios.get('http://localhost:3001/api/sessions/stats');
      setRecentSessions(sessionsRes.data.slice(0, 5));
      setSessionStats(statsRes.data);

      // Load detailed session summary
      try {
        const summaryRes = await axios.get('http://localhost:3001/api/sessions/stats/summary');
        setSessionSummary(summaryRes.data);
      } catch (error) {
        console.log('Session summary not available');
      }

      // Content Stats
      try {
        const contentStatsRes = await axios.get('http://localhost:3001/api/content/ideas/stats/overview');
        const contentIdeasRes = await axios.get('http://localhost:3001/api/content/ideas');
        setContentStats(contentStatsRes.data);
        setRecentContent(contentIdeasRes.data.slice(0, 4));
      } catch (error) {
        console.log('Content stats not available');
      }

      // Goal Stats
      try {
        const goalsStatsRes = await axios.get('http://localhost:3001/api/goals/stats/overview');
        const goalsRes = await axios.get('http://localhost:3001/api/goals?status=active');
        setGoalStats(goalsStatsRes.data);
        setActiveGoals(goalsRes.data.slice(0, 3));
        setTickerGoals(goalsRes.data);

        // Load tasks for ticker from all active goals
        const allTasks: any[] = [];
        for (const goal of goalsRes.data.slice(0, 5)) {
          try {
            const tasksRes = await axios.get(`http://localhost:3001/api/goals/${goal.id}/tasks`);
            tasksRes.data.forEach((task: any) => {
              allTasks.push({ ...task, goalTitle: goal.title });
            });
          } catch (e) { /* ignore */ }
        }
        setTickerTasks(allTasks.filter(t => t.status !== 'done').slice(0, 10));
      } catch (error) {
        console.log('Goal stats not available');
      }

      // CRM Stats
      try {
        const contactsRes = await axios.get('http://localhost:3001/api/crm/contacts');
        const followupsRes = await axios.get('http://localhost:3001/api/crm/followups');
        setCrmStats({
          total_contacts: contactsRes.data.length,
          overdue_followups: followupsRes.data.length
        });
      } catch (error) {
        console.log('CRM stats not available');
      }

      // Dashboard Summary
      try {
        const summaryRes = await axios.get('http://localhost:3001/api/dashboard/summary');
        setDashboardSummary(summaryRes.data);
      } catch (error) {
        console.log('Dashboard summary not available');
      }

      // Today Events
      try {
        const eventsRes = await axios.get('http://localhost:3001/api/dashboard/events/today');
        setTodayEvents(eventsRes.data);
      } catch (error) {
        console.log('Today events not available');
      }

      // Unread Notifications
      try {
        const notifRes = await axios.get('http://localhost:3001/api/dashboard/notifications/unread');
        setUnreadNotifications(notifRes.data.slice(0, 5));
      } catch (error) {
        console.log('Notifications not available');
      }

      // Active Applications
      try {
        const appsRes = await axios.get('http://localhost:3001/api/dashboard/applications/active');
        setActiveApplications(appsRes.data.slice(0, 5));
      } catch (error) {
        console.log('Applications not available');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleStartClick = () => {
    setShowTaskSelection(true);
  };

  const handleTaskSelected = (task: Task) => {
    setSelectedTask(task);
    setShowTaskSelection(false);
    setShowTimer(true);
  };

  const handleTimerComplete = (session: WorkSession) => {
    setCurrentSession(session);
    setShowTimer(false);
    setShowDocumentation(true);
  };

  const handleDocumentationComplete = () => {
    setShowDocumentation(false);
    setSelectedTask(null);
    setCurrentSession(null);
    loadAllDashboardData();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>KensenichManager</h1>
        <p>Dein komplettes Business & Content Hub</p>
      </div>

      {/* Productivity Section */}
      <div className="productivity-section">
        <div className="start-session-card">
          <h2>⚡ Produktivität</h2>
          <button className="btn-start-large" onClick={handleStartClick}>
            <span className="btn-icon">▶</span>
            Start Session
          </button>
          <p className="hint">30-Minuten Pomodoro Session starten</p>
        </div>

        <div className="session-stats-grid">
          <div className="stat-card glow">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{sessionStats?.total_sessions || 0}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>
          <div className="stat-card glow">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">{sessionSummary?.allTime?.hours || Math.round((sessionStats?.total_minutes || 0) / 60)}h</div>
              <div className="stat-label">Gearbeitete Zeit</div>
            </div>
          </div>
          <div className="stat-card glow">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">{sessionSummary?.currentStreak || 0}</div>
              <div className="stat-label">Tage Streak</div>
            </div>
          </div>
        </div>

        {/* Detailed Productivity Stats */}
        {sessionSummary && (
          <div className="productivity-details">
            <div className="productivity-row">
              <div className="prod-stat">
                <span className="prod-label">Heute</span>
                <span className="prod-value">{sessionSummary.today?.sessions || 0} Sessions</span>
                <span className="prod-time">{sessionSummary.today?.hours || 0}h</span>
              </div>
              <div className="prod-stat">
                <span className="prod-label">Diese Woche</span>
                <span className="prod-value">{sessionSummary.thisWeek?.sessions || 0} Sessions</span>
                <span className="prod-time">{sessionSummary.thisWeek?.hours || 0}h</span>
              </div>
              <div className="prod-stat">
                <span className="prod-label">Dieser Monat</span>
                <span className="prod-value">{sessionSummary.thisMonth?.sessions || 0} Sessions</span>
                <span className="prod-time">{sessionSummary.thisMonth?.hours || 0}h</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Goals & Tasks Ticker Band - Click to go to Goals */}
      {(tickerGoals.length > 0 || tickerTasks.length > 0) && (
        <div className="ticker-band" onClick={() => navigate('/goals')} title="Klicken um zu Ziele & Tasks zu gehen">
          <div className="ticker-label">
            <span className="ticker-icon">🎯</span>
            <span>LIVE</span>
          </div>
          <div className="ticker-track">
            <div className="ticker-content">
              {tickerGoals.map((goal, idx) => (
                <span key={`goal-${goal.id}`} className="ticker-item ticker-goal">
                  <span className="ticker-item-icon">🎯</span>
                  <span className="ticker-item-title">{goal.title}</span>
                  <span className="ticker-item-progress">{goal.progress}%</span>
                  {idx < tickerGoals.length - 1 || tickerTasks.length > 0 ? <span className="ticker-divider">•</span> : null}
                </span>
              ))}
              {tickerTasks.map((task, idx) => (
                <span key={`task-${task.id}`} className={`ticker-item ticker-task ${task.is_blocked ? 'blocked' : ''}`}>
                  <span className="ticker-item-icon">{task.is_blocked ? '🔒' : task.status === 'in_progress' ? '⚡' : '○'}</span>
                  <span className="ticker-item-title">{task.title}</span>
                  <span className="ticker-item-goal">({task.goalTitle})</span>
                  {idx < tickerTasks.length - 1 ? <span className="ticker-divider">•</span> : null}
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {tickerGoals.map((goal, idx) => (
                <span key={`goal2-${goal.id}`} className="ticker-item ticker-goal">
                  <span className="ticker-item-icon">🎯</span>
                  <span className="ticker-item-title">{goal.title}</span>
                  <span className="ticker-item-progress">{goal.progress}%</span>
                  {idx < tickerGoals.length - 1 || tickerTasks.length > 0 ? <span className="ticker-divider">•</span> : null}
                </span>
              ))}
              {tickerTasks.map((task, idx) => (
                <span key={`task2-${task.id}`} className={`ticker-item ticker-task ${task.is_blocked ? 'blocked' : ''}`}>
                  <span className="ticker-item-icon">{task.is_blocked ? '🔒' : task.status === 'in_progress' ? '⚡' : '○'}</span>
                  <span className="ticker-item-title">{task.title}</span>
                  <span className="ticker-item-goal">({task.goalTitle})</span>
                  {idx < tickerTasks.length - 1 ? <span className="ticker-divider">•</span> : null}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Habits Tracker */}
      <div className="daily-habits-section">
        <div className="habits-header">
          <h2>🔥 Daily Output Tracker</h2>
          <div className="habits-progress-summary">
            <span className="completed-count">
              {dailyHabits.filter(h => h.completed).length}/{dailyHabits.length}
            </span>
            <span className="progress-label">completed</span>
          </div>
          {dailyHabits.length < 9 && (
            <button
              className="btn-add-habit"
              onClick={() => setShowAddHabitModal(true)}
              title="Neue tägliche Aufgabe hinzufügen"
            >
              <span className="plus-icon">➕</span> Neue Aufgabe
            </button>
          )}
        </div>

        <div className="habits-grid">
          {dailyHabits.map(habit => (
            <div
              key={habit.id}
              className={`habit-card ${habit.completed ? 'completed' : ''} ${habit.checkedCount > 0 ? 'in-progress' : ''}`}
            >
              {editingHabit === habit.id ? (
                <div className="habit-edit-form">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Habit Name"
                    className="habit-edit-title"
                    autoFocus
                  />
                  <div className="habit-edit-count">
                    <label>Anzahl:</label>
                    <input
                      type="number"
                      value={editCount}
                      onChange={(e) => setEditCount(parseInt(e.target.value) || 1)}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="habit-edit-actions">
                    <button className="btn-save" onClick={saveHabitEdit}>✓</button>
                    <button className="btn-cancel" onClick={cancelEdit}>✕</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="habit-header">
                    <h3 className="habit-title">{habit.title}</h3>
                    <button
                      className="btn-edit-habit"
                      onClick={() => startEditHabit(habit)}
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                  </div>
                  <div className="habit-target">
                    <span className="target-text">Ziel: {habit.targetCount}x</span>
                    <span className="progress-text">
                      {habit.checkedCount}/{habit.targetCount}
                    </span>
                  </div>
                  <div className="habit-checkboxes">
                    {Array.from({ length: habit.targetCount }, (_, index) => (
                      <button
                        key={index}
                        className={`habit-checkbox ${index < habit.checkedCount ? 'checked' : ''}`}
                        onClick={() => toggleHabitCheck(habit.id, index)}
                      >
                        {index < habit.checkedCount ? '✓' : ''}
                      </button>
                    ))}
                  </div>
                  {habit.completed && (
                    <div className="habit-complete-badge">
                      <span className="complete-icon">🎯</span>
                      <span className="complete-text">DONE!</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Modern Performance Dashboard */}
        <div className="performance-dashboard-section">
          <h3>📊 Performance Analytics</h3>
          
          {performanceHistory.length > 0 ? (
            <div className="performance-charts-container">
              {/* Chart 1: Completion Rate Line Chart */}
              <div className="performance-chart-card">
                <div className="chart-header">
                  <h4>🎯 Completion Rate</h4>
                  <span className="chart-subtitle">% of habits completed daily</span>
                </div>
                <div className="line-chart">
                  <svg viewBox="0 0 300 100" className="line-chart-svg">
                    <polyline
                      fill="none"
                      stroke="var(--neon-green)"
                      strokeWidth="2"
                      points={performanceHistory.slice(-14).map((entry, index) => 
                        `${index * (300 / 14)}, ${100 - entry.completionRate}`
                      ).join(' ')}
                    />
                    {performanceHistory.slice(-14).map((entry, index) => (
                      <circle
                        key={index}
                        cx={index * (300 / 14)}
                        cy={100 - entry.completionRate}
                        r="3"
                        fill="var(--neon-green)"
                        stroke="#000"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Y-axis labels */}
                    <text x="-10" y="15" fill="#999" fontSize="10">100%</text>
                    <text x="-10" y="50" fill="#999" fontSize="10">50%</text>
                    <text x="-10" y="95" fill="#999" fontSize="10">0%</text>
                  </svg>
                  <div className="chart-x-axis">
                    {performanceHistory.slice(-14).map((entry, index) => (
                      <span key={index} className="axis-label">
                        {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Chart 2: Streak & Productivity Bars */}
              <div className="performance-chart-card">
                <div className="chart-header">
                  <h4>🔥 Streak & Productivity</h4>
                  <span className="chart-subtitle">Daily streak and habit completion</span>
                </div>
                <div className="dual-bars-chart">
                  {performanceHistory.slice(-14).map((entry, index) => (
                    <div key={index} className="dual-bar-container">
                      {/* Streak bar (background) */}
                      <div
                        className="streak-bar"
                        style={{
                          height: `${Math.min(entry.streak * 10, 100)}%`,
                          opacity: entry.streak > 0 ? 0.3 : 0.1
                        }}
                        title={`Streak: ${entry.streak} day${entry.streak !== 1 ? 's' : ''}`}
                      />
                      {/* Completion bar (foreground) */}
                      <div
                        className={`completion-bar ${entry.habitsCompleted === entry.totalHabits ? 'full' : ''}`}
                        style={{
                          height: `${(entry.habitsCompleted / entry.totalHabits) * 100}%`
                        }}
                        title={`${entry.habitsCompleted}/${entry.totalHabits} habits`}
                      >
                        {entry.habitsCompleted > 0 && (
                          <span className="bar-value">{entry.habitsCompleted}</span>
                        )}
                      </div>
                      <span className="bar-date">
                        {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="performance-summary-card">
                <div className="summary-stats">
                  <div className="summary-stat">
                    <span className="stat-label">📊 Avg Completion</span>
                    <span className="stat-value">
                      {Math.round(performanceHistory.slice(-14).reduce((sum, entry) => sum + entry.completionRate, 0) / 14)}%
                    </span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-label">🔥 Current Streak</span>
                    <span className="stat-value">
                      {performanceHistory.slice(-14).findLast(entry => entry.streak > 0)?.streak || 0} days
                    </span>
                  </div>
                  <div className="summary-stat">
                    <span className="stat-label">⭐ Perfect Days</span>
                    <span className="stat-value">
                      {performanceHistory.slice(-14).filter(entry => entry.habitsCompleted === entry.totalHabits && entry.totalHabits > 0).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="chart-empty">
              <p>📊 Noch keine Performance-Daten. Beginne mit deinen täglichen Aufgaben!</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Task Tracker */}
      <div className="daily-task-tracker-section">
        <DailyTaskTracker />
      </div>

      {/* Alerts & Notifications Bar */}
      <div className="alerts-bar">
        {dashboardSummary && (
          <>
            {todayEvents.length > 0 && (
              <div className="alert-badge calendar">
                <span className="alert-icon">📅</span>
                <span className="alert-text">{todayEvents.length} Termin{todayEvents.length > 1 ? 'e' : ''} heute</span>
              </div>
            )}
            {dashboardSummary.unread_notifications > 0 && (
              <div className="alert-badge notifications">
                <span className="alert-icon">🔔</span>
                <span className="alert-text">{dashboardSummary.unread_notifications} Benachrichtigungen</span>
              </div>
            )}
            {dashboardSummary.active_applications > 0 && (
              <div className="alert-badge applications">
                <span className="alert-icon">📋</span>
                <span className="alert-text">{dashboardSummary.active_applications} aktive Anträge</span>
              </div>
            )}
            {dashboardSummary.urgent_items > 0 && (
              <div className="alert-badge urgent">
                <span className="alert-icon">⚠️</span>
                <span className="alert-text">{dashboardSummary.urgent_items} dringend</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Live Activity Widgets */}
      <div className="activity-widgets">
        {/* Today's Events */}
        <div className="widget-card events-widget">
          <div className="widget-header">
            <h3>📅 Heute</h3>
            <span className="widget-count">{todayEvents.length}</span>
          </div>
          <div className="widget-content">
            {todayEvents.length > 0 ? (
              <div className="events-list">
                {todayEvents.map(event => (
                  <div key={event.id} className="event-item">
                    <div className="event-time">
                      {new Date(event.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="event-details">
                      <div className="event-title">{event.title}</div>
                      {event.location && <div className="event-location">📍 {event.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="widget-empty">Keine Termine heute</div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="widget-card notifications-widget">
          <div className="widget-header">
            <h3>🔔 Benachrichtigungen</h3>
            <span className="widget-count">{unreadNotifications.length}</span>
          </div>
          <div className="widget-content">
            {unreadNotifications.length > 0 ? (
              <div className="notifications-list">
                {unreadNotifications.map(notif => (
                  <div key={notif.id} className={`notification-item priority-${notif.priority}`}>
                    <div className="notification-icon">
                      {notif.type === 'email' && '📧'}
                      {notif.type === 'system' && '⚙️'}
                      {notif.type === 'reminder' && '⏰'}
                      {notif.type === 'update' && '📢'}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notif.title}</div>
                      {notif.message && <div className="notification-message">{notif.message}</div>}
                      <div className="notification-time">
                        {new Date(notif.created_at).toLocaleString('de-DE')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="widget-empty">Keine neuen Benachrichtigungen</div>
            )}
          </div>
        </div>

        {/* Active Applications/Processes */}
        <div className="widget-card applications-widget">
          <div className="widget-header">
            <h3>📋 Laufende Anträge</h3>
            <span className="widget-count">{activeApplications.length}</span>
          </div>
          <div className="widget-content">
            {activeApplications.length > 0 ? (
              <div className="applications-list">
                {activeApplications.map(app => (
                  <div key={app.id} className="application-item">
                    <div className="application-header">
                      <div className="application-title">{app.title}</div>
                      <span className={`application-status status-${app.status}`}>
                        {app.status === 'pending' && '⏳ Ausstehend'}
                        {app.status === 'in_progress' && '⚡ In Bearbeitung'}
                        {app.status === 'waiting_for_info' && '📝 Wartet auf Info'}
                        {app.status === 'under_review' && '🔍 In Prüfung'}
                      </span>
                    </div>
                    {app.institution && (
                      <div className="application-institution">🏢 {app.institution}</div>
                    )}
                    {app.expected_response_date && (
                      <div className="application-date">
                        📅 Erwartete Antwort: {new Date(app.expected_response_date).toLocaleDateString('de-DE')}
                      </div>
                    )}
                    {app.last_update && (
                      <div className="application-update">
                        🕒 Letztes Update: {new Date(app.last_update).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="widget-empty">Keine aktiven Anträge</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid - All Features Overview */}
      <div className="main-grid">
        {/* Content Plan Overview */}
        <div className="dashboard-section content-section">
          <div className="section-header" onClick={() => navigate('/content')}>
            <h2>🎬 Content Plan</h2>
            <button className="btn-view-all">Alle →</button>
          </div>

          {contentStats && (
            <div className="mini-stats">
              <div className="mini-stat">
                <span className="mini-value">{contentStats.ideas}</span>
                <span className="mini-label">💡 Ideen</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{contentStats.in_progress}</span>
                <span className="mini-label">⚡ In Progress</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{contentStats.ready}</span>
                <span className="mini-label">✅ Ready</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{contentStats.published}</span>
                <span className="mini-label">🚀 Published</span>
              </div>
            </div>
          )}

          <div className="content-preview">
            {recentContent.length > 0 ? (
              recentContent.map(content => (
                <div key={content.id} className="content-preview-item" onClick={() => navigate('/content')}>
                  <div className="preview-header">
                    <span className="preview-title">{content.title}</span>
                    <span className={`preview-status status-${content.status}`}>
                      {content.status}
                    </span>
                  </div>
                  {content.platform && (
                    <span className="preview-platform">📱 {content.platform}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-preview">
                <p>Noch keine Content-Ideen</p>
                <button className="btn-add" onClick={() => navigate('/content')}>
                  ➕ Idee hinzufügen
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CRM Overview */}
        <div className="dashboard-section crm-section">
          <div className="section-header" onClick={() => navigate('/crm')}>
            <h2>👥 CRM</h2>
            <button className="btn-view-all">Alle →</button>
          </div>

          {crmStats && (
            <div className="mini-stats">
              <div className="mini-stat">
                <span className="mini-value">{crmStats.total_contacts || 0}</span>
                <span className="mini-label">Kontakte</span>
              </div>
              <div className="mini-stat alert">
                <span className="mini-value">{crmStats.overdue_followups || 0}</span>
                <span className="mini-label">🔔 Follow-ups</span>
              </div>
            </div>
          )}

          <div className="quick-action">
            <button className="btn-quick-add" onClick={() => navigate('/crm')}>
              ➕ Neuer Kontakt
            </button>
          </div>
        </div>

        {/* Goals Overview */}
        <div className="dashboard-section goals-section">
          <div className="section-header" onClick={() => navigate('/goals')}>
            <h2>🎯 Ziele</h2>
            <button className="btn-view-all">Alle →</button>
          </div>

          {goalStats && (
            <div className="mini-stats">
              <div className="mini-stat">
                <span className="mini-value">{goalStats.active || 0}</span>
                <span className="mini-label">Aktiv</span>
              </div>
              <div className="mini-stat">
                <span className="mini-value">{goalStats.completed || 0}</span>
                <span className="mini-label">✅ Erreicht</span>
              </div>
            </div>
          )}

          <div className="goals-preview">
            {activeGoals.length > 0 ? (
              activeGoals.map(goal => (
                <div key={goal.id} className="goal-preview-item">
                  <div className="goal-title">{goal.title}</div>
                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="goal-progress-text">{goal.progress}%</div>
                </div>
              ))
            ) : (
              <div className="empty-preview">
                <button className="btn-add" onClick={() => navigate('/goals')}>
                  ➕ Ziel hinzufügen
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Jobs Overview */}
        <div className="dashboard-section jobs-section">
          <div className="section-header" onClick={() => navigate('/jobs')}>
            <h2>💼 Job Search</h2>
            <button className="btn-view-all">Alle →</button>
          </div>

          <div className="quick-stats-vertical">
            <div className="quick-stat-item">
              <span className="quick-icon">📝</span>
              <span className="quick-text">Bewerbungen tracken</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-icon">📅</span>
              <span className="quick-text">Interview-Termine</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-icon">💰</span>
              <span className="quick-text">Gehaltsspannen</span>
            </div>
          </div>

          <button className="btn-quick-add" onClick={() => navigate('/jobs')}>
            ➕ Bewerbung hinzufügen
          </button>
        </div>

        {/* Mutuus Launch Overview */}
        <div className="dashboard-section mutuus-section">
          <div className="section-header" onClick={() => navigate('/mutuus')}>
            <h2>🚀 Mutuus Launch</h2>
            <button className="btn-view-all">Alle →</button>
          </div>

          <div className="quick-stats-vertical">
            <div className="quick-stat-item">
              <span className="quick-icon">📋</span>
              <span className="quick-text">Milestones tracken</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-icon">🎯</span>
              <span className="quick-text">Launch Roadmap</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-icon">📊</span>
              <span className="quick-text">Progress Dashboard</span>
            </div>
          </div>

          <button className="btn-quick-add" onClick={() => navigate('/mutuus')}>
            Zur Roadmap →
          </button>
        </div>

        {/* Branding Board Overview */}
        <div className="dashboard-section branding-section">
          <div className="section-header" onClick={() => navigate('/branding')}>
            <h2>🎨 Branding</h2>
            <button className="btn-view-all">Alle →</button>
          </div>

          <div className="quick-stats-vertical">
            <div className="quick-stat-item">
              <span className="quick-icon">🖼️</span>
              <span className="quick-text">Asset Management</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-icon">📄</span>
              <span className="quick-text">Templates</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-icon">🎨</span>
              <span className="quick-text">Brand Guidelines</span>
            </div>
          </div>

          <button className="btn-quick-add" onClick={() => navigate('/branding')}>
            Assets verwalten →
          </button>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="recent-activity-section">
        <div className="recent-sessions-card">
          <h2>📜 Letzte Sessions</h2>
          {recentSessions.length === 0 ? (
            <p className="empty-state">Noch keine Sessions. Starte deine erste!</p>
          ) : (
            <div className="sessions-timeline">
              {recentSessions.map((session) => (
                <div key={session.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <h3>{session.task_title}</h3>
                      <span className={`status-badge ${session.status}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="timeline-meta">
                      <span>⏱️ {session.duration_minutes} min</span>
                      <span>📅 {new Date(session.started_at).toLocaleDateString('de-DE')}</span>
                    </div>
                    {session.documentation && (
                      <p className="timeline-doc">{session.documentation.substring(0, 100)}...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Shortcuts */}
      <div className="shortcuts-section">
        <h2>⚡ Quick Access</h2>
        <div className="shortcuts-grid">
          <div className="shortcut-card" onClick={() => navigate('/files')}>
            <div className="shortcut-icon">📁</div>
            <div className="shortcut-label">Files</div>
          </div>
          <div className="shortcut-card" onClick={() => navigate('/terminal')}>
            <div className="shortcut-icon">💻</div>
            <div className="shortcut-label">Terminal</div>
          </div>
          <div className="shortcut-card" onClick={() => navigate('/content')}>
            <div className="shortcut-icon">🎬</div>
            <div className="shortcut-label">Content</div>
          </div>
          <div className="shortcut-card" onClick={() => navigate('/crm')}>
            <div className="shortcut-icon">👥</div>
            <div className="shortcut-label">CRM</div>
          </div>
          <div className="shortcut-card" onClick={() => navigate('/goals')}>
            <div className="shortcut-icon">🎯</div>
            <div className="shortcut-label">Goals</div>
          </div>
          <div className="shortcut-card" onClick={() => navigate('/jobs')}>
            <div className="shortcut-icon">💼</div>
            <div className="shortcut-label">Jobs</div>
          </div>
          <div className="shortcut-card" onClick={() => navigate('/mutuus')}>
            <div className="shortcut-icon">🚀</div>
            <div className="shortcut-label">Mutuus</div>
          </div>
          <div className="shortcut-card" onClick={() => navigate('/branding')}>
            <div className="shortcut-icon">🎨</div>
            <div className="shortcut-label">Branding</div>
          </div>
        </div>
      </div>

      {/* Add Habit Modal */}
      {showAddHabitModal && (
        <div className="modal-overlay" onClick={() => setShowAddHabitModal(false)}>
          <div className="modal add-habit-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Neue tägliche Aufgabe hinzufügen</h2>

            <div className="form-group">
              <label>Aufgabenname *</label>
              <input
                type="text"
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                placeholder="z.B. Meditation, Lesen, Programmieren"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Zielanzahl (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={newHabitCount}
                onChange={(e) => setNewHabitCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAddHabitModal(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={addNewHabit}
                disabled={!newHabitTitle.trim() || dailyHabits.length >= 9}
              >
                Hinzufügen
              </button>
            </div>

            <div className="habit-limit-info">
              <small>
                {dailyHabits.length}/9 Aufgaben - Du kannst maximal 9 tägliche Aufgaben erstellen.
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showTaskSelection && (
        <TaskSelection
          onSelect={handleTaskSelected}
          onCancel={() => setShowTaskSelection(false)}
        />
      )}

      {showTimer && selectedTask && (
        <TimerModal
          task={selectedTask}
          onComplete={handleTimerComplete}
          onStop={() => setShowTimer(false)}
        />
      )}

      {showDocumentation && currentSession && selectedTask && (
        <DocumentationModal
          session={currentSession}
          task={selectedTask}
          onComplete={handleDocumentationComplete}
        />
      )}
    </div>
  );
}
