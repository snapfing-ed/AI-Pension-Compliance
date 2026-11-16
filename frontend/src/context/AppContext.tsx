import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SessionUser } from '../types';
import { useAuth } from './AuthContext';

export type TabKey =
  | 'admin-overview'
  | 'overview'
  | 'employers'
  | 'members'
  | 'periods'
  | 'payroll'
  | 'rules'
  | 'returns-payments'
  | 'compliance'
  | 'cases'
  | 'users';

const VALID_TABS: TabKey[] = [
  'admin-overview',
  'overview',
  'employers',
  'members',
  'periods',
  'payroll',
  'rules',
  'returns-payments',
  'compliance',
  'cases',
  'users',
];

export function tabFromPathname(pathname: string): TabKey | null {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!clean || clean === 'login' || clean === 'change-password') return null;
  return (VALID_TABS as string[]).includes(clean) ? (clean as TabKey) : null;
}

interface AppContextType {
  currentUser: SessionUser;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  activeDetailId: string | null;
  setActiveDetailId: (id: string | null) => void;
  alerts?: Array<{ id: string; read: boolean }>;
  runComplianceChecks?: () => { recordsEvaluated: number; durationMs: number; exceptionsDetected: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser: authUser } = useAuth();

  const currentUser: SessionUser = authUser || {
    id: 'USR-GUEST',
    name: 'Unauthenticated User',
    email: 'guest@smartcompliance.local',
    role: 'COMPLIANCE_MONITOR',
    department: '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  const roleDefaultTab: TabKey =
    currentUser.role === 'SYSTEM_ADMINISTRATOR' ? 'admin-overview' : 'overview';

  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    return tabFromPathname(window.location.pathname) ?? roleDefaultTab;
  });
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);

  const setActiveTab = useCallback((tab: TabKey) => {
    setActiveTabState(tab);
    const targetPath = `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  }, []);

  useEffect(() => {
    const fromUrl = tabFromPathname(window.location.pathname);
    const targetTab = fromUrl ?? roleDefaultTab;
    setActiveTabState(targetTab);
    const targetPath = `/${targetTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ tab: targetTab }, '', targetPath);
    }
  }, [currentUser.id, currentUser.role, roleDefaultTab]);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = tabFromPathname(window.location.pathname);
      if (fromUrl) {
        setActiveTabState(fromUrl);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeTab,
        setActiveTab,
        activeDetailId,
        setActiveDetailId,
        alerts: [],
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};