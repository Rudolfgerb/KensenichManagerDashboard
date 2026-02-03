import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import CRM from './components/CRM/CRM';
import GoalTracker from './components/GoalTracker/GoalTracker';
import Terminal from './components/Terminal/Terminal';
import JobTracker from './components/JobTracker/JobTracker';
import MutuusLaunch from './components/MutuusLaunch/MutuusLaunch';
import FileManager from './components/FileManager/FileManager';
import ContentPlan from './components/ContentPlan/ContentPlan';
import BrandingBoard from './components/BrandingBoard/BrandingBoard';
import AIAssistant from './components/AIAssistant/AIAssistant';
import GlobalSearch from './components/GlobalSearch/GlobalSearch';
import IntegrationsHub from './components/IntegrationsHub/IntegrationsHub';
import MatrixRain from './components/MatrixRain/MatrixRain';
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle';
import { ThemeProvider } from './context/ThemeContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { ToastProvider, useToast } from './components/Toast/Toast';
import { setToastCallback } from './services/api';
import './App.css';

// Component to connect Toast with API service
function ToastConnector() {
  const { showToast } = useToast();

  useEffect(() => {
    setToastCallback(showToast);
    return () => setToastCallback(() => {});
  }, [showToast]);

  return null;
}

// Global Matrix Rain that shows when session is active
function GlobalMatrixRain() {
  const { isSessionActive } = useSession();

  return (
    <div className="global-matrix-container">
      <MatrixRain isActive={isSessionActive} opacity={0.6} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ToastProvider>
          <ToastConnector />
          <BrowserRouter>
            {/* Global Matrix Rain Background */}
            <GlobalMatrixRain />

            <div className="app">
              <header className="header">
                <div className="header-brand">
                  <Link to="/" className="header-logo-link">
                    <img src="/images/logowortmarke.png" alt="Kensenich" className="header-logo" />
                  </Link>
                </div>
                <nav className="nav" role="navigation" aria-label="Hauptnavigation">
                  <Link to="/">Dashboard</Link>
                  <Link to="/content">Content</Link>
                  <Link to="/crm">CRM</Link>
                  <Link to="/integrations">AI & Analytics</Link>
                  <Link to="/goals">Goals</Link>
                  <Link to="/jobs">Jobs</Link>
                  <Link to="/mutuus">Mutuus</Link>
                  <Link to="/files">Files</Link>
                </nav>
                <div className="header-actions">
                  <GlobalSearch />
                  <ThemeToggle />
                </div>
              </header>

              <main className="main" role="main">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/content" element={<ContentPlan />} />
                  <Route path="/branding" element={<BrandingBoard />} />
                  <Route path="/crm" element={<CRM />} />
                  <Route path="/integrations" element={<IntegrationsHub />} />
                  <Route path="/goals" element={<GoalTracker />} />
                  <Route path="/jobs" element={<JobTracker />} />
                  <Route path="/mutuus" element={<MutuusLaunch />} />
                  <Route path="/files" element={<FileManager />} />
                  <Route path="/terminal" element={<Terminal />} />
                </Routes>
              </main>
            </div>

            {/* AI Assistant - Outside .app div to ensure position:fixed works */}
            <AIAssistant />
          </BrowserRouter>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
