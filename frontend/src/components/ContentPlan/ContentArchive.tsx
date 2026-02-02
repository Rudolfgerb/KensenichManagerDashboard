import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ContentArchive as ArchiveItem } from '../../types';
import './ContentPlan.css';

const ContentArchive: React.FC = () => {
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [searchTags, setSearchTags] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    element_type: 'text',
    content: '',
    file: null as File | null,
    tags: '',
    platform: '',
    category: '',
    notes: ''
  });

  useEffect(() => {
    fetchArchive();
  }, [filterType, filterPlatform, searchTags]);

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType !== 'all') params.element_type = filterType;
      if (filterPlatform !== 'all') params.platform = filterPlatform;
      if (searchTags) params.tags = searchTags;

      const response = await axios.get('http://localhost:3001/api/content/archive', { params });
      setArchive(response.data);
    } catch (error) {
      console.error('Error fetching archive:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseAsset = async (item: ArchiveItem) => {
    try {
      await axios.post(`http://localhost:3001/api/content/archive/${item.id}/use`);
      fetchArchive();
      alert(`Asset "${item.title}" wurde als verwendet markiert! Usage Count: ${item.usage_count + 1}`);
    } catch (error) {
      console.error('Error marking asset as used:', error);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Asset wirklich aus dem Archiv löschen?')) return;

    try {
      await axios.delete(`http://localhost:3001/api/content/archive/${id}`);
      fetchArchive();
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('In Zwischenablage kopiert!');
  };

  const handleUploadAsset = async () => {
    try {
      const formData = new FormData();
      formData.append('title', uploadFormData.title);
      formData.append('element_type', uploadFormData.element_type);
      formData.append('content', uploadFormData.content);
      formData.append('tags', uploadFormData.tags);
      formData.append('platform', uploadFormData.platform);
      formData.append('category', uploadFormData.category);
      formData.append('notes', uploadFormData.notes);

      if (uploadFormData.file) {
        formData.append('file', uploadFormData.file);
      }

      await axios.post('http://localhost:3001/api/content/archive', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setShowUploadModal(false);
      fetchArchive();
      
      // Reset form
      setUploadFormData({
        title: '',
        element_type: 'text',
        content: '',
        file: null,
        tags: '',
        platform: '',
        category: '',
        notes: ''
      });

      alert('Asset erfolgreich hochgeladen!');
    } catch (error) {
      console.error('Error uploading asset:', error);
      alert('Fehler beim Hochladen des Assets: ' + (error as any).message);
    }
  };

  return (
    <div className="content-archive-view">
      <div className="archive-controls">
        <div className="archive-filters">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Alle Typen</option>
            <option value="hook">🎣 Hooks</option>
            <option value="caption">📝 Captions</option>
            <option value="text">💬 Texte</option>
            <option value="voiceover">🎤 Voiceovers</option>
            <option value="script">📜 Scripts</option>
            <option value="transitions">🔄 Transitions</option>
            <option value="animations">✨ Animations</option>
            <option value="stickers">🎨 Stickers</option>
            <option value="videos">🎬 Videos</option>
            <option value="music">🎵 Music</option>
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

          <input
            type="text"
            placeholder="🔍 Suche nach Tags..."
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="archive-stats">
          <span>{archive.length} Assets</span>
          <span>•</span>
          <span>{archive.reduce((sum, item) => sum + item.usage_count, 0)} Gesamt-Verwendungen</span>
        </div>
      </div>

      <div className="archive-upload-button">
        <button
          className="btn-upload-asset"
          onClick={() => setShowUploadModal(true)}
        >
          ⬆️ Asset hochladen
        </button>
      </div>

      {loading ? (
        <div className="loading">Lade Archiv...</div>
      ) : (
        <div className="archive-grid">
          {archive.map(item => (
            <div key={item.id} className="archive-card">
              <div className="archive-card-header">
                <div className="archive-card-title">
                  <span className="archive-icon">{getElementIcon(item.element_type)}</span>
                  <h4>{item.title}</h4>
                </div>
                <div className="archive-card-badges">
                  {item.platform && (
                    <span className="badge badge-platform">{item.platform}</span>
                  )}
                  <span className="badge badge-usage">
                    🔄 {item.usage_count}x
                  </span>
                </div>
              </div>

              <div className="archive-card-content">
                {item.content && (
                  <div className="archive-content-preview">
                    <p>{item.content.substring(0, 150)}{item.content.length > 150 ? '...' : ''}</p>
                  </div>
                )}

                {item.file_url && (
                  <div className="archive-file">
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                      📎 {item.file_url}
                    </a>
                  </div>
                )}

                {item.tags && (
                  <div className="archive-tags">
                    {item.tags.split(',').map((tag, idx) => (
                      <span key={idx} className="tag">#{tag.trim()}</span>
                    ))}
                  </div>
                )}

                {item.last_used && (
                  <div className="archive-meta">
                    <small>Zuletzt verwendet: {new Date(item.last_used).toLocaleDateString('de-DE')}</small>
                  </div>
                )}
              </div>

              <div className="archive-card-actions">
                <button
                  className="btn-use"
                  onClick={() => handleUseAsset(item)}
                  title="Als verwendet markieren"
                >
                  ✅ Verwenden
                </button>
                {item.content && (
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(item.content || '')}
                    title="In Zwischenablage kopieren"
                  >
                    📋 Kopieren
                  </button>
                )}
                <button
                  className="btn-view"
                  onClick={() => setSelectedItem(item)}
                  title="Details anzeigen"
                >
                  👁️
                </button>
                <button
                  className="btn-delete-small"
                  onClick={() => handleDeleteAsset(item.id)}
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {archive.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>Noch keine Assets archiviert</h3>
              <p>Archiviere Content-Elemente aus deinen Ideen, um sie hier wiederzuverwenden!</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{getElementIcon(selectedItem.element_type)} {selectedItem.title}</h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>✕</button>
            </div>

            <div className="archive-detail">
              <div className="detail-section">
                <h3>📋 Info</h3>
                <div className="detail-grid">
                  <div>
                    <strong>Typ:</strong> {selectedItem.element_type}
                  </div>
                  {selectedItem.platform && (
                    <div>
                      <strong>Plattform:</strong> {selectedItem.platform}
                    </div>
                  )}
                  {selectedItem.category && (
                    <div>
                      <strong>Kategorie:</strong> {selectedItem.category}
                    </div>
                  )}
                  <div>
                    <strong>Verwendet:</strong> {selectedItem.usage_count}x
                  </div>
                  {selectedItem.last_used && (
                    <div>
                      <strong>Zuletzt:</strong> {new Date(selectedItem.last_used).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </div>
              </div>

              {selectedItem.content && (
                <div className="detail-section">
                  <h3>💬 Content</h3>
                  <div className="content-box">
                    <pre>{selectedItem.content}</pre>
                  </div>
                  <button
                    className="btn-copy-full"
                    onClick={() => copyToClipboard(selectedItem.content || '')}
                  >
                    📋 Kompletten Text kopieren
                  </button>
                </div>
              )}

              {selectedItem.file_url && (
                <div className="detail-section">
                  <h3>📎 Datei</h3>
                  <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" className="file-link">
                    {selectedItem.file_url}
                  </a>
                </div>
              )}

              {selectedItem.notes && (
                <div className="detail-section">
                  <h3>📝 Notizen</h3>
                  <p>{selectedItem.notes}</p>
                </div>
              )}

              {selectedItem.tags && (
                <div className="detail-section">
                  <h3>🏷️ Tags</h3>
                  <div className="archive-tags">
                    {selectedItem.tags.split(',').map((tag, idx) => (
                      <span key={idx} className="tag">#{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⬆️ Asset hochladen</h2>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>✕</button>
            </div>

            <div className="upload-form">
              <div className="form-group">
                <label>📋 Titel *</label>
                <input
                  type="text"
                  value={uploadFormData.title}
                  onChange={(e) => setUploadFormData({...uploadFormData, title: e.target.value})}
                  placeholder="Titel des Assets"
                  required
                />
              </div>

              <div className="form-group">
                <label>📦 Element Typ *</label>
                <select
                  value={uploadFormData.element_type}
                  onChange={(e) => setUploadFormData({...uploadFormData, element_type: e.target.value})}
                  required
                >
                  <option value="hook">🎣 Hook</option>
                  <option value="caption">📝 Caption</option>
                  <option value="text">💬 Text</option>
                  <option value="voiceover">🎤 Voiceover</option>
                  <option value="script">📜 Script</option>
                  <option value="transitions">🔄 Transitions</option>
                  <option value="animations">✨ Animations</option>
                  <option value="stickers">🎨 Stickers</option>
                  <option value="videos">🎬 Videos</option>
                  <option value="music">🎵 Music</option>
                  <option value="custom">📦 Custom</option>
                </select>
              </div>

              <div className="form-group">
                <label>💬 Content (optional)</label>
                <textarea
                  value={uploadFormData.content}
                  onChange={(e) => setUploadFormData({...uploadFormData, content: e.target.value})}
                  placeholder="Textinhalt, Skript, Beschreibung, etc."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>📎 Datei (optional)</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFormData({...uploadFormData, file: e.target.files[0]});
                    }
                  }}
                  accept=".jpg,.jpeg,.png,.gif,.mp4,.mov,.mp3,.wav,.pdf,.txt,.doc,.docx"
                />
                {uploadFormData.file && (
                  <div className="file-preview">
                    <span>📎 {uploadFormData.file.name}</span>
                    <button
                      className="btn-remove-file"
                      onClick={() => setUploadFormData({...uploadFormData, file: null})}
                    >
                      ✕ Entfernen
                    </button>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>🏷️ Tags (optional)</label>
                  <input
                    type="text"
                    value={uploadFormData.tags}
                    onChange={(e) => setUploadFormData({...uploadFormData, tags: e.target.value})}
                    placeholder="Tag1, Tag2, Tag3"
                  />
                </div>

                <div className="form-group">
                  <label>📱 Plattform (optional)</label>
                  <select
                    value={uploadFormData.platform}
                    onChange={(e) => setUploadFormData({...uploadFormData, platform: e.target.value})}
                  >
                    <option value="">Alle Plattformen</option>
                    <option value="youtube">📺 YouTube</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="tiktok">🎵 TikTok</option>
                    <option value="twitter">🐦 Twitter</option>
                    <option value="linkedin">💼 LinkedIn</option>
                    <option value="facebook">👥 Facebook</option>
                    <option value="blog">📝 Blog</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>📚 Kategorie (optional)</label>
                  <input
                    type="text"
                    value={uploadFormData.category}
                    onChange={(e) => setUploadFormData({...uploadFormData, category: e.target.value})}
                    placeholder="z.B. Tutorial, Werbung, Vlog"
                  />
                </div>

                <div className="form-group">
                  <label>📝 Notizen (optional)</label>
                  <input
                    type="text"
                    value={uploadFormData.notes}
                    onChange={(e) => setUploadFormData({...uploadFormData, notes: e.target.value})}
                    placeholder="Zusätzliche Informationen"
                  />
                </div>
              </div>

              <div className="upload-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowUploadModal(false)}
                >
                  ✕ Abbrechen
                </button>
                <button
                  className="btn-upload"
                  onClick={handleUploadAsset}
                  disabled={!uploadFormData.title.trim()}
                >
                  ⬆️ Hochladen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentArchive;
