import { useState, useEffect } from 'react';
import axios from 'axios';

interface Contact {
  id: string;
  name: string;
  company?: string;
}

interface Deal {
  id: string;
  contact_id: string;
  contact_name?: string;
  contact_company?: string;
  title: string;
  description?: string;
  stage_id: string;
  stage_name?: string;
  stage_color?: string;
  deal_value: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  deal_source?: string;
  priority: string;
  status: string;
  created_at: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  deals: Deal[];
  total_value: number;
  count: number;
}

interface DealStats {
  total_deals: number;
  open_deals: number;
  won_deals: number;
  lost_deals: number;
  pipeline_value: number;
  won_value: number;
  win_rate: number;
}

interface DealsTabProps {
  contacts: Contact[];
}

export default function DealsTab({ contacts }: DealsTabProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showDealForm, setShowDealForm] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [loading, setLoading] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  const [newDeal, setNewDeal] = useState({
    contact_id: '',
    title: '',
    description: '',
    stage_id: 'stage-lead',
    deal_value: 0,
    currency: 'EUR',
    probability: 50,
    expected_close_date: '',
    deal_source: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadDeals();
    loadStats();
  }, []);

  const loadDeals = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/deals/by-stage');
      setStages(res.data);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await axios.get('/api/deals/stats/overview');
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateDeal = async () => {
    try {
      await axios.post('/api/deals', newDeal);
      setShowDealForm(false);
      setNewDeal({
        contact_id: '',
        title: '',
        description: '',
        stage_id: 'stage-lead',
        deal_value: 0,
        currency: 'EUR',
        probability: 50,
        expected_close_date: '',
        deal_source: '',
        priority: 'medium'
      });
      loadDeals();
      loadStats();
    } catch (error) {
      console.error('Error creating deal:', error);
    }
  };

  const handleMoveDeal = async (dealId: string, newStageId: string) => {
    try {
      await axios.post(`/api/deals/${dealId}/move`, { stage_id: newStageId });
      loadDeals();
      loadStats();
    } catch (error) {
      console.error('Error moving deal:', error);
    }
  };

  const handleWinDeal = async (dealId: string) => {
    try {
      await axios.post(`/api/deals/${dealId}/win`, { notes: 'Deal gewonnen!' });
      setSelectedDeal(null);
      loadDeals();
      loadStats();
    } catch (error) {
      console.error('Error winning deal:', error);
    }
  };

  const handleLoseDeal = async (dealId: string) => {
    const reason = prompt('Grund für Verlust:');
    if (reason === null) return;
    try {
      await axios.post(`/api/deals/${dealId}/lose`, { lost_reason: reason, lost_reason_details: reason });
      setSelectedDeal(null);
      loadDeals();
      loadStats();
    } catch (error) {
      console.error('Error losing deal:', error);
    }
  };

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stageId: string) => {
    if (draggedDeal && draggedDeal.stage_id !== stageId) {
      handleMoveDeal(draggedDeal.id, stageId);
    }
    setDraggedDeal(null);
  };

  const formatCurrency = (value: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(value);
  };

  const priorityColors: Record<string, string> = {
    low: '#888',
    medium: '#ffc800',
    high: '#ff6b6b'
  };

  return (
    <div className="deals-tab">
      <div className="deals-header">
        <h2>💼 Deals Pipeline</h2>
        <div className="deals-controls">
          <div className="view-toggle">
            <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>Board</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>Liste</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowDealForm(true)}>
            + Neuer Deal
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="deals-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.open_deals}</span>
            <span className="stat-label">Offene Deals</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatCurrency(stats.pipeline_value)}</span>
            <span className="stat-label">Pipeline-Wert</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.won_deals}</span>
            <span className="stat-label">Gewonnen</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatCurrency(stats.won_value)}</span>
            <span className="stat-label">Gewonnen (Wert)</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.win_rate?.toFixed(1) || 0}%</span>
            <span className="stat-label">Win-Rate</span>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === 'board' && (
        <div className="deals-board">
          {loading ? (
            <div className="loading-state">Laden...</div>
          ) : (
            stages.map(stage => (
              <div
                key={stage.id}
                className="stage-column"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="stage-header" style={{ borderColor: stage.color }}>
                  <h3>{stage.name}</h3>
                  <div className="stage-meta">
                    <span className="stage-count">{stage.count} Deals</span>
                    <span className="stage-value">{formatCurrency(stage.total_value)}</span>
                  </div>
                </div>

                <div className="stage-deals">
                  {stage.deals.map(deal => (
                    <div
                      key={deal.id}
                      className={`deal-card ${draggedDeal?.id === deal.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(deal)}
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <div className="deal-card-header">
                        <span className="deal-title">{deal.title}</span>
                        <span className="deal-priority" style={{ backgroundColor: priorityColors[deal.priority] }}>
                          {deal.priority}
                        </span>
                      </div>
                      <div className="deal-card-body">
                        <span className="deal-contact">{deal.contact_name}</span>
                        {deal.contact_company && <span className="deal-company">{deal.contact_company}</span>}
                      </div>
                      <div className="deal-card-footer">
                        <span className="deal-value">{formatCurrency(deal.deal_value)}</span>
                        <span className="deal-probability">{deal.probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="deals-list">
          <table className="deals-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Kontakt</th>
                <th>Stage</th>
                <th>Wert</th>
                <th>Wahrsch.</th>
                <th>Abschluss</th>
                <th>Priorität</th>
              </tr>
            </thead>
            <tbody>
              {stages.flatMap(s => s.deals).map(deal => (
                <tr key={deal.id} onClick={() => setSelectedDeal(deal)}>
                  <td>{deal.title}</td>
                  <td>{deal.contact_name}</td>
                  <td><span className="stage-badge" style={{ backgroundColor: deal.stage_color }}>{deal.stage_name}</span></td>
                  <td>{formatCurrency(deal.deal_value)}</td>
                  <td>{deal.probability}%</td>
                  <td>{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('de-DE') : '-'}</td>
                  <td><span className="priority-badge" style={{ backgroundColor: priorityColors[deal.priority] }}>{deal.priority}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deal Detail Panel */}
      {selectedDeal && (
        <div className="modal-overlay" onClick={() => setSelectedDeal(null)}>
          <div className="modal deal-detail" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDeal.title}</h2>
              <button className="close-btn" onClick={() => setSelectedDeal(null)}>×</button>
            </div>

            <div className="deal-detail-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Kontakt</label>
                  <p>{selectedDeal.contact_name} {selectedDeal.contact_company && `(${selectedDeal.contact_company})`}</p>
                </div>
                <div className="detail-item">
                  <label>Stage</label>
                  <p><span className="stage-badge" style={{ backgroundColor: selectedDeal.stage_color }}>{selectedDeal.stage_name}</span></p>
                </div>
                <div className="detail-item">
                  <label>Deal-Wert</label>
                  <p className="deal-value-large">{formatCurrency(selectedDeal.deal_value)}</p>
                </div>
                <div className="detail-item">
                  <label>Wahrscheinlichkeit</label>
                  <p>{selectedDeal.probability}%</p>
                </div>
                <div className="detail-item">
                  <label>Erw. Abschluss</label>
                  <p>{selectedDeal.expected_close_date ? new Date(selectedDeal.expected_close_date).toLocaleDateString('de-DE') : '-'}</p>
                </div>
                <div className="detail-item">
                  <label>Priorität</label>
                  <p><span className="priority-badge" style={{ backgroundColor: priorityColors[selectedDeal.priority] }}>{selectedDeal.priority}</span></p>
                </div>
              </div>

              {selectedDeal.description && (
                <div className="detail-description">
                  <label>Beschreibung</label>
                  <p>{selectedDeal.description}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-success" onClick={() => handleWinDeal(selectedDeal.id)}>
                🎉 Gewonnen
              </button>
              <button className="btn btn-danger" onClick={() => handleLoseDeal(selectedDeal.id)}>
                ❌ Verloren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Deal Form */}
      {showDealForm && (
        <div className="modal-overlay" onClick={() => setShowDealForm(false)}>
          <div className="modal deal-form" onClick={e => e.stopPropagation()}>
            <h2>Neuer Deal</h2>

            <div className="form-group">
              <label>Kontakt *</label>
              <select
                value={newDeal.contact_id}
                onChange={e => setNewDeal({ ...newDeal, contact_id: e.target.value })}
              >
                <option value="">-- Kontakt wählen --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Deal-Titel *</label>
              <input
                type="text"
                value={newDeal.title}
                onChange={e => setNewDeal({ ...newDeal, title: e.target.value })}
                placeholder="z.B. Website Redesign"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Deal-Wert</label>
                <input
                  type="number"
                  value={newDeal.deal_value}
                  onChange={e => setNewDeal({ ...newDeal, deal_value: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                />
              </div>
              <div className="form-group">
                <label>Wahrscheinlichkeit (%)</label>
                <input
                  type="number"
                  value={newDeal.probability}
                  onChange={e => setNewDeal({ ...newDeal, probability: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Erw. Abschluss</label>
                <input
                  type="date"
                  value={newDeal.expected_close_date}
                  onChange={e => setNewDeal({ ...newDeal, expected_close_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Priorität</label>
                <select value={newDeal.priority} onChange={e => setNewDeal({ ...newDeal, priority: e.target.value })}>
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Quelle</label>
              <select value={newDeal.deal_source} onChange={e => setNewDeal({ ...newDeal, deal_source: e.target.value })}>
                <option value="">-- Optional --</option>
                <option value="website">Website</option>
                <option value="referral">Empfehlung</option>
                <option value="cold_outreach">Kaltakquise</option>
                <option value="event">Event</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>

            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={newDeal.description}
                onChange={e => setNewDeal({ ...newDeal, description: e.target.value })}
                placeholder="Details zum Deal..."
                rows={3}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowDealForm(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateDeal}
                disabled={!newDeal.contact_id || !newDeal.title}
              >
                Deal erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
