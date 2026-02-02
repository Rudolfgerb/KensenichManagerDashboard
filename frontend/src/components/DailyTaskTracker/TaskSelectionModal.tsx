import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Task } from '../../types';
import './TaskSelectionModal.css';

interface TaskSelectionModalProps {
  onSelect: (task: Task) => void;
  onCancel: () => void;
  existingTasks: any[];
}

export default function TaskSelectionModal({ onSelect, onCancel, existingTasks }: TaskSelectionModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'goals' | 'new'>('goals');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      // Load active goals
      const goalsRes = await axios.get('http://localhost:3001/api/goals?status=active');
      const goals = goalsRes.data;
      
      // Load tasks for each goal
      const tasksPromises = goals.map((goal: any) => 
        axios.get(`http://localhost:3001/api/goals/${goal.id}/tasks`)
      );
      
      const tasksResults = await Promise.all(tasksPromises);
      const allTasks: Task[] = [];
      
      tasksResults.forEach((result, index) => {
        const goal = goals[index];
        result.data.forEach((task: any) => {
          // Only include tasks that aren't already in daily tracker
          const isAlreadyAdded = existingTasks.some(et => et.id === task.id);
          if (!isAlreadyAdded && task.status !== 'done') {
            allTasks.push({
              ...task,
              goal_id: goal.id,
              goal_title: goal.title
            });
          }
        });
      });
      
      setTasks(allTasks);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const newTask = {
        id: 'new-' + Date.now(),
        title: newTaskTitle.trim(),
        description: newTaskDescription,
        status: 'todo' as const,
        priority: 1,
        estimated_sessions: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSelect(newTask);
      setShowNewTask(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleStart = () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
      onSelect(task);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal task-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Task auswählen oder erstellen</h2>
          <div className="modal-tabs">
            <button
              className={`tab-button ${activeTab === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveTab('goals')}
            >
              Aus Zielen
            </button>
            <button
              className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              Neue Task
            </button>
          </div>
        </div>

        {activeTab === 'goals' ? (
          <>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Lade Tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <p>Keine verfügbaren Tasks aus Zielen. Erstelle eine neue Task oder füge Tasks zu deinen Zielen hinzu.</p>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-item ${selectedTaskId === task.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="task-radio">
                      <input
                        type="radio"
                        checked={selectedTaskId === task.id}
                        onChange={() => setSelectedTaskId(task.id)}
                      />
                    </div>
                    <div className="task-content">
                      <h4>{task.title}</h4>
                      {task.description && <p>{task.description}</p>}
                      {task.goal_title && (
                        <div className="task-goal-badge">
                          <span className="goal-icon">🎯</span>
                          <span className="goal-title">{task.goal_title}</span>
                        </div>
                      )}
                      <div className="task-meta">
                        <span className="priority">Priorität: {task.priority}</span>
                        <span className="sessions">~{task.estimated_sessions} Sessions</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={onCancel}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={!selectedTaskId}
              >
                Auswählen & Hinzufügen
              </button>
            </div>
          </>
        ) : (
          <div className="new-task-form">
            <div className="form-group">
              <label>Task Titel *</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="z.B. Feature X implementieren"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Beschreibung (optional)</label>
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Details zur Task..."
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setActiveTab('goals')}>
                Zurück
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim()}
              >
                Task erstellen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}