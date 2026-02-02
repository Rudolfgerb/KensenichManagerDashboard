import { useState, useEffect } from 'react';
import axios from 'axios';

interface Contact {
  id: string;
  name: string;
  email?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_time: string;
  end_time?: string;
  location?: string;
  video_link?: string;
  related_contact_id?: string;
  contact_name?: string;
  attendee_count?: number;
  status: string;
}

interface CalendarTabProps {
  contacts: Contact[];
  selectedContact: Contact | null;
}

export default function CalendarTab({ contacts, selectedContact }: CalendarTabProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    start_time: '',
    end_time: '',
    location: '',
    video_link: '',
    related_contact_id: selectedContact?.id || '',
    reminders: [15]
  });

  useEffect(() => {
    loadEvents();
  }, [currentDate, viewMode]);

  useEffect(() => {
    if (selectedContact) {
      setNewEvent(prev => ({ ...prev, related_contact_id: selectedContact.id }));
    }
  }, [selectedContact]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
      const res = await axios.get(`/api/calendar/events?start=${start}&end=${end}`);
      setEvents(res.data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      await axios.post('/api/calendar/events', newEvent);
      setShowEventForm(false);
      setNewEvent({
        title: '',
        description: '',
        event_type: 'meeting',
        start_time: '',
        end_time: '',
        location: '',
        video_link: '',
        related_contact_id: '',
        reminders: [15]
      });
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Event wirklich löschen?')) return;
    try {
      await axios.delete(`/api/calendar/events/${eventId}`);
      setSelectedEvent(null);
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month padding
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ day: i, date });
    }

    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const eventTypes = [
    { value: 'meeting', label: 'Meeting', icon: '🤝' },
    { value: 'call', label: 'Anruf', icon: '📞' },
    { value: 'task', label: 'Aufgabe', icon: '✅' },
    { value: 'reminder', label: 'Erinnerung', icon: '⏰' },
    { value: 'other', label: 'Sonstiges', icon: '📌' },
  ];

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  const todaysEvents = events.filter(e => new Date(e.start_time).toDateString() === new Date().toDateString());
  const upcomingEvents = events.filter(e => new Date(e.start_time) > new Date()).slice(0, 5);

  return (
    <div className="calendar-tab">
      <div className="calendar-header">
        <h2>📅 Kalender</h2>
        <div className="calendar-controls">
          <div className="view-toggle">
            <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Monat</button>
            <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Woche</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>Liste</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowEventForm(true)}>
            + Neuer Termin
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        {/* Sidebar */}
        <div className="calendar-sidebar">
          <div className="today-section">
            <h3>Heute</h3>
            {todaysEvents.length === 0 ? (
              <p className="no-events">Keine Termine heute</p>
            ) : (
              todaysEvents.map(event => (
                <div key={event.id} className="mini-event" onClick={() => setSelectedEvent(event)}>
                  <span className="event-time">{new Date(event.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="event-title">{event.title}</span>
                </div>
              ))
            )}
          </div>

          <div className="upcoming-section">
            <h3>Kommende Termine</h3>
            {upcomingEvents.length === 0 ? (
              <p className="no-events">Keine kommenden Termine</p>
            ) : (
              upcomingEvents.map(event => (
                <div key={event.id} className="mini-event" onClick={() => setSelectedEvent(event)}>
                  <span className="event-date">{new Date(event.start_time).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                  <span className="event-title">{event.title}</span>
                  {event.contact_name && <span className="event-contact">{event.contact_name}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Calendar */}
        <div className="calendar-main">
          {viewMode === 'month' && (
            <>
              <div className="month-navigation">
                <button onClick={() => navigateMonth(-1)}>◀</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={() => navigateMonth(1)}>▶</button>
              </div>

              <div className="calendar-grid">
                <div className="calendar-header-row">
                  {dayNames.map(day => (
                    <div key={day} className="day-header">{day}</div>
                  ))}
                </div>

                <div className="calendar-days">
                  {getDaysInMonth().map((dayData, index) => {
                    const dayEvents = getEventsForDate(dayData.date);
                    const isToday = dayData.date?.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={index}
                        className={`calendar-day ${!dayData.day ? 'empty' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => {
                          if (dayData.date) {
                            const dateStr = dayData.date.toISOString().slice(0, 16);
                            setNewEvent(prev => ({ ...prev, start_time: dateStr }));
                            setShowEventForm(true);
                          }
                        }}
                      >
                        {dayData.day && (
                          <>
                            <span className="day-number">{dayData.day}</span>
                            <div className="day-events">
                              {dayEvents.slice(0, 3).map(event => (
                                <div
                                  key={event.id}
                                  className={`day-event event-${event.event_type}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                  }}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="more-events">+{dayEvents.length - 3} mehr</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {viewMode === 'list' && (
            <div className="events-list">
              {loading ? (
                <div className="loading-state">Laden...</div>
              ) : events.length === 0 ? (
                <div className="empty-state">Keine Termine in diesem Monat</div>
              ) : (
                events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map(event => (
                  <div
                    key={event.id}
                    className={`event-list-item ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="event-type-icon">
                      {eventTypes.find(t => t.value === event.event_type)?.icon || '📌'}
                    </div>
                    <div className="event-list-content">
                      <div className="event-list-header">
                        <span className="event-title">{event.title}</span>
                        <span className={`event-status status-${event.status}`}>{event.status}</span>
                      </div>
                      <div className="event-list-meta">
                        <span className="event-datetime">
                          {new Date(event.start_time).toLocaleDateString('de-DE')} um {new Date(event.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {event.contact_name && <span className="event-contact">👤 {event.contact_name}</span>}
                        {event.location && <span className="event-location">📍 {event.location}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Event Detail Panel */}
        {selectedEvent && (
          <div className="event-detail-panel">
            <div className="panel-header">
              <h3>{selectedEvent.title}</h3>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className="panel-content">
              <div className="detail-row">
                <span className="label">Typ</span>
                <span className="value">{eventTypes.find(t => t.value === selectedEvent.event_type)?.icon} {eventTypes.find(t => t.value === selectedEvent.event_type)?.label}</span>
              </div>
              <div className="detail-row">
                <span className="label">Datum & Zeit</span>
                <span className="value">
                  {new Date(selectedEvent.start_time).toLocaleDateString('de-DE')} um {new Date(selectedEvent.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="detail-row">
                  <span className="label">Ort</span>
                  <span className="value">{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.video_link && (
                <div className="detail-row">
                  <span className="label">Video-Link</span>
                  <a href={selectedEvent.video_link} target="_blank" rel="noopener noreferrer" className="value link">
                    {selectedEvent.video_link}
                  </a>
                </div>
              )}
              {selectedEvent.contact_name && (
                <div className="detail-row">
                  <span className="label">Kontakt</span>
                  <span className="value">{selectedEvent.contact_name}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="detail-row">
                  <span className="label">Beschreibung</span>
                  <p className="value">{selectedEvent.description}</p>
                </div>
              )}
            </div>
            <div className="panel-actions">
              <button className="btn btn-danger" onClick={() => handleDeleteEvent(selectedEvent.id)}>
                🗑️ Löschen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
          <div className="modal event-form" onClick={e => e.stopPropagation()}>
            <h2>Neuer Termin</h2>

            <div className="form-group">
              <label>Titel *</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="z.B. Meeting mit Kunde"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Typ</label>
                <select value={newEvent.event_type} onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })}>
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Kontakt</label>
                <select value={newEvent.related_contact_id} onChange={e => setNewEvent({ ...newEvent, related_contact_id: e.target.value })}>
                  <option value="">-- Keiner --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start *</label>
                <input
                  type="datetime-local"
                  value={newEvent.start_time}
                  onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Ende</label>
                <input
                  type="datetime-local"
                  value={newEvent.end_time}
                  onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Ort</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="z.B. Büro, Online, etc."
              />
            </div>

            <div className="form-group">
              <label>Video-Link (optional)</label>
              <input
                type="url"
                value={newEvent.video_link}
                onChange={e => setNewEvent({ ...newEvent, video_link: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="form-group">
              <label>Beschreibung</label>
              <textarea
                value={newEvent.description}
                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Details zum Termin..."
                rows={3}
              />
            </div>

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowEventForm(false)}>
                Abbrechen
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateEvent}
                disabled={!newEvent.title || !newEvent.start_time}
              >
                Termin erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
