import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Database,
  Plus,
  AlertCircle,
  Lock,
  Archive,
  X,
} from 'lucide-react';
import { ContributionPeriod, DataSource, module2Api } from '../../api/module2Api';

const PERIOD_STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-amber-50 text-amber-700 border-amber-200',
  ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const PeriodsSourcesPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number>(1);
  const [submittingPeriod, setSubmittingPeriod] = useState(false);

  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceCode, setSourceCode] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('PAYROLL_EXPORT');
  const [submittingSource, setSubmittingSource] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [periodsRes, sourcesRes] = await Promise.all([
        module2Api.listPeriods(),
        module2Api.listDataSources(),
      ]);
      setPeriods(Array.isArray(periodsRes) ? periodsRes : []);
      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load periods and data sources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingPeriod(true);
      setError(null);
      await module2Api.createPeriod({ periodYear: year, periodMonth: month });
      setShowPeriodForm(false);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to create contribution period.');
    } finally {
      setSubmittingPeriod(false);
    }
  };

  const handlePeriodStatus = async (periodId: number, status: 'CLOSED' | 'ARCHIVED') => {
    try {
      setError(null);
      await module2Api.updatePeriodStatus(periodId, status);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to update period status.');
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceCode.trim() || !sourceName.trim()) return;
    try {
      setSubmittingSource(true);
      setError(null);
      await module2Api.createDataSource({
        sourceCode: sourceCode.trim(),
        sourceName: sourceName.trim(),
        sourceType,
      });
      setSourceCode('');
      setSourceName('');
      setShowSourceForm(false);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to register data source.');
    } finally {
      setSubmittingSource(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            Reporting Cadence &amp; Provenance
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Periods &amp; Data Sources</h1>
          <p className="text-slate-300 text-sm mt-1">
            Manage monthly contribution periods and register authorised data-source origins.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setShowPeriodForm((v) => !v)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              {showPeriodForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showPeriodForm ? 'Close Period Form' : 'New Period'}
            </button>
            <button
              onClick={() => setShowSourceForm((v) => !v)}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              {showSourceForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showSourceForm ? 'Close Source Form' : 'New Data Source'}
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Create Period Card */}
      {isAdmin && showPeriodForm && (
        <form
          onSubmit={handleCreatePeriod}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Open Contribution Period</h2>
            <span className="text-xs text-slate-500">Dates and labels are derived by the server</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Period Year</label>
              <input
                type="number"
                min={2020}
                max={2035}
                required
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Period Month (1–12)</label>
              <select
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPeriodForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPeriod}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {submittingPeriod ? 'Creating...' : 'Create Period'}
            </button>
          </div>
        </form>
      )}

      {/* Create Data Source Card */}
      {isAdmin && showSourceForm && (
        <form
          onSubmit={handleCreateSource}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Register Data Source</h2>
            <span className="text-xs text-slate-500">Tracks provenance of imported payroll batches</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Source Code</label>
              <input
                required
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. SRC-PAYROLL-CSV"
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Source Name</label>
              <input
                required
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Monthly Payroll Export"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Source Type</label>
              <select
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                <option value="PAYROLL_EXPORT">PAYROLL_EXPORT</option>
                <option value="SYNTHETIC_GENERATOR">SYNTHETIC_GENERATOR</option>
                <option value="MANUAL_ENTRY">MANUAL_ENTRY</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSourceForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingSource}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {submittingSource ? 'Registering...' : 'Register Source'}
            </button>
          </div>
        </form>
      )}

      {/* Contribution Periods Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Contribution Periods</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
              {periods.length}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Period</th>
                <th className="py-3 px-4 font-semibold">Start Date</th>
                <th className="py-3 px-4 font-semibold">End Date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                {isAdmin && <th className="py-3 px-4 font-semibold text-right">Lifecycle</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-8 text-center text-slate-500">
                    Loading periods...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-8 text-center text-slate-500">
                    No contribution periods configured.
                  </td>
                </tr>
              ) : (
                periods.map((p) => (
                  <tr key={p.periodId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {p.periodLabel || `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{p.startDate}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{p.endDate}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          PERIOD_STATUS_BADGE[p.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {p.status === 'OPEN' && (
                          <button
                            onClick={() => handlePeriodStatus(p.periodId, 'CLOSED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Close
                          </button>
                        )}
                        {p.status === 'CLOSED' && (
                          <button
                            onClick={() => handlePeriodStatus(p.periodId, 'ARCHIVED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Sources Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Database className="w-4 h-4 text-slate-500" />
            <span>Registered Data Sources</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
              {sources.length}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Source Code</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500">
                    Loading data sources...
                  </td>
                </tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500">
                    No data sources registered.
                  </td>
                </tr>
              ) : (
                sources.map((s) => (
                  <tr key={s.sourceId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{s.sourceCode}</td>
                    <td className="py-3.5 px-4 text-slate-700">{s.sourceName}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.sourceType}
                      </span>
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