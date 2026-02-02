import { useState, useEffect } from 'react';
import axios from 'axios';

interface Contact {
  id: string;
  name: string;
  email?: string;
  company?: string;
}

interface Email {
  id: string;
  contact_id?: string;
  contact_name?: string;
  direction: 'incoming' | 'outgoing';
  from_address: string;
  to_addresses: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  status: string;
  sent_at?: string;
  received_at?: string;
  is_read: boolean;
  is_starred: boolean;
  folder: string;
  open_count: number;
  click_count: number;
  replied: boolean;
  tracking_pixel_id?: string;
  created_at: string;
}

interface EmailTabProps {
  contacts: Contact[];
  selectedContact: Contact | null;
}

export default function EmailTab({ contacts, selectedContact }: EmailTabProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [showComposer, setShowComposer] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newEmail, setNewEmail] = useState({
    to: selectedContact?.email || '',
    contact_id: selectedContact?.id || '',
    subject: '',
    body_text: '',
    track_opens: true
  });

  useEffect(() => {
    loadEmails();
  }, [activeFolder]);

  useEffect(() => {
    if (selectedContact?.email) {
      setNewEmail(prev => ({
        ...prev,
        to: selectedContact.email || '',
        contact_id: selectedContact.id
      }));
    }
  }, [selectedContact]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/email/messages?folder=${activeFolder}`);
      setEmails(res.data);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      try {
        await axios.put(`/api/email/messages/${email.id}/read`, { is_read: true });
        setEmails(emails.map(e => e.id === email.id ? { ...e, is_read: true } : e));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const handleSendEmail = async () => {
    try {
      const res = await axios.post('/api/email/messages', {
        contact_id: newEmail.contact_id || null,
        to_addresses: [newEmail.to],
        subject: newEmail.subject,
        body_text: newEmail.body_text,
        body_html: `<p>${newEmail.body_text.replace(/\n/g, '<br>')}</p>`,
        track_opens: newEmail.track_opens
      });

      setShowComposer(false);
      setNewEmail({ to: '', contact_id: '', subject: '', body_text: '', track_opens: true });

      // Show tracking info
      if (res.data.tracking_pixel_url) {
        alert(`Email gesendet!\n\nTracking-Pixel URL:\n${res.data.tracking_pixel_url}\n\nFüge diesen unsichtbaren Pixel in deine Email-Signatur ein, um Opens zu tracken.`);
      }

      loadEmails();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Fehler beim Senden der Email');
    }
  };

  const handleStarEmail = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/email/messages/${email.id}/star`, { is_starred: !email.is_starred });
      setEmails(emails.map(em => em.id === email.id ? { ...em, is_starred: !em.is_starred } : em));
    } catch (error) {
      console.error('Error starring email:', error);
    }
  };

  const folders = [
    { id: 'inbox', label: 'Posteingang', icon: '📥' },
    { id: 'sent', label: 'Gesendet', icon: '📤' },
    { id: 'drafts', label: 'Entwürfe', icon: '📝' },
    { id: 'archive', label: 'Archiv', icon: '📦' },
    { id: 'trash', label: 'Papierkorb', icon: '🗑️' },
  ];

  const unreadCount = emails.filter(e => !e.is_read && e.folder === 'inbox').length;

  return (
    <div className="email-tab">
      <div className="email-header">
        <h2>📧 Email</h2>
        <button className="btn btn-primary" onClick={() => setShowComposer(true)}>
          + Neue Email
        </button>
      </div>

      <div className="email-layout">
        {/* Sidebar */}
        <div className="email-sidebar">
          {folders.map(folder => (
            <button
              key={folder.id}
              className={`folder-btn ${activeFolder === folder.id ? 'active' : ''}`}
              onClick={() => setActiveFolder(folder.id)}
            >
              <span className="folder-icon">{folder.icon}</span>
              <span className="folder-label">{folder.label}</span>
              {folder.id === 'inbox' && unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Email List */}
        <div className="email-list">
          {loading ? (
            <div className="loading-state">Laden...</div>
          ) : emails.length === 0 ? (
            <div className="empty-state">Keine Emails in diesem Ordner</div>
          ) : (
            emails.map(email => (
              <div
                key={email.id}
                className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${!email.is_read ? 'unread' : ''}`}
                onClick={() => handleSelectEmail(email)}
              >
                <button
                  className={`star-btn ${email.is_starred ? 'starred' : ''}`}
                  onClick={(e) => handleStarEmail(email, e)}
                >
                  {email.is_starred ? '⭐' : '☆'}
                </button>
                <div className="email-item-content">
                  <div className="email-item-header">
                    <span className="email-sender">
                      {email.direction === 'outgoing' ? `An: ${email.to_addresses?.[0]}` : email.contact_name || email.from_address}
                    </span>
                    <span className="email-date">
                      {new Date(email.sent_at || email.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <div className="email-subject">{email.subject || '(Kein Betreff)'}</div>
                  <div className="email-preview">{email.body_text?.substring(0, 80)}...</div>
                  {email.direction === 'outgoing' && (
                    <div className="email-tracking">
                      {email.open_count > 0 && <span className="tracking-badge opened">👁 {email.open_count}x geöffnet</span>}
                      {email.click_count > 0 && <span className="tracking-badge clicked">🔗 {email.click_count}x geklickt</span>}
                      {email.replied && <span className="tracking-badge replied">↩️ Beantwortet</span>}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Email Detail */}
        <div className="email-detail">
          {selectedEmail ? (
            <>
              <div className="email-detail-header">
                <h3>{selectedEmail.subject || '(Kein Betreff)'}</h3>
                <div className="email-meta">
                  <span>{selectedEmail.direction === 'outgoing' ? 'An' : 'Von'}: {selectedEmail.direction === 'outgoing' ? selectedEmail.to_addresses?.join(', ') : selectedEmail.from_address}</span>
                  <span>{new Date(selectedEmail.sent_at || selectedEmail.created_at).toLocaleString('de-DE')}</span>
                </div>
              </div>

              {selectedEmail.direction === 'outgoing' && (
                <div className="tracking-info">
                  <h4>📊 Tracking</h4>
                  <div className="tracking-stats">
                    <div className="stat">
                      <span className="stat-value">{selectedEmail.open_count}</span>
                      <span className="stat-label">Öffnungen</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{selectedEmail.click_count}</span>
                      <span className="stat-label">Klicks</span>
                    </div>
                    <div className="stat">
                      <span className={`stat-value ${selectedEmail.replied ? 'positive' : ''}`}>
                        {selectedEmail.replied ? 'Ja' : 'Nein'}
                      </span>
                      <span className="stat-label">Beantwortet</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="email-body">
                {selectedEmail.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                ) : (
                  <pre>{selectedEmail.body_text}</pre>
                )}
              </div>

              <div className="email-actions">
                <button className="btn btn-secondary" onClick={() => {
                  setNewEmail({
                    to: selectedEmail.from_address,
                    contact_id: selectedEmail.contact_id || '',
                    subject: `Re: ${selectedEmail.subject}`,
                    body_text: '',
                    track_opens: true
                  });
                  setShowComposer(true);
                }}>
                  ↩️ Antworten
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>📧 Wähle eine Email aus</p>
            </div>
          )}
        </div>
      </div>

      {/* Composer Modal */}
      {showComposer && (
        <div className="modal-overlay" onClick={() => setShowComposer(false)}>
          <div className="modal email-composer" onClick={e => e.stopPropagation()}>
            <h2>Neue Email</h2>

            <div className="form-group">
              <label>An</label>
              <input
                type="email"
                value={newEmail.to}
                onChange={e => setNewEmail({ ...newEmail, to: e.target.value })}
                placeholder="email@example.com"
                list="contact-emails"
              />
              <datalist id="contact-emails">
                {contacts.filter(c => c.email).map(c => (
                  <option key={c.id} value={c.email}>{c.name}</option>
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label>Kontakt verknüpfen</label>
              <select
                value={newEmail.contact_id}
                onChange={e => {
                  const contact = contacts.find(c => c.id === e.target.value);
                  setNewEmail({
                    ...newEmail,
                    contact_id: e.target.value,
                    to: contact?.email || newEmail.to
                  });
                }}
              >
                <option value="">-- Optional --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Betreff</label>
              <input
                type="text"
                value={newEmail.subject}
                onChange={e => setNewEmail({ ...newEmail, subject: e.target.value })}
                placeholder="Betreff eingeben..."
              />
            </div>

            <div className="form-group">
              <label>Nachricht</label>
              <textarea
                value={newEmail.body_text}
                onChange={e => setNewEmail({ ...newEmail, body_text: e.target.value })}
                placeholder="Deine Nachricht..."
                rows={10}
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={newEmail.track_opens}
                  onChange={e => setNewEmail({ ...newEmail, track_opens: e.target.checked })}
                />
                Öffnungen tracken (Tracking-Pixel)
              </label>
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowComposer(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendEmail}
                disabled={!newEmail.to || !newEmail.subject}
              >
                📤 Senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
