import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './pages/auth/LoginView';
import { FirstLoginPasswordView } from './pages/auth/FirstLoginPasswordView';

import { AdminDashboardPage } from './pages/dashboard/AdminDashboardPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { EmployersPage } from './pages/employers/EmployersPage';
import { MembersPage } from './pages/members/MembersPage';
import { PeriodsSourcesPage } from './pages/periods/PeriodsSourcesPage';
import { PayrollPage } from './pages/payroll/PayrollPage';
import { RulesCalculatorPage } from './pages/contribution/RulesCalculatorPage';

const AuthenticatedApp: React.FC = () => {
  const { activeTab } = useApp();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'SYSTEM_ADMINISTRATOR';

  const renderActiveView = () => {
    switch (activeTab) {
      case 'admin-overview':
      case 'overview':
        return <AdminDashboardPage />;
      case 'users':        return <UserManagementPage />;
      case 'employers':    return <EmployersPage isAdmin={isAdmin} />;
      case 'members':      return <MembersPage isAdmin={isAdmin} />;
      case 'periods':      return <PeriodsSourcesPage isAdmin={isAdmin} />;
      case 'payroll':      return <PayrollPage isAdmin={isAdmin} />;
      case 'rules':        return <RulesCalculatorPage />;
      default:             return <AdminDashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto" id="main-content">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

const RootRouter: React.FC = () => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl animate-pulse">
          SC
        </div>
        <div className="text-sm font-semibold tracking-wide">Initialising SmartCompliance...</div>
        <div className="text-xs text-slate-400">Verifying your authentication session</div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginView />;
  if (currentUser?.mustChangePassword) return <FirstLoginPasswordView />;

  return (
    <AppProvider>
      <AuthenticatedApp />
    </AppProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  );
}

export default App;