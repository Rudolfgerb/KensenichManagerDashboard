import { useState, useEffect } from 'react';
import axios from 'axios';
import './JobTracker.css';

interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  applied_date?: string;
  interview_date?: string;
  notes?: string;
  salary_range?: string;
  job_url?: string;
  contact_person?: string;
  created_at: string;
}

export default function JobTracker() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newApp, setNewApp] = useState({
    company: '',
    position: '',
    status: 'applied' as const,
    applied_date: new Date().toISOString().split('T')[0],
    interview_date: '',
    notes: '',
    salary_range: '',
    job_url: '',
    contact_person: ''
  });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const res = await axios.get('/api/jobs');
      setApplications(res.data);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const handleAddApplication = async () => {
    try {
      await axios.post('/api/jobs', newApp);
      setShowAddModal(false);
      setNewApp({
        company: '',
        position: '',
        status: 'applied',
        applied_date: new Date().toISOString().split('T')[0],
        interview_date: '',
        notes: '',
        salary_range: '',
        job_url: '',
        contact_person: ''
      });
      loadApplications();
    } catch (error) {
      console.error('Error creating application:', error);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: JobApplication['status']) => {
    try {
      await axios.put(`/api/jobs/${appId}`, { status: newStatus });
      loadApplications();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return '#4a90e2';
      case 'interview': return '#f39c12';
      case 'offer': return '#00ff88';
      case 'rejected': return '#e74c3c';
      default: return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return '📤';
      case 'interview': return '🗣️';
      case 'offer': return '🎉';
      case 'rejected': return '❌';
      default: return '📋';
    }
  };

  const filteredApps = applications
    .filter(app => filterStatus === 'all' || app.status === filterStatus)
    .filter(app =>
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === 'applied').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer: applications.filter(a => a.status === 'offer').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  return (
    <div className="job-tracker-container">
      <div className="jobs-header">
        <div>
          <h1>💼 Job Search Tracker</h1>
          <p>Bewerbungen & Karriere</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Neue Bewerbung
        </button>
      </div>

      {/* Stats Cards */}
      <div className="jobs-stats">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Gesamt</div>
          </div>
        </div>
        <div className="stat-card applied">
          <div className="stat-icon">📤</div>
          <div className="stat-info">
            <div className="stat-value">{stats.applied}</div>
            <div className="stat-label">Beworben</div>
          </div>
        </div>
        <div className="stat-card interview">
          <div className="stat-icon">🗣️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.interview}</div>
            <div className="stat-label">Interview</div>
          </div>
        </div>
        <div className="stat-card offer">
          <div className="stat-icon">🎉</div>
          <div className="stat-info">
            <div className="stat-value">{stats.offer}</div>
            <div className="stat-label">Angebote</div>
          </div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Absagen</div>
          </div>
        </div>
      </div>

      <div className="jobs-controls">
        <input
          type="text"
          placeholder="🔍 Firma oder Position suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="filter-buttons">
          {['all', 'applied', 'interview', 'offer', 'rejected'].map(status => (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'Alle' : status === 'applied' ? 'Beworben' : status === 'interview' ? 'Interview' : status === 'offer' ? 'Angebote' : 'Absagen'}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="applications-grid">
        {filteredApps.map(app => (
          <div
            key={app.id}
            className={`application-card ${app.status}`}
            onClick={() => setSelectedApp(app)}
          >
            <div className="app-header">
              <div>
                <h3>{app.company}</h3>
                <p className="position">{app.position}</p>
              </div>
              <div className="status-badge" style={{ background: getStatusColor(app.status) + '33', color: getStatusColor(app.status) }}>
                {getStatusIcon(app.status)} {app.status}
              </div>
            </div>

            <div className="app-details">
              {app.applied_date && (
                <div className="detail-item">
                  <span className="detail-label">📅 Beworben:</span>
                  <span>{new Date(app.applied_date).toLocaleDateString('de-DE')}</span>
                </div>
              )}
              {app.interview_date && (
                <div className="detail-item">
                  <span className="detail-label">🗣️ Interview:</span>
                  <span>{new Date(app.interview_date).toLocaleDateString('de-DE')}</span>
                </div>
              )}
              {app.salary_range && (
                <div className="detail-item">
                  <span className="detail-label">💰 Gehalt:</span>
                  <span>{app.salary_range}</span>
                </div>
              )}
              {app.contact_person && (
                <div className="detail-item">
                  <span className="detail-label">👤 Kontakt:</span>
                  <span>{app.contact_person}</span>
                </div>
              )}
            </div>

            {app.notes && (
              <div className="app-notes">
                <p>{app.notes.substring(0, 100)}{app.notes.length > 100 ? '...' : ''}</p>
              </div>
            )}

            <div className="app-actions">
              <select
                value={app.status}
                onChange={(e) => {
                  e.stopPropagation();
                  handleUpdateStatus(app.id, e.target.value as JobApplication['status']);
                }}
                className="status-select"
              >
                <option value="applied">📤 Beworben</option>
                <option value="interview">🗣️ Interview</option>
                <option value="offer">🎉 Angebot</option>
                <option value="rejected">❌ Absage</option>
              </select>
            </div>
          </div>
        ))}

        {filteredApps.length === 0 && (
          <div className="empty-state">
            <p>📭 Keine Bewerbungen gefunden</p>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
              Erste Bewerbung anlegen
            </button>
          </div>
        )}
      </div>

      {/* Add Application Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Neue Bewerbung anlegen</h2>

            <div className="form-group">
              <label>Firma *</label>
              <input
                type="text"
                value={newApp.company}
                onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                placeholder="z.B. Google"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Position *</label>
              <input
                type="text"
                value={newApp.position}
                onChange={(e) => setNewApp({ ...newApp, position: e.target.value })}
                placeholder="z.B. Senior Frontend Developer"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={newApp.status} onChange={(e) => setNewApp({ ...newApp, status: e.target.value as any })}>
                  <option value="applied">Beworben</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Angebot</option>
                  <option value="rejected">Absage</option>
                </select>
              </div>

              <div className="form-group">
                <label>Bewerbungsdatum</label>
                <input
                  type="date"
                  value={newApp.applied_date}
                  onChange={(e) => setNewApp({ ...newApp, applied_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Interview-Datum</label>
              <input
                type="date"
                value={newApp.interview_date}
                onChange={(e) => setNewApp({ ...newApp, interview_date: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gehaltsspanne</label>
                <input
                  type="text"
                  value={newApp.salary_range}
                  onChange={(e) => setNewApp({ ...newApp, salary_range: e.target.value })}
                  placeholder="z.B. 60.000€ - 80.000€"
                />
              </div>

              <div className="form-group">
                <label>Ansprechpartner</label>
                <input
                  type="text"
                  value={newApp.contact_person}
                  onChange={(e) => setNewApp({ ...newApp, contact_person: e.target.value })}
                  placeholder="z.B. Max Mustermann"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Job-URL</label>
              <input
                type="url"
                value={newApp.job_url}
                onChange={(e) => setNewApp({ ...newApp, job_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label>Notizen</label>
              <textarea
                value={newApp.notes}
                onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                placeholder="Wichtige Infos, Anforderungen, Eindruck..."
                rows={4}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddApplication}
                disabled={!newApp.company || !newApp.position}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedApp.company}</h2>
                <p style={{ margin: 0, color: '#888' }}>{selectedApp.position}</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedApp(null)}>×</button>
            </div>

            <div className="detail-grid">
              <div className="detail-row">
                <label>Status:</label>
                <div className="status-badge" style={{ background: getStatusColor(selectedApp.status) + '33', color: getStatusColor(selectedApp.status) }}>
                  {getStatusIcon(selectedApp.status)} {selectedApp.status}
                </div>
              </div>
              {selectedApp.applied_date && (
                <div className="detail-row">
                  <label>Bewerbungsdatum:</label>
                  <span>{new Date(selectedApp.applied_date).toLocaleDateString('de-DE')}</span>
                </div>
              )}
              {selectedApp.interview_date && (
                <div className="detail-row">
                  <label>Interview-Datum:</label>
                  <span>{new Date(selectedApp.interview_date).toLocaleDateString('de-DE')}</span>
                </div>
              )}
              {selectedApp.salary_range && (
                <div className="detail-row">
                  <label>Gehaltsspanne:</label>
                  <span>{selectedApp.salary_range}</span>
                </div>
              )}
              {selectedApp.contact_person && (
                <div className="detail-row">
                  <label>Ansprechpartner:</label>
                  <span>{selectedApp.contact_person}</span>
                </div>
              )}
              {selectedApp.job_url && (
                <div className="detail-row">
                  <label>Job-URL:</label>
                  <a href={selectedApp.job_url} target="_blank" rel="noopener noreferrer" className="job-link">
                    Link öffnen →
                  </a>
                </div>
              )}
            </div>

            {selectedApp.notes && (
              <div className="notes-section">
                <h4>Notizen</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedApp.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
