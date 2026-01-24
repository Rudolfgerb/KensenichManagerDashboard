import { useState, useEffect } from 'react';
import axios from 'axios';
import './MutuusLaunch.css';

interface Milestone {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  dependencies?: string;
  created_at: string;
}

export default function MutuusLaunch() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    target_date: '',
    progress: 0
  });

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      const res = await axios.get('/api/mutuus/milestones');
      setMilestones(res.data);
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  };

  const handleAddMilestone = async () => {
    try {
      await axios.post('/api/mutuus/milestones', newMilestone);
      setShowAddModal(false);
      setNewMilestone({
        title: '',
        description: '',
        target_date: '',
        progress: 0
      });
      loadMilestones();
    } catch (error) {
      console.error('Error creating milestone:', error);
    }
  };

  const handleUpdateProgress = async (milestoneId: string, newProgress: number) => {
    try {
      const status = newProgress >= 100 ? 'completed' : newProgress > 0 ? 'in_progress' : 'pending';
      await axios.put(`/api/mutuus/milestones/${milestoneId}`, {
        progress: newProgress,
        status
      });
      loadMilestones();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleUpdateStatus = async (milestoneId: string, newStatus: Milestone['status']) => {
    try {
      await axios.put(`/api/mutuus/milestones/${milestoneId}`, { status: newStatus });
      loadMilestones();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🚀';
      case 'completed': return '✅';
      case 'blocked': return '🚫';
      default: return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#888';
      case 'in_progress': return '#f39c12';
      case 'completed': return '#00ff88';
      case 'blocked': return '#e74c3c';
      default: return '#888';
    }
  };

  const filteredMilestones = milestones.filter(m =>
    filterStatus === 'all' || m.status === filterStatus
  );

  const stats = {
    total: milestones.length,
    pending: milestones.filter(m => m.status === 'pending').length,
    in_progress: milestones.filter(m => m.status === 'in_progress').length,
    completed: milestones.filter(m => m.status === 'completed').length,
    blocked: milestones.filter(m => m.status === 'blocked').length,
    overall_progress: milestones.length > 0
      ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length)
      : 0
  };

  return (
    <div className="mutuus-launch-container">
      <div className="mutuus-hero">
        <div className="hero-content">
          <h1>🚀 Mutuus Launch</h1>
          <p>From Zero to Hero - App Launch Roadmap</p>
          <div className="hero-progress">
            <div className="progress-label">
              <span>Gesamt-Fortschritt</span>
              <span className="progress-percentage">{stats.overall_progress}%</span>
            </div>
            <div className="hero-progress-bar">
              <div
                className="hero-progress-fill"
                style={{ width: `${stats.overall_progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowAddModal(true)}>
          + Neuer Milestone
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="mutuus-stats">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Milestones</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Ausstehend</div>
          </div>
        </div>
        <div className="stat-card in-progress">
          <div className="stat-icon">🚀</div>
          <div className="stat-info">
            <div className="stat-value">{stats.in_progress}</div>
            <div className="stat-label">In Arbeit</div>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Fertig</div>
          </div>
        </div>
        <div className="stat-card blocked">
          <div className="stat-icon">🚫</div>
          <div className="stat-info">
            <div className="stat-value">{stats.blocked}</div>
            <div className="stat-label">Blockiert</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mutuus-filters">
        {['all', 'pending', 'in_progress', 'completed', 'blocked'].map(status => (
          <button
            key={status}
            className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'all' ? 'Alle' : status === 'pending' ? 'Ausstehend' : status === 'in_progress' ? 'In Arbeit' : status === 'completed' ? 'Fertig' : 'Blockiert'}
          </button>
        ))}
      </div>

      {/* Milestones Timeline */}
      <div className="milestones-timeline">
        {filteredMilestones.map((milestone, index) => (
          <div
            key={milestone.id}
            className={`milestone-item ${milestone.status}`}
            onClick={() => setSelectedMilestone(milestone)}
          >
            <div className="milestone-number">{index + 1}</div>
            <div className="milestone-content">
              <div className="milestone-header">
                <div>
                  <h3>{milestone.title}</h3>
                  {milestone.description && (
                    <p className="milestone-description">{milestone.description}</p>
                  )}
                </div>
                <div className="milestone-meta">
                  <div
                    className="status-badge"
                    style={{
                      background: getStatusColor(milestone.status) + '33',
                      color: getStatusColor(milestone.status)
                    }}
                  >
                    {getStatusIcon(milestone.status)} {milestone.status}
                  </div>
                </div>
              </div>

              <div className="milestone-progress-section">
                <div className="progress-header">
                  <span>Fortschritt</span>
                  <span className="progress-value">{milestone.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${milestone.progress}%`,
                      background: getStatusColor(milestone.status)
                    }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={milestone.progress}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleUpdateProgress(milestone.id, parseInt(e.target.value));
                  }}
                  className="progress-slider"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="milestone-footer">
                {milestone.target_date && (
                  <div className="target-date">
                    <span className="date-icon">📅</span>
                    <span>{new Date(milestone.target_date).toLocaleDateString('de-DE')}</span>
                  </div>
                )}
                <select
                  value={milestone.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(milestone.id, e.target.value as Milestone['status']);
                  }}
                  className="status-select"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="pending">⏳ Ausstehend</option>
                  <option value="in_progress">🚀 In Arbeit</option>
                  <option value="completed">✅ Fertig</option>
                  <option value="blocked">🚫 Blockiert</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {filteredMilestones.length === 0 && (
          <div className="empty-state">
            <p>🚀 Keine Milestones gefunden</p>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
              Ersten Milestone erstellen
            </button>
          </div>
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🚀 Neuer Milestone</h2>

            <div className="form-group">
              <label>Titel *</label>
              <input
                type="text"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                placeholder="z.B. MVP Development abschließen"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                placeholder="Was genau muss erreicht werden?"
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Zieldatum</label>
              <input
                type="date"
                value={newMilestone.target_date}
                onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddMilestone}
                disabled={!newMilestone.title}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <div className="modal-overlay" onClick={() => setSelectedMilestone(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMilestone.title}</h2>
              <button className="close-btn" onClick={() => setSelectedMilestone(null)}>×</button>
            </div>

            {selectedMilestone.description && (
              <div className="milestone-detail-description">
                <p>{selectedMilestone.description}</p>
              </div>
            )}

            <div className="detail-grid">
              <div className="detail-row">
                <label>Status:</label>
                <div
                  className="status-badge"
                  style={{
                    background: getStatusColor(selectedMilestone.status) + '33',
                    color: getStatusColor(selectedMilestone.status)
                  }}
                >
                  {getStatusIcon(selectedMilestone.status)} {selectedMilestone.status}
                </div>
              </div>
              <div className="detail-row">
                <label>Fortschritt:</label>
                <span style={{ color: getStatusColor(selectedMilestone.status), fontWeight: 'bold' }}>
                  {selectedMilestone.progress}%
                </span>
              </div>
              {selectedMilestone.target_date && (
                <div className="detail-row">
                  <label>Zieldatum:</label>
                  <span>{new Date(selectedMilestone.target_date).toLocaleDateString('de-DE')}</span>
                </div>
              )}
              <div className="detail-row">
                <label>Erstellt:</label>
                <span>{new Date(selectedMilestone.created_at).toLocaleDateString('de-DE')}</span>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary">Bearbeiten</button>
              <button className="btn btn-danger">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
