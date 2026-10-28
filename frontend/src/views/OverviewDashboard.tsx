import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  Users,
  FileCheck2,
  ArrowRight,
  Filter,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatZMW, formatDate } from '../utils/formatters';

export const OverviewDashboard: React.FC = () => {
  const {
    employers,
    records,
    findings,
    anomalies,
    cases,
    setActiveTab,
    setActiveDetailId,
    systemConfig,
  } = useApp();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');

  // Filter records based on selected period
  const filteredRecords = useMemo(() => {
    if (selectedPeriod === 'ALL') return records;
    return records.filter((r) => r.period === selectedPeriod);
  }, [records, selectedPeriod]);

  // Dynamic calculations strictly from active records
  const totalExpected = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.expectedAmount, 0),
    [filteredRecords]
  );

  const totalRemitted = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.remittedAmount, 0),
    [filteredRecords]
  );

  const totalShortfall = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + Math.max(0, r.expectedAmount - r.remittedAmount), 0),
    [filteredRecords]
  );

  const missingSchedulesCount = useMemo(
    () => filteredRecords.filter((r) => r.status === 'MISSING_SUBMISSION').length,
    [filteredRecords]
  );

  const delayedRecordsCount = useMemo(
    () => filteredRecords.filter((r) => r.status === 'OVERDUE').length,
    [filteredRecords]
  );

  const unusualRecordsCount = useMemo(
    () => filteredRecords.filter((r) => r.status === 'UNUSUAL_VARIATION').length,
    [filteredRecords]
  );

  const openCases = useMemo(
    () => cases.filter((c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED'),
    [cases]
  );

  const overdueCases = useMemo(() => {
    const now = new Date().getTime();
    return cases.filter(
      (c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED' && new Date(c.dueDate).getTime() < now
    );
  }, [cases]);

  // Aggregate monthly trends for chart
  const monthlyTrends = useMemo(() => {
    const months = ['2026-07', '2026-08', '2026-09'];
    return months.map((m) => {
      const monthRecs = records.filter((r) => r.period === m);
      const expected = monthRecs.reduce((sum, r) => sum + r.expectedAmount, 0);
      const remitted = monthRecs.reduce((sum, r) => sum + r.remittedAmount, 0);
      return { month: m, expected, remitted };
    });
  }, [records]);

  // Top high-priority cases
  const highPriorityCases = useMemo(() => {
    return [...cases]
      .filter((c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED')
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 4);
  }, [cases]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Disclaimer */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-700">
        <div>
          <span className="font-semibold text-slate-900">Prototype Environment Notice: </span>
          <span>
            Demonstration system operating on synthetic Zambian pension records for academic research evaluation
            (Mulungushi University). Algorithm flags are administrative leads, not legal determinations.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-500">Period Filter:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Recorded Cycles</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
          </select>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Expected Obligations */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Total Expected Obligations</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatZMW(totalExpected)}</div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{filteredRecords.length} Contribution Cycles</span>
            <span>{employers.length} Employers</span>
          </div>
        </div>

        {/* Metric 2: Recorded Remittances */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Recorded Remittances Received</div>
          <div className="text-xl font-bold text-teal-700 mt-1 font-mono">{formatZMW(totalRemitted)}</div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              {totalExpected > 0 ? ((totalRemitted / totalExpected) * 100).toFixed(1) : 0}% Realised
            </span>
            <span className="text-teal-700 font-medium">Reconciled Ledger</span>
          </div>
        </div>

        {/* Metric 3: Potential Discrepancy & Shortfall */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Identified Contribution Shortfall</div>
          <div className="text-xl font-bold text-amber-600 mt-1 font-mono">{formatZMW(totalShortfall)}</div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{missingSchedulesCount} Missing · {unusualRecordsCount} Unusual</span>
            <span className="text-amber-700 font-medium">Subject to Audit</span>
          </div>
        </div>

        {/* Metric 4: Active Investigations */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Open Investigation Cases</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{openCases.length}</div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span className={overdueCases.length > 0 ? 'text-rose-600 font-medium' : 'text-slate-500'}>
              {overdueCases.length} Overdue Attention
            </span>
            <button
              onClick={() => setActiveTab('cases')}
              className="text-teal-700 hover:text-teal-800 font-medium flex items-center gap-0.5"
            >
              <span>View Queue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts & Analysis Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Visualization */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Contribution Volume (Expected vs Remitted)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Synthetic historical comparisons across reporting cycles in Zambian Kwacha (ZMW)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-slate-300 rounded-sm"></span>
                <span className="text-slate-600">Expected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-teal-600 rounded-sm"></span>
                <span className="text-slate-600">Remitted</span>
              </div>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="mt-6 space-y-4">
            {monthlyTrends.map((t) => {
              const maxVal = 1600000;
              const expectedPct = Math.min(100, (t.expected / maxVal) * 100);
              const remittedPct = Math.min(100, (t.remitted / maxVal) * 100);
              const variance = t.expected - t.remitted;

              return (
                <div key={t.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{t.month}</span>
                    <span className="font-mono text-slate-600">
                      Remitted: {formatZMW(t.remitted)} / Exp: {formatZMW(t.expected)}
                      {variance > 0 && (
                        <span className="text-amber-600 font-medium ml-2">(-{formatZMW(variance)})</span>
                      )}
                    </span>
                  </div>
                  <div className="h-6 bg-slate-100 rounded overflow-hidden flex flex-col justify-center gap-1 p-1">
                    <div
                      className="h-2 bg-slate-300 rounded transition-all"
                      style={{ width: `${expectedPct}%` }}
                      title={`Expected: ${formatZMW(t.expected)}`}
                    ></div>
                    <div
                      className="h-2 bg-teal-600 rounded transition-all"
                      style={{ width: `${remittedPct}%` }}
                      title={`Remitted: ${formatZMW(t.remitted)}`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Note: September 2026 reflects partial reporting awaiting bank credit clearances.</span>
            <button
              onClick={() => setActiveTab('contributions')}
              className="text-teal-700 hover:underline font-medium"
            >
              Open Full Reconciliation Ledger &rarr;
            </button>
          </div>
        </div>

        {/* Exception Breakdown & Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Compliance Exception Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">Categorization of flagged records by detection rule</p>

            <div className="mt-5 space-y-3">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="font-medium text-slate-800">Rule A: Missing Schedules</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{missingSchedulesCount} cases</span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-medium text-slate-800">Rule C: Remittance Shortfall</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {findings.filter((f) => f.ruleId === 'RULE_C_INCOMPLETE').length} cases
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-medium text-slate-800">Rule B: Delayed Submissions</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{delayedRecordsCount} cases</span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="font-medium text-slate-800">AI / ML Statistical Outliers</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{anomalies.length} cases</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('compliance')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors"
            >
              Inspect Deterministic Rule Findings
            </button>
          </div>
        </div>
      </div>

      {/* Prioritized Investigation Queue Preview */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">High-Priority Investigation Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cases prioritized by monetary exposure, aging latency, and employer risk status
            </p>
          </div>
          <button
            onClick={() => setActiveTab('cases')}
            className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
          >
            <span>All Investigation Cases ({cases.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2.5 px-3">Case Ref</th>
                <th className="py-2.5 px-3">Employer</th>
                <th className="py-2.5 px-3">Reporting Period</th>
                <th className="py-2.5 px-3 text-right">Exposure (ZMW)</th>
                <th className="py-2.5 px-3">Priority Score</th>
                <th className="py-2.5 px-3">Workflow Status</th>
                <th className="py-2.5 px-3">Assigned Officer</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {highPriorityCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-800">{c.caseNumber}</td>
                  <td className="py-3 px-3 font-medium text-slate-900">{c.employerName}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{c.reportingPeriod}</td>
                  <td className="py-3 px-3 font-mono font-semibold text-right text-slate-900">
                    {formatZMW(c.monetaryDiscrepancy)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                          c.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : c.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {c.priorityScore}/100
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">{c.priority}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{c.assignedOfficerName}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setActiveTab('cases');
                        setActiveDetailId(c.id);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px]"
                    >
                      Investigate
                    </button>
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
