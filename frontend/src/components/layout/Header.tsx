import React, { useState } from 'react';
import { Play, Bell, CheckCircle2, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, runComplianceChecks, alerts } = useApp();
  const { currentUser, logout } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const isAdmin = currentUser?.role === 'SYSTEM_ADMINISTRATOR';

  const roleLabel =
    currentUser?.role === 'SYSTEM_ADMINISTRATOR' ? 'System Administrator Role' :
    currentUser?.role === 'COMPLIANCE_SUPERVISOR' ? 'Compliance Supervisor Role' :
    'Compliance Monitor Role';

  const roleColor =
    currentUser?.role === 'SYSTEM_ADMINISTRATOR' ? 'text-purple-700' :
    currentUser?.role === 'COMPLIANCE_SUPERVISOR' ? 'text-indigo-700' :
    'text-teal-700';

  const avatarColor =
    currentUser?.role === 'SYSTEM_ADMINISTRATOR' ? 'bg-purple-700' :
    currentUser?.role === 'COMPLIANCE_SUPERVISOR' ? 'bg-indigo-700' :
    'bg-teal-700';

  const avatarLabel =
    currentUser?.role === 'SYSTEM_ADMINISTRATOR' ? 'System Admin' :
    currentUser?.role === 'COMPLIANCE_SUPERVISOR' ? 'Supervisor' :
    'Compliance Monitor';

  const sectionLabel = isAdmin ? 'Administration' : 'Monitoring Operations';

  const handleRunChecks = () => {
    setIsRunning(true);
    setTimeout(() => {
      const result = runComplianceChecks();
      setIsRunning(false);
      setToastMessage(
        `Checked ${result.recordsEvaluated} records in ${result.durationMs}ms: Found ${result.exceptionsDetected} exceptions.`
      );
      setTimeout(() => setToastMessage(null), 4000);
    }, 400);
  };

  const titles: Record<string, string> = {
    'admin-overview': 'System Administration Console',
    overview: 'Compliance Monitoring Dashboard',
    employers: 'Employer Directory & Profiles',
    members: 'Registered Members Directory',
    contributions: 'Contribution Reconciliation Ledger',
    compliance: 'Compliance Monitoring Engine',
    'ai-risk': 'AI Anomaly Analysis & Explainability',
    cases: 'Investigation Case Management',
    alerts: 'Compliance Alerts & Notifications',
    reports: 'Compliance Reports & Analytics',
    import: 'Contribution Data Import & Validation',
    evaluation: 'Model Evaluation & System Performance',
    users: 'User Accounts & Access Control',
    audit: 'Security & Activity Audit Logs',
    settings: 'System Configuration & Demonstration Thresholds',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">

      {/* Zone 1: Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="hidden sm:inline">{sectionLabel}</span>
            <span className="hidden sm:inline" aria-hidden="true">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-[180px] sm:max-w-none">
              {titles[activeTab] || 'Dashboard'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="font-semibold text-slate-700 truncate max-w-[160px] sm:max-w-none">
              {currentUser?.email}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Lusaka (UTC+2)</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className={`font-semibold ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Toast */}
      {toastMessage && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={handleRunChecks}
          disabled={isRunning}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
          aria-label="Execute deterministic compliance rules on active records"
          title="Execute deterministic compliance rules on active records"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Running...' : 'Run Checks'}</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className="relative p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label={`View alerts${unreadAlerts > 0 ? `, ${unreadAlerts} unread` : ''}`}
          title="View Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlerts > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 ${avatarColor}`}
            aria-hidden="true"
          >
            {currentUser?.name
              ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
              : 'U'}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-semibold text-slate-900 leading-tight truncate max-w-[130px]">
              {currentUser?.name}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {avatarLabel}
            </div>
          </div>

          <button
            onClick={() => void logout()}
            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
            aria-label="Sign out of session"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};