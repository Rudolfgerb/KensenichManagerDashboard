import { useState, useEffect } from 'react';
import axios from 'axios';
import AIIntegrations from '../AIIntegrations/AIIntegrations';
import AnalyticsDashboard from '../AnalyticsDashboard/AnalyticsDashboard';
import './IntegrationsHub.css';

type TabType = 'integrations' | 'analytics' | 'ollama' | 'lmstudio' | 'automations' | 'social';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  hierarchy: 'master' | 'worker' | 'specialist';
  parentId?: string;
  active: boolean;
  createdAt: string;
}

interface SocialProfile {
  id: string;
  platform: string;
  username: string;
  connected: boolean;
  accessToken?: string;
  followers: number;
  following: number;
  posts: number;
  engagement_rate: number;
  icon: string;
}

const POPULAR_MODELS = [
  { name: 'llama3.2', desc: 'Meta Llama 3.2 - Neuestes Modell', size: '2.0 GB' },
  { name: 'llama3.1', desc: 'Meta Llama 3.1 - Stabil & Schnell', size: '4.7 GB' },
  { name: 'mistral', desc: 'Mistral 7B - Schnell & Effizient', size: '4.1 GB' },
  { name: 'codellama', desc: 'Code Llama - Für Programmierung', size: '3.8 GB' },
  { name: 'phi3', desc: 'Microsoft Phi-3 - Kompakt', size: '2.2 GB' },
  { name: 'gemma2', desc: 'Google Gemma 2 - Multimodal', size: '5.4 GB' },
  { name: 'qwen2.5', desc: 'Alibaba Qwen 2.5 - Multilingual', size: '4.4 GB' },
  { name: 'deepseek-coder', desc: 'DeepSeek Coder - Code Expert', size: '6.7 GB' },
];

export default function IntegrationsHub() {
  const [activeTab, setActiveTab] = useState<TabType>('integrations');

  // Ollama State
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [selectedModel, setSelectedModel] = useState('');
  const [downloadingModel, setDownloadingModel] = useState('');
  const [downloadProgress, setDownloadProgress] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // LM Studio State
  const [lmStudioConnected, setLmStudioConnected] = useState(false);
  const [lmStudioUrl, setLmStudioUrl] = useState('http://localhost:1234');
  const [lmStudioModels, setLmStudioModels] = useState<string[]>([]);

  // Automations State
  const [n8nRunning, setN8nRunning] = useState(false);
  const [n8nUrl, setN8nUrl] = useState('http://localhost:5678');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'llama3.2',
    hierarchy: 'worker' as const,
    parentId: ''
  });

  // Social Profiles State
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([
    { id: '1', platform: 'Instagram', username: '', connected: false, followers: 0, following: 0, posts: 0, engagement_rate: 0, icon: '📸' },
    { id: '2', platform: 'YouTube', username: '', connected: false, followers: 0, following: 0, posts: 0, engagement_rate: 0, icon: '📺' },
    { id: '3', platform: 'TikTok', username: '', connected: false, followers: 0, following: 0, posts: 0, engagement_rate: 0, icon: '🎵' },
    { id: '4', platform: 'Twitter/X', username: '', connected: false, followers: 0, following: 0, posts: 0, engagement_rate: 0, icon: '🐦' },
    { id: '5', platform: 'LinkedIn', username: '', connected: false, followers: 0, following: 0, posts: 0, engagement_rate: 0, icon: '💼' },
    { id: '6', platform: 'Facebook', username: '', connected: false, followers: 0, following: 0, posts: 0, engagement_rate: 0, icon: '👥' },
  ]);

  useEffect(() => {
    if (activeTab === 'ollama') {
      checkOllamaConnection();
    } else if (activeTab === 'lmstudio') {
      checkLmStudioConnection();
    } else if (activeTab === 'automations') {
      checkN8nConnection();
      loadAgents();
    } else if (activeTab === 'social') {
      loadSocialProfiles();
    }
  }, [activeTab]);

  // =============== OLLAMA FUNCTIONS ===============
  const checkOllamaConnection = async () => {
    try {
      const response = await axios.get('/api/ai/test-ollama');
      setOllamaConnected(response.data.success);
      if (response.data.models) {
        setOllamaModels(response.data.models);
        if (response.data.models.length > 0 && !selectedModel) {
          setSelectedModel(response.data.models[0].name);
        }
      }
      setTestResult({ success: true, message: 'Ollama läuft!' });
    } catch (error) {
      setOllamaConnected(false);
      setTestResult({ success: false, message: 'Ollama nicht erreichbar. Starte Ollama mit: ollama serve' });
    }
  };

  const startOllama = async () => {
    try {
      await axios.post('/api/terminal/execute', { command: 'ollama serve' });
      setTestResult({ success: true, message: 'Ollama wird gestartet...' });
      setTimeout(checkOllamaConnection, 3000);
    } catch (error) {
      setTestResult({ success: false, message: 'Fehler beim Starten von Ollama' });
    }
  };

  const downloadModel = async (modelName: string) => {
    setDownloadingModel(modelName);
    setDownloadProgress('Download wird gestartet...');
    try {
      await axios.post('/api/terminal/execute', {
        command: `ollama pull ${modelName}`,
        timeout: 600000 // 10 min timeout
      });
      setDownloadProgress('Download abgeschlossen!');
      setTimeout(() => {
        setDownloadingModel('');
        setDownloadProgress('');
        checkOllamaConnection();
      }, 2000);
    } catch (error) {
      setDownloadProgress('Download fehlgeschlagen');
      setTimeout(() => {
        setDownloadingModel('');
        setDownloadProgress('');
      }, 3000);
    }
  };

  const setActiveModel = async (modelName: string) => {
    setSelectedModel(modelName);
    try {
      await axios.post('/api/integrations/connect', {
        integrationId: 'ollama-model',
        name: 'Ollama',
        apiKey: modelName,
        config: { model: modelName, url: ollamaUrl }
      });
      setTestResult({ success: true, message: `Modell ${modelName} aktiviert!` });
    } catch (error) {
      console.error('Error setting model:', error);
    }
  };

  const deleteModel = async (modelName: string) => {
    if (!confirm(`Modell "${modelName}" wirklich löschen?`)) return;
    try {
      await axios.post('/api/terminal/execute', { command: `ollama rm ${modelName}` });
      checkOllamaConnection();
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  // =============== LM STUDIO FUNCTIONS ===============
  const checkLmStudioConnection = async () => {
    try {
      const response = await axios.get(`${lmStudioUrl}/v1/models`, { timeout: 5000 });
      setLmStudioConnected(true);
      if (response.data.data) {
        setLmStudioModels(response.data.data.map((m: any) => m.id));
      }
    } catch (error) {
      setLmStudioConnected(false);
    }
  };

  const openLmStudio = () => {
    // Open LM Studio app (platform dependent)
    window.open('lmstudio://', '_blank');
    setTestResult({ success: true, message: 'LM Studio wird geöffnet...' });
    setTimeout(checkLmStudioConnection, 5000);
  };

  // =============== N8N / AUTOMATIONS FUNCTIONS ===============
  const checkN8nConnection = async () => {
    try {
      await axios.get(`${n8nUrl}/healthz`, { timeout: 5000 });
      setN8nRunning(true);
    } catch (error) {
      setN8nRunning(false);
    }
  };

  const startN8n = async () => {
    try {
      await axios.post('/api/terminal/execute', {
        command: 'npx n8n start',
        timeout: 30000
      });
      setTestResult({ success: true, message: 'n8n wird gestartet...' });
      setTimeout(checkN8nConnection, 5000);
    } catch (error) {
      setTestResult({ success: false, message: 'n8n konnte nicht gestartet werden. Installiere mit: npm install -g n8n' });
    }
  };

  const loadAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      if (Array.isArray(response.data)) {
        setAgents(response.data);
      }
    } catch (error) {
      // Initialize with default agents if none exist
      setAgents([
        {
          id: 'master-1',
          name: 'Orchestrator',
          description: 'Hauptagent der alle anderen koordiniert',
          systemPrompt: 'Du bist der Master-Orchestrator. Du delegierst Aufgaben an spezialisierte Agenten.',
          model: 'llama3.2',
          hierarchy: 'master',
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'worker-1',
          name: 'Content Writer',
          description: 'Schreibt Content für Social Media',
          systemPrompt: 'Du bist ein Content-Spezialist. Erstelle engaging Content für verschiedene Plattformen.',
          model: 'mistral',
          hierarchy: 'worker',
          parentId: 'master-1',
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'worker-2',
          name: 'Code Assistant',
          description: 'Hilft bei Programmieraufgaben',
          systemPrompt: 'Du bist ein Programmier-Experte. Schreibe sauberen, effizienten Code.',
          model: 'codellama',
          hierarchy: 'specialist',
          parentId: 'master-1',
          active: true,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const saveAgent = async () => {
    const newAgent: Agent = {
      id: editingAgent?.id || `agent-${Date.now()}`,
      ...agentForm,
      active: true,
      createdAt: editingAgent?.createdAt || new Date().toISOString()
    };

    try {
      await axios.post('/api/agents', newAgent);
      if (editingAgent) {
        setAgents(prev => prev.map(a => a.id === editingAgent.id ? newAgent : a));
      } else {
        setAgents(prev => [...prev, newAgent]);
      }
      resetAgentForm();
    } catch (error) {
      // Local fallback
      if (editingAgent) {
        setAgents(prev => prev.map(a => a.id === editingAgent.id ? newAgent : a));
      } else {
        setAgents(prev => [...prev, newAgent]);
      }
      resetAgentForm();
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Agent wirklich löschen?')) return;
    try {
      await axios.delete(`/api/agents/${id}`);
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      setAgents(prev => prev.filter(a => a.id !== id));
    }
  };

  const resetAgentForm = () => {
    setShowAgentForm(false);
    setEditingAgent(null);
    setAgentForm({
      name: '',
      description: '',
      systemPrompt: '',
      model: 'llama3.2',
      hierarchy: 'worker',
      parentId: ''
    });
  };

  // =============== SOCIAL PROFILES FUNCTIONS ===============
  const loadSocialProfiles = async () => {
    try {
      const response = await axios.get('/api/social/profiles');
      if (Array.isArray(response.data)) {
        setSocialProfiles(response.data);
      }
    } catch (error) {
      // Use default state
    }
  };

  const connectSocialProfile = async (profile: SocialProfile) => {
    // Open OAuth flow or show connection modal
    alert(`Verbinde ${profile.platform}...\n\nOAuth-Integration kommt bald!\nFür jetzt: Gehe zu den ${profile.platform} API-Einstellungen.`);
  };

  const disconnectSocialProfile = async (profileId: string) => {
    setSocialProfiles(prev => prev.map(p =>
      p.id === profileId ? { ...p, connected: false, accessToken: undefined } : p
    ));
  };

  // =============== RENDER FUNCTIONS ===============
  const renderOllamaPanel = () => (
    <div className="ollama-panel">
      <div className="ollama-header">
        <h2>🦙 Ollama - Lokale LLMs</h2>
        <p>Verwalte deine lokalen KI-Modelle</p>
      </div>

      <div className="connection-status-grid">
        <div className={`connection-card ${ollamaConnected ? 'connected' : 'disconnected'}`}>
          <div className="connection-icon">🦙</div>
          <div className="connection-info">
            <h3>Ollama Server</h3>
            <span className="connection-badge">
              {ollamaConnected ? '✓ Verbunden' : '✗ Offline'}
            </span>
            {ollamaConnected && (
              <span className="model-count">{ollamaModels.length} Modelle installiert</span>
            )}
          </div>
        </div>

        <div className="connection-card">
          <div className="connection-icon">⚙️</div>
          <div className="connection-info">
            <h3>Konfiguration</h3>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="Ollama URL"
              className="config-input"
            />
          </div>
        </div>
      </div>

      <div className="action-buttons">
        {!ollamaConnected ? (
          <button className="btn-start" onClick={startOllama}>
            🚀 Ollama Starten
          </button>
        ) : (
          <button className="btn-refresh" onClick={checkOllamaConnection}>
            🔄 Status Prüfen
          </button>
        )}
        <button className="btn-test" onClick={checkOllamaConnection}>
          🧪 Verbindung Testen
        </button>
      </div>

      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          {testResult.message}
        </div>
      )}

      {/* Installed Models */}
      {ollamaModels.length > 0 && (
        <div className="installed-models-section">
          <h3>📦 Installierte Modelle</h3>
          <div className="installed-models-list">
            {ollamaModels.map(model => (
              <div key={model.name} className={`installed-model-item ${selectedModel === model.name ? 'active' : ''}`}>
                <span className="model-name">{model.name}</span>
                <span className="model-size">{(model.size / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                <button
                  className="btn-use"
                  onClick={() => setActiveModel(model.name)}
                >
                  {selectedModel === model.name ? '✓ Aktiv' : 'Aktivieren'}
                </button>
                <button
                  className="btn-delete-small"
                  onClick={() => deleteModel(model.name)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download Models */}
      <div className="model-download-section">
        <h3>⬇️ Modelle Herunterladen</h3>
        {downloadingModel && (
          <div className="download-progress">
            <div className="progress-info">
              <span>Downloading {downloadingModel}...</span>
              <span>{downloadProgress}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill animate" />
            </div>
          </div>
        )}
        <div className="models-grid">
          {POPULAR_MODELS.map(model => {
            const installed = ollamaModels.some(m => m.name.startsWith(model.name));
            return (
              <div
                key={model.name}
                className={`model-card ${installed ? 'installed' : ''}`}
                onClick={() => !installed && !downloadingModel && downloadModel(model.name)}
              >
                {installed && <span className="installed-badge">✓</span>}
                <div className="model-name">{model.name}</div>
                <div className="model-desc">{model.desc}</div>
                <div className="model-size">{model.size}</div>
                {!installed && !downloadingModel && (
                  <button className="btn-download">⬇️ Download</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Commands */}
      <div className="quick-commands">
        <h3>⌨️ Terminal Commands</h3>
        <div className="command-list">
          <div className="command-item">
            <code>ollama serve</code>
            <span>Server starten</span>
          </div>
          <div className="command-item">
            <code>ollama list</code>
            <span>Modelle anzeigen</span>
          </div>
          <div className="command-item">
            <code>ollama pull llama3.2</code>
            <span>Modell herunterladen</span>
          </div>
          <div className="command-item">
            <code>ollama run llama3.2</code>
            <span>Chat starten</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLmStudioPanel = () => (
    <div className="lmstudio-panel">
      <div className="lmstudio-header">
        <h2>🖥️ LM Studio</h2>
        <p>Desktop App für lokale LLMs mit GUI</p>
      </div>

      <div className="connection-status-grid">
        <div className={`connection-card ${lmStudioConnected ? 'connected' : 'disconnected'}`}>
          <div className="connection-icon">🖥️</div>
          <div className="connection-info">
            <h3>LM Studio API</h3>
            <span className="connection-badge">
              {lmStudioConnected ? '✓ Verbunden' : '✗ Offline'}
            </span>
            {lmStudioConnected && lmStudioModels.length > 0 && (
              <span className="model-count">{lmStudioModels.length} Modelle geladen</span>
            )}
          </div>
        </div>

        <div className="connection-card">
          <div className="connection-icon">⚙️</div>
          <div className="connection-info">
            <h3>API Endpoint</h3>
            <input
              type="text"
              value={lmStudioUrl}
              onChange={(e) => setLmStudioUrl(e.target.value)}
              placeholder="LM Studio URL"
              className="config-input"
            />
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="btn-start" onClick={openLmStudio}>
          🚀 LM Studio Öffnen
        </button>
        <button className="btn-test" onClick={checkLmStudioConnection}>
          🧪 Verbindung Testen
        </button>
      </div>

      {lmStudioConnected && lmStudioModels.length > 0 && (
        <div className="installed-models-section">
          <h3>📦 Geladene Modelle</h3>
          <div className="installed-models-list">
            {lmStudioModels.map(model => (
              <div key={model} className="installed-model-item">
                <span className="model-name">{model}</span>
                <button className="btn-use">Verwenden</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="lmstudio-info">
        <h3>📋 LM Studio Setup</h3>
        <div className="setup-steps">
          <div className="step">
            <span className="step-num">1</span>
            <span>Download LM Studio von <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer">lmstudio.ai</a></span>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <span>Öffne LM Studio und lade ein Modell herunter</span>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <span>Aktiviere "Local Server" in LM Studio (Port 1234)</span>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <span>Verbinde hier und nutze das Modell im KensenichManager</span>
          </div>
        </div>
      </div>

      <div className="feature-cards">
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h4>Grafische Oberfläche</h4>
          <p>Einfache Modellverwaltung mit GUI</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📁</div>
          <h4>GGUF Support</h4>
          <p>Unterstützt alle GGUF Modelle</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h4>OpenAI-kompatibel</h4>
          <p>API kompatibel mit OpenAI Format</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h4>100% Lokal</h4>
          <p>Alle Daten bleiben auf deinem PC</p>
        </div>
      </div>
    </div>
  );

  const renderAutomationsPanel = () => (
    <div className="automations-panel">
      <div className="automations-header">
        <h2>🔗 Automations & Agents</h2>
        <p>n8n Workflows und AI-Agent Hierarchie</p>
      </div>

      {/* n8n Section */}
      <div className="n8n-section">
        <div className="section-header">
          <h3>⚡ n8n Workflow Automation</h3>
          <div className="n8n-status">
            <span className={`status-dot ${n8nRunning ? 'running' : 'stopped'}`} />
            {n8nRunning ? 'Läuft' : 'Gestoppt'}
          </div>
        </div>

        <div className="n8n-controls">
          {!n8nRunning ? (
            <button className="btn-start" onClick={startN8n}>
              🚀 n8n Starten
            </button>
          ) : (
            <button className="btn-open" onClick={() => window.open(n8nUrl, '_blank')}>
              🔗 n8n Öffnen
            </button>
          )}
          <input
            type="text"
            value={n8nUrl}
            onChange={(e) => setN8nUrl(e.target.value)}
            placeholder="n8n URL"
            className="config-input"
          />
        </div>

        {n8nRunning && (
          <div className="n8n-iframe-container">
            <iframe
              src={n8nUrl}
              title="n8n Workflow Editor"
              className="n8n-iframe"
            />
          </div>
        )}
      </div>

      {/* Agents Section */}
      <div className="agents-section">
        <div className="section-header">
          <h3>🤖 AI Agents Hierarchie</h3>
          <button className="btn-add" onClick={() => setShowAgentForm(true)}>
            ➕ Neuer Agent
          </button>
        </div>

        <div className="agents-hierarchy">
          {/* Master Agents */}
          <div className="hierarchy-level master-level">
            <h4>👑 Master Agents</h4>
            <div className="agents-grid">
              {agents.filter(a => a.hierarchy === 'master').map(agent => (
                <div key={agent.id} className="agent-card master">
                  <div className="agent-header">
                    <span className="agent-icon">👑</span>
                    <h5>{agent.name}</h5>
                    <span className={`agent-status ${agent.active ? 'active' : 'inactive'}`}>
                      {agent.active ? '●' : '○'}
                    </span>
                  </div>
                  <p className="agent-desc">{agent.description}</p>
                  <div className="agent-meta">
                    <span className="agent-model">🧠 {agent.model}</span>
                  </div>
                  <div className="agent-actions">
                    <button onClick={() => { setEditingAgent(agent); setAgentForm(agent); setShowAgentForm(true); }}>✏️</button>
                    <button onClick={() => deleteAgent(agent.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worker Agents */}
          <div className="hierarchy-level worker-level">
            <h4>⚙️ Worker Agents</h4>
            <div className="agents-grid">
              {agents.filter(a => a.hierarchy === 'worker').map(agent => (
                <div key={agent.id} className="agent-card worker">
                  <div className="agent-header">
                    <span className="agent-icon">⚙️</span>
                    <h5>{agent.name}</h5>
                    <span className={`agent-status ${agent.active ? 'active' : 'inactive'}`}>
                      {agent.active ? '●' : '○'}
                    </span>
                  </div>
                  <p className="agent-desc">{agent.description}</p>
                  <div className="agent-meta">
                    <span className="agent-model">🧠 {agent.model}</span>
                    {agent.parentId && (
                      <span className="agent-parent">↑ {agents.find(a => a.id === agent.parentId)?.name}</span>
                    )}
                  </div>
                  <div className="agent-actions">
                    <button onClick={() => { setEditingAgent(agent); setAgentForm(agent); setShowAgentForm(true); }}>✏️</button>
                    <button onClick={() => deleteAgent(agent.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specialist Agents */}
          <div className="hierarchy-level specialist-level">
            <h4>🎯 Specialist Agents</h4>
            <div className="agents-grid">
              {agents.filter(a => a.hierarchy === 'specialist').map(agent => (
                <div key={agent.id} className="agent-card specialist">
                  <div className="agent-header">
                    <span className="agent-icon">🎯</span>
                    <h5>{agent.name}</h5>
                    <span className={`agent-status ${agent.active ? 'active' : 'inactive'}`}>
                      {agent.active ? '●' : '○'}
                    </span>
                  </div>
                  <p className="agent-desc">{agent.description}</p>
                  <div className="agent-meta">
                    <span className="agent-model">🧠 {agent.model}</span>
                    {agent.parentId && (
                      <span className="agent-parent">↑ {agents.find(a => a.id === agent.parentId)?.name}</span>
                    )}
                  </div>
                  <div className="agent-actions">
                    <button onClick={() => { setEditingAgent(agent); setAgentForm(agent); setShowAgentForm(true); }}>✏️</button>
                    <button onClick={() => deleteAgent(agent.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Form Modal */}
      {showAgentForm && (
        <div className="modal-overlay" onClick={() => resetAgentForm()}>
          <div className="agent-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAgent ? '✏️ Agent Bearbeiten' : '➕ Neuer Agent'}</h3>
              <button className="close-btn" onClick={() => resetAgentForm()}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-field">
                <label>Name</label>
                <input
                  type="text"
                  value={agentForm.name}
                  onChange={e => setAgentForm({ ...agentForm, name: e.target.value })}
                  placeholder="Agent Name"
                />
              </div>
              <div className="form-field">
                <label>Beschreibung</label>
                <input
                  type="text"
                  value={agentForm.description}
                  onChange={e => setAgentForm({ ...agentForm, description: e.target.value })}
                  placeholder="Was macht dieser Agent?"
                />
              </div>
              <div className="form-field">
                <label>System Prompt</label>
                <textarea
                  value={agentForm.systemPrompt}
                  onChange={e => setAgentForm({ ...agentForm, systemPrompt: e.target.value })}
                  placeholder="Instruktionen für den Agent..."
                  rows={4}
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Modell</label>
                  <select
                    value={agentForm.model}
                    onChange={e => setAgentForm({ ...agentForm, model: e.target.value })}
                  >
                    {POPULAR_MODELS.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Hierarchie</label>
                  <select
                    value={agentForm.hierarchy}
                    onChange={e => setAgentForm({ ...agentForm, hierarchy: e.target.value as any })}
                  >
                    <option value="master">👑 Master</option>
                    <option value="worker">⚙️ Worker</option>
                    <option value="specialist">🎯 Specialist</option>
                  </select>
                </div>
              </div>
              {agentForm.hierarchy !== 'master' && (
                <div className="form-field">
                  <label>Parent Agent</label>
                  <select
                    value={agentForm.parentId}
                    onChange={e => setAgentForm({ ...agentForm, parentId: e.target.value })}
                  >
                    <option value="">Kein Parent</option>
                    {agents.filter(a => a.hierarchy === 'master' || (agentForm.hierarchy === 'specialist' && a.hierarchy === 'worker')).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => resetAgentForm()}>Abbrechen</button>
              <button className="btn-save" onClick={saveAgent}>
                {editingAgent ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSocialProfilesPanel = () => (
    <div className="social-profiles-panel">
      <div className="social-header">
        <h2>📱 Social Media Profile</h2>
        <p>Verbinde deine Accounts für Live-Metriken</p>
      </div>

      <div className="social-profiles-grid">
        {socialProfiles.map(profile => (
          <div key={profile.id} className={`social-profile-card ${profile.connected ? 'connected' : ''}`}>
            <div className="profile-header">
              <span className="profile-icon">{profile.icon}</span>
              <h3>{profile.platform}</h3>
              <span className={`connection-status ${profile.connected ? 'connected' : ''}`}>
                {profile.connected ? '✓' : '○'}
              </span>
            </div>

            {profile.connected ? (
              <>
                <div className="profile-username">@{profile.username}</div>
                <div className="profile-stats">
                  <div className="stat">
                    <span className="stat-value">{profile.followers.toLocaleString()}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{profile.posts}</span>
                    <span className="stat-label">Posts</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{profile.engagement_rate}%</span>
                    <span className="stat-label">Engagement</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="btn-refresh" onClick={() => loadSocialProfiles()}>
                    🔄 Aktualisieren
                  </button>
                  <button className="btn-disconnect" onClick={() => disconnectSocialProfile(profile.id)}>
                    🔌 Trennen
                  </button>
                </div>
              </>
            ) : (
              <div className="profile-connect">
                <p>Nicht verbunden</p>
                <button className="btn-connect" onClick={() => connectSocialProfile(profile)}>
                  🔗 Verbinden
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="analytics-preview">
        <h3>📊 Analytics Übersicht</h3>
        <div className="analytics-note">
          <p>Verbinde deine Social Media Accounts um Live-Metriken im Analytics Dashboard zu sehen.</p>
          <button
            className="btn-go-analytics"
            onClick={() => setActiveTab('analytics')}
          >
            📊 Zum Analytics Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="integrations-hub">
      <div className="hub-tabs">
        <button
          className={`hub-tab ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          ⚡ Integrations
        </button>
        <button
          className={`hub-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
        <button
          className={`hub-tab ollama-tab ${activeTab === 'ollama' ? 'active' : ''}`}
          onClick={() => setActiveTab('ollama')}
        >
          🦙 Ollama
        </button>
        <button
          className={`hub-tab ${activeTab === 'lmstudio' ? 'active' : ''}`}
          onClick={() => setActiveTab('lmstudio')}
        >
          🖥️ LM Studio
        </button>
        <button
          className={`hub-tab ${activeTab === 'automations' ? 'active' : ''}`}
          onClick={() => setActiveTab('automations')}
        >
          🔗 Automations
        </button>
        <button
          className={`hub-tab ${activeTab === 'social' ? 'active' : ''}`}
          onClick={() => setActiveTab('social')}
        >
          📱 Social
        </button>
      </div>

      <div className="hub-content">
        {activeTab === 'integrations' && <AIIntegrations />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'ollama' && renderOllamaPanel()}
        {activeTab === 'lmstudio' && renderLmStudioPanel()}
        {activeTab === 'automations' && renderAutomationsPanel()}
        {activeTab === 'social' && renderSocialProfilesPanel()}
      </div>
    </div>
  );
}
