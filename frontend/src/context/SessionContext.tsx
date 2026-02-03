import { createContext, useContext, useState, ReactNode } from 'react';

interface SessionContextType {
  isSessionActive: boolean;
  setSessionActive: (active: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isSessionActive, setIsSessionActive] = useState(false);

  const setSessionActive = (active: boolean) => {
    setIsSessionActive(active);
  };

  return (
    <SessionContext.Provider value={{ isSessionActive, setSessionActive }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
