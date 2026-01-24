import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Project, BrandingAsset, ProjectDocument, ProjectMilestone } from '../../types';
import './BrandingBoard.css';

const BrandingBoard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<BrandingAsset[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'documents' | 'milestones'>('assets');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingAsset, setEditingAsset] = useState<BrandingAsset | null>(null);
  const [showEditAssetForm, setShowEditAssetForm] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch project details when selected
  useEffect(() => {
    if (selectedProject) {
      fetchProjectDetails(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/projects');
      setProjects(response.data);
      if (response.data.length > 0 && !selectedProject) {
        setSelectedProject(response.data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const [assetsRes, docsRes, milestonesRes] = await Promise.all([
        axios.get(`http://localhost:3001/api/projects/${projectId}/assets`),
        axios.get(`http://localhost:3001/api/projects/${projectId}/documents`),
        axios.get(`http://localhost:3001/api/projects/${projectId}/milestones`)
      ]);

      setAssets(assetsRes.data);
      setDocuments(docsRes.data);
      setMilestones(milestonesRes.data);
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await axios.post('http://localhost:3001/api/projects', {
        name: formData.get('name'),
        description: formData.get('description'),
        color: formData.get('color') || '#00ff88',
        icon: formData.get('icon'),
        status: 'active'
      });

      setProjects([response.data, ...projects]);
      setSelectedProject(response.data);
      setShowProjectForm(false);
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.currentTarget);
    setUploading(true);
    setUploadProgress(0);

    try {
      let response;

      if (selectedFile) {
        // Upload with file
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('asset_type', formData.get('asset_type') as string);
        uploadData.append('title', formData.get('title') as string);
        uploadData.append('description', formData.get('description') as string || '');
        uploadData.append('version', formData.get('version') as string || '1.0');

        response = await axios.post(
          `http://localhost:3001/api/projects/${selectedProject.id}/assets/upload`,
          uploadData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const progress = progressEvent.total
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0;
              setUploadProgress(progress);
            }
          }
        );
      } else {
        // Create without file (URL only)
        response = await axios.post(
          `http://localhost:3001/api/projects/${selectedProject.id}/assets`,
          {
            asset_type: formData.get('asset_type'),
            title: formData.get('title'),
            description: formData.get('description'),
            file_url: formData.get('file_url'),
            version: formData.get('version') || '1.0'
          }
        );
      }

      setAssets([response.data, ...assets]);
      setShowAssetForm(false);
      setSelectedFile(null);
      setUploadProgress(0);
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating asset:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleEditAsset = (asset: BrandingAsset) => {
    setEditingAsset(asset);
    setShowEditAssetForm(true);
  };

  const handleUpdateAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject || !editingAsset) return;

    const formData = new FormData(e.currentTarget);

    try {
      const response = await axios.put(
        `http://localhost:3001/api/projects/${selectedProject.id}/assets/${editingAsset.id}`,
        {
          title: formData.get('title'),
          description: formData.get('description'),
          version: formData.get('version')
        }
      );

      setAssets(assets.map(a => a.id === editingAsset.id ? response.data : a));
      setShowEditAssetForm(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const handleDeleteAsset = async (asset: BrandingAsset) => {
    if (!selectedProject) return;

    const confirmed = window.confirm(`Asset "${asset.title}" wirklich löschen?`);
    if (!confirmed) return;

    try {
      await axios.delete(
        `http://localhost:3001/api/projects/${selectedProject.id}/assets/${asset.id}`
      );
      setAssets(assets.filter(a => a.id !== asset.id));
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.currentTarget);

    try {
      const response = await axios.post(
        `http://localhost:3001/api/projects/${selectedProject.id}/documents`,
        {
          document_type: formData.get('document_type'),
          title: formData.get('title'),
          content: formData.get('content'),
          status: formData.get('status') || 'draft',
          version: formData.get('version') || '1.0'
        }
      );

      setDocuments([response.data, ...documents]);
      setShowDocumentForm(false);
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const getAssetIcon = (type: string) => {
    const icons: Record<string, string> = {
      logo: '🎨',
      color_palette: '🎨',
      typography: '✍️',
      icon: '🔲',
      image: '🖼️',
      video: '🎥',
      template: '📄',
      other: '📎'
    };
    return icons[type] || '📎';
  };

  const getDocumentIcon = (type: string) => {
    const icons: Record<string, string> = {
      prd: '📋',
      pitch_deck: '📊',
      business_plan: '📈',
      roadmap: '🗺️',
      design_spec: '🎨',
      other: '📄'
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <div className="branding-board">
        <div className="loading">Laden...</div>
      </div>
    );
  }

  return (
    <div className="branding-board">
      {/* Header with Project Selector */}
      <div className="branding-header">
        <div className="header-left">
          <h1>🎨 Branding Board</h1>
          <p className="subtitle">Multi-Projekt-Management</p>
        </div>

        <div className="project-selector">
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value);
              setSelectedProject(project || null);
            }}
            className="project-dropdown"
          >
            <option value="">Projekt wählen...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.icon || '📁'} {project.name}
              </option>
            ))}
          </select>

          <button
            className="btn-add-project"
            onClick={() => setShowProjectForm(true)}
          >
            ➕ Neues Projekt
          </button>
        </div>
      </div>

      {/* Project Form Modal */}
      {showProjectForm && (
        <div className="modal-overlay" onClick={() => setShowProjectForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📁 Neues Projekt erstellen</h2>
              <button className="modal-close" onClick={() => setShowProjectForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Projektname *</label>
                <input type="text" name="name" required placeholder="z.B. Mutuus App" />
              </div>
              <div className="form-group">
                <label>Beschreibung</label>
                <textarea name="description" rows={3} placeholder="Was ist das Projekt?" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Icon</label>
                  <input type="text" name="icon" placeholder="z.B. 🚀, 💼, 🎨" />
                </div>
                <div className="form-group">
                  <label>Farbe</label>
                  <input type="color" name="color" defaultValue="#00ff88" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowProjectForm(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Erstellen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedProject ? (
        <div className="project-content">
          {/* Project Info Card */}
          <div className="project-info-card" style={{ borderColor: selectedProject.color }}>
            <div className="project-info-header">
              <div className="project-icon">{selectedProject.icon || '📁'}</div>
              <div className="project-details">
                <h2>{selectedProject.name}</h2>
                <p>{selectedProject.description || 'Keine Beschreibung'}</p>
                <div className="project-meta">
                  <span className={`status-badge status-${selectedProject.status}`}>
                    {selectedProject.status}
                  </span>
                  {selectedProject.website_url && (
                    <a href={selectedProject.website_url} target="_blank" rel="noreferrer">
                      🌐 Website
                    </a>
                  )}
                  {selectedProject.repository_url && (
                    <a href={selectedProject.repository_url} target="_blank" rel="noreferrer">
                      💻 Repository
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'assets' ? 'active' : ''}`}
              onClick={() => setActiveTab('assets')}
            >
              🎨 Assets ({assets.length})
            </button>
            <button
              className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              📄 Dokumente ({documents.length})
            </button>
            <button
              className={`tab ${activeTab === 'milestones' ? 'active' : ''}`}
              onClick={() => setActiveTab('milestones')}
            >
              🎯 Milestones ({milestones.length})
            </button>
          </div>

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="tab-content">
              <div className="tab-header">
                <h3>🎨 Branding Assets</h3>
                <button className="btn-add" onClick={() => setShowAssetForm(true)}>
                  ➕ Asset hinzufügen
                </button>
              </div>

              <div className="assets-grid">
                {assets.map(asset => (
                  <div key={asset.id} className="asset-card">
                    {/* Asset Actions */}
                    <div className="asset-actions">
                      <button
                        className="asset-action-btn edit"
                        onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}
                        title="Bearbeiten"
                      >
                        ✏️
                      </button>
                      <button
                        className="asset-action-btn delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset); }}
                        title="Löschen"
                      >
                        🗑️
                      </button>
                    </div>
                    {/* Image Preview */}
                    {asset.file_url && asset.file_type?.startsWith('image/') ? (
                      <div className="asset-preview">
                        <img
                          src={`http://localhost:3001${asset.file_url}`}
                          alt={asset.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="asset-icon">{getAssetIcon(asset.asset_type)}</div>
                    )}
                    <div className="asset-info">
                      <h4>{asset.title}</h4>
                      <p className="asset-type">{asset.asset_type.replace('_', ' ')}</p>
                      {asset.description && <p className="asset-description">{asset.description}</p>}
                      <div className="asset-meta">
                        <span>v{asset.version}</span>
                        {asset.is_primary === 1 && <span className="primary-badge">⭐ Primary</span>}
                      </div>
                      {asset.file_url && (
                        <div className="asset-file-info">
                          <span>📎</span>
                          <a
                            href={`http://localhost:3001${asset.file_url}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Datei öffnen
                          </a>
                          {asset.file_size && (
                            <span>({formatFileSize(asset.file_size)})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {assets.length === 0 && (
                <div className="empty-state">
                  <p>Noch keine Assets vorhanden</p>
                  <button className="btn-add" onClick={() => setShowAssetForm(true)}>
                    ➕ Erstes Asset hinzufügen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="tab-content">
              <div className="tab-header">
                <h3>📄 Projekt-Dokumente</h3>
                <button className="btn-add" onClick={() => setShowDocumentForm(true)}>
                  ➕ Dokument hinzufügen
                </button>
              </div>

              <div className="documents-list">
                {documents.map(doc => (
                  <div key={doc.id} className="document-card">
                    <div className="document-icon">{getDocumentIcon(doc.document_type)}</div>
                    <div className="document-info">
                      <h4>{doc.title}</h4>
                      <p className="document-type">{doc.document_type.replace('_', ' ')}</p>
                      <div className="document-meta">
                        <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
                        <span>v{doc.version}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {documents.length === 0 && (
                <div className="empty-state">
                  <p>Noch keine Dokumente vorhanden</p>
                  <button className="btn-add" onClick={() => setShowDocumentForm(true)}>
                    ➕ Erstes Dokument hinzufügen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <div className="tab-content">
              <div className="tab-header">
                <h3>🎯 Milestones</h3>
              </div>

              <div className="milestones-list">
                {milestones.map(milestone => (
                  <div key={milestone.id} className="milestone-card">
                    <div className="milestone-info">
                      <h4>{milestone.title}</h4>
                      {milestone.description && <p>{milestone.description}</p>}
                      <div className="milestone-meta">
                        <span className={`status-badge status-${milestone.status}`}>
                          {milestone.status}
                        </span>
                        {milestone.target_date && (
                          <span>🎯 {new Date(milestone.target_date).toLocaleDateString('de-DE')}</span>
                        )}
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {milestones.length === 0 && (
                <div className="empty-state">
                  <p>Noch keine Milestones definiert</p>
                </div>
              )}
            </div>
          )}

          {/* Asset Form Modal */}
          {showAssetForm && (
            <div className="modal-overlay" onClick={() => { setShowAssetForm(false); setSelectedFile(null); }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>🎨 Neues Asset hinzufügen</h2>
                  <button className="modal-close" onClick={() => { setShowAssetForm(false); setSelectedFile(null); }}>✕</button>
                </div>
                <form onSubmit={handleCreateAsset}>
                  <div className="form-group">
                    <label>Asset-Typ *</label>
                    <select name="asset_type" required>
                      <option value="">Wählen...</option>
                      <option value="logo">🎨 Logo</option>
                      <option value="color_palette">🎨 Farbpalette</option>
                      <option value="typography">✍️ Typography</option>
                      <option value="icon">🔲 Icon</option>
                      <option value="image">🖼️ Image</option>
                      <option value="video">🎥 Video</option>
                      <option value="template">📄 Template</option>
                      <option value="other">📎 Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Titel *</label>
                    <input type="text" name="title" required placeholder="z.B. Primary Logo" />
                  </div>
                  <div className="form-group">
                    <label>Beschreibung</label>
                    <textarea name="description" rows={3} placeholder="Details zum Asset" />
                  </div>

                  {/* File Upload Section */}
                  <div className="form-group file-upload-section">
                    <label>Datei hochladen</label>
                    <div className="file-upload-container">
                      <input
                        type="file"
                        id="asset-file"
                        onChange={handleFileSelect}
                        accept="image/*,.pdf,.ai,.psd,.sketch,.fig,.zip,video/*"
                        className="file-input-hidden"
                      />
                      <label htmlFor="asset-file" className="file-upload-button">
                        📁 Datei auswählen
                      </label>
                      {selectedFile && (
                        <div className="selected-file">
                          <span className="file-name">{selectedFile.name}</span>
                          <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                          <button
                            type="button"
                            className="remove-file"
                            onClick={() => setSelectedFile(null)}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    {uploading && (
                      <div className="upload-progress">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <span>{uploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  <div className="form-divider">
                    <span>oder</span>
                  </div>

                  <div className="form-group">
                    <label>Externe URL</label>
                    <input
                      type="url"
                      name="file_url"
                      placeholder="https://..."
                      disabled={!!selectedFile}
                    />
                  </div>
                  <div className="form-group">
                    <label>Version</label>
                    <input type="text" name="version" defaultValue="1.0" />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => { setShowAssetForm(false); setSelectedFile(null); }}>Abbrechen</button>
                    <button type="submit" className="btn-primary" disabled={uploading}>
                      {uploading ? `Hochladen... ${uploadProgress}%` : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Asset Form Modal */}
          {showEditAssetForm && editingAsset && (
            <div className="modal-overlay" onClick={() => { setShowEditAssetForm(false); setEditingAsset(null); }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>✏️ Asset bearbeiten</h2>
                  <button className="modal-close" onClick={() => { setShowEditAssetForm(false); setEditingAsset(null); }}>✕</button>
                </div>
                <form onSubmit={handleUpdateAsset}>
                  <div className="form-group">
                    <label>Asset-Typ</label>
                    <input
                      type="text"
                      value={`${getAssetIcon(editingAsset.asset_type)} ${editingAsset.asset_type.replace('_', ' ')}`}
                      disabled
                      className="input-disabled"
                    />
                  </div>
                  <div className="form-group">
                    <label>Titel *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      defaultValue={editingAsset.title}
                    />
                  </div>
                  <div className="form-group">
                    <label>Beschreibung</label>
                    <textarea
                      name="description"
                      rows={3}
                      defaultValue={editingAsset.description || ''}
                    />
                  </div>
                  <div className="form-group">
                    <label>Version</label>
                    <input
                      type="text"
                      name="version"
                      defaultValue={editingAsset.version}
                    />
                  </div>

                  {/* Current File Info */}
                  {editingAsset.file_url && (
                    <div className="current-file-info">
                      <label>Aktuelle Datei</label>
                      <div className="file-preview-box">
                        {editingAsset.file_type?.startsWith('image/') && (
                          <img
                            src={`http://localhost:3001${editingAsset.file_url}`}
                            alt={editingAsset.title}
                            className="file-preview-thumb"
                          />
                        )}
                        <div className="file-details">
                          <a
                            href={`http://localhost:3001${editingAsset.file_url}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📎 Datei öffnen
                          </a>
                          {editingAsset.file_size && (
                            <span className="file-size-info">{formatFileSize(editingAsset.file_size)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        handleDeleteAsset(editingAsset);
                        setShowEditAssetForm(false);
                        setEditingAsset(null);
                      }}
                    >
                      🗑️ Löschen
                    </button>
                    <div className="form-actions-right">
                      <button type="button" onClick={() => { setShowEditAssetForm(false); setEditingAsset(null); }}>Abbrechen</button>
                      <button type="submit" className="btn-primary">Speichern</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Document Form Modal */}
          {showDocumentForm && (
            <div className="modal-overlay" onClick={() => setShowDocumentForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>📄 Neues Dokument hinzufügen</h2>
                  <button className="modal-close" onClick={() => setShowDocumentForm(false)}>✕</button>
                </div>
                <form onSubmit={handleCreateDocument}>
                  <div className="form-group">
                    <label>Dokumenten-Typ *</label>
                    <select name="document_type" required>
                      <option value="">Wählen...</option>
                      <option value="prd">📋 PRD (Product Requirements)</option>
                      <option value="pitch_deck">📊 Pitch Deck</option>
                      <option value="business_plan">📈 Business Plan</option>
                      <option value="roadmap">🗺️ Roadmap</option>
                      <option value="design_spec">🎨 Design Specification</option>
                      <option value="other">📄 Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Titel *</label>
                    <input type="text" name="title" required placeholder="z.B. Product Roadmap Q1 2025" />
                  </div>
                  <div className="form-group">
                    <label>Inhalt</label>
                    <textarea name="content" rows={6} placeholder="Dokumenten-Inhalt..." />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Status</label>
                      <select name="status">
                        <option value="draft">Draft</option>
                        <option value="review">Review</option>
                        <option value="approved">Approved</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Version</label>
                      <input type="text" name="version" defaultValue="1.0" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowDocumentForm(false)}>Abbrechen</button>
                    <button type="submit" className="btn-primary">Erstellen</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Noch keine Projekte vorhanden</h2>
          <p>Erstelle dein erstes Projekt, um loszulegen!</p>
          <button className="btn-add" onClick={() => setShowProjectForm(true)}>
            ➕ Erstes Projekt erstellen
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandingBoard;
