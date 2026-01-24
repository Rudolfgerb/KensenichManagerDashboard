import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SalesPipeline.css';
import TemplateManager from './TemplateManager';
import AutomationManager from './AutomationManager';
import PipelineStats from './PipelineStats';

const API_URL = 'http://localhost:3001/api';

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
}

interface PipelineContact {
  id: string;
  contact_id: string;
  stage_id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  potential_value: number;
  probability: number;
  notes: string;
  last_interaction: string;
  next_action: string;
  next_action_date: string;
  stage_name: string;
  stage_color: string;
  created_at: string;
  activities?: any[];
}

interface CRMContact {
  id: string;
  name: string;
  email: string;
  company: string;
  type: string;
}

const SalesPipeline: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [contacts, setContacts] = useState<PipelineContact[]>([]);
  const [crmContacts, setCrmContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'pipeline' | 'templates' | 'automation' | 'stats'>('pipeline');
  const [draggedContact, setDraggedContact] = useState<PipelineContact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PipelineContact | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state for adding new contact to pipeline
  const [newPipelineContact, setNewPipelineContact] = useState({
    contact_id: '',
    stage_id: '',
    potential_value: 0,
    probability: 50,
    notes: '',
    next_action: '',
    next_action_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stagesRes, contactsRes, crmRes] = await Promise.all([
        axios.get(`${API_URL}/sales-pipeline/stages`),
        axios.get(`${API_URL}/sales-pipeline/contacts`),
        axios.get(`${API_URL}/crm/contacts`)
      ]);

      setStages(stagesRes.data);
      setContacts(contactsRes.data);
      setCrmContacts(crmRes.data);
    } catch (error) {
      console.error('Error loading pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (contact: PipelineContact) => {
    setDraggedContact(contact);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stageId: string) => {
    if (!draggedContact || draggedContact.stage_id === stageId) {
      setDraggedContact(null);
      return;
    }

    try {
      await axios.post(`${API_URL}/sales-pipeline/contacts/${draggedContact.id}/move`, {
        stage_id: stageId
      });

      await loadData();
      setDraggedContact(null);
    } catch (error) {
      console.error('Error moving contact:', error);
    }
  };

  const handleAddToPipeline = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await axios.post(`${API_URL}/sales-pipeline/contacts`, newPipelineContact);

      setShowAddModal(false);
      setNewPipelineContact({
        contact_id: '',
        stage_id: '',
        potential_value: 0,
        probability: 50,
        notes: '',
        next_action: '',
        next_action_date: ''
      });

      await loadData();
    } catch (error) {
      console.error('Error adding contact to pipeline:', error);
    }
  };

  const handleViewDetails = async (contact: PipelineContact) => {
    try {
      const res = await axios.get(`${API_URL}/sales-pipeline/contacts/${contact.id}`);
      setSelectedContact(res.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching contact details:', error);
    }
  };

  const handleUpdateContact = async (updates: Partial<PipelineContact>) => {
    if (!selectedContact) return;

    try {
      await axios.put(`${API_URL}/sales-pipeline/contacts/${selectedContact.id}`, updates);
      await loadData();

      // Refresh selected contact
      const res = await axios.get(`${API_URL}/sales-pipeline/contacts/${selectedContact.id}`);
      setSelectedContact(res.data);
    } catch (error) {
      console.error('Error updating contact:', error);
    }
  };

  const getContactsForStage = (stageId: string) => {
    return contacts.filter(c => c.stage_id === stageId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  if (loading) {
    return <div className="sales-pipeline-loading">Loading Pipeline...</div>;
  }

  return (
    <div className="sales-pipeline">
      <header className="sales-pipeline-header">
        <h1>🎯 Sales Pipeline</h1>
        <div className="sales-pipeline-nav">
          <button
            className={activeView === 'pipeline' ? 'active' : ''}
            onClick={() => setActiveView('pipeline')}
          >
            Pipeline
          </button>
          <button
            className={activeView === 'templates' ? 'active' : ''}
            onClick={() => setActiveView('templates')}
          >
            Templates
          </button>
          <button
            className={activeView === 'automation' ? 'active' : ''}
            onClick={() => setActiveView('automation')}
          >
            Automation
          </button>
          <button
            className={activeView === 'stats' ? 'active' : ''}
            onClick={() => setActiveView('stats')}
          >
            Stats
          </button>
        </div>
        <button className="add-button" onClick={() => setShowAddModal(true)}>
          + Add to Pipeline
        </button>
      </header>

      {activeView === 'pipeline' && (
        <div className="pipeline-board">
          {stages.map(stage => (
            <div
              key={stage.id}
              className="pipeline-column"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="pipeline-column-header" style={{ borderColor: stage.color }}>
                <h3>{stage.name}</h3>
                <span className="pipeline-count">{getContactsForStage(stage.id).length}</span>
              </div>

              <div className="pipeline-cards">
                {getContactsForStage(stage.id).map(contact => (
                  <div
                    key={contact.id}
                    className="pipeline-card"
                    draggable
                    onDragStart={() => handleDragStart(contact)}
                    onClick={() => handleViewDetails(contact)}
                  >
                    <div className="pipeline-card-header">
                      <h4>{contact.name}</h4>
                      <span className="probability">{contact.probability}%</span>
                    </div>

                    {contact.company && (
                      <p className="company">{contact.company}</p>
                    )}

                    {contact.potential_value > 0 && (
                      <p className="value">{formatCurrency(contact.potential_value)}</p>
                    )}

                    {contact.next_action && (
                      <div className="next-action">
                        <span className="action-icon">📅</span>
                        <span className="action-text">{contact.next_action}</span>
                        {contact.next_action_date && (
                          <span className="action-date">{formatDate(contact.next_action_date)}</span>
                        )}
                      </div>
                    )}

                    <div className="pipeline-card-footer">
                      <span className="last-interaction">
                        Last: {formatDate(contact.last_interaction)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'templates' && <TemplateManager onClose={() => setActiveView('pipeline')} />}
      {activeView === 'automation' && <AutomationManager onClose={() => setActiveView('pipeline')} />}
      {activeView === 'stats' && <PipelineStats />}

      {/* Add to Pipeline Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Contact to Pipeline</h2>

            <form onSubmit={handleAddToPipeline}>
              <div className="form-group">
                <label>Contact *</label>
                <select
                  required
                  value={newPipelineContact.contact_id}
                  onChange={(e) => setNewPipelineContact({
                    ...newPipelineContact,
                    contact_id: e.target.value
                  })}
                >
                  <option value="">Select Contact...</option>
                  {crmContacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.company ? `(${contact.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Initial Stage *</label>
                <select
                  required
                  value={newPipelineContact.stage_id}
                  onChange={(e) => setNewPipelineContact({
                    ...newPipelineContact,
                    stage_id: e.target.value
                  })}
                >
                  <option value="">Select Stage...</option>
                  {stages.filter(s => !['stage-won', 'stage-lost'].includes(s.id)).map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Potential Value (€)</label>
                  <input
                    type="number"
                    value={newPipelineContact.potential_value}
                    onChange={(e) => setNewPipelineContact({
                      ...newPipelineContact,
                      potential_value: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newPipelineContact.probability}
                    onChange={(e) => setNewPipelineContact({
                      ...newPipelineContact,
                      probability: parseInt(e.target.value) || 50
                    })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newPipelineContact.notes}
                  onChange={(e) => setNewPipelineContact({
                    ...newPipelineContact,
                    notes: e.target.value
                  })}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Next Action</label>
                <input
                  type="text"
                  value={newPipelineContact.next_action}
                  onChange={(e) => setNewPipelineContact({
                    ...newPipelineContact,
                    next_action: e.target.value
                  })}
                  placeholder="e.g., Send follow-up email"
                />
              </div>

              <div className="form-group">
                <label>Next Action Date</label>
                <input
                  type="date"
                  value={newPipelineContact.next_action_date}
                  onChange={(e) => setNewPipelineContact({
                    ...newPipelineContact,
                    next_action_date: e.target.value
                  })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Add to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {showDetailsModal && selectedContact && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedContact.name}</h2>

            <div className="contact-details">
              <div className="details-section">
                <h3>Contact Info</h3>
                <p><strong>Company:</strong> {selectedContact.company || 'N/A'}</p>
                <p><strong>Email:</strong> {selectedContact.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedContact.phone || 'N/A'}</p>
              </div>

              <div className="details-section">
                <h3>Pipeline Info</h3>
                <p><strong>Stage:</strong> {selectedContact.stage_name}</p>
                <p><strong>Potential Value:</strong> {formatCurrency(selectedContact.potential_value)}</p>
                <p><strong>Probability:</strong> {selectedContact.probability}%</p>
                <p><strong>Last Interaction:</strong> {formatDate(selectedContact.last_interaction)}</p>
              </div>

              <div className="details-section">
                <h3>Next Action</h3>
                <input
                  type="text"
                  value={selectedContact.next_action || ''}
                  onChange={(e) => setSelectedContact({
                    ...selectedContact,
                    next_action: e.target.value
                  })}
                  onBlur={() => handleUpdateContact({ next_action: selectedContact.next_action })}
                  placeholder="What's the next action?"
                />
                <input
                  type="date"
                  value={selectedContact.next_action_date?.split('T')[0] || ''}
                  onChange={(e) => setSelectedContact({
                    ...selectedContact,
                    next_action_date: e.target.value
                  })}
                  onBlur={() => handleUpdateContact({ next_action_date: selectedContact.next_action_date })}
                />
              </div>

              <div className="details-section">
                <h3>Notes</h3>
                <textarea
                  value={selectedContact.notes || ''}
                  onChange={(e) => setSelectedContact({
                    ...selectedContact,
                    notes: e.target.value
                  })}
                  onBlur={() => handleUpdateContact({ notes: selectedContact.notes })}
                  rows={5}
                  placeholder="Add notes about this contact..."
                />
              </div>

              {selectedContact.activities && selectedContact.activities.length > 0 && (
                <div className="details-section">
                  <h3>Activity History</h3>
                  <div className="activity-timeline">
                    {selectedContact.activities.map((activity: any) => (
                      <div key={activity.id} className="activity-item">
                        <span className="activity-type">{activity.activity_type}</span>
                        <span className="activity-description">{activity.description}</span>
                        <span className="activity-date">{formatDate(activity.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPipeline;
