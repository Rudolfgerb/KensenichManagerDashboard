import { useState, useEffect } from 'react';
import axios from 'axios';
import './AnalyticsDashboard.css';

interface AnalyticsData {
  overview: {
    totalVisitors: number;
    totalPageviews: number;
    avgSessionDuration: string;
    bounceRate: string;
    conversionRate: string;
  };
  googleAnalytics: any;
  socialMedia: any;
  email: any;
  timeSeries: any[];
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'social' | 'email' | 'ga'>('overview');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/integrations/analytics?range=${timeRange}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Lade Analytics Daten...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-error">
        <span className="error-icon">⚠️</span>
        <p>Fehler beim Laden der Analytics</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div>
          <h1>💀🔮 Analytics Dashboard</h1>
          <p className="header-subtitle">Alle deine wichtigen KPIs an einem Ort</p>
        </div>

        <div className="time-range-selector">
          {['7d', '30d', '90d', '1y'].map(range => (
            <button
              key={range}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range === '7d' ? '7 Tage' : range === '30d' ? '30 Tage' : range === '90d' ? '90 Tage' : '1 Jahr'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">👥</div>
          <div className="kpi-content">
            <div className="kpi-label">Total Visitors</div>
            <div className="kpi-value">{analytics.overview.totalVisitors.toLocaleString()}</div>
            <div className="kpi-change positive">+12.5%</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">📄</div>
          <div className="kpi-content">
            <div className="kpi-label">Pageviews</div>
            <div className="kpi-value">{analytics.overview.totalPageviews.toLocaleString()}</div>
            <div className="kpi-change positive">+8.3%</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏱️</div>
          <div className="kpi-content">
            <div className="kpi-label">Avg. Duration</div>
            <div className="kpi-value">{analytics.overview.avgSessionDuration}</div>
            <div className="kpi-change positive">+5.2%</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-content">
            <div className="kpi-label">Conversion Rate</div>
            <div className="kpi-value">{analytics.overview.conversionRate}</div>
            <div className="kpi-change positive">+2.1%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        <button
          className={`tab-btn ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          📊 Übersicht
        </button>
        <button
          className={`tab-btn ${selectedTab === 'ga' ? 'active' : ''}`}
          onClick={() => setSelectedTab('ga')}
        >
          📈 Google Analytics
        </button>
        <button
          className={`tab-btn ${selectedTab === 'social' ? 'active' : ''}`}
          onClick={() => setSelectedTab('social')}
        >
          📱 Social Media
        </button>
        <button
          className={`tab-btn ${selectedTab === 'email' ? 'active' : ''}`}
          onClick={() => setSelectedTab('email')}
        >
          📧 Email Marketing
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {selectedTab === 'overview' && (
          <div className="overview-section">
            <div className="chart-card">
              <h3>Traffic Trends (30 Tage)</h3>
              <div className="simple-chart">
                {analytics.timeSeries.map((day: any, idx: number) => (
                  <div key={idx} className="chart-bar" style={{ height: `${(day.visitors / 500) * 100}%` }}>
                    <span className="bar-tooltip">{day.visitors}</span>
                  </div>
                ))}
              </div>
              <div className="chart-labels">
                <span>Vor 30 Tagen</span>
                <span>Heute</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h4>Traffic Sources</h4>
                {analytics.googleAnalytics.trafficSources.map((source: any) => (
                  <div key={source.source} className="source-row">
                    <span className="source-name">{source.source}</span>
                    <div className="source-bar">
                      <div className="bar-fill" style={{ width: `${source.percentage}%` }}></div>
                    </div>
                    <span className="source-value">{source.sessions.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="stat-card">
                <h4>Top Pages</h4>
                {analytics.googleAnalytics.topPages.map((page: any, idx: number) => (
                  <div key={idx} className="page-row">
                    <span className="page-url">{page.page}</span>
                    <span className="page-views">{page.views.toLocaleString()} views</span>
                    <span className="page-time">{page.avgTime}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'ga' && (
          <div className="ga-section">
            <div className="ga-grid">
              <div className="ga-card">
                <h4>Sessions</h4>
                <div className="ga-value">{analytics.googleAnalytics.sessions.toLocaleString()}</div>
                <div className="ga-change positive">+15.2%</div>
              </div>
              <div className="ga-card">
                <h4>Users</h4>
                <div className="ga-value">{analytics.googleAnalytics.users.toLocaleString()}</div>
                <div className="ga-change positive">+12.8%</div>
              </div>
              <div className="ga-card">
                <h4>Bounce Rate</h4>
                <div className="ga-value">{analytics.googleAnalytics.bounceRate}%</div>
                <div className="ga-change negative">+2.3%</div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'social' && (
          <div className="social-section">
            <div className="social-grid">
              {Object.entries(analytics.socialMedia).map(([platform, data]: [string, any]) => (
                <div key={platform} className="social-card">
                  <div className="social-header">
                    <h4>{getPlatformIcon(platform)} {capitalize(platform)}</h4>
                    <span className="follower-count">{data.followers?.toLocaleString() || '0'} Followers</span>
                  </div>
                  <div className="social-stats">
                    <div className="social-stat">
                      <span className="stat-label">Reach</span>
                      <span className="stat-value">{(data.reach || data.views || data.impressions || 0).toLocaleString()}</span>
                    </div>
                    <div className="social-stat">
                      <span className="stat-label">Engagement</span>
                      <span className="stat-value">{data.engagement}%</span>
                    </div>
                    <div className="social-stat">
                      <span className="stat-label">Posts</span>
                      <span className="stat-value">{data.posts || data.videos || data.tweets || 0}</span>
                    </div>
                  </div>
                  {data.topPost && (
                    <div className="top-post">
                      <div className="top-post-label">🔥 Top Post</div>
                      <div className="top-post-text">{data.topPost.text || data.topPost.title}</div>
                      <div className="top-post-stats">
                        {data.topPost.likes && <span>❤️ {data.topPost.likes}</span>}
                        {data.topPost.shares && <span>🔄 {data.topPost.shares}</span>}
                        {data.topPost.comments && <span>💬 {data.topPost.comments}</span>}
                        {data.topPost.views && <span>👁️ {data.topPost.views}</span>}
                        {data.topPost.retweets && <span>🔄 {data.topPost.retweets}</span>}
                        {data.topPost.reactions && <span>👍 {data.topPost.reactions}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'email' && (
          <div className="email-section">
            <div className="email-overview">
              <div className="email-stat-card">
                <h4>📧 Gmail Stats</h4>
                <div className="email-stats">
                  <div className="stat-row">
                    <span>Sent</span>
                    <span>{analytics.email.gmail.sent}</span>
                  </div>
                  <div className="stat-row">
                    <span>Received</span>
                    <span>{analytics.email.gmail.received}</span>
                  </div>
                  <div className="stat-row">
                    <span>Open Rate</span>
                    <span className="positive">{analytics.email.gmail.openRate}%</span>
                  </div>
                  <div className="stat-row">
                    <span>Click Rate</span>
                    <span className="positive">{analytics.email.gmail.clickRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="campaigns-section">
              <h4>📊 Email Campaigns</h4>
              <div className="campaigns-table">
                {analytics.email.campaigns.map((campaign: any, idx: number) => (
                  <div key={idx} className="campaign-row">
                    <div className="campaign-name">{campaign.name}</div>
                    <div className="campaign-stats">
                      <span>✉️ {campaign.sent.toLocaleString()}</span>
                      <span>👁️ {campaign.opened.toLocaleString()}</span>
                      <span>🖱️ {campaign.clicked.toLocaleString()}</span>
                      <span className="revenue">💰 ${campaign.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getPlatformIcon(platform: string): string {
  const icons: any = {
    facebook: '👥',
    instagram: '📷',
    tiktok: '🎵',
    linkedin: '💼',
    twitter: '🐦'
  };
  return icons[platform] || '📱';
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
