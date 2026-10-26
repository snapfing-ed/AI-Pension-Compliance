import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Settings,
  ScrollText,
  Activity,
  CheckCircle2,
  Lock,
  Server,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAllUsersFromDB } from '../services/db/indexedDB';
import { User } from '../types';
import { formatZMW, formatDateTime } from '../utils/formatters';

export const AdminOverviewDashboard: React.FC = () => {
  const { setActiveTab, auditLogs, records, employers, systemConfig } = useApp();
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    getAllUsersFromDB().then(setUsers);
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const adminCount = users.filter((u) => u.role === 'SYSTEM_ADMINISTRATOR').length;
  const monitorCount = users.filter((u) => u.role === 'COMPLIANCE_MONITOR').length;

  const totalExpected = records.reduce((s, r) => s + r.expectedAmount, 0);
  const totalRemitted = records.reduce((s, r) => s + r.remittedAmount, 0);
  const totalShortfall = records.reduce((s, r) => s + Math.max(0, r.expectedAmount - r.remittedAmount), 0);

  const recentSecurityAudits = auditLogs.slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-purple-950/20 border border-purple-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-purple-900">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-purple-700 shrink-0" />
          <div>
            <span className="font-bold">System Administration Dashboard: </span>
            <span>
              Privileged security oversight, user account management, and institutional audit governance.
            </span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-purple-800 shrink-0">
          Administrator: {currentUser?.name}
        </div>
      </div>

      {/* Admin KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Registered Accounts</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{totalUsers}</div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>{adminCount} Admins · {monitorCount} Monitors</span>
            <span className="text-emerald-700 font-semibold">{activeUsers} Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Security Audit Events</div>
          <div className="text-xl font-bold text-purple-700 mt-1 font-mono">{auditLogs.length}</div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Immutable Trail</span>
            <span className="text-teal-700 font-medium">Logged</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Local Account Storage</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">IndexedDB</div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>SHA-256 Salted Hashes</span>
            <span className="text-emerald-700 font-medium">Encrypted</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">System Engine Status</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">Operational</div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Rules Due Day: {systemConfig.monthlyDueDay}th</span>
            <span className="text-slate-600 font-mono">v1.2.4</span>
          </div>
        </div>
      </div>

      {/* Quick Administrative Operations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('users')}
          className="bg-white border border-slate-200 hover:border-purple-300 rounded-lg p-4 cursor-pointer transition-all hover:shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-purple-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3">User & Access Management</h3>
          <p className="text-xs text-slate-500 mt-1">
            Provision compliance personnel, toggle activation status, and assign permitted roles.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('audit')}
          className="bg-white border border-slate-200 hover:border-purple-300 rounded-lg p-4 cursor-pointer transition-all hover:shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <ScrollText className="w-5 h-5 text-purple-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3">Security & Activity Audit Logs</h3>
          <p className="text-xs text-slate-500 mt-1">
            Inspect immutable records of logins, case escalations, data imports, and config changes.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('settings')}
          className="bg-white border border-slate-200 hover:border-purple-300 rounded-lg p-4 cursor-pointer transition-all hover:shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <Settings className="w-5 h-5 text-purple-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-3">System Settings & Thresholds</h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure monthly filing deadlines, grace periods, discrepancy tolerance, and ML hooks.
          </p>
        </div>
      </div>

      {/* Read-Only Compliance Oversight Strip for Admin */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Administrative Oversight: Contribution Ledger Summary</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only aggregate visibility across active pension contribution cadastres
            </p>
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1"
          >
            <span>Audit Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-slate-500">Total Expected Contribution Volume</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">{formatZMW(totalExpected)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{employers.length} registered employers</div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-slate-500">Total Confirmed Remittances</div>
            <div className="text-base font-bold font-mono text-teal-700 mt-1">{formatZMW(totalRemitted)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified treasury receipts</div>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-slate-500">Unreconciled Deficit Subject to Review</div>
            <div className="text-base font-bold font-mono text-rose-600 mt-1">{formatZMW(totalShortfall)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Assigned to compliance monitors</div>
          </div>
        </div>
      </div>

      {/* Recent Security Audit Events */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Recent Security & Configuration Audit Events</h3>
          <button
            onClick={() => setActiveTab('audit')}
            className="text-xs font-semibold text-purple-700 hover:text-purple-800"
          >
            View Complete Log ({auditLogs.length})
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Change Summary</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSecurityAudits.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{log.actor}</td>
                  <td className="py-2.5 px-3 font-mono text-purple-700 whitespace-nowrap">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-sm truncate">{log.changeSummary}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                      {log.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
