import { useState, useEffect } from 'react';
import axios from 'axios';
import { getPendingTasks, createTask } from '../../services/api';
import type { Task } from '../../types';
import './TaskTimer.css';

interface TaskSelectionProps {
  onSelect: (task: Task) => void;
  onCancel: () => void;
}

export default function TaskSelection({ onSelect, onCancel }: TaskSelectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await getPendingTasks();
      setTasks(res);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const newTask = await createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        priority: 0,
        estimated_sessions: 1
      });

      setTasks([newTask, ...tasks]);
      setSelectedTaskId(newTask.id);
      setShowNewTask(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!window.confirm(`Task "${task.title}" wirklich löschen?`)) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId('');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Fehler beim Löschen des Tasks');
    }
  };

  // Start editing task
  const startEditTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
  };

  // Save task edit
  const saveTaskEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!editingTaskId || !editTitle.trim()) return;

    try {
      await axios.put(`http://localhost:3001/api/tasks/${editingTaskId}`, {
        title: editTitle.trim(),
        description: editDescription
      });

      setTasks(tasks.map(t =>
        t.id === editingTaskId
          ? { ...t, title: editTitle.trim(), description: editDescription }
          : t
      ));
      setEditingTaskId(null);
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Fehler beim Speichern');
    }
  };

  // Cancel edit
  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(null);
    setEditTitle('');
    setEditDescription('');
  };

  const handleStart = () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (task) {
      onSelect(task);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Task auswählen</h2>

        {!showNewTask ? (
          <>
            <div className="task-list">
              {tasks.length === 0 ? (
                <p className="empty-state">Noch keine Tasks vorhanden.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-item ${selectedTaskId === task.id ? 'selected' : ''} ${editingTaskId === task.id ? 'editing' : ''}`}
                    onClick={() => editingTaskId !== task.id && setSelectedTaskId(task.id)}
                  >
                    {editingTaskId === task.id ? (
                      <div className="task-edit-inline" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Task-Name"
                          className="task-edit-input"
                          autoFocus
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Beschreibung (optional)"
                          className="task-edit-textarea"
                        />
                        <div className="task-edit-buttons">
                          <button className="btn-task-save" onClick={saveTaskEdit}>✓ Speichern</button>
                          <button className="btn-task-cancel" onClick={cancelEdit}>✕ Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                          <div className="task-meta">
                            <span className="priority">Priorität: {task.priority}</span>
                            <span className="sessions">~{task.estimated_sessions} Sessions</span>
                          </div>
                        </div>
                        <div className="task-item-actions">
                          <button
                            className="btn-task-edit"
                            onClick={(e) => startEditTask(task, e)}
                            title="Bearbeiten"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-task-delete"
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            title="Löschen"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setShowNewTask(true)}
              style={{ marginTop: '1rem', width: '100%' }}
            >
              + Neue Task erstellen
            </button>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={onCancel}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={!selectedTaskId}
              >
                Einwählen & Starten
              </button>
            </div>
          </>
        ) : (
          <>
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
              <button className="btn btn-secondary" onClick={() => setShowNewTask(false)}>
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
          </>
        )}
      </div>
    </div>
  );
}
