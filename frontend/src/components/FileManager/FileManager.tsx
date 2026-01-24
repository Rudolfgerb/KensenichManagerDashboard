import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import BrandingBoard from '../BrandingBoard/BrandingBoard';
import './FileManager.css';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  path: string;
  modified?: string;
}

type UploadMode = 'text' | 'file' | 'url' | 'voice' | null;

export default function FileManager() {
  const [activeTab, setActiveTab] = useState<'files' | 'branding'>('files');
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>(null);
  const [textContent, setTextContent] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/files?path=${encodeURIComponent(path)}`);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      // Mock data for demo
      setFiles([
        { name: 'Projekte', type: 'folder', path: '/Projekte' },
        { name: 'Dokumente', type: 'folder', path: '/Dokumente' },
        { name: 'Notizen.txt', type: 'file', size: 2048, path: '/Notizen.txt', modified: new Date().toISOString() },
        { name: 'Todo.md', type: 'file', size: 1024, path: '/Todo.md', modified: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
    } else {
      setSelectedFile(file);
    }
  };

  const handleBack = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath('/' + parts.join('/'));
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date?: string): string => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenUploadModal = () => {
    setShowUploadModal(true);
    setUploadMode(null);
    setTextContent('');
    setUrlInput('');
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadMode(null);
    setTextContent('');
    setUrlInput('');
    setIsRecording(false);
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;
    setIsProcessing(true);
    try {
      const response = await axios.post('/api/ai/process-content', {
        content: textContent,
        type: 'text'
      });

      // AI determines what to do with the content
      if (response.data.action === 'create_task') {
        await axios.post('/api/tasks', response.data.task);
        alert('✅ Aufgabe erstellt!');
      } else if (response.data.action === 'create_contact') {
        await axios.post('/api/crm/contacts', response.data.contact);
        alert('✅ Kontakt erstellt!');
      } else if (response.data.action === 'save_file') {
        // Save as file
        alert('✅ Datei gespeichert!');
      }

      handleCloseUploadModal();
      loadFiles(currentPath);
    } catch (error) {
      console.error('Error processing text:', error);
      alert('Fehler beim Verarbeiten');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('✅ Datei hochgeladen!');
      handleCloseUploadModal();
      loadFiles(currentPath);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Fehler beim Upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setIsProcessing(true);
    try {
      const response = await axios.post('/api/ai/process-content', {
        content: urlInput,
        type: 'url'
      });

      alert('✅ URL verarbeitet!');
      handleCloseUploadModal();
      loadFiles(currentPath);
    } catch (error) {
      console.error('Error processing URL:', error);
      alert('Fehler beim Verarbeiten der URL');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Mikrofon-Zugriff verweigert');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Use Web Speech API for transcription
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = false;

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;

        // Process transcribed text with AI
        const response = await axios.post('/api/ai/process-content', {
          content: transcript,
          type: 'voice'
        });

        if (response.data.action === 'create_task') {
          await axios.post('/api/tasks', response.data.task);
          alert('✅ Aufgabe aus Voice Memo erstellt!');
        } else if (response.data.action === 'create_contact') {
          await axios.post('/api/crm/contacts', response.data.contact);
          alert('✅ Kontakt aus Voice Memo erstellt!');
        } else if (response.data.action === 'save_file') {
          alert('✅ Voice Memo als Datei gespeichert!');
        }

        handleCloseUploadModal();
        loadFiles(currentPath);
      };

      recognition.onerror = (error: any) => {
        console.error('Transcription error:', error);
        alert('Fehler bei der Transkription');
      };

      recognition.start();
    } catch (error) {
      console.error('Error transcribing audio:', error);
      alert('Fehler bei der Transkription');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="file-manager">
      {/* Tabs */}
      <div className="file-manager-tabs">
        <button
          className={`tab-button ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          📁 Dateien
        </button>
        <button
          className={`tab-button ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          🎨 Branding
        </button>
      </div>

      {activeTab === 'branding' ? (
        <BrandingBoard />
      ) : (
        <>
          <div className="file-manager-header">
            <div className="path-navigation">
              {currentPath !== '/' && (
                <button className="btn-back" onClick={handleBack}>
                  ← Zurück
                </button>
              )}
              <div className="current-path">
                <span className="path-icon">📁</span>
                <span className="path-text">{currentPath || '/'}</span>
              </div>
            </div>

            <div className="view-controls">
              <button
                className="add-content-btn"
                onClick={handleOpenUploadModal}
                title="Inhalt hinzufügen"
              >
                + Hinzufügen
              </button>
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ▦
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰
              </button>
            </div>
          </div>

      <div className={`file-grid ${viewMode}`}>
        {isLoading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Lade Dateien...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-folder">
            <p>📂 Dieser Ordner ist leer</p>
          </div>
        ) : (
          files.map((file, idx) => (
            <div
              key={idx}
              className={`file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
              onClick={() => handleFileClick(file)}
            >
              <div className="file-icon">
                {file.type === 'folder' ? '📁' : getFileIcon(file.name)}
              </div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                {viewMode === 'list' && (
                  <>
                    <div className="file-size">{formatFileSize(file.size)}</div>
                    <div className="file-date">{formatDate(file.modified)}</div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedFile && (
        <div className="file-preview">
          <div className="preview-header">
            <h3>Datei-Info</h3>
            <button className="close-preview" onClick={() => setSelectedFile(null)}>
              ×
            </button>
          </div>
          <div className="preview-content">
            <div className="preview-icon">{getFileIcon(selectedFile.name)}</div>
            <div className="preview-details">
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">{selectedFile.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Größe:</span>
                <span className="value">{formatFileSize(selectedFile.size)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Geändert:</span>
                <span className="value">{formatDate(selectedFile.modified)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Pfad:</span>
                <span className="value path-value">{selectedFile.path}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="upload-modal-overlay" onClick={handleCloseUploadModal}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <h2>💀🔮 Inhalt hinzufügen</h2>
              <button className="close-modal-btn" onClick={handleCloseUploadModal}>×</button>
            </div>

            {!uploadMode ? (
              <div className="upload-options">
                <button
                  className="upload-option"
                  onClick={() => setUploadMode('text')}
                >
                  <span className="option-icon">📝</span>
                  <span className="option-label">Text schreiben</span>
                  <span className="option-desc">Notiz, Aufgabe oder Info eingeben</span>
                </button>

                <button
                  className="upload-option"
                  onClick={() => setUploadMode('file')}
                >
                  <span className="option-icon">📁</span>
                  <span className="option-label">Datei hochladen</span>
                  <span className="option-desc">PDF, Bilder, Dokumente, etc.</span>
                </button>

                <button
                  className="upload-option"
                  onClick={() => setUploadMode('url')}
                >
                  <span className="option-icon">🔗</span>
                  <span className="option-label">URL/Link</span>
                  <span className="option-desc">Google Docs, Sheets, Websites</span>
                </button>

                <button
                  className="upload-option"
                  onClick={() => setUploadMode('voice')}
                >
                  <span className="option-icon">🎤</span>
                  <span className="option-label">Voice Memo</span>
                  <span className="option-desc">Sprachnotiz aufnehmen</span>
                </button>
              </div>
            ) : (
              <div className="upload-content">
                {uploadMode === 'text' && (
                  <div className="text-input-section">
                    <textarea
                      className="text-input"
                      placeholder="Text hier eingeben... Die AI erkennt automatisch ob es eine Aufgabe, ein Kontakt oder eine Notiz ist."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={10}
                    />
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setUploadMode(null)}>
                        Zurück
                      </button>
                      <button
                        className="btn-primary"
                        onClick={handleTextSubmit}
                        disabled={!textContent.trim() || isProcessing}
                      >
                        {isProcessing ? 'Verarbeite...' : 'AI Verarbeiten'}
                      </button>
                    </div>
                  </div>
                )}

                {uploadMode === 'file' && (
                  <div className="file-upload-section">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      className="file-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      <span className="upload-icon">📤</span>
                      <span>Datei auswählen</span>
                    </button>
                    {isProcessing && <div className="processing-spinner">⏳ Upload läuft...</div>}
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setUploadMode(null)}>
                        Zurück
                      </button>
                    </div>
                  </div>
                )}

                {uploadMode === 'url' && (
                  <div className="url-input-section">
                    <input
                      type="url"
                      className="url-input"
                      placeholder="https://docs.google.com/... oder andere URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <p className="url-hint">
                      💡 Unterstützt: Google Docs, Sheets, Slides, Websites, PDFs
                    </p>
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setUploadMode(null)}>
                        Zurück
                      </button>
                      <button
                        className="btn-primary"
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim() || isProcessing}
                      >
                        {isProcessing ? 'Verarbeite...' : 'URL Verarbeiten'}
                      </button>
                    </div>
                  </div>
                )}

                {uploadMode === 'voice' && (
                  <div className="voice-input-section">
                    <div className="voice-visualizer">
                      {isRecording ? (
                        <>
                          <div className="recording-indicator">
                            <span className="recording-dot"></span>
                            <span>Aufnahme läuft...</span>
                          </div>
                          <button className="stop-recording-btn" onClick={stopRecording}>
                            ⏹ Stopp
                          </button>
                        </>
                      ) : (
                        <button className="start-recording-btn" onClick={startRecording}>
                          <span className="mic-icon">🎤</span>
                          <span>Aufnahme starten</span>
                        </button>
                      )}
                    </div>
                    {isProcessing && (
                      <div className="processing-spinner">
                        ⏳ Transkribiere und verarbeite...
                      </div>
                    )}
                    <p className="voice-hint">
                      💡 Sage z.B.: "Termin mit Max am Freitag um 15 Uhr" oder "Neue Aufgabe: Landing Page designen"
                    </p>
                    <div className="modal-actions">
                      <button className="btn-secondary" onClick={() => setUploadMode(null)}>
                        Zurück
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'txt':
    case 'md':
      return '📄';
    case 'pdf':
      return '📕';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '🖼️';
    case 'mp3':
    case 'wav':
      return '🎵';
    case 'mp4':
    case 'avi':
      return '🎬';
    case 'zip':
    case 'rar':
      return '📦';
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
      return '📜';
    case 'json':
      return '⚙️';
    default:
      return '📄';
  }
}
