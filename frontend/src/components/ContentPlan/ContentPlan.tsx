import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ContentIdea, ContentStats } from '../../types';
import './ContentPlan.css';
import ContentIdeaForm from './ContentIdeaForm';
import ContentDetail from './ContentDetail';
import ContentArchive from './ContentArchive';

type ViewMode = 'grid' | 'list' | 'kanban';
type TabMode = 'ideas' | 'archive';

const ContentPlan: React.FC = () => {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [tabMode, setTabMode] = useState<TabMode>('ideas');
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIdeas();
    fetchStats();
  }, [filterStatus, filterPlatform]);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPlatform !== 'all') params.platform = filterPlatform;

      const response = await axios.get('http://localhost:3001/api/content/ideas', { params });
      setIdeas(response.data);
    } catch (error) {
      console.error('Error fetching content ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/content/ideas/stats/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateIdea = async (data: any) => {
    try {
      await axios.post('http://localhost:3001/api/content/ideas', data);
      setShowCreateForm(false);
      fetchIdeas();
      fetchStats();
    } catch (error) {
      console.error('Error creating idea:', error);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm('Content-Idee wirklich löschen?')) return;

    try {
      await axios.delete(`http://localhost:3001/api/content/ideas/${id}`);
      fetchIdeas();
      fetchStats();
      if (selectedIdea?.id === id) setSelectedIdea(null);
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  };

  // const handleUpdateStatus = async (id: string, status: string) => {
  //   try {
  //     await axios.put(`http://localhost:3001/api/content/ideas/${id}`, { status });
  //     fetchIdeas();
  //     fetchStats();
  //   } catch (error) {
  //     console.error('Error updating status:', error);
  //   }
  // };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idea: '#666',
      in_progress: '#f59e0b',
      ready: '#3b82f6',
      published: '#00ff88'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      idea: '💡',
      in_progress: '⚡',
      ready: '✅',
      published: '🚀'
    };
    return icons[status] || '📄';
  };

  const getPlatformIcon = (platform?: string) => {
    const icons: Record<string, string> = {
      youtube: '📺',
      instagram: '📸',
      tiktok: '🎵',
      twitter: '🐦',
      linkedin: '💼',
      facebook: '👥',
      blog: '📝'
    };
    return platform ? icons[platform.toLowerCase()] || '🌐' : '🌐';
  };

  const getProgressPercentage = (idea: ContentIdea) => {
    if (!idea.elements || idea.elements.length === 0) return 0;
    const completedElements = idea.elements.filter(e => e.status === 'ready' || e.status === 'approved').length;
    return Math.round((completedElements / idea.elements.length) * 100);
  };

  const renderKanbanColumn = (status: string, title: string) => {
    const columnIdeas = ideas.filter(idea => idea.status === status);

    return (
      <div className="kanban-column">
        <div className="kanban-column-header">
          <h3>
            {getStatusIcon(status)} {title}
            <span className="kanban-count">{columnIdeas.length}</span>
          </h3>
        </div>
        <div className="kanban-column-content">
          {columnIdeas.map(idea => (
            <div
              key={idea.id}
              className="kanban-card"
              onClick={() => setSelectedIdea(idea)}
            >
              {idea.thumbnail_url && (
                <div className="kanban-card-image">
                  <img src={idea.thumbnail_url} alt={idea.title} />
                </div>
              )}
              <div className="kanban-card-content">
                <h4>{idea.title}</h4>
                {idea.platform && (
                  <span className="kanban-card-platform">
                    {getPlatformIcon(idea.platform)} {idea.platform}
                  </span>
                )}
                {idea.elements && idea.elements.length > 0 && (
                  <div className="kanban-card-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${getProgressPercentage(idea)}%` }}
                      />
                    </div>
                    <span>{getProgressPercentage(idea)}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="content-plan">
      <div className="content-plan-header">
        <div className="content-plan-title">
          <h1>🎬 Content Plan</h1>
          <p>Manage deine Content-Ideen, Elemente & Assets</p>
        </div>

        <button
          className="btn-create-idea"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ Neue Idee
        </button>
      </div>

      {stats && (
        <div className="content-stats">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💡</div>
            <div className="stat-content">
              <div className="stat-value">{stats.ideas}</div>
              <div className="stat-label">Ideen</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <div className="stat-value">{stats.in_progress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.ready}</div>
              <div className="stat-label">Ready</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <div className="stat-value">{stats.published}</div>
              <div className="stat-label">Published</div>
            </div>
          </div>
        </div>
      )}

      <div className="content-plan-tabs">
        <button
          className={`tab-button ${tabMode === 'ideas' ? 'active' : ''}`}
          onClick={() => setTabMode('ideas')}
        >
          💡 Content Ideas
        </button>
        <button
          className={`tab-button ${tabMode === 'archive' ? 'active' : ''}`}
          onClick={() => setTabMode('archive')}
        >
          📚 Content Archive
        </button>
      </div>

      {tabMode === 'ideas' && (
        <>
          <div className="content-plan-controls">
            <div className="filters">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">Alle Status</option>
                <option value="idea">💡 Ideen</option>
                <option value="in_progress">⚡ In Progress</option>
                <option value="ready">✅ Ready</option>
                <option value="published">🚀 Published</option>
              </select>

              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="filter-select"
              >
                <option value="all">Alle Plattformen</option>
                <option value="youtube">📺 YouTube</option>
                <option value="instagram">📸 Instagram</option>
                <option value="tiktok">🎵 TikTok</option>
                <option value="twitter">🐦 Twitter</option>
                <option value="linkedin">💼 LinkedIn</option>
                <option value="facebook">👥 Facebook</option>
                <option value="blog">📝 Blog</option>
              </select>
            </div>

            <div className="view-mode-switcher">
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ▦
              </button>
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰
              </button>
              <button
                className={viewMode === 'kanban' ? 'active' : ''}
                onClick={() => setViewMode('kanban')}
                title="Kanban View"
              >
                ▥
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Lade Content...</div>
          ) : viewMode === 'kanban' ? (
            <div className="kanban-board">
              {renderKanbanColumn('idea', 'Ideen')}
              {renderKanbanColumn('in_progress', 'In Progress')}
              {renderKanbanColumn('ready', 'Ready')}
              {renderKanbanColumn('published', 'Published')}
            </div>
          ) : (
            <div className={`content-ideas-${viewMode}`}>
              {ideas.map(idea => (
                <div
                  key={idea.id}
                  className={`content-idea-card ${viewMode}`}
                  onClick={() => setSelectedIdea(idea)}
                >
                  {viewMode === 'grid' && idea.thumbnail_url && (
                    <div className="idea-thumbnail">
                      <img src={idea.thumbnail_url} alt={idea.title} />
                    </div>
                  )}

                  <div className="idea-content">
                    <div className="idea-header">
                      <h3>{idea.title}</h3>
                      <div className="idea-badges">
                        {idea.platform && (
                          <span className="badge badge-platform">
                            {getPlatformIcon(idea.platform)} {idea.platform}
                          </span>
                        )}
                        <span
                          className="badge badge-status"
                          style={{ backgroundColor: getStatusColor(idea.status) }}
                        >
                          {getStatusIcon(idea.status)} {idea.status}
                        </span>
                      </div>
                    </div>

                    {idea.description && (
                      <p className="idea-description">{idea.description}</p>
                    )}

                    {idea.elements && idea.elements.length > 0 && (
                      <div className="idea-progress">
                        <div className="progress-info">
                          <span>{idea.elements.filter(e => e.status === 'ready' || e.status === 'approved').length} / {idea.elements.length} Elemente</span>
                          <span>{getProgressPercentage(idea)}%</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${getProgressPercentage(idea)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="idea-footer">
                      <div className="idea-meta">
                        {idea.target_date && (
                          <span>📅 {new Date(idea.target_date).toLocaleDateString('de-DE')}</span>
                        )}
                        {idea.priority > 0 && (
                          <span>⭐ P{idea.priority}</span>
                        )}
                      </div>
                      <button
                        className="btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIdea(idea.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tabMode === 'archive' && <ContentArchive />}

      {showCreateForm && (
        <ContentIdeaForm
          onSubmit={handleCreateIdea}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {selectedIdea && (
        <ContentDetail
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onUpdate={() => {
            fetchIdeas();
            fetchStats();
          }}
        />
      )}
    </div>
  );
};

export default ContentPlan;
