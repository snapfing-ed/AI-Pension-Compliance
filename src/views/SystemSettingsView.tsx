import React, { useState } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle2, Server, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AccessDeniedView } from '../components/auth/AccessDeniedView';

export const SystemSettingsView: React.FC = () => {
  const { systemConfig, updateSystemConfig, currentUser } = useApp();

  const [dueDay, setDueDay] = useState(systemConfig.monthlyDueDay);
  const [graceDays, setGraceDays] = useState(systemConfig.gracePeriodDays);
  const [shortfallZMW, setShortfallZMW] = useState(systemConfig.shortfallToleranceZMW);
  const [shortfallPct, setShortfallPct] = useState(systemConfig.shortfallTolerancePercent);
  const [zScore, setZScore] = useState(systemConfig.zScoreSensitivity);
  const [backendUrl, setBackendUrl] = useState('http://localhost:8080/api/v1');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'SYSTEM_ADMINISTRATOR';

  if (!isAdmin) {
    return (
      <AccessDeniedView
        requiredRole="SYSTEM_ADMINISTRATOR"
        attemptedResource="System Settings & Security Configuration"
      />
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    updateSystemConfig({
      monthlyDueDay: dueDay,
      gracePeriodDays: graceDays,
      shortfallToleranceZMW: shortfallZMW,
      shortfallTolerancePercent: shortfallPct,
      zScoreSensitivity: zScore,
    });

    setSaveToast('System configuration saved and recorded in security audit trail.');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleResetDefaults = () => {
    setDueDay(10);
    setGraceDays(5);
    setShortfallZMW(500);
    setShortfallPct(2);
    setZScore(2.0);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">System Configuration & Demonstration Parameters</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable statutory compliance thresholds, demonstration deadlines, and planned backend integration hooks
          </p>
        </div>
      </div>

      {saveToast && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Compliance Deadlines & Timing Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Demonstration Due Date & Grace Timing Rules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Monthly Schedule Submission Deadline (Day of Month)
              </label>
              <input
                type="number"
                min="1"
                max="28"
                disabled={!isAdmin}
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standard baseline due date for preceding month contributions (default: 10th of following month).
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Administrative Grace Period (Days)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                disabled={!isAdmin}
                value={graceDays}
                onChange={(e) => setGraceDays(parseInt(e.target.value, 10) || 5)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Buffer period before Rule A escalates missing schedule to formal notice (default: 5 calendar days).
              </p>
            </div>
          </div>
        </div>

        {/* Shortfall & Anomaly Thresholds Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Discrepancy Tolerances & Statistical Anomaly Sensitivity
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Shortfall Monetary Floor (ZMW)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                disabled={!isAdmin}
                value={shortfallZMW}
                onChange={(e) => setShortfallZMW(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Variances below this floor are deemed rounding differences (default: K 500).
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Shortfall Percentage Margin (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                disabled={!isAdmin}
                value={shortfallPct}
                onChange={(e) => setShortfallPct(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Allowed proportional variance before Rule C triggers (default: 2.0%).
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Z-Score Outlier Cutoff
              </label>
              <input
                type="number"
                min="1.0"
                max="5.0"
                step="0.1"
                disabled={!isAdmin}
                value={zScore}
                onChange={(e) => setZScore(parseFloat(e.target.value) || 2.0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standard deviations from historical mean to flag anomalous drop (default: 2.0σ).
              </p>
            </div>
          </div>
        </div>

        {/* Future Architecture Integration Hooks (Spring Boot & PostgreSQL) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Server className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Planned Backend Architecture Hooks</h3>
          </div>

          <p className="text-slate-600 leading-relaxed text-[11px]">
            The planned capstone architecture comprises a <strong>Java 21 / Spring Boot 3 REST API</strong> with a{' '}
            <strong>PostgreSQL 16</strong> relational database. The frontend maintains an interchangeable data-access
            layer so that local in-memory repositories can be replaced by HTTP client adapters pointing to the backend.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Spring Boot API Endpoint (Planned)</label>
              <input
                type="text"
                disabled
                value={backendUrl}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">PostgreSQL Database Connection</label>
              <input
                type="text"
                disabled
                value="jdbc:postgresql://localhost:5432/pension_compliance_db"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
            >
              Reset Recommended Defaults
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save System Parameters</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
