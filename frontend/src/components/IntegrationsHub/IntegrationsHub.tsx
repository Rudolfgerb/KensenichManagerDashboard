import { useState } from 'react';
import AIIntegrations from '../AIIntegrations/AIIntegrations';
import AnalyticsDashboard from '../AnalyticsDashboard/AnalyticsDashboard';
import './IntegrationsHub.css';

export default function IntegrationsHub() {
  const [activeTab, setActiveTab] = useState<'integrations' | 'analytics'>('integrations');

  return (
    <div className="integrations-hub">
      <div className="hub-tabs">
        <button
          className={`hub-tab ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          ⚡ AI & Integrations
        </button>
        <button
          className={`hub-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics Dashboard
        </button>
      </div>

      <div className="hub-content">
        {activeTab === 'integrations' ? (
          <AIIntegrations />
        ) : (
          <AnalyticsDashboard />
        )}
      </div>
    </div>
  );
}
