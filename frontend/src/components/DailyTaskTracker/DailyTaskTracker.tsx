import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TaskSelectionModal from './TaskSelectionModal';
import TaskTimerModal from './TaskTimerModal';
import type { Task, WorkSession } from '../../types';
import './DailyTaskTracker.css';

interface DailyTask extends Task {
  goal_id?: string;
  goal_title?: string;
  completion_date?: string;
  is_completed?: boolean;
}

interface TaskCompletionHistory {
  date: string;
  completed_tasks: number;
  total_tasks: number;
  completion_rate: number;
}

const getTodayDateString = () => new Date().toISOString().split('T')[0];
const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

export default function DailyTaskTracker() {
  const navigate = useNavigate();
  const [showTaskSelection, setShowTaskSelection] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  
  // Task data
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [yesterdayTasks, setYesterdayTasks] = useState<DailyTask[]>([]);
  const [allTasks, setAllTasks] = useState<DailyTask[]>([]);
  const [completionHistory, setCompletionHistory] = useState<TaskCompletionHistory[]>([]);
  
  // UI state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Check backend connectivity
  const checkBackendConnectivity = async () => {
    try {
      await axios.get('http://localhost:3001/api/health', { timeout: 2000 });
      setBackendAvailable(true);
      return true;
    } catch (error) {
      console.warn('Backend server not responding. Running in offline mode.');
      setBackendAvailable(false);
      return false;
    }
  };

  // Load tasks from backend
  useEffect(() => {
    const loadData = async () => {
      const isBackendAvailable = await checkBackendConnectivity();
      if (isBackendAvailable) {
        await loadTasks();
        await loadCompletionHistory();
      }
    };
    loadData();
  }, []);

  const loadTasks = async () => {
    try {
      // Load tasks from goals
      const goalsRes = await axios.get('http://localhost:3001/api/goals?status=active');
      const goals = goalsRes.data;
      
      // Load tasks for each goal
      const tasksPromises = goals.map((goal: any) => 
        axios.get(`http://localhost:3001/api/goals/${goal.id}/tasks`)
      );
      
      const tasksResults = await Promise.all(tasksPromises);
      const allTasksData: DailyTask[] = [];
      
      tasksResults.forEach((result, index) => {
        const goal = goals[index];
        result.data.forEach((task: any) => {
          allTasksData.push({
            ...task,
            goal_id: goal.id,
            goal_title: goal.title,
            is_completed: task.status === 'done'
          });
        });
      });
      
      // Separate today and yesterday tasks
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      
      const todayTasksData = allTasksData.filter(task => 
        task.completion_date === today || !task.completion_date
      );
      
      const yesterdayTasksData = allTasksData.filter(task => 
        task.completion_date === yesterday
      );
      
      setAllTasks(allTasksData);
      setTodayTasks(todayTasksData);
      setYesterdayTasks(yesterdayTasksData);
      
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setBackendAvailable(false);
    }
  };

  const loadCompletionHistory = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/tasks/daily/history?days=14');
      setCompletionHistory(res.data);
    } catch (error) {
      console.error('Failed to load completion history:', error);
    }
  };

  const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    try {
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;
      
      const completionDate = isCompleted ? getTodayDateString() : null;
      
      // Update in backend
      await axios.put(`http://localhost:3001/api/goals/${task.goal_id}/tasks/${taskId}`, {
        status: isCompleted ? 'done' : 'todo',
        completion_date: completionDate
      });
      
      // Update local state
      const updatedTasks = allTasks.map(t => 
        t.id === taskId ? { ...t, status: isCompleted ? 'done' : 'todo', is_completed: isCompleted, completion_date: completionDate } : t
      );
      
      setAllTasks(updatedTasks);
      
      // Update today/yesterday separation
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      
      setTodayTasks(updatedTasks.filter(task => 
        task.completion_date === today || !task.completion_date
      ));
      
      setYesterdayTasks(updatedTasks.filter(task => 
        task.completion_date === yesterday
      ));
      
      // Reload completion history
      loadCompletionHistory();
      
    } catch (error) {
      console.error('Failed to update task completion:', error);
    }
  };

  const handleStartTask = (task: DailyTask) => {
    setSelectedTask(task);
    setShowTimer(true);
  };

  const handleTimerComplete = (session: WorkSession) => {
    setCurrentSession(session);
    setShowTimer(false);
    
    // Mark task as completed
    if (selectedTask) {
      toggleTaskCompletion(selectedTask.id, true);
    }
  };

  const handleAddTask = () => {
    setShowTaskSelection(true);
  };

  const handleTaskSelected = (task: Task) => {
    // Add the task to today's tasks
    const goalTask = allTasks.find(t => t.id === task.id);
    if (goalTask) {
      // Already exists in goals
      setShowTaskSelection(false);
      return;
    }
    
    // Add as new daily task
    const newTask: DailyTask = {
      ...task,
      goal_id: undefined,
      goal_title: 'Daily Task',
      is_completed: false,
      status: 'todo'
    };
    
    setAllTasks([...allTasks, newTask]);
    setTodayTasks([...todayTasks, newTask]);
    setShowTaskSelection(false);
  };

  const startEditTask = (task: DailyTask) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
  };

  const saveTaskEdit = async () => {
    if (editingTask && editTitle.trim()) {
      const task = allTasks.find(t => t.id === editingTask);
      if (!task) return;
      
      try {
        // Update in backend if it's a goal task
        if (task.goal_id) {
          await axios.put(`http://localhost:3001/api/goals/${task.goal_id}/tasks/${editingTask}`, {
            title: editTitle.trim(),
            description: editDescription
          });
        }
        
        // Update local state
        const updatedTasks = allTasks.map(t => 
          t.id === editingTask ? { ...t, title: editTitle.trim(), description: editDescription } : t
        );
        
        setAllTasks(updatedTasks);
        setTodayTasks(updatedTasks.filter(t => 
          t.completion_date === getTodayDateString() || !t.completion_date
        ));
        setYesterdayTasks(updatedTasks.filter(t => 
          t.completion_date === getYesterdayDateString()
        ));
        
        setEditingTask(null);
      } catch (error) {
        console.error('Failed to save task edit:', error);
      }
    }
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditDescription('');
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    // Confirm deletion
    if (!window.confirm(`Task "${task.title}" wirklich löschen?`)) {
      return;
    }

    try {
      // Delete from backend if it's a goal task
      if (task.goal_id) {
        await axios.delete(`http://localhost:3001/api/goals/${task.goal_id}/tasks/${taskId}`);
      }

      // Update local state
      const updatedTasks = allTasks.filter(t => t.id !== taskId);
      setAllTasks(updatedTasks);
      setTodayTasks(updatedTasks.filter(t =>
        t.completion_date === getTodayDateString() || !t.completion_date
      ));
      setYesterdayTasks(updatedTasks.filter(t =>
        t.completion_date === getYesterdayDateString()
      ));

    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Fehler beim Löschen des Tasks');
    }
  };

  // Calculate completion stats
  const todayCompleted = todayTasks.filter(t => t.is_completed).length;
  const yesterdayCompleted = yesterdayTasks.filter(t => t.is_completed).length;
  
  return (
    <div className="daily-task-tracker">
      {!backendAvailable && (
        <div className="backend-warning">
          ⚠️ Backend-Server nicht erreichbar. Einige Funktionen sind möglicherweise eingeschränkt.
        </div>
      )}
      <div className="task-tracker-header">
        <h2>🎯 Daily Task Tracker</h2>
        <div className="task-progress-summary">
          <span className="completed-count">
            {todayCompleted}/{todayTasks.length}
          </span>
          <span className="progress-label">heute</span>
          <span className="yesterday-count">
            {yesterdayCompleted}/{yesterdayTasks.length} gestern
          </span>
        </div>
        <button
          className="btn-add-task"
          onClick={handleAddTask}
          title="Neue Aufgabe hinzufügen"
        >
          <span className="plus-icon">➕</span> Neue Aufgabe
        </button>
      </div>

      {/* Today's Tasks */}
      <div className="tasks-section today-tasks">
        <h3>📅 Heute ({todayTasks.length})</h3>
        {todayTasks.length === 0 ? (
          <div className="empty-tasks">
            <p>Keine Aufgaben für heute. Füge Aufgaben hinzu oder wähle aus deinen Zielen.</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {todayTasks.map(task => (
              <div
                key={task.id}
                className={`task-card ${task.is_completed ? 'completed' : ''} ${editingTask === task.id ? 'editing' : ''}`}
              >
                {editingTask === task.id ? (
                  <div className="task-edit-form">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Aufgabenname"
                      className="task-edit-title"
                      autoFocus
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Beschreibung (optional)"
                      className="task-edit-description"
                    />
                    <div className="task-edit-actions">
                      <button className="btn-save" onClick={saveTaskEdit}>✓ Speichern</button>
                      <button className="btn-cancel" onClick={cancelEdit}>✕ Abbrechen</button>
                      <button
                        className="btn-delete"
                        onClick={() => {
                          cancelEdit();
                          deleteTask(task.id);
                        }}
                      >
                        🗑️ Löschen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="task-header">
                      <h4 className="task-title">{task.title}</h4>
                      <div className="task-actions">
                        <button
                          className="btn-edit-task"
                          onClick={() => startEditTask(task)}
                          title="Bearbeiten"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-delete-task"
                          onClick={() => deleteTask(task.id)}
                          title="Löschen"
                        >
                          🗑️
                        </button>
                        {!task.is_completed && (
                          <button
                            className="btn-start-task"
                            onClick={() => handleStartTask(task)}
                            title="Task starten"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    </div>
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    {task.goal_title && (
                      <div className="task-goal-reference">
                        <span className="goal-icon">🎯</span>
                        <span className="goal-title">{task.goal_title}</span>
                      </div>
                    )}
                    <div className="task-completion">
                      <label className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={task.is_completed || false}
                          onChange={(e) => toggleTaskCompletion(task.id, e.target.checked)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="completion-label">
                          {task.is_completed ? 'Erledigt ✓' : 'Als erledigt markieren'}
                        </span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Yesterday's Tasks */}
      {yesterdayTasks.length > 0 && (
        <div className="tasks-section yesterday-tasks">
          <h3>📅 Gestern ({yesterdayTasks.length})</h3>
          <div className="tasks-grid">
            {yesterdayTasks.map(task => (
              <div
                key={task.id}
                className={`task-card ${task.is_completed ? 'completed' : 'incomplete'}`}
              >
                <div className="task-header">
                  <h4 className="task-title">{task.title}</h4>
                  <div className="task-actions">
                    <span className={`task-status-badge ${task.is_completed ? 'completed' : 'incomplete'}`}>
                      {task.is_completed ? '✓ Erledigt' : '✗ Nicht erledigt'}
                    </span>
                    <button
                      className="btn-delete-task"
                      onClick={() => deleteTask(task.id)}
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {task.description && (
                  <p className="task-description">{task.description}</p>
                )}
                {task.goal_title && (
                  <div className="task-goal-reference">
                    <span className="goal-icon">🎯</span>
                    <span className="goal-title">{task.goal_title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Completion Stats */}
      {completionHistory.length > 0 && (
        <div className="task-completion-stats">
          <h3>📊 Task Performance</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">
                {Math.round(completionHistory.slice(-7).reduce((sum, day) => sum + day.completion_rate, 0) / 7)}%
              </div>
              <div className="stat-label">7-Tage Durchschnitt</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {completionHistory.slice(-14).filter(day => day.completion_rate === 100).length}
              </div>
              <div className="stat-label">Perfekte Tage</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {completionHistory.slice(-1).length > 0 
                  ? Math.round(completionHistory.slice(-1)[0].completion_rate) + '%' 
                  : '0%'}
              </div>
              <div className="stat-label">Heutige Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Task Selection Modal */}
      {showTaskSelection && (
        <TaskSelectionModal
          onSelect={handleTaskSelected}
          onCancel={() => setShowTaskSelection(false)}
          existingTasks={allTasks}
        />
      )}

      {/* Task Timer Modal */}
      {showTimer && selectedTask && (
        <TaskTimerModal
          task={selectedTask}
          onComplete={handleTimerComplete}
          onStop={() => setShowTimer(false)}
        />
      )}
    </div>
  );
}