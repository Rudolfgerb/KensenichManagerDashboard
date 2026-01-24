import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ContentIdea, ContentElement } from '../../types';
import './ContentPlan.css';

interface ContentDetailProps {
  idea: ContentIdea;
  onClose: () => void;
  onUpdate: () => void;
}

const ContentDetail: React.FC<ContentDetailProps> = ({ idea, onClose, onUpdate }) => {
  const [contentIdea, setContentIdea] = useState<ContentIdea>(idea);
  const [elements, setElements] = useState<ContentElement[]>([]);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [elementData, setElementData] = useState<Partial<ContentElement>>({});

  useEffect(() => {
    fetchFullIdea();
  }, [idea.id]);

  const fetchFullIdea = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/content/ideas/${idea.id}`);
      setContentIdea(response.data);
      setElements(response.data.elements || []);
    } catch (error) {
      console.error('Error fetching full idea:', error);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await axios.put(`http://localhost:3001/api/content/ideas/${idea.id}`, {
        status: newStatus
      });
      fetchFullIdea();
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdateElement = async (elementId: string) => {
    try {
      await axios.put(`http://localhost:3001/api/content/elements/${elementId}`, elementData);
      setEditingElement(null);
      setElementData({});
      fetchFullIdea();
      onUpdate();
    } catch (error) {
      console.error('Error updating element:', error);
    }
  };

  const startEditingElement = (element: ContentElement) => {
    setEditingElement(element.id);
    setElementData({
      title: element.title,
      content: element.content,
      file_url: element.file_url,
      status: element.status,
      notes: element.notes
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      missing: '#ef4444',
      draft: '#f59e0b',
      ready: '#3b82f6',
      approved: '#00ff88'
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      missing: '❌',
      draft: '✏️',
      ready: '✅',
      approved: '⭐'
    };
    return icons[status] || '📄';
  };

  const getElementIcon = (type: string) => {
    const icons: Record<string, string> = {
      hook: '🎣',
      caption: '📝',
      text: '💬',
      voiceover: '🎤',
      script: '📜',
      transitions: '🔄',
      animations: '✨',
      stickers: '🎨',
      videos: '🎬',
      music: '🎵',
      custom: '📦'
    };
    return icons[type] || '📄';
  };

  const getProgressPercentage = () => {
    if (elements.length === 0) return 0;
    const completedElements = elements.filter(e => e.status === 'ready' || e.status === 'approved').length;
    return Math.round((completedElements / elements.length) * 100);
  };

  const handleArchiveElement = async (element: ContentElement) => {
    if (!element.content && !element.file_url) {
      alert('Element hat keinen Content zum Archivieren!');
      return;
    }

    try {
      await axios.post('http://localhost:3001/api/content/archive', {
        title: `${contentIdea.title} - ${element.title}`,
        element_type: element.element_type,
        content: element.content,
        file_url: element.file_url,
        platform: contentIdea.platform,
        category: contentIdea.category,
        notes: element.notes
      });
      alert('Element erfolgreich archiviert!');
    } catch (error) {
      console.error('Error archiving element:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{contentIdea.title}</h2>
            <p className="content-meta">
              {contentIdea.platform && `📱 ${contentIdea.platform}`}
              {contentIdea.category && ` • 🏷️ ${contentIdea.category}`}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="content-detail">
          {/* Status & Progress */}
          <div className="content-overview">
            <div className="status-selector">
              <label>Status:</label>
              <div className="status-buttons">
                {['idea', 'in_progress', 'ready', 'published'].map(status => (
                  <button
                    key={status}
                    className={`status-button ${contentIdea.status === status ? 'active' : ''}`}
                    onClick={() => handleUpdateStatus(status)}
                  >
                    {status === 'idea' && '💡 Idee'}
                    {status === 'in_progress' && '⚡ In Progress'}
                    {status === 'ready' && '✅ Ready'}
                    {status === 'published' && '🚀 Published'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overall-progress">
              <div className="progress-header">
                <span>Gesamtfortschritt</span>
                <span className="progress-percentage">{getProgressPercentage()}%</span>
              </div>
              <div className="progress-bar large">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="progress-stats">
                {elements.filter(e => e.status === 'approved').length} Approved •
                {elements.filter(e => e.status === 'ready').length} Ready •
                {elements.filter(e => e.status === 'draft').length} Draft •
                {elements.filter(e => e.status === 'missing').length} Missing
              </div>
            </div>
          </div>

          {contentIdea.description && (
            <div className="content-description">
              <h3>📋 Beschreibung</h3>
              <p>{contentIdea.description}</p>
            </div>
          )}

          {/* Content Elements */}
          <div className="content-elements">
            <h3>🧩 Content-Elemente</h3>
            <div className="elements-grid">
              {elements.map(element => (
                <div key={element.id} className="element-card">
                  <div className="element-header">
                    <div className="element-title">
                      <span className="element-icon">{getElementIcon(element.element_type)}</span>
                      <h4>{element.title || element.element_type}</h4>
                    </div>
                    <div className="element-actions">
                      <span
                        className="element-status-badge"
                        style={{ backgroundColor: getStatusColor(element.status) }}
                      >
                        {getStatusIcon(element.status)} {element.status}
                      </span>
                    </div>
                  </div>

                  {editingElement === element.id ? (
                    <div className="element-edit-form">
                      <div className="form-group">
                        <label>Content</label>
                        <textarea
                          value={elementData.content || ''}
                          onChange={(e) => setElementData({ ...elementData, content: e.target.value })}
                          placeholder="Text eingeben..."
                          rows={3}
                        />
                      </div>

                      <div className="form-group">
                        <label>Datei/URL</label>
                        <input
                          type="text"
                          value={elementData.file_url || ''}
                          onChange={(e) => setElementData({ ...elementData, file_url: e.target.value })}
                          placeholder="https://... oder Dateipfad"
                        />
                      </div>

                      <div className="form-group">
                        <label>Status</label>
                        <select
                          value={elementData.status || 'missing'}
                          onChange={(e) => setElementData({ ...elementData, status: e.target.value as any })}
                        >
                          <option value="missing">❌ Missing</option>
                          <option value="draft">✏️ Draft</option>
                          <option value="ready">✅ Ready</option>
                          <option value="approved">⭐ Approved</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Notizen</label>
                        <textarea
                          value={elementData.notes || ''}
                          onChange={(e) => setElementData({ ...elementData, notes: e.target.value })}
                          placeholder="Notizen, Todos, Links..."
                          rows={2}
                        />
                      </div>

                      <div className="element-form-actions">
                        <button
                          className="btn-cancel"
                          onClick={() => {
                            setEditingElement(null);
                            setElementData({});
                          }}
                        >
                          Abbrechen
                        </button>
                        <button
                          className="btn-submit"
                          onClick={() => handleUpdateElement(element.id)}
                        >
                          💾 Speichern
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="element-content">
                      {element.content && (
                        <div className="element-text">
                          <p>{element.content}</p>
                        </div>
                      )}

                      {element.file_url && (
                        <div className="element-file">
                          <a href={element.file_url} target="_blank" rel="noopener noreferrer">
                            📎 {element.file_url}
                          </a>
                        </div>
                      )}

                      {element.notes && (
                        <div className="element-notes">
                          <small>{element.notes}</small>
                        </div>
                      )}

                      {!element.content && !element.file_url && !element.notes && (
                        <p className="element-empty">Noch kein Content hinzugefügt</p>
                      )}

                      <div className="element-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => startEditingElement(element)}
                        >
                          ✏️ Bearbeiten
                        </button>
                        {(element.content || element.file_url) && (
                          <button
                            className="btn-archive"
                            onClick={() => handleArchiveElement(element)}
                          >
                            📚 Archivieren
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          {contentIdea.images && contentIdea.images.length > 0 && (
            <div className="content-images">
              <h3>🖼️ Bilder</h3>
              <div className="images-grid">
                {contentIdea.images.map(image => (
                  <div key={image.id} className="image-card">
                    <img src={image.file_path} alt={image.alt_text || image.file_name} />
                    <div className="image-info">
                      <p>{image.file_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contentIdea.notes && (
            <div className="content-notes">
              <h3>📝 Notizen</h3>
              <p>{contentIdea.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentDetail;
