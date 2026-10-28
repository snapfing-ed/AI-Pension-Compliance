import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Building2,
  Filter,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatZMW, formatDate, formatDateTime, exportToCSV } from '../utils/formatters';

export const ReportsView: React.FC = () => {
  const { employers, records, findings, cases, anomalies, systemConfig } = useApp();

  const [reportType, setReportType] = useState<'EXECUTIVE' | 'SHORTFALLS' | 'INVESTIGATIONS' | 'EMPLOYER_SUMMARY'>('EXECUTIVE');
  const [selectedEmployerId, setSelectedEmployerId] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');

  // Filtered records for report
  const activeRecords = useMemo(() => {
    return records.filter((r) => {
      const matchEmp = selectedEmployerId === 'ALL' || r.employerId === selectedEmployerId;
      const matchPeriod = selectedPeriod === 'ALL' || r.period === selectedPeriod;
      return matchEmp && matchPeriod;
    });
  }, [records, selectedEmployerId, selectedPeriod]);

  // Aggregated totals
  const totalExpected = useMemo(() => activeRecords.reduce((s, r) => s + r.expectedAmount, 0), [activeRecords]);
  const totalRemitted = useMemo(() => activeRecords.reduce((s, r) => s + r.remittedAmount, 0), [activeRecords]);
  const totalShortfall = useMemo(
    () => activeRecords.reduce((s, r) => s + Math.max(0, r.expectedAmount - r.remittedAmount), 0),
    [activeRecords]
  );
  const collectionRate = totalExpected > 0 ? ((totalRemitted / totalExpected) * 100).toFixed(1) : '100.0';

  const handleExportReportCSV = () => {
    if (reportType === 'EXECUTIVE' || reportType === 'EMPLOYER_SUMMARY') {
      const headers = ['Employer ID', 'Employer Name', 'Period', 'Expected (ZMW)', 'Remitted (ZMW)', 'Shortfall (ZMW)', 'Status'];
      const rows = activeRecords.map((r) => [
        r.employerId,
        r.employerName,
        r.period,
        r.expectedAmount,
        r.remittedAmount,
        Math.max(0, r.expectedAmount - r.remittedAmount),
        r.status,
      ]);
      exportToCSV(`compliance_report_${reportType}_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else if (reportType === 'SHORTFALLS') {
      const headers = ['Finding Ref', 'Rule', 'Employer Name', 'Period', 'Impact (ZMW)', 'Detected', 'Explanation'];
      const rows = findings.map((f) => [f.id, f.ruleName, f.employerName, f.period, f.monetaryImpact, f.detectedAt, f.explanation]);
      exportToCSV(`compliance_shortfalls_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else {
      const headers = ['Case Number', 'Employer Name', 'Priority', 'Status', 'Discrepancy (ZMW)', 'Assigned Officer', 'Outcome'];
      const rows = cases.map((c) => [
        c.caseNumber,
        c.employerName,
        c.priority,
        c.status,
        c.monetaryDiscrepancy,
        c.assignedOfficerName,
        c.finalOutcome || 'In Progress',
      ]);
      exportToCSV(`investigations_report_${new Date().toISOString().split('T')[0]}`, headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print-container">
      {/* View Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Compliance Reporting & Audit Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional summaries, shortfall reconciliation schedules, and case disposition metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>

          <button
            onClick={handleExportReportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Table CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Configuration Controls (Hidden in Print) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Report Profile:</span>
            <select
              value={reportType}
              onChange={(e: any) => setReportType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-teal-500"
            >
              <option value="EXECUTIVE">Executive Compliance Summary</option>
              <option value="SHORTFALLS">Unreconciled Shortfalls & Exceptions</option>
              <option value="INVESTIGATIONS">Investigation Case Outcomes & Aging</option>
              <option value="EMPLOYER_SUMMARY">Employer-Specific Audit Schedule</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Employer:</span>
            <select
              value={selectedEmployerId}
              onChange={(e) => setSelectedEmployerId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Employers</option>
              {employers.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Reporting Cycle:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Reporting Cycles</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Official Report Document Canvas (Printable Layout) */}
      <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-6 shadow-xs">
        {/* Formal Institutional Header */}
        <div className="border-b border-slate-900/10 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                PENSION COMPLIANCE INTELLIGENCE SYSTEM
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {reportType === 'EXECUTIVE'
                  ? 'Comprehensive Contribution Compliance Audit Report'
                  : reportType === 'SHORTFALLS'
                  ? 'Statutory Contribution Shortfall & Exception Register'
                  : reportType === 'INVESTIGATIONS'
                  ? 'Investigation Case Resolutions & Disposition Analysis'
                  : 'Employer-Level Statutory Compliance Schedule'}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Mulungushi University BSc Computer Science Capstone Decision-Support Model
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              <div>Generated: {new Date().toISOString().replace('T', ' ').slice(0, 19)} (CAT)</div>
              <div>Data Source: Synthetic Demonstration Corpus</div>
            </div>
          </div>

          {/* Metric Definition Banner */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div>
              <span className="font-semibold text-slate-800">Collection Realization Rate:</span>{' '}
              <span>(Recorded Remittances ÷ Expected Obligations) × 100</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Statutory Shortfall:</span>{' '}
              <span>Max(0, Expected - Verified Remittance)</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Aging Horizon:</span>{' '}
              <span>Days elapsed post demonstration deadline</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Metrics Box */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Total Statutory Dues Expected</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">{formatZMW(totalExpected)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Verified Bank Remittances</div>
            <div className="text-base font-bold font-mono text-teal-700 mt-1">{formatZMW(totalRemitted)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Unreconciled Net Shortfall</div>
            <div className="text-base font-bold font-mono text-rose-600 mt-1">{formatZMW(totalShortfall)}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Calculated Collection Rate</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-1">{collectionRate}%</div>
          </div>
        </div>

        {/* Detailed Table Based on Report Type */}
        {reportType === 'EXECUTIVE' || reportType === 'EMPLOYER_SUMMARY' ? (
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Monthly Obligation & Remittance Schedules
            </h3>
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Employer</th>
                    <th className="py-2.5 px-3">Cycle</th>
                    <th className="py-2.5 px-3 text-right">Expected (ZMW)</th>
                    <th className="py-2.5 px-3 text-right">Remitted (ZMW)</th>
                    <th className="py-2.5 px-3 text-right">Shortfall (ZMW)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Transaction Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRecords.map((r) => {
                    const shortfall = Math.max(0, r.expectedAmount - r.remittedAmount);
                    return (
                      <tr key={r.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{r.employerName}</td>
                        <td className="py-2.5 px-3 font-mono">{r.period}</td>
                        <td className="py-2.5 px-3 font-mono text-right">{formatZMW(r.expectedAmount)}</td>
                        <td className="py-2.5 px-3 font-mono text-right font-semibold text-slate-900">
                          {formatZMW(r.remittedAmount)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right font-bold text-rose-600">
                          {shortfall > 0 ? `-${formatZMW(shortfall)}` : 'K 0.00'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {r.paymentReference || 'None'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : reportType === 'SHORTFALLS' ? (
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Detected Compliance Shortfalls & Irregularities
            </h3>
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Finding Ref</th>
                    <th className="py-2.5 px-3">Rule Description</th>
                    <th className="py-2.5 px-3">Employer</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Potential Impact (ZMW)</th>
                    <th className="py-2.5 px-3">Recommended Officer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {findings.map((f) => (
                    <tr key={f.id}>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{f.id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{f.ruleName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{f.employerName}</td>
                      <td className="py-2.5 px-3 font-mono">{f.period}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right text-rose-600">
                        {f.monetaryImpact > 0 ? formatZMW(f.monetaryImpact) : 'Timing Exception'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">{f.suggestedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Investigation Case Register & Outcomes
            </h3>
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">Employer</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Workflow State</th>
                    <th className="py-2.5 px-3 text-right">Exposure (ZMW)</th>
                    <th className="py-2.5 px-3">Assigned Officer</th>
                    <th className="py-2.5 px-3">Recorded Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{c.caseNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{c.employerName}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{c.priority}</td>
                      <td className="py-2.5 px-3 text-slate-700">{c.status.replace('_', ' ')}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-right text-slate-900">
                        {formatZMW(c.monetaryDiscrepancy)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{c.assignedOfficerName}</td>
                      <td className="py-2.5 px-3 font-semibold text-teal-800">
                        {c.finalOutcome ? c.finalOutcome.replace('_', ' ') : 'Under Active Investigation'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Certification Sign-off Block */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <div className="font-semibold text-slate-900">Prepared By:</div>
            <div className="mt-1">Compliance Intelligence Decision-Support Engine</div>
            <div className="text-[11px] text-slate-400 mt-4">Authorized Officer Signature / Review Date</div>
            <div className="w-48 h-px bg-slate-300 mt-8"></div>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Institutional Governance & Disclaimer:</div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              This report is compiled for administrative compliance oversight and investigation prioritisation. All
              metrics represent synthetic calculations. Official enforcement requires formal administrative summons
              pursuant to statutory pension regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
