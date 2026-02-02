import { useState, useEffect } from 'react';
import axios from 'axios';
import './CRM.css';

// Sub-Components
import EmailTab from './EmailTab';
import CalendarTab from './CalendarTab';
import DealsTab from './DealsTab';
import TasksTab from './TasksTab';

interface Contact {
  id: string;
  name: string;
  type: 'client' | 'partner' | 'lead';
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  last_contact?: string;
  next_followup?: string;
  tags?: string;
  lifecycle_stage?: string;
  engagement_score?: number;
  created_at: string;
}

interface Communication {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'message';
  subject?: string;
  content?: string;
  direction: 'incoming' | 'outgoing';
  status: string;
  sent_at?: string;
  created_at: string;
}

type TabType = 'contacts' | 'email' | 'calendar' | 'deals' | 'tasks';

export default function CRM() {
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddComm, setShowAddComm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newContact, setNewContact] = useState({
    name: '',
    type: 'lead' as const,
    email: '',
    phone: '',
    company: '',
    notes: '',
    tags: ''
  });

  const [newComm, setNewComm] = useState({
    type: 'email' as const,
    subject: '',
    content: '',
    direction: 'outgoing' as const
  });

  useEffect(() => {
    loadContacts();
  }, [filterType]);

  const loadContacts = async () => {
    try {
      const url = filterType === 'all'
        ? '/api/crm/contacts'
        : `/api/crm/contacts?type=${filterType}`;
      const res = await axios.get(url);
      setContacts(res.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    try {
      const res = await axios.get(`/api/crm/contacts/${contact.id}`);
      setCommunications(res.data.communications || []);
    } catch (error) {
      console.error('Error loading contact details:', error);
    }
  };

  const handleAddContact = async () => {
    try {
      await axios.post('/api/crm/contacts', newContact);
      setShowAddContact(false);
      setNewContact({
        name: '',
        type: 'lead',
        email: '',
        phone: '',
        company: '',
        notes: '',
        tags: ''
      });
      loadContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  const handleAddCommunication = async () => {
    if (!selectedContact) return;

    try {
      await axios.post(`/api/crm/contacts/${selectedContact.id}/communication`, newComm);
      setShowAddComm(false);
      setNewComm({
        type: 'email',
        subject: '',
        content: '',
        direction: 'outgoing'
      });
      handleSelectContact(selectedContact);
    } catch (error) {
      console.error('Error logging communication:', error);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'contacts', label: 'Kontakte', icon: '👥' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'calendar', label: 'Kalender', icon: '📅' },
    { id: 'deals', label: 'Deals', icon: '💼' },
    { id: 'tasks', label: 'Aufgaben', icon: '✅' },
  ];

  return (
    <div className="crm-container">
      <div className="crm-header">
        <h1>CRM</h1>
        <div className="crm-header-actions">
          {activeTab === 'contacts' && (
            <button className="btn btn-primary" onClick={() => setShowAddContact(true)}>
              + Neuer Kontakt
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="crm-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`crm-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="crm-tab-content">
        {activeTab === 'contacts' && (
          <>
            <div className="crm-filters">
              <input
                type="text"
                placeholder="🔍 Kontakt suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <div className="filter-buttons">
                {['all', 'client', 'partner', 'lead'].map(type => (
                  <button
                    key={type}
                    className={`filter-btn ${filterType === type ? 'active' : ''}`}
                    onClick={() => setFilterType(type)}
                  >
                    {type === 'all' ? 'Alle' : type === 'client' ? 'Kunden' : type === 'partner' ? 'Partner' : 'Leads'}
                  </button>
                ))}
              </div>
            </div>

            <div className="crm-content">
              <div className="contacts-list">
                <h3>Kontakte ({filteredContacts.length})</h3>
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className={`contact-card ${selectedContact?.id === contact.id ? 'selected' : ''}`}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="contact-avatar">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="contact-info">
                      <h4>{contact.name}</h4>
                      <p className="company">{contact.company || 'Keine Firma'}</p>
                      <div className="contact-meta">
                        <span className={`type-badge ${contact.type}`}>{contact.type}</span>
                        {contact.engagement_score && contact.engagement_score > 0 && (
                          <span className="score-badge">{contact.engagement_score} pts</span>
                        )}
                        {contact.next_followup && (
                          <span className="followup">📅 {new Date(contact.next_followup).toLocaleDateString('de-DE')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="contact-details">
                {selectedContact ? (
                  <>
                    <div className="details-header">
                      <div className="details-avatar">
                        {selectedContact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2>{selectedContact.name}</h2>
                        <p className="company-name">{selectedContact.company}</p>
                      </div>
                      <div className="details-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowAddComm(true)}>
                          + Kommunikation
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => {
                          setActiveTab('email');
                        }}>
                          📧 Email senden
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => {
                          setActiveTab('calendar');
                        }}>
                          📅 Termin
                        </button>
                      </div>
                    </div>

                    <div className="contact-info-grid">
                      <div className="info-item">
                        <label>Email</label>
                        <p>{selectedContact.email || '—'}</p>
                      </div>
                      <div className="info-item">
                        <label>Telefon</label>
                        <p>{selectedContact.phone || '—'}</p>
                      </div>
                      <div className="info-item">
                        <label>Typ</label>
                        <p><span className={`type-badge ${selectedContact.type}`}>{selectedContact.type}</span></p>
                      </div>
                      <div className="info-item">
                        <label>Letzter Kontakt</label>
                        <p>{selectedContact.last_contact ? new Date(selectedContact.last_contact).toLocaleDateString('de-DE') : '—'}</p>
                      </div>
                    </div>

                    {selectedContact.notes && (
                      <div className="notes-section">
                        <h4>Notizen</h4>
                        <p>{selectedContact.notes}</p>
                      </div>
                    )}

                    <div className="communications-section">
                      <h4>Kommunikations-Historie ({communications.length})</h4>
                      <div className="communications-timeline">
                        {communications.map(comm => (
                          <div key={comm.id} className={`comm-item ${comm.direction}`}>
                            <div className="comm-icon">
                              {comm.type === 'email' ? '📧' : comm.type === 'call' ? '📞' : comm.type === 'meeting' ? '🤝' : '💬'}
                            </div>
                            <div className="comm-content">
                              <div className="comm-header">
                                <span className="comm-type">{comm.type}</span>
                                <span className="comm-date">
                                  {new Date(comm.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {comm.subject && <h5>{comm.subject}</h5>}
                              {comm.content && <p>{comm.content}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="no-selection">
                    <p>👈 Wähle einen Kontakt aus</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'email' && <EmailTab contacts={contacts} selectedContact={selectedContact} />}
        {activeTab === 'calendar' && <CalendarTab contacts={contacts} selectedContact={selectedContact} />}
        {activeTab === 'deals' && <DealsTab contacts={contacts} />}
        {activeTab === 'tasks' && <TasksTab contacts={contacts} />}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Neuer Kontakt</h2>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                placeholder="Max Mustermann"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Typ</label>
              <select value={newContact.type} onChange={(e) => setNewContact({...newContact, type: e.target.value as any})}>
                <option value="lead">Lead</option>
                <option value="client">Kunde</option>
                <option value="partner">Partner</option>
              </select>
            </div>

            <div className="form-group">
              <label>Firma</label>
              <input
                type="text"
                value={newContact.company}
                onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                placeholder="Firma GmbH"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                placeholder="max@firma.de"
              />
            </div>

            <div className="form-group">
              <label>Telefon</label>
              <input
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                placeholder="+49 123 456789"
              />
            </div>

            <div className="form-group">
              <label>Notizen</label>
              <textarea
                value={newContact.notes}
                onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                placeholder="Wichtige Infos..."
                rows={3}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAddContact(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddContact}
                disabled={!newContact.name}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Communication Modal */}
      {showAddComm && (
        <div className="modal-overlay" onClick={() => setShowAddComm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Kommunikation loggen</h2>

            <div className="form-group">
              <label>Typ</label>
              <select value={newComm.type} onChange={(e) => setNewComm({...newComm, type: e.target.value as any})}>
                <option value="email">Email</option>
                <option value="call">Anruf</option>
                <option value="meeting">Meeting</option>
                <option value="message">Nachricht</option>
              </select>
            </div>

            <div className="form-group">
              <label>Richtung</label>
              <select value={newComm.direction} onChange={(e) => setNewComm({...newComm, direction: e.target.value as any})}>
                <option value="outgoing">Ausgehend</option>
                <option value="incoming">Eingehend</option>
              </select>
            </div>

            <div className="form-group">
              <label>Betreff</label>
              <input
                type="text"
                value={newComm.subject}
                onChange={(e) => setNewComm({...newComm, subject: e.target.value})}
                placeholder="z.B. Projektbesprechung"
              />
            </div>

            <div className="form-group">
              <label>Inhalt</label>
              <textarea
                value={newComm.content}
                onChange={(e) => setNewComm({...newComm, content: e.target.value})}
                placeholder="Was wurde besprochen?"
                rows={5}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAddComm(false)}>
                Abbrechen
              </button>
              <button className="btn btn-primary" onClick={handleAddCommunication}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
