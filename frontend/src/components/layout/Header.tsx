import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useApp, TabKey } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { currentUser, logout } = useAuth();

  const isAdmin = currentUser?.role === 'SYSTEM_ADMINISTRATOR';
  const displayName =
    currentUser?.displayName || currentUser?.name || currentUser?.username || 'User';
  const displayEmail =
    currentUser?.institutionalEmail || currentUser?.email || '';

  const roleLabel =
    currentUser?.role === 'SYSTEM_ADMINISTRATOR'
      ? 'System Administrator Role'
      : currentUser?.role === 'COMPLIANCE_SUPERVISOR'
      ? 'Compliance Supervisor Role'
      : 'Compliance Monitor Role';

  const avatarLabel =
    currentUser?.role === 'SYSTEM_ADMINISTRATOR'
      ? 'System Admin'
      : currentUser?.role === 'COMPLIANCE_SUPERVISOR'
      ? 'Supervisor'
      : 'Compliance Monitor';

  const sectionLabel = isAdmin ? 'Administration' : 'Monitoring Operations';

  const titles: Record<TabKey, string> = {
    'admin-overview': 'System Administration Console',
    overview: 'Compliance Monitoring Dashboard',
    users: 'User Accounts & Access Control',
    employers: 'Employer Directory & Profiles',
    members: 'Registered Members Directory',
    periods: 'Contribution Periods & Data Sources',
    payroll: 'Payroll Batches & Records',
    'returns-payments': 'Returns, Payments & Completeness Ledger',
    compliance: 'Compliance Analysis & Findings',
    cases: 'Investigation Case Management',
    rules: 'Contribution Rules & Calculator',
  };

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
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
            {displayEmail && (
              <>
                <span className="font-semibold text-slate-700 truncate max-w-[180px] sm:max-w-none">
                  {displayEmail}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
              </>
            )}
            <span className="hidden sm:inline">Lusaka (UTC+2)</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="font-semibold text-blue-700">{roleLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={() => setActiveTab('compliance')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors shadow-sm"
          title="Open Compliance Analysis & Findings"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Analysis Console</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold font-mono shrink-0"
            aria-hidden="true"
          >
            {initials || 'U'}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-semibold text-slate-900 leading-tight truncate max-w-[130px]">
              {displayName}
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