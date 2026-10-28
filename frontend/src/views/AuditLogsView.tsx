import React, { useState, useMemo } from 'react';
import { ScrollText, Search, Filter, Download, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateTime, exportToCSV } from '../utils/formatters';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');

  const distinctActors = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.actor)));
  }, [auditLogs]);

  const distinctActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.action)));
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.changeSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.referenceId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchActor = actorFilter === 'ALL' || log.actor === actorFilter;
      return matchSearch && matchAction && matchActor;
    });
  }, [auditLogs, searchQuery, actionFilter, actorFilter]);

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp (UTC+2)', 'Actor', 'Role', 'Action', 'Resource', 'Summary', 'Outcome', 'Reference ID'];
    const rows = filteredLogs.map((l) => [
      l.id,
      formatDateTime(l.timestamp),
      l.actor,
      l.role,
      l.action,
      l.resource,
      l.changeSummary,
      l.outcome,
      l.referenceId,
    ]);
    exportToCSV(`security_audit_log_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Security & Operational Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident, chronological trail of all user actions, case transitions, compliance runs, and config adjustments
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action keyword, or change summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Actor:</span>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Actors ({distinctActors.length})</option>
            {distinctActors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Action Event:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Actions ({distinctActions.length})</option>
            {distinctActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-3">Timestamp (UTC+2)</th>
                <th className="py-3 px-3">Actor & Role</th>
                <th className="py-3 px-3">Action Event</th>
                <th className="py-3 px-3">Target Resource</th>
                <th className="py-3 px-3">Change Summary & Context</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3">Correlation ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No audit records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{log.actor}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.role}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{log.resource}</td>
                    <td className="py-3 px-3 text-slate-700 max-w-md">{log.changeSummary}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-800'
                            : log.outcome === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {log.referenceId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
