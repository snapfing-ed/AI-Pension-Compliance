import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { BootstrapAdminView } from './views/auth/BootstrapAdminView';
import { AccessDeniedView } from './components/auth/AccessDeniedView';

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
import { BookOpen, X, KeyRound, Shield, Lock } from 'lucide-react';

type AuthScreenState = 'LOGIN' | 'REGISTER' | 'BOOTSTRAP';

const AuthenticatedApp: React.FC = () => {
  const { activeTab, hasPermission } = useApp();
  const { currentUser } = useAuth();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const renderActiveView = () => {
    // Route Guard: Deny access if current user's role lacks permission for the activeTab
    if (!hasPermission(activeTab)) {
      return (
        <AccessDeniedView
          requiredRole={activeTab === 'users' || activeTab === 'settings' || activeTab === 'admin-overview' ? 'SYSTEM_ADMINISTRATOR' : 'COMPLIANCE_MONITOR'}
          attemptedResource={activeTab}
        />
      );
    }

    switch (activeTab) {
      case 'admin-overview':
        return <AdminOverviewDashboard />;
      case 'overview':
        return <OverviewDashboard />;
      case 'employers':
        return <EmployersView />;
      case 'members':
        return <MembersView />;
      case 'contributions':
        return <ContributionRecordsView />;
      case 'compliance':
        return <ComplianceMonitoringView />;
      case 'ai-risk':
        return <AIRiskAnalysisView />;
      case 'cases':
        return <InvestigationCasesView />;
      case 'alerts':
        return <AlertsView />;
      case 'reports':
        return <ReportsView />;
      case 'import':
        return <DataImportView />;
      case 'evaluation':
        return <ModelEvaluationView />;
      case 'users':
        return <UserManagementView />;
      case 'audit':
        return <AuditLogsView />;
      case 'settings':
        return <SystemSettingsView />;
      default:
        return currentUser?.role === 'SYSTEM_ADMINISTRATOR' ? <AdminOverviewDashboard /> : <OverviewDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">{renderActiveView()}</main>

        {/* Global Floating Research Guide Button */}
        <div className="fixed bottom-4 right-4 z-40 no-print">
          <button
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-semibold shadow-lg hover:shadow-xl transition-all border border-slate-700"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>Capstone RBAC & Testing Guide</span>
          </button>
        </div>

        {/* Guide Modal */}
        {showGuideModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Mulungushi University BSc CS Capstone RBAC Guide
                  </h3>
                  <p className="text-xs text-slate-500">
                    Authentication, IndexedDB Persistence, and Two-Role Separation of Responsibilities
                  </p>
                </div>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-700" />
                    <span>Active Authenticated Session:</span>
                  </div>
                  <div className="text-[11px]">
                    User: <strong>{currentUser?.name}</strong> ({currentUser?.email}) · Role:{' '}
                    <strong className="font-mono">{currentUser?.role}</strong> · Status:{' '}
                    <strong>{currentUser?.status}</strong>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">Strict Two-Role Separation Enforced:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <div className="font-bold text-purple-900 mb-0.5">ROLE 1: SYSTEM ADMINISTRATOR</div>
                      <p className="text-slate-600">
                        Oversees user accounts, role allocation, activation/suspension, security audit logs, system
                        thresholds, and read-only compliance oversight.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <div className="font-bold text-teal-900 mb-0.5">ROLE 2: COMPLIANCE MONITOR / SUPERVISOR</div>
                      <p className="text-slate-600">
                        Executes deterministic compliance rules, evaluates AI anomalies, manages investigation cases and
                        evidence notes, and generates compliance reports.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">Persistence & Cryptographic Verification:</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                    <li>
                      <strong>IndexedDB Storage:</strong> Accounts persist across page refreshes in the browser database.
                    </li>
                    <li>
                      <strong>Cryptographic Hashing:</strong> Passwords are verified via SHA-256 with unique 16-byte
                      salts. Plaintext passwords are never stored.
                    </li>
                    <li>
                      <strong>Route & Action Guards:</strong> Direct URL or navigation tampering results in an immediate
                      Access Denied response and security audit event.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
                >
                  Close Guide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RootRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreenState>('LOGIN');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl animate-pulse">
          PC
        </div>
        <div className="text-sm font-semibold tracking-wide">
          Initializing Pension Compliance Intelligence Gateway...
        </div>
        <div className="text-xs text-slate-400">Verifying secure IndexedDB repository</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authScreen === 'REGISTER') {
      return <RegisterView onNavigateToLogin={() => setAuthScreen('LOGIN')} />;
    }
    if (authScreen === 'BOOTSTRAP') {
      return <BootstrapAdminView onNavigateToLogin={() => setAuthScreen('LOGIN')} />;
    }
    return (
      <LoginView
        onNavigateToRegister={() => setAuthScreen('REGISTER')}
        onNavigateToBootstrap={() => setAuthScreen('BOOTSTRAP')}
      />
    );
  }

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
