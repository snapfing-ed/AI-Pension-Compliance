import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatZMW } from '../utils/formatters';

export const OverviewDashboard: React.FC = () => {
  const {
    employers,
    records,
    findings,
    anomalies,
    cases,
    setActiveTab,
    setActiveDetailId,
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
            className="bg-white border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Recorded Cycles</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
          </select>
        </div>
      </div>

      {/* Compact ledger indicators */}
      <div className="flex flex-wrap divide-x divide-slate-300 border-y border-slate-200 bg-white">
        <div className="px-4 py-2 min-w-[12rem] flex-1">
          <div className="text-[11px] font-medium text-slate-500">Expected obligations</div>
          <div className="font-mono text-base font-semibold text-slate-900">{formatZMW(totalExpected)}</div>
          <div className="text-[10px] text-slate-500">{filteredRecords.length} cycles · {employers.length} employers</div>
        </div>
        <div className="px-4 py-2 min-w-[12rem] flex-1">
          <div className="text-[11px] font-medium text-slate-500">Remittances received</div>
          <div className="font-mono text-base font-semibold text-blue-700">{formatZMW(totalRemitted)}</div>
          <div className="text-[10px] text-slate-500">{totalExpected > 0 ? ((totalRemitted / totalExpected) * 100).toFixed(1) : 0}% realised</div>
        </div>
        <div className="px-4 py-2 min-w-[12rem] flex-1">
          <div className="text-[11px] font-medium text-slate-500">Contribution shortfall</div>
          <div className="font-mono text-base font-semibold text-amber-700">{formatZMW(totalShortfall)}</div>
          <div className="text-[10px] text-slate-500">{missingSchedulesCount} missing · {unusualRecordsCount} unusual</div>
        </div>
        <div className="px-4 py-2 min-w-[12rem] flex-1">
          <div className="text-[11px] font-medium text-slate-500">Open investigations</div>
          <div className="font-mono text-base font-semibold text-slate-900">{openCases.length}</div>
          <div className={overdueCases.length > 0 ? 'text-[10px] font-medium text-rose-700' : 'text-[10px] text-slate-500'}>{overdueCases.length} overdue</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-start">
      {/* Prioritized Investigation Queue Preview */}
      <div className="lg:col-span-7 min-w-0">
      <div className="bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">High-Priority Investigation Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cases prioritized by monetary exposure, aging latency, and employer risk status
            </p>
          </div>
          <button
            onClick={() => setActiveTab('cases')}
            className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
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
      <aside className="lg:col-span-3 border border-slate-200 bg-white p-4" aria-label="Compliance exception summary">
        <h2 className="text-sm font-semibold text-slate-900">Exception register</h2>
        <p className="mt-1 text-[11px] text-slate-500">Current period · {selectedPeriod === 'ALL' ? 'all cycles' : selectedPeriod}</p>
        <dl className="mt-4 divide-y divide-slate-200 text-xs">
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Missing schedules</dt><dd className="font-mono font-semibold text-slate-900">{missingSchedulesCount}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Remittance shortfall</dt><dd className="font-mono font-semibold text-slate-900">{findings.filter((f) => f.ruleId === 'RULE_C_INCOMPLETE').length}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Delayed submissions</dt><dd className="font-mono font-semibold text-slate-900">{delayedRecordsCount}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Statistical outliers</dt><dd className="font-mono font-semibold text-slate-900">{anomalies.length}</dd></div>
        </dl>
        <button onClick={() => setActiveTab('compliance')} className="mt-4 w-full border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          Review compliance findings <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
        </button>
        <button onClick={() => setActiveTab('contributions')} className="mt-2 w-full border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          Open contribution ledger <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
        </button>
      </aside>
      </div>
    </div>
  );
};
