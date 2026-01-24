import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TaskSelection from '../TaskTimer/TaskSelection';
import TimerModal from '../TaskTimer/TimerModal';
import DocumentationModal from '../TaskDocumentation/DocumentationModal';
import type { Task, WorkSession } from '../../types';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [showTaskSelection, setShowTaskSelection] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);

  // Stats from different modules
  const [sessionStats, setSessionStats] = useState<any>(null);
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

  useEffect(() => {
    loadAllDashboardData();
  }, []);

  const loadAllDashboardData = async () => {
    try {
      // Sessions Stats
      const sessionsRes = await axios.get('http://localhost:3001/api/sessions');
      const statsRes = await axios.get('http://localhost:3001/api/sessions/stats');
      setRecentSessions(sessionsRes.data.slice(0, 3));
      setSessionStats(statsRes.data);

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
              <div className="stat-value">{Math.round((sessionStats?.total_minutes || 0) / 60)}h</div>
              <div className="stat-label">Gearbeitete Zeit</div>
            </div>
          </div>
          <div className="stat-card glow">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">{sessionStats?.sessions_today || 0}</div>
              <div className="stat-label">Heute</div>
            </div>
          </div>
        </div>
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
