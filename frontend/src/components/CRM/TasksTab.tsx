import { useState, useEffect } from 'react';
import axios from 'axios';

interface Contact {
  id: string;
  name: string;
}

interface CRMTask {
  id: string;
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  due_date?: string;
  contact_id?: string;
  contact_name?: string;
  deal_id?: string;
  deal_title?: string;
  completed_at?: string;
  created_at: string;
}

interface TasksTabProps {
  contacts: Contact[];
}

export default function TasksTab({ contacts }: TasksTabProps) {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'todo',
    priority: 'normal',
    due_date: '',
    contact_id: ''
  });

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/crm/tasks?status=${filter === 'all' ? '' : filter}`);
      setTasks(res.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      // Fallback: Try with query param
      try {
        const status = filter === 'pending' ? 'pending' : filter === 'completed' ? 'completed' : '';
        const url = status ? `/api/crm/tasks?status=${status}` : '/api/crm/tasks';
        const res = await axios.get(url);
        setTasks(res.data);
      } catch (e) {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      await axios.post('/api/crm/tasks', newTask);
      setShowTaskForm(false);
      setNewTask({
        title: '',
        description: '',
        task_type: 'todo',
        priority: 'normal',
        due_date: '',
        contact_id: ''
      });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await axios.post(`/api/crm/tasks/${taskId}/complete`);
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Aufgabe wirklich löschen?')) return;
    try {
      await axios.delete(`/api/crm/tasks/${taskId}`);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const taskTypes = [
    { value: 'todo', label: 'Aufgabe', icon: '✅' },
    { value: 'call', label: 'Anruf', icon: '📞' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'meeting', label: 'Meeting', icon: '🤝' },
    { value: 'follow_up', label: 'Follow-up', icon: '🔄' },
  ];

  const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Niedrig', color: '#888' },
    normal: { label: 'Normal', color: '#00ccff' },
    high: { label: 'Hoch', color: '#ffc800' },
    urgent: { label: 'Dringend', color: '#ff6b6b' }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isToday = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by priority first
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                         (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  const todaysTasks = tasks.filter(t => isToday(t.due_date) && t.status !== 'completed');
  const overdueTasks = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'completed');

  return (
    <div className="tasks-tab">
      <div className="tasks-header">
        <h2>✅ CRM Aufgaben</h2>
        <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>
          + Neue Aufgabe
        </button>
      </div>

      {/* Quick Stats */}
      <div className="tasks-stats">
        <div className="stat-card warning">
          <span className="stat-value">{overdueTasks.length}</span>
          <span className="stat-label">Überfällig</span>
        </div>
        <div className="stat-card info">
          <span className="stat-value">{todaysTasks.length}</span>
          <span className="stat-label">Heute fällig</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{tasks.filter(t => t.status === 'pending').length}</span>
          <span className="stat-label">Offen</span>
        </div>
        <div className="stat-card success">
          <span className="stat-value">{tasks.filter(t => t.status === 'completed').length}</span>
          <span className="stat-label">Erledigt</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tasks-filter">
        <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>
          Offen
        </button>
        <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>
          Erledigt
        </button>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          Alle
        </button>
      </div>

      {/* Task List */}
      <div className="tasks-list">
        {loading ? (
          <div className="loading-state">Laden...</div>
        ) : sortedTasks.length === 0 ? (
          <div className="empty-state">
            {filter === 'pending' ? 'Keine offenen Aufgaben' : filter === 'completed' ? 'Keine erledigten Aufgaben' : 'Keine Aufgaben'}
          </div>
        ) : (
          sortedTasks.map(task => (
            <div
              key={task.id}
              className={`task-item ${task.status === 'completed' ? 'completed' : ''} ${isOverdue(task.due_date) && task.status !== 'completed' ? 'overdue' : ''}`}
            >
              <button
                className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
              >
                {task.status === 'completed' ? '✓' : ''}
              </button>

              <div className="task-type-icon">
                {taskTypes.find(t => t.value === task.task_type)?.icon || '✅'}
              </div>

              <div className="task-content">
                <div className="task-header">
                  <span className="task-title">{task.title}</span>
                  <span
                    className="task-priority"
                    style={{ backgroundColor: priorityConfig[task.priority]?.color || '#888' }}
                  >
                    {priorityConfig[task.priority]?.label || task.priority}
                  </span>
                </div>

                {task.description && (
                  <p className="task-description">{task.description}</p>
                )}

                <div className="task-meta">
                  {task.due_date && (
                    <span className={`task-due ${isOverdue(task.due_date) ? 'overdue' : ''} ${isToday(task.due_date) ? 'today' : ''}`}>
                      📅 {isToday(task.due_date) ? 'Heute' : new Date(task.due_date).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  {task.contact_name && (
                    <span className="task-contact">👤 {task.contact_name}</span>
                  )}
                  {task.deal_title && (
                    <span className="task-deal">💼 {task.deal_title}</span>
                  )}
                </div>
              </div>

              <button className="task-delete" onClick={() => handleDeleteTask(task.id)}>
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* New Task Form */}
      {showTaskForm && (
        <div className="modal-overlay" onClick={() => setShowTaskForm(false)}>
          <div className="modal task-form" onClick={e => e.stopPropagation()}>
            <h2>Neue Aufgabe</h2>

            <div className="form-group">
              <label>Titel *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="z.B. Follow-up mit Kunde"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Typ</label>
                <select value={newTask.task_type} onChange={e => setNewTask({ ...newTask, task_type: e.target.value })}>
                  {taskTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Priorität</label>
                <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                  <option value="low">Niedrig</option>
                  <option value="normal">Normal</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fällig am</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Kontakt</label>
                <select value={newTask.contact_id} onChange={e => setNewTask({ ...newTask, contact_id: e.target.value })}>
                  <option value="">-- Optional --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Details zur Aufgabe..."
                rows={3}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowTaskForm(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateTask}
                disabled={!newTask.title}
              >
                Aufgabe erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
