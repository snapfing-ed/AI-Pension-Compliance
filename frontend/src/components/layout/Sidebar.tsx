import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  ShieldCheck,
  Cpu,
  FolderKanban,
  Bell,
  BarChart3,
  FileSpreadsheet,
  LineChart,
  UserCog,
  ScrollText,
  Settings,
  ChevronRight,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useApp, TabKey } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, setActiveDetailId, alerts } = useApp();
  const { currentUser, logout } = useAuth();

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const role = currentUser?.role;
  const isAdmin = role === 'SYSTEM_ADMINISTRATOR';
  const isSupervisor = role === 'COMPLIANCE_SUPERVISOR';

  const roleLabel =
    isAdmin ? 'SYSTEM ADMINISTRATOR' :
    isSupervisor ? 'COMPLIANCE SUPERVISOR' :
    'COMPLIANCE MONITOR';

  const roleBadgeColor =
    isAdmin ? 'bg-blue-900/80 text-blue-200' :
    isSupervisor ? 'bg-blue-900/80 text-blue-200' :
    'bg-blue-900/80 text-blue-200';

  const accentColor =
    isAdmin ? 'bg-blue-600' :
    isSupervisor ? 'bg-blue-600' :
    'bg-blue-600';

  const activeItemColor =
    isAdmin
      ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400'
      : isSupervisor
      ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400'
      : 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400';

  const activeIconColor =
    isAdmin ? 'text-blue-400' :
    isSupervisor ? 'text-blue-400' :
    'text-blue-400';

  const capstoneColor =
    isAdmin ? 'text-blue-400' :
    isSupervisor ? 'text-blue-400' :
    'text-blue-400';

  const navSectionLabel =
    isAdmin ? 'System Administration & Oversight' :
    isSupervisor ? 'Compliance Supervision' :
    'Compliance Monitoring Operations';

  const adminNavItems: Array<{ key: TabKey; label: string; icon: React.ElementType; badge?: number }> = [
    { key: 'admin-overview', label: 'Administration Console', icon: ShieldAlert },
    { key: 'users',          label: 'User & Role Management', icon: UserCog },
    { key: 'settings',       label: 'System Configuration',   icon: Settings },
    { key: 'audit',          label: 'Security Audit Logs',    icon: ScrollText },
    { key: 'overview',       label: 'Compliance Oversight',   icon: LayoutDashboard },
    { key: 'contributions',  label: 'Contribution Ledger',    icon: Receipt },
    { key: 'employers',      label: 'Employer Cadastre',      icon: Building2 },
    { key: 'import',         label: 'Data Import Administration', icon: FileSpreadsheet },
    { key: 'reports',        label: 'Reports & Analytics',    icon: BarChart3 },
    { key: 'evaluation',     label: 'Model Evaluation Specs', icon: LineChart },
  ];

  // Supervisors see the full operational menu
  const operationalNavItems: Array<{ key: TabKey; label: string; icon: React.ElementType; badge?: number }> = [
    { key: 'overview',      label: 'Overview Dashboard',    icon: LayoutDashboard },
    { key: 'employers',     label: 'Employers Directory',   icon: Building2 },
    { key: 'members',       label: 'Members Directory',     icon: Users },
    { key: 'contributions', label: 'Contribution Records',  icon: Receipt },
    { key: 'compliance',    label: 'Compliance Monitoring', icon: ShieldCheck },
    { key: 'ai-risk',       label: 'AI Risk Analysis',      icon: Cpu },
    { key: 'cases',         label: 'Investigation Cases',   icon: FolderKanban },
    { key: 'alerts',        label: 'Alerts & Notices',      icon: Bell, badge: unreadAlertCount },
    { key: 'reports',       label: 'Reports & Analytics',   icon: BarChart3 },
    { key: 'import',        label: 'Data Import & Validation', icon: FileSpreadsheet },
    { key: 'evaluation',    label: 'Model Evaluation',      icon: LineChart },
  ];

  const navItems = isAdmin ? adminNavItems : operationalNavItems;

  const handleNavClick = (key: TabKey) => {
    setActiveTab(key);
    setActiveDetailId(null);
  };

  return (
    <aside
      className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-screen select-none"
      aria-label="Application navigation"
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm ${accentColor}`}>
            SC
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-semibold text-white tracking-tight truncate leading-tight">
              SmartCompliance
            </h1>
            <p className="text-xs text-slate-400 truncate">Pension Compliance System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Main menu">
        <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          {navSectionLabel}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                isActive ? activeItemColor : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? activeIconColor : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 ? (
                <span className="px-1.5 text-[10px] font-bold rounded bg-amber-500 text-slate-950 font-mono">
                  {item.badge}
                </span>
              ) : isActive ? (
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Session footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${roleBadgeColor}`}>
            {roleLabel}
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">Session Active</span>
        </div>
        <div>
          <div className="text-xs font-semibold text-white truncate">{currentUser?.name}</div>
          <div className="text-[10px] text-slate-400 font-mono truncate">{currentUser?.email}</div>
        </div>
        <button
          onClick={() => void logout()}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 mt-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-300 rounded text-xs font-semibold transition-colors border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-rose-500"
          aria-label="Sign out of session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};