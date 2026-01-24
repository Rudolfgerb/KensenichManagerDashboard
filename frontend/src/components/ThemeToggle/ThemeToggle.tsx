import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`theme-toggle ${theme}`}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <span role="img" aria-label="Sun">☀️</span>
      ) : (
        <span role="img" aria-label="Moon">🌙</span>
      )}
    </button>
  );
};