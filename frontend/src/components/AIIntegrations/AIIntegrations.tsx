import { useState, useEffect } from 'react';
import axios from 'axios';
import './AIIntegrations.css';

interface Integration {
  id: string;
  name: string;
  category: 'local-ai' | 'automation' | 'ai' | 'communication' | 'productivity' | 'social' | 'crm' | 'calendar' | 'storage';
  icon: string;
  description: string;
  connected: boolean;
  apiKey?: string;
  config?: any;
  features: string[];
}

// // Priority integrations that should NOT be in "Weitere"
// const PRIORITY_INTEGRATIONS = [
//   'Ollama', 'LM Studio', 'n8n', 'Docker',
//   'OpenAI GPT-4', 'Anthropic Claude', 'Google Gemini', 'Midjourney', 'ElevenLabs',
//   'Gmail', 'Google Calendar', 'Google Docs', 'Google Sheets', 'Google Drive',
//   'Telegram', 'WhatsApp Business', 'Slack', 'Discord',
//   'Facebook', 'Instagram', 'TikTok', 'Twitter/X', 'LinkedIn',
//   'HubSpot', 'Notion', 'Zapier', 'Make (Integromat)'
// ];

// Integrations to move to "Weitere" collapsible section
const WEITERE_INTEGRATIONS = ['Asana', 'Pipedrive', 'Salesforce', 'Trello'];

const AVAILABLE_INTEGRATIONS: Omit<Integration, 'id' | 'connected' | 'apiKey' | 'config'>[] = [
  // 🔥 LOCAL AI - Priority (Ollama & LM Studio)
  {
    name: 'Ollama',
    category: 'local-ai',
    icon: '🦙',
    description: 'Lokale LLMs - Llama 3, Mistral, CodeLlama, Phi & mehr',
    features: ['100% Lokal', 'Privatsphäre', 'Kostenlos', 'Offline-fähig']
  },
  {
    name: 'LM Studio',
    category: 'local-ai',
    icon: '🖥️',
    description: 'Desktop App für lokale LLMs mit GUI',
    features: ['GGUF Models', 'Chat UI', 'API Server', 'Model Library']
  },

  // 🔧 AUTOMATION & DEVOPS
  {
    name: 'n8n',
    category: 'automation',
    icon: '🔗',
    description: 'Self-hosted Workflow Automation Platform',
    features: ['Visual Builder', 'Webhooks', '400+ Nodes', 'Self-hosted']
  },
  {
    name: 'Docker',
    category: 'automation',
    icon: '🐳',
    description: 'Container Management & Deployment',
    features: ['Containers', 'Images', 'Compose', 'Volumes']
  },

  // AI & LLM Models (Cloud)
  {
    name: 'OpenAI GPT-4',
    category: 'ai',
    icon: '🤖',
    description: 'GPT-4, GPT-3.5 Turbo für fortgeschrittene AI Tasks',
    features: ['Chat', 'Text Generation', 'Code', 'Embeddings']
  },
  {
    name: 'Anthropic Claude',
    category: 'ai',
    icon: '🧠',
    description: 'Claude 3 Opus/Sonnet für komplexe Reasoning',
    features: ['Long Context', 'Analysis', 'Code Review']
  },
  {
    name: 'Google Gemini',
    category: 'ai',
    icon: '✨',
    description: 'Gemini Pro für Multimodal AI',
    features: ['Text', 'Vision', 'Audio', 'Multimodal']
  },
  {
    name: 'Midjourney',
    category: 'ai',
    icon: '🎨',
    description: 'AI Image Generation',
    features: ['Image Gen', 'Style Transfer', 'Upscaling']
  },
  {
    name: 'ElevenLabs',
    category: 'ai',
    icon: '🗣️',
    description: 'Voice Synthesis & Cloning',
    features: ['Text-to-Speech', 'Voice Cloning', 'Multilingual']
  },

  // Google Suite
  {
    name: 'Gmail',
    category: 'communication',
    icon: '📧',
    description: 'Email Management & Automation',
    features: ['Send/Receive', 'Auto-Reply', 'Templates', 'Filters']
  },
  {
    name: 'Google Calendar',
    category: 'calendar',
    icon: '📅',
    description: 'Calendar & Meeting Management',
    features: ['Events', 'Reminders', 'Scheduling', 'Sync']
  },
  {
    name: 'Google Docs',
    category: 'productivity',
    icon: '📄',
    description: 'Document Creation & Collaboration',
    features: ['Read', 'Write', 'Comment', 'Share']
  },
  {
    name: 'Google Sheets',
    category: 'productivity',
    icon: '📊',
    description: 'Spreadsheet Automation',
    features: ['Read', 'Write', 'Formulas', 'Charts']
  },
  {
    name: 'Google Drive',
    category: 'storage',
    icon: '💾',
    description: 'Cloud Storage & File Management',
    features: ['Upload', 'Download', 'Sync', 'Share']
  },

  // Communication
  {
    name: 'Telegram',
    category: 'communication',
    icon: '✈️',
    description: 'Telegram Bot Integration',
    features: ['Send Messages', 'Bot Commands', 'Channels', 'Groups']
  },
  {
    name: 'WhatsApp Business',
    category: 'communication',
    icon: '💬',
    description: 'WhatsApp Business API',
    features: ['Messages', 'Templates', 'Media', 'Status']
  },
  {
    name: 'Slack',
    category: 'communication',
    icon: '💼',
    description: 'Team Communication',
    features: ['Messages', 'Channels', 'Webhooks', 'Bots']
  },
  {
    name: 'Discord',
    category: 'communication',
    icon: '🎮',
    description: 'Discord Bot & Webhooks',
    features: ['Messages', 'Embeds', 'Commands', 'Voice']
  },

  // Social Media
  {
    name: 'Facebook',
    category: 'social',
    icon: '👥',
    description: 'Facebook Pages & Ads Management',
    features: ['Post', 'Ads', 'Analytics', 'Messenger']
  },
  {
    name: 'Instagram',
    category: 'social',
    icon: '📷',
    description: 'Instagram Business Tools',
    features: ['Post', 'Stories', 'IGTV', 'Analytics']
  },
  {
    name: 'TikTok',
    category: 'social',
    icon: '🎵',
    description: 'TikTok Content & Analytics',
    features: ['Upload', 'Analytics', 'Trends', 'Hashtags']
  },
  {
    name: 'Twitter/X',
    category: 'social',
    icon: '🐦',
    description: 'Twitter API Integration',
    features: ['Tweet', 'Timeline', 'Analytics', 'DMs']
  },
  {
    name: 'LinkedIn',
    category: 'social',
    icon: '💼',
    description: 'LinkedIn Professional Network',
    features: ['Post', 'Jobs', 'Connections', 'Analytics']
  },

  // CRM & Sales
  {
    name: 'HubSpot',
    category: 'crm',
    icon: '🎯',
    description: 'CRM & Marketing Automation',
    features: ['Contacts', 'Deals', 'Email', 'Analytics']
  },
  {
    name: 'Salesforce',
    category: 'crm',
    icon: '☁️',
    description: 'Enterprise CRM Platform',
    features: ['Leads', 'Opportunities', 'Reports', 'API']
  },
  {
    name: 'Pipedrive',
    category: 'crm',
    icon: '📊',
    description: 'Sales Pipeline Management',
    features: ['Deals', 'Activities', 'Goals', 'Reports']
  },

  // Productivity
  {
    name: 'Notion',
    category: 'productivity',
    icon: '📝',
    description: 'All-in-one Workspace',
    features: ['Pages', 'Databases', 'API', 'Sync']
  },
  {
    name: 'Trello',
    category: 'productivity',
    icon: '📋',
    description: 'Visual Project Management',
    features: ['Boards', 'Cards', 'Lists', 'Automation']
  },
  {
    name: 'Asana',
    category: 'productivity',
    icon: '✅',
    description: 'Work Management Platform',
    features: ['Tasks', 'Projects', 'Timeline', 'Reports']
  },
  {
    name: 'Zapier',
    category: 'productivity',
    icon: '⚡',
    description: 'Workflow Automation',
    features: ['Zaps', 'Triggers', 'Actions', '5000+ Apps']
  },
  {
    name: 'Make (Integromat)',
    category: 'productivity',
    icon: '🔄',
    description: 'Advanced Automation Platform',
    features: ['Scenarios', 'Webhooks', 'API', 'Visual Builder']
  }
];

export default function AIIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWeitere, setShowWeitere] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await axios.get('/api/integrations');
      const data = response.data;

      // Ensure data is an array
      if (Array.isArray(data) && data.length > 0) {
        setIntegrations(data);
      } else {
        // Initialize with default integrations
        setIntegrations(
          AVAILABLE_INTEGRATIONS.map((integ, idx) => ({
            ...integ,
            id: `integration-${idx}`,
            connected: false
          }))
        );
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      // Initialize with default integrations
      setIntegrations(
        AVAILABLE_INTEGRATIONS.map((integ, idx) => ({
          ...integ,
          id: `integration-${idx}`,
          connected: false
        }))
      );
    }
  };

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setApiKeyInput(integration.apiKey || '');
    setShowConfigModal(true);
  };

  const handleSaveConnection = async () => {
    if (!selectedIntegration) return;
    setIsConnecting(true);

    try {
      await axios.post('/api/integrations/connect', {
        integrationId: selectedIntegration.id,
        name: selectedIntegration.name,
        apiKey: apiKeyInput,
        config: {}
      });

      // Update local state
      setIntegrations(prev =>
        prev.map(int =>
          int.id === selectedIntegration.id
            ? { ...int, connected: true, apiKey: apiKeyInput }
            : int
        )
      );

      alert(`✅ ${selectedIntegration.name} erfolgreich verbunden!`);
      setShowConfigModal(false);
    } catch (error) {
      console.error('Connection error:', error);
      alert('❌ Verbindung fehlgeschlagen');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!confirm(`${integration.name} trennen?`)) return;

    try {
      await axios.post('/api/integrations/disconnect', {
        integrationId: integration.id
      });

      setIntegrations(prev =>
        prev.map(int =>
          int.id === integration.id
            ? { ...int, connected: false, apiKey: undefined }
            : int
        )
      );

      alert(`🔌 ${integration.name} getrennt`);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Split integrations into main and "weitere"
  const allFiltered = Array.isArray(integrations)
    ? integrations.filter(int => {
        const matchesCategory = selectedCategory === 'all' || int.category === selectedCategory;
        const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             int.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : [];

  const filteredIntegrations = allFiltered.filter(int => !WEITERE_INTEGRATIONS.includes(int.name));
  const weitereIntegrations = allFiltered.filter(int => WEITERE_INTEGRATIONS.includes(int.name));

  const categories = [
    { id: 'all', label: 'Alle', icon: '🌐' },
    { id: 'local-ai', label: 'Lokal AI', icon: '🦙' },
    { id: 'automation', label: 'Automation', icon: '🔗' },
    { id: 'ai', label: 'Cloud AI', icon: '🤖' },
    { id: 'communication', label: 'Kommunikation', icon: '💬' },
    { id: 'social', label: 'Social Media', icon: '📱' },
    { id: 'crm', label: 'CRM & Sales', icon: '💼' },
    { id: 'productivity', label: 'Produktivität', icon: '⚡' },
    { id: 'calendar', label: 'Kalender', icon: '📅' },
    { id: 'storage', label: 'Storage', icon: '💾' }
  ];

  const connectedCount = Array.isArray(integrations)
    ? integrations.filter(i => i.connected).length
    : 0;

  return (
    <div className="ai-integrations">
      <div className="integrations-header">
        <div className="header-top">
          <div>
            <h1>💀🔮 AI & Integrations</h1>
            <p className="header-subtitle">
              Verbinde externe Tools, AI-Modelle und Services
            </p>
          </div>
          <div className="connection-stats">
            <div className="stat-card">
              <span className="stat-value">{connectedCount}</span>
              <span className="stat-label">Verbunden</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{integrations.length}</span>
              <span className="stat-label">Verfügbar</span>
            </div>
          </div>
        </div>

        <div className="header-controls">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Suche Integration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="integrations-grid">
        {filteredIntegrations.map(integration => (
          <div
            key={integration.id}
            className={`integration-card ${integration.connected ? 'connected' : ''}`}
          >
            <div className="integration-header">
              <div className="integration-icon">{integration.icon}</div>
              <div className="integration-info">
                <h3>{integration.name}</h3>
                <span className="integration-category">{integration.category}</span>
              </div>
              {integration.connected && (
                <span className="connected-badge">✓ Verbunden</span>
              )}
            </div>

            <p className="integration-description">{integration.description}</p>

            <div className="integration-features">
              {integration.features.slice(0, 4).map((feature, idx) => (
                <span key={idx} className="feature-tag">{feature}</span>
              ))}
            </div>

            <div className="integration-actions">
              {integration.connected ? (
                <>
                  <button
                    className="btn-test"
                    onClick={() => alert('Test-Funktion in Entwicklung')}
                  >
                    🧪 Testen
                  </button>
                  <button
                    className="btn-disconnect"
                    onClick={() => handleDisconnect(integration)}
                  >
                    🔌 Trennen
                  </button>
                </>
              ) : (
                <button
                  className="btn-connect"
                  onClick={() => handleConnect(integration)}
                >
                  ⚡ Verbinden
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && weitereIntegrations.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>Keine Integrationen gefunden</p>
        </div>
      )}

      {/* Weitere Integrationen - Collapsible */}
      {weitereIntegrations.length > 0 && (
        <div className="weitere-section">
          <button
            className={`weitere-toggle ${showWeitere ? 'open' : ''}`}
            onClick={() => setShowWeitere(!showWeitere)}
          >
            <span className="weitere-icon">📦</span>
            <span className="weitere-title">Weitere Integrationen</span>
            <span className="weitere-count">{weitereIntegrations.length}</span>
            <span className="weitere-arrow">{showWeitere ? '▲' : '▼'}</span>
          </button>

          {showWeitere && (
            <div className="weitere-grid">
              {weitereIntegrations.map(integration => (
                <div
                  key={integration.id}
                  className={`integration-card weitere-card ${integration.connected ? 'connected' : ''}`}
                >
                  <div className="integration-header">
                    <div className="integration-icon">{integration.icon}</div>
                    <div className="integration-info">
                      <h3>{integration.name}</h3>
                      <span className="integration-category">{integration.category}</span>
                    </div>
                    {integration.connected && (
                      <span className="connected-badge">✓ Verbunden</span>
                    )}
                  </div>

                  <p className="integration-description">{integration.description}</p>

                  <div className="integration-features">
                    {integration.features.slice(0, 4).map((feature, idx) => (
                      <span key={idx} className="feature-tag">{feature}</span>
                    ))}
                  </div>

                  <div className="integration-actions">
                    {integration.connected ? (
                      <>
                        <button
                          className="btn-test"
                          onClick={() => alert('Test-Funktion in Entwicklung')}
                        >
                          🧪 Testen
                        </button>
                        <button
                          className="btn-disconnect"
                          onClick={() => handleDisconnect(integration)}
                        >
                          🔌 Trennen
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-connect"
                        onClick={() => handleConnect(integration)}
                      >
                        ⚡ Verbinden
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && selectedIntegration && (
        <div className="config-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="config-header">
              <h2>
                {selectedIntegration.icon} {selectedIntegration.name} verbinden
              </h2>
              <button className="close-btn" onClick={() => setShowConfigModal(false)}>×</button>
            </div>

            <div className="config-content">
              <div className="config-section">
                <label>API Key / Token</label>
                <input
                  type="password"
                  className="api-key-input"
                  placeholder="Gib deinen API Key ein..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <p className="input-hint">
                  💡 Finde deinen API Key im Dashboard von {selectedIntegration.name}
                </p>
              </div>

              <div className="config-section">
                <label>Features</label>
                <div className="features-list">
                  {selectedIntegration.features.map((feature, idx) => (
                    <div key={idx} className="feature-item">
                      <span className="feature-check">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="config-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowConfigModal(false)}
              >
                Abbrechen
              </button>
              <button
                className="btn-save"
                onClick={handleSaveConnection}
                disabled={!apiKeyInput.trim() || isConnecting}
              >
                {isConnecting ? '⏳ Verbinde...' : '✓ Verbinden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
