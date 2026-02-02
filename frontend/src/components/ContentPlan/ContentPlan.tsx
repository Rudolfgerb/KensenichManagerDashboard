import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ContentIdea, ContentStats } from '../../types';
import './ContentPlan.css';
import './ContentPlanAdditionalStyles.css';
import ContentIdeaForm from './ContentIdeaForm';
import ContentDetail from './ContentDetail';
import ContentArchive from './ContentArchive';

type ViewMode = 'grid' | 'list' | 'kanban';
type TabMode = 'ideas' | 'archive' | 'social' | 'calendar' | 'performance';

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  connected: boolean;
  followers?: number;
  subscribers?: number;
  connections?: number;
  engagement_rate?: number;
  views_last_30?: number;
  profile_views?: number;
  likes?: number;
  last_post?: string | null;
  last_video?: string;
  icon: string;
}

interface SocialStats {
  total_followers: number;
  engagement_rate: number;
  growth_last_30: number;
  posts_last_30: number;
  best_performing: string;
  worst_performing: string;
  audience_demographics: {
    age: Record<string, number>;
    gender: { male: number; female: number };
    location: Record<string, number>;
  };
}

interface CalendarEvent {
  id: string;
  title: string;
  platform: string;
  date: string;
  time: string;
  status: string;
  content_type: string;
  duration?: string;
  thumbnail?: string;
  caption?: string;
  hashtags?: string[];
  views?: number;
  engagement?: number;
}

interface PerformanceData {
  overall: {
    total_posts: number;
    total_reach: number;
    total_engagement: number;
    engagement_rate: number;
    growth_rate: number;
  };
  by_platform: Record<string, {
    posts: number;
    reach: number;
    engagement: number;
    engagement_rate: number;
    growth: number;
  }>;
  recent_posts: Array<{
    id: string;
    title: string;
    platform: string;
    date: string;
    reach: number;
    engagement: number;
    engagement_rate: number;
    sentiment: string;
  }>;
}

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
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);

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

  const fetchSocialAccounts = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockData = [
        {
          id: '1',
          platform: 'Instagram',
          username: '@kensenich',
          connected: true,
          followers: 15428,
          engagement_rate: 4.2,
          last_post: '2024-03-15',
          icon: '📸'
        },
        {
          id: '2',
          platform: 'YouTube',
          username: 'Kensenich TV',
          connected: true,
          subscribers: 8723,
          views_last_30: 125487,
          last_video: '2024-03-10',
          icon: '📺'
        },
        {
          id: '3',
          platform: 'TikTok',
          username: '@kensenich',
          connected: false,
          followers: 0,
          likes: 0,
          last_post: null,
          icon: '🎵'
        },
        {
          id: '4',
          platform: 'LinkedIn',
          username: 'Rudik Kensenich',
          connected: true,
          connections: 5214,
          profile_views: 3287,
          last_post: '2024-03-12',
          icon: '💼'
        }
      ];
      setSocialAccounts(mockData as SocialAccount[]);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    }
  };

  const fetchSocialStats = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockData = {
        total_followers: 29365,
        engagement_rate: 3.8,
        growth_last_30: 1248,
        posts_last_30: 18,
        best_performing: 'Instagram',
        worst_performing: 'TikTok',
        audience_demographics: {
          age: { '18-24': 32, '25-34': 45, '35-44': 18, '45+': 5 },
          gender: { male: 58, female: 42 },
          location: { germany: 62, usa: 15, uk: 8, other: 15 }
        }
      };
      setSocialStats(mockData as SocialStats);
    } catch (error) {
      console.error('Error fetching social stats:', error);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockData = [
        {
          id: '1',
          title: 'YouTube Video: React Tutorial',
          platform: 'YouTube',
          date: '2024-03-20',
          time: '15:00',
          status: 'scheduled',
          content_type: 'video',
          duration: '12:45',
          thumbnail: '/images/youtube-thumb.jpg'
        },
        {
          id: '2',
          title: 'Instagram Post: New Project Launch',
          platform: 'Instagram',
          date: '2024-03-22',
          time: '18:30',
          status: 'draft',
          content_type: 'image',
          caption: 'Excited to announce our new project!',
          hashtags: ['#launch', '#newproject', '#tech']
        },
        {
          id: '3',
          title: 'LinkedIn Article: AI in Business',
          platform: 'LinkedIn',
          date: '2024-03-25',
          time: '09:00',
          status: 'published',
          content_type: 'article',
          views: 1248,
          engagement: 87
        },
        {
          id: '4',
          title: 'TikTok Video: Quick Coding Tip',
          platform: 'TikTok',
          date: '2024-03-27',
          time: '12:00',
          status: 'scheduled',
          content_type: 'video',
          duration: '00:58'
        }
      ];
      setCalendarEvents(mockData as CalendarEvent[]);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockData = {
        overall: {
          total_posts: 42,
          total_reach: 124876,
          total_engagement: 8742,
          engagement_rate: 7.0,
          growth_rate: 12.4
        },
        by_platform: {
          instagram: {
            posts: 12,
            reach: 45872,
            engagement: 3458,
            engagement_rate: 7.5,
            growth: 428
          },
          youtube: {
            posts: 8,
            reach: 52487,
            engagement: 2874,
            engagement_rate: 5.5,
            growth: 321
          },
          linkedin: {
            posts: 15,
            reach: 18456,
            engagement: 1548,
            engagement_rate: 8.4,
            growth: 287
          },
          tiktok: {
            posts: 7,
            reach: 8063,
            engagement: 862,
            engagement_rate: 10.7,
            growth: 212
          }
        },
        recent_posts: [
          {
            id: '1',
            title: 'React Hooks Tutorial',
            platform: 'YouTube',
            date: '2024-03-10',
            reach: 12487,
            engagement: 874,
            engagement_rate: 7.0,
            sentiment: 'positive'
          },
          {
            id: '2',
            title: 'New Project Launch',
            platform: 'Instagram',
            date: '2024-03-12',
            reach: 8742,
            engagement: 654,
            engagement_rate: 7.5,
            sentiment: 'very_positive'
          }
        ]
      };
      setPerformanceData(mockData as PerformanceData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
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
          className={`tab-button ideas-tab ${tabMode === 'ideas' ? 'active' : ''}`}
          onClick={() => setTabMode('ideas')}
        >
          💡 Content Ideas
        </button>
        <button
          className={`tab-button archive-tab ${tabMode === 'archive' ? 'active' : ''}`}
          onClick={() => setTabMode('archive')}
        >
          📚 Content Archive
        </button>
        <button
          className={`tab-button social-tab ${tabMode === 'social' ? 'active' : ''}`}
          onClick={() => {
            setTabMode('social');
            fetchSocialAccounts();
            fetchSocialStats();
          }}
        >
          📱 Social Media
        </button>
        <button
          className={`tab-button calendar-tab ${tabMode === 'calendar' ? 'active' : ''}`}
          onClick={() => {
            setTabMode('calendar');
            fetchCalendarEvents();
          }}
        >
          📅 Upload Calendar
        </button>
        <button
          className={`tab-button performance-tab ${tabMode === 'performance' ? 'active' : ''}`}
          onClick={() => {
            setTabMode('performance');
            fetchPerformanceData();
          }}
        >
          📈 Performance
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

      {tabMode === 'social' && (
        <div className="social-media-tab">
          <h2>📊 Social Media Integration</h2>
          
          {socialStats && (
            <div className="social-overview">
              <div className="social-stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{socialStats.total_followers.toLocaleString()}</div>
                <div className="stat-label">Total Followers</div>
              </div>
              <div className="social-stat-card">
                <div className="stat-icon">❤️</div>
                <div className="stat-value">{socialStats.engagement_rate}%</div>
                <div className="stat-label">Engagement Rate</div>
              </div>
              <div className="social-stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-value">+{socialStats.growth_last_30}</div>
                <div className="stat-label">Growth (30d)</div>
              </div>
              <div className="social-stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-value">{socialStats.posts_last_30}</div>
                <div className="stat-label">Posts (30d)</div>
              </div>
            </div>
          )}
          
          <div className="social-accounts">
            <h3>🔗 Connected Accounts</h3>
            <div className="accounts-grid">
              {socialAccounts.map(account => (
                <div key={account.id} className="account-card">
                  <div className="account-header">
                    <div className="account-icon">{account.icon}</div>
                    <div className="account-info">
                      <h4>{account.platform}</h4>
                      <p>{account.username}</p>
                    </div>
                  </div>
                  <div className="account-status">
                    <span className={`status-badge ${account.connected ? 'connected' : 'disconnected'}`}>
                      {account.connected ? '✓ Connected' : '✗ Disconnected'}
                    </span>
                  </div>
                  <div className="account-stats">
                    {account.platform === 'Instagram' && (
                      <>
                        <div className="stat-item">
                          <span>👥 {account.followers?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="stat-item">
                          <span>❤️ {account.engagement_rate}%</span>
                        </div>
                      </>
                    )}
                    {account.platform === 'YouTube' && (
                      <>
                        <div className="stat-item">
                          <span>👥 {account.subscribers?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="stat-item">
                          <span>👁️ {account.views_last_30?.toLocaleString() || '0'}</span>
                        </div>
                      </>
                    )}
                    {account.platform === 'LinkedIn' && (
                      <>
                        <div className="stat-item">
                          <span>👥 {account.connections?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="stat-item">
                          <span>👁️ {account.profile_views?.toLocaleString() || '0'}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="account-actions">
                    <button className="btn-connect">
                      {account.connected ? '🔄 Refresh' : '🔌 Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {socialStats && (
            <div className="social-demographics">
              <h3>📊 Audience Demographics</h3>
              <div className="demographics-grid">
                <div className="demo-chart">
                  <h4>Age Distribution</h4>
                  <div className="chart-bars">
                    {Object.entries(socialStats.audience_demographics.age).map(([age, percent]) => (
                      <div key={age} className="chart-bar">
                        <div className="bar-label">{age}</div>
                        <div className="bar-wrapper">
                          <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="bar-value">{percent}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="demo-chart">
                  <h4>Gender</h4>
                  <div className="gender-chart">
                    <div className="gender-item male">
                      <span>Male: {socialStats.audience_demographics.gender.male}%</span>
                    </div>
                    <div className="gender-item female">
                      <span>Female: {socialStats.audience_demographics.gender.female}%</span>
                    </div>
                  </div>
                </div>
                <div className="demo-chart">
                  <h4>Location</h4>
                  <div className="location-chart">
                    {Object.entries(socialStats.audience_demographics.location).map(([country, percent]) => (
                      <div key={country} className="location-item">
                        <span>{country}: {percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tabMode === 'calendar' && (
        <div className="upload-calendar-tab">
          <h2>📅 Upload Calendar</h2>
          
          <div className="calendar-controls">
            <button className="btn-create-upload">➕ Add New Upload</button>
            <div className="calendar-view-switcher">
              <button className="active">Month</button>
              <button>Week</button>
              <button>Day</button>
            </div>
          </div>
          
          <div className="calendar-grid">
            <div className="calendar-header">
              <div className="calendar-day-header">Monday</div>
              <div className="calendar-day-header">Tuesday</div>
              <div className="calendar-day-header">Wednesday</div>
              <div className="calendar-day-header">Thursday</div>
              <div className="calendar-day-header">Friday</div>
              <div className="calendar-day-header">Saturday</div>
              <div className="calendar-day-header">Sunday</div>
            </div>
            
            <div className="calendar-weeks">
              {/* Week 1 */}
              <div className="calendar-week">
                <div className="calendar-day empty"></div>
                <div className="calendar-day empty"></div>
                <div className="calendar-day empty"></div>
                <div className="calendar-day empty"></div>
                <div className="calendar-day empty"></div>
                <div className="calendar-day">1</div>
                <div className="calendar-day">2</div>
              </div>
              
              {/* Week 2 */}
              <div className="calendar-week">
                <div className="calendar-day">3</div>
                <div className="calendar-day">4</div>
                <div className="calendar-day">5</div>
                <div className="calendar-day">6</div>
                <div className="calendar-day">7</div>
                <div className="calendar-day">8</div>
                <div className="calendar-day">9</div>
              </div>
              
              {/* Week 3 */}
              <div className="calendar-week">
                <div className="calendar-day">10</div>
                <div className="calendar-day">11</div>
                <div className="calendar-day">12</div>
                <div className="calendar-day">13</div>
                <div className="calendar-day">14</div>
                <div className="calendar-day">15</div>
                <div className="calendar-day">16</div>
              </div>
              
              {/* Week 4 */}
              <div className="calendar-week">
                <div className="calendar-day">17</div>
                <div className="calendar-day">18</div>
                <div className="calendar-day">19</div>
                <div className="calendar-day">20</div>
                <div className="calendar-day">21</div>
                <div className="calendar-day">22</div>
                <div className="calendar-day">23</div>
              </div>
              
              {/* Week 5 */}
              <div className="calendar-week">
                <div className="calendar-day">24</div>
                <div className="calendar-day">25</div>
                <div className="calendar-day">26</div>
                <div className="calendar-day">27</div>
                <div className="calendar-day">28</div>
                <div className="calendar-day">29</div>
                <div className="calendar-day">30</div>
              </div>
            </div>
          </div>
          
          <div className="upcoming-uploads">
            <h3>🚀 Upcoming Uploads</h3>
            <div className="uploads-list">
              {calendarEvents.map(event => (
                <div key={event.id} className="upload-item">
                  <div className="upload-header">
                    <span className="upload-platform">{event.platform}</span>
                    <span className={`upload-status ${event.status}`}>{event.status}</span>
                  </div>
                  <div className="upload-title">{event.title}</div>
                  <div className="upload-meta">
                    <span>📅 {event.date} at {event.time}</span>
                    <span>🕒 {event.content_type}</span>
                    {event.duration && <span>⏱️ {event.duration}</span>}
                  </div>
                  <div className="upload-actions">
                    <button className="btn-edit">✏️ Edit</button>
                    <button className="btn-delete">🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tabMode === 'performance' && (
        <div className="performance-tab">
          <h2>📈 Performance Analytics</h2>
          
          {performanceData && (
            <div className="performance-overview">
              <div className="performance-stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{performanceData.overall.total_posts}</div>
                <div className="stat-label">Total Posts</div>
              </div>
              <div className="performance-stat-card">
                <div className="stat-icon">👁️</div>
                <div className="stat-value">{performanceData.overall.total_reach.toLocaleString()}</div>
                <div className="stat-label">Total Reach</div>
              </div>
              <div className="performance-stat-card">
                <div className="stat-icon">❤️</div>
                <div className="stat-value">{performanceData.overall.total_engagement.toLocaleString()}</div>
                <div className="stat-label">Total Engagement</div>
              </div>
              <div className="performance-stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-value">{performanceData.overall.engagement_rate}%</div>
                <div className="stat-label">Engagement Rate</div>
              </div>
              <div className="performance-stat-card">
                <div className="stat-icon">🚀</div>
                <div className="stat-value">+{performanceData.overall.growth_rate}%</div>
                <div className="stat-label">Growth Rate</div>
              </div>
            </div>
          )}
          
          <div className="performance-by-platform">
            <h3>📊 Performance by Platform</h3>
            <div className="platform-performance-grid">
              {Object.entries(performanceData?.by_platform || {}).map(([platform, data]) => (
                <div key={platform} className="platform-performance-card">
                  <div className="platform-header">
                    <h4>{platform.charAt(0).toUpperCase() + platform.slice(1)}</h4>
                  </div>
                  <div className="platform-stats">
                    <div className="platform-stat-item">
                      <span>📝 {data.posts} Posts</span>
                    </div>
                    <div className="platform-stat-item">
                      <span>👁️ {data.reach.toLocaleString()} Reach</span>
                    </div>
                    <div className="platform-stat-item">
                      <span>❤️ {data.engagement.toLocaleString()} Engagement</span>
                    </div>
                    <div className="platform-stat-item">
                      <span>📈 {data.engagement_rate}% Rate</span>
                    </div>
                    <div className="platform-stat-item">
                      <span>🚀 +{data.growth} Growth</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="recent-posts-performance">
            <h3>📝 Recent Posts Performance</h3>
            <div className="recent-posts-list">
              {performanceData?.recent_posts.map(post => (
                <div key={post.id} className="recent-post-item">
                  <div className="post-header">
                    <span className="post-platform">{post.platform}</span>
                    <span className="post-date">{post.date}</span>
                  </div>
                  <div className="post-title">{post.title}</div>
                  <div className="post-performance-metrics">
                    <div className="metric">
                      <span>👁️ {post.reach.toLocaleString()}</span>
                    </div>
                    <div className="metric">
                      <span>❤️ {post.engagement.toLocaleString()}</span>
                    </div>
                    <div className="metric">
                      <span>📈 {post.engagement_rate}%</span>
                    </div>
                    <div className="metric">
                      <span className={`sentiment ${post.sentiment}`}>{post.sentiment}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tabMode === 'archive' && <ContentArchive />}

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

      {showCreateForm && (
        <ContentIdeaForm
          onSubmit={handleCreateIdea}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default ContentPlan;
