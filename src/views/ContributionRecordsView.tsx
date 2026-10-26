import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ContributionRecord } from '../types';
import { formatZMW, formatDate, exportToCSV } from '../utils/formatters';

export const ContributionRecordsView: React.FC = () => {
  const { records, employers, createCaseFromFinding, setActiveTab } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<ContributionRecord | null>(null);

  // Distinct reporting periods
  const periods = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.period))).sort().reverse();
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.employerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.paymentReference && r.paymentReference.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPeriod = periodFilter === 'ALL' || r.period === periodFilter;
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }, [records, searchQuery, periodFilter, statusFilter]);

  const handleExportCSV = () => {
    const headers = [
      'Record Ref',
      'Employer ID',
      'Employer Name',
      'Period',
      'Expected (ZMW)',
      'Reported (ZMW)',
      'Remitted (ZMW)',
      'Discrepancy (ZMW)',
      'Due Date',
      'Submission Date',
      'Remittance Date',
      'Status',
      'Payment Ref',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.employerId,
      r.employerName,
      r.period,
      r.expectedAmount,
      r.reportedAmount,
      r.remittedAmount,
      r.expectedAmount - r.remittedAmount,
      r.dueDate,
      r.submissionDate || 'N/A',
      r.remittanceDate || 'N/A',
      r.status,
      r.paymentReference || 'N/A',
    ]);

    exportToCSV(`pension_contributions_${periodFilter}`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Contribution Reconciliation Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tripartite comparison: Expected Obligations vs Employer-Reported Schedules vs Verified Bank Remittances
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Domain Clarification Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2.5">
        <Receipt className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Reconciliation Principle: </span>
          <span>
            An employer-reported schedule does not establish that funds have been received. A record is only fully
            reconciled when verified bank clearing confirms actual receipt of remitted statutory dues.
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by employer name, record ID, or bank reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Period:</span>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Periods ({periods.length})</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECONCILED">Reconciled</option>
            <option value="PARTIAL_PAYMENT">Partial Remittance</option>
            <option value="MISSING_SUBMISSION">Missing Schedule</option>
            <option value="OVERDUE">Late Remittance</option>
            <option value="UNUSUAL_VARIATION">Unusual Variation</option>
            <option value="DATA_QUALITY_ERROR">Data Error</option>
          </select>
        </div>
      </div>

      {/* Contribution Records Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-3">Record ID</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Employer</th>
                <th className="py-3 px-3 text-right">Expected (ZMW)</th>
                <th className="py-3 px-3 text-right">Reported (ZMW)</th>
                <th className="py-3 px-3 text-right">Remitted (ZMW)</th>
                <th className="py-3 px-3 text-right">Shortfall (ZMW)</th>
                <th className="py-3 px-3">Reconciliation Standing</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No contribution records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const shortfall = Math.max(0, r.expectedAmount - r.remittedAmount);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">{r.id}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-700">{r.period}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">{r.employerName}</td>
                      <td className="py-3 px-3 font-mono text-right text-slate-600">{formatZMW(r.expectedAmount)}</td>
                      <td className="py-3 px-3 font-mono text-right text-slate-700">
                        {r.reportedAmount > 0 ? formatZMW(r.reportedAmount) : <span className="text-slate-400">None</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-semibold text-slate-900">
                        {r.remittedAmount > 0 ? formatZMW(r.remittedAmount) : <span className="text-slate-400">None</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-right font-bold">
                        {shortfall > 0 ? (
                          <span className="text-rose-600">-{formatZMW(shortfall)}</span>
                        ) : (
                          <span className="text-slate-400">K 0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.status === 'RECONCILED'
                              ? 'bg-emerald-50 text-emerald-800'
                              : r.status === 'PARTIAL_PAYMENT'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'MISSING_SUBMISSION'
                              ? 'bg-rose-100 text-rose-800'
                              : r.status === 'OVERDUE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedRecord(r)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Reconciliation Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedRecord.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Reconciliation Summary: {selectedRecord.employerName}
                </h3>
                <p className="text-xs text-slate-500">Period {selectedRecord.period} · Roster: {selectedRecord.memberCount} members</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Three-Way Comparison Strip */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="text-slate-500 font-medium">1. Statutory Obligation</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                    {formatZMW(selectedRecord.expectedAmount)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Calculated from wage tier</div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">2. Employer Reported</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                    {selectedRecord.reportedAmount > 0 ? formatZMW(selectedRecord.reportedAmount) : 'None (Missing)'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Declared in monthly schedule</div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">3. Bank Remittance</div>
                  <div className="text-sm font-bold font-mono text-teal-700 mt-1">
                    {selectedRecord.remittedAmount > 0 ? formatZMW(selectedRecord.remittedAmount) : 'None (K 0.00)'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Verified treasury deposit</div>
                </div>
              </div>

              {/* Dates & Reference Breakdown */}
              <div className="space-y-2 border-t border-b border-slate-100 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Configured Demonstration Due Date:</span>
                  <span className="font-mono text-slate-900 font-medium">{selectedRecord.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employer Submission Timestamp:</span>
                  <span className="font-mono text-slate-900">
                    {selectedRecord.submissionDate ? formatDate(selectedRecord.submissionDate) : 'Not Submitted'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Settlement Date:</span>
                  <span className="font-mono text-slate-900">
                    {selectedRecord.remittanceDate ? formatDate(selectedRecord.remittanceDate) : 'Unsettled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Reference Code:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedRecord.paymentReference || 'No verified payment token'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submission Transmission Channel:</span>
                  <span className="text-slate-800 font-medium">{selectedRecord.sourceChannel.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Discrepancy & Action Analysis */}
              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="font-bold">Reconciliation Analysis:</div>
                <div className="mt-1">
                  {selectedRecord.expectedAmount > selectedRecord.remittedAmount ? (
                    <span>
                      An unreconciled deficit of {formatZMW(selectedRecord.expectedAmount - selectedRecord.remittedAmount)}{' '}
                      exists. This warrants investigation to establish whether supplemental payments are in transit or a
                      formal compliance inquiry is required.
                    </span>
                  ) : selectedRecord.status === 'OVERDUE' ? (
                    <span>
                      Schedule and remittance were received past the due date. Reconciled financially but recorded as a
                      compliance timeliness infraction.
                    </span>
                  ) : (
                    <span className="text-emerald-800 font-medium">
                      Record is fully reconciled with matching statutory obligations and confirmed bank settlement.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
