import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './GlobalSearch.css';

interface SearchResult {
  id: string;
  type: 'task' | 'contact' | 'file' | 'content' | 'goal' | 'job' | 'milestone';
  title: string;
  subtitle?: string;
  url: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    const allResults: SearchResult[] = [];

    try {
      // Search tasks
      const tasksRes = await axios.get('/api/tasks');
      const tasks = tasksRes.data.filter((task: any) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      tasks.forEach((task: any) => {
        allResults.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: task.category,
          url: '/'
        });
      });

      // Search contacts
      const contactsRes = await axios.get('/api/crm/contacts');
      const contacts = contactsRes.data.filter((contact: any) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      contacts.forEach((contact: any) => {
        allResults.push({
          id: contact.id,
          type: 'contact',
          title: contact.name,
          subtitle: contact.company || contact.type,
          url: '/crm'
        });
      });

      // Search goals
      const goalsRes = await axios.get('/api/goals');
      const goals = goalsRes.data.filter((goal: any) =>
        goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        goal.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      goals.forEach((goal: any) => {
        allResults.push({
          id: goal.id,
          type: 'goal',
          title: goal.title,
          subtitle: `${goal.progress}% complete`,
          url: '/goals'
        });
      });

      // Search job applications
      const jobsRes = await axios.get('/api/jobs');
      const jobs = jobsRes.data.filter((job: any) =>
        job.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase())
      );
      jobs.forEach((job: any) => {
        allResults.push({
          id: job.id,
          type: 'job',
          title: `${job.position} at ${job.company}`,
          subtitle: job.status,
          url: '/jobs'
        });
      });

      // Search Mutuus milestones
      const mutuusRes = await axios.get('/api/mutuus/milestones');
      const milestones = mutuusRes.data.filter((milestone: any) =>
        milestone.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        milestone.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      milestones.forEach((milestone: any) => {
        allResults.push({
          id: milestone.id,
          type: 'milestone',
          title: milestone.title,
          subtitle: `Mutuus - ${milestone.status}`,
          url: '/mutuus'
        });
      });

      setResults(allResults.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      navigateToResult(results[selectedIndex]);
    }
  };

  const navigateToResult = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'task': return '✓';
      case 'contact': return '👤';
      case 'file': return '📄';
      case 'content': return '📝';
      case 'goal': return '🎯';
      case 'job': return '💼';
      case 'milestone': return '🚀';
      default: return '•';
    }
  };

  return (
    <>
      <button className="search-trigger" onClick={() => setIsOpen(true)} title="Search (⌘K)">
        🔍
      </button>

      {isOpen && (
        <div className="search-overlay" onClick={() => setIsOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder="Suche Tasks, Kontakte, Dokumente, Ziele..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button
                  className="search-clear"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="search-results">
              {isLoading && (
                <div className="search-loading">
                  <span className="loader">⏳ Suche...</span>
                </div>
              )}

              {!isLoading && query.trim().length >= 2 && results.length === 0 && (
                <div className="search-empty">
                  <span>Keine Ergebnisse für "{query}"</span>
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <ul className="search-results-list">
                  {results.map((result, index) => (
                    <li
                      key={result.id}
                      className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => navigateToResult(result)}
                    >
                      <span className="result-icon">{getResultIcon(result.type)}</span>
                      <div className="result-content">
                        <div className="result-title">{result.title}</div>
                        {result.subtitle && (
                          <div className="result-subtitle">{result.subtitle}</div>
                        )}
                      </div>
                      <span className="result-type">{result.type}</span>
                    </li>
                  ))}
                </ul>
              )}

              {!isLoading && query.trim().length < 2 && (
                <div className="search-hint">
                  <p>💡 Tipp: Mindestens 2 Zeichen eingeben</p>
                  <p className="search-shortcuts">
                    <kbd>↑</kbd> <kbd>↓</kbd> Navigation • <kbd>Enter</kbd> Öffnen • <kbd>Esc</kbd> Schließen
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
