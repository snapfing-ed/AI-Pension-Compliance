import React, { useState, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AlertNotification } from '../types';
import { formatDateTime } from '../utils/formatters';

export const AlertsView: React.FC = () => {
  const { alerts, markAlertRead, markAllAlertsRead, setActiveTab, setActiveDetailId } = useApp();
  const [filterType, setFilterType] = useState('ALL');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchesType = filterType === 'ALL' || a.type === filterType;
      const matchesRead = !filterUnreadOnly || !a.read;
      return matchesType && matchesRead;
    });
  }, [alerts, filterType, filterUnreadOnly]);

  const handleNavigate = (alert: AlertNotification) => {
    markAlertRead(alert.id);
    if (alert.targetView) {
      setActiveTab(alert.targetView as any);
      if (alert.targetId) {
        setActiveDetailId(alert.targetId);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Compliance Alerts & Operational Notices</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated notifications regarding emerging discrepancies, approaching deadlines, and batch runs
          </p>
        </div>

        <button
          onClick={markAllAlertsRead}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-2xs"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Notification Category:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Categories</option>
              <option value="HIGH_PRIORITY">High-Priority Findings</option>
              <option value="OVERDUE_CASE">Overdue Investigations</option>
              <option value="NEW_EXCEPTION">New Exceptions</option>
              <option value="CHECK_COMPLETED">Monitoring Run Summaries</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterUnreadOnly}
              onChange={(e) => setFilterUnreadOnly(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-slate-700 font-medium">Unread Only</span>
          </label>
        </div>

        <div className="text-slate-500 text-xs">
          Showing {filteredAlerts.length} of {alerts.length} notifications
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
            No active operational notices in this category.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border transition-colors ${
                alert.read ? 'bg-white border-slate-200' : 'bg-slate-50/80 border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.severity === 'ALERT' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    ) : alert.severity === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{alert.title}</span>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="Unread Notice"></span>
                      )}
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatDateTime(alert.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleNavigate(alert)}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  {!alert.read && (
                    <button
                      onClick={() => markAlertRead(alert.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title="Mark as Read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
