import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './views/auth/LoginView';
import { AccessDeniedView } from './components/auth/AccessDeniedView';
import { FirstLoginPasswordView } from './views/auth/FirstLoginPasswordView';

import { AdminOverviewDashboard } from './views/AdminOverviewDashboard';
import { OverviewDashboard } from './views/OverviewDashboard';
import { EmployersView } from './views/EmployersView';
import { MembersView } from './views/MembersView';
import { ContributionRecordsView } from './views/ContributionRecordsView';
import { ComplianceMonitoringView } from './views/ComplianceMonitoringView';
import { AIRiskAnalysisView } from './views/AIRiskAnalysisView';
import { InvestigationCasesView } from './views/InvestigationCasesView';
import { AlertsView } from './views/AlertsView';
import { ReportsView } from './views/ReportsView';
import { DataImportView } from './views/DataImportView';
import { ModelEvaluationView } from './views/ModelEvaluationView';
import { UserManagementView } from './views/UserManagementView';
import { AuditLogsView } from './views/AuditLogsView';
import { SystemSettingsView } from './views/SystemSettingsView';
import { TAB_MIN_ROLE } from './lib/permissions';

const AuthenticatedApp: React.FC = () => {
  const { activeTab, hasPermission } = useApp();
  const { currentUser } = useAuth();

  const renderActiveView = () => {
    if (!hasPermission(activeTab)) {
      const required = TAB_MIN_ROLE[activeTab] ?? 'SYSTEM_ADMINISTRATOR';
      return (
        <AccessDeniedView
          requiredRole={required}
          attemptedResource={activeTab}
        />
      );
    }

    switch (activeTab) {
      case 'admin-overview': return <AdminOverviewDashboard />;
      case 'overview':       return <OverviewDashboard />;
      case 'employers':      return <EmployersView />;
      case 'members':        return <MembersView />;
      case 'contributions':  return <ContributionRecordsView />;
      case 'compliance':     return <ComplianceMonitoringView />;
      case 'ai-risk':        return <AIRiskAnalysisView />;
      case 'cases':          return <InvestigationCasesView />;
      case 'alerts':         return <AlertsView />;
      case 'reports':        return <ReportsView />;
      case 'import':         return <DataImportView />;
      case 'evaluation':     return <ModelEvaluationView />;
      case 'users':          return <UserManagementView />;
      case 'audit':          return <AuditLogsView />;
      case 'settings':       return <SystemSettingsView />;
      default:
        return currentUser?.role === 'SYSTEM_ADMINISTRATOR'
          ? <AdminOverviewDashboard />
          : <OverviewDashboard />;
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
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl animate-pulse">
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