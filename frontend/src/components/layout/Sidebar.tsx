import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  FileSpreadsheet,
  Calculator,
  UserCog,
  ChevronRight,
  ChevronLeft,
  LogOut,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useApp, TabKey } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, setActiveDetailId } = useApp();
  const { currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const role = currentUser?.role;
  const isAdmin = role === 'SYSTEM_ADMINISTRATOR';
  const isSupervisor = role === 'COMPLIANCE_SUPERVISOR';

  const roleLabel =
    isAdmin ? 'SYSTEM ADMINISTRATOR' :
    isSupervisor ? 'COMPLIANCE SUPERVISOR' :
    'COMPLIANCE MONITOR';

  const navSectionLabel =
    isAdmin ? 'System Administration' :
    isSupervisor ? 'Compliance Supervision' :
    'Compliance Operations';

  const adminNavItems: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
    { key: 'admin-overview', label: 'Administration Console', icon: ShieldAlert },
    { key: 'users',          label: 'User & Role Management', icon: UserCog },
    { key: 'employers',      label: 'Employers Directory',    icon: Building2 },
    { key: 'members',        label: 'Members Directory',      icon: Users },
    { key: 'periods',        label: 'Periods & Data Sources', icon: Calendar },
    { key: 'payroll',        label: 'Payroll Batches',        icon: FileSpreadsheet },
    { key: 'rules',          label: 'Rules & Calculator',     icon: Calculator },
  ];

  const operationalNavItems: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
    { key: 'overview',  label: 'Overview Dashboard',     icon: LayoutDashboard },
    { key: 'employers', label: 'Employers Directory',    icon: Building2 },
    { key: 'members',   label: 'Members Directory',      icon: Users },
    { key: 'periods',   label: 'Periods & Data Sources', icon: Calendar },
    { key: 'payroll',   label: 'Payroll Batches',        icon: FileSpreadsheet },
    { key: 'rules',     label: 'Rules & Calculator',     icon: Calculator },
  ];

  const navItems = isAdmin ? adminNavItems : operationalNavItems;

  const handleNavClick = (key: TabKey) => {
    setActiveTab(key);
    setActiveDetailId(null);
  };

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-screen select-none transition-all duration-200`}
      aria-label="Application navigation"
    >
      {/* Brand + Collapse Toggle */}
      <div className="px-4 py-5 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm bg-blue-600 shrink-0">
            SC
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold text-white tracking-tight truncate leading-tight">
                SmartCompliance
              </h1>
              <p className="text-xs text-slate-400 truncate">Pension Compliance</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="px-3 pt-3 flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Main menu">
        {!collapsed && (
          <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            {navSectionLabel}
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
              } rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!collapsed && isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </button>
          );
        })}
      </nav>

      {/* Session footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        {!collapsed && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded tracking-wide bg-blue-900/80 text-blue-200">
                {roleLabel}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">Session Active</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.displayName || currentUser?.username}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {currentUser?.institutionalEmail}
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => void logout()}
          title={collapsed ? 'Sign Out' : undefined}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 mt-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-300 rounded text-xs font-semibold transition-colors border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-rose-500"
          aria-label="Sign out of session"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};