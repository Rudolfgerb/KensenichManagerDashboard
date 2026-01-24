import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PipelineStats.css';

const API_URL = 'http://localhost:3001/api';

interface PipelineStats {
  total_contacts: number;
  total_value: number;
  weighted_value: number;
  conversion_rate: number;
  avg_time_in_pipeline: number;
  won_deals_30d: {
    count: number;
    value: number;
  };
  by_stage: Array<{
    id: string;
    name: string;
    color: string;
    count: number;
    total_value: number;
  }>;
  upcoming_actions: Array<{
    id: string;
    next_action: string;
    next_action_date: string;
    name: string;
    company: string;
    stage_name: string;
  }>;
}

const PipelineStats: React.FC = () => {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/sales-pipeline/stats`);
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading || !stats) {
    return <div className="stats-loading">Loading stats...</div>;
  }

  return (
    <div className="pipeline-stats">
      <h2>📊 Pipeline Analytics</h2>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <div className="metric-value">{stats.total_contacts}</div>
            <div className="metric-label">Total Contacts</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <div className="metric-value">{formatCurrency(stats.total_value)}</div>
            <div className="metric-label">Pipeline Value</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <div className="metric-value">{formatCurrency(stats.weighted_value)}</div>
            <div className="metric-label">Weighted Value</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <div className="metric-value">{stats.conversion_rate.toFixed(1)}%</div>
            <div className="metric-label">Conversion Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🏆</div>
          <div className="metric-content">
            <div className="metric-value">{stats.won_deals_30d.count}</div>
            <div className="metric-label">Wins (30d)</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <div className="metric-value">{Math.round(stats.avg_time_in_pipeline)} days</div>
            <div className="metric-label">Avg. Time</div>
          </div>
        </div>
      </div>

      {/* Contacts by Stage */}
      <div className="stats-section">
        <h3>Contacts by Stage</h3>
        <div className="stage-breakdown">
          {stats.by_stage.map(stage => (
            <div key={stage.id} className="stage-item">
              <div className="stage-info">
                <div
                  className="stage-indicator"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="stage-name">{stage.name}</span>
              </div>
              <div className="stage-metrics">
                <span className="stage-count">{stage.count} contacts</span>
                {stage.total_value > 0 && (
                  <span className="stage-value">{formatCurrency(stage.total_value)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Actions */}
      {stats.upcoming_actions.length > 0 && (
        <div className="stats-section">
          <h3>Upcoming Actions (Next 7 Days)</h3>
          <div className="upcoming-actions">
            {stats.upcoming_actions.map(action => (
              <div key={action.id} className="action-item">
                <div className="action-date">
                  {formatDate(action.next_action_date)}
                </div>
                <div className="action-details">
                  <div className="action-title">{action.next_action}</div>
                  <div className="action-contact">
                    {action.name} {action.company ? `(${action.company})` : ''}
                    <span className="action-stage">{action.stage_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.upcoming_actions.length === 0 && (
        <div className="stats-section">
          <h3>Upcoming Actions</h3>
          <p className="empty-message">No actions scheduled for the next 7 days</p>
        </div>
      )}
    </div>
  );
};

export default PipelineStats;
