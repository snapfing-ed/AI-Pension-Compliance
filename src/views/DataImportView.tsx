import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ContributionRecord } from '../types';
import { parseCSV, exportToCSV, formatZMW } from '../utils/formatters';

interface ValidatedRow {
  rowIndex: number;
  employerId: string;
  employerName: string;
  period: string;
  expectedAmount: number;
  reportedAmount: number;
  remittedAmount: number;
  submissionDate: string | null;
  paymentReference: string;
  isValid: boolean;
  errors: string[];
}

export const DataImportView: React.FC = () => {
  const { employers, importValidatedRecords, setActiveTab } = useApp();

  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ValidatedRow[]>([]);
  const [validationStats, setValidationStats] = useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    durationMs: number;
  } | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const sampleCSVTemplate = `employer_id,employer_name,period,expected_amount,reported_amount,remitted_amount,submission_date,payment_ref
EMP-ZM-1002,Victoria Commercial Bank Zambia,2026-10,390000,390000,390000,2026-10-25,BOZ-FT-20261025-01
EMP-ZM-1006,Zambezi Grains & Agri-Ventures,2026-10,175000,175000,175000,2026-10-24,PR-ZGA-202610-02
EMP-ZM-1007,Konkola Minerals Logistics Ltd,2026-10,84500,84500,84500,2026-10-25,TX-KML-202610-01`;

  const sampleProblematicCSV = `employer_id,employer_name,period,expected_amount,reported_amount,remitted_amount,submission_date,payment_ref
EMP-ZM-1002,Victoria Commercial Bank Zambia,2026-10,390000,390000,390000,2026-10-25,BOZ-FT-20261025-01
EMP-ZM-9999,Unknown Zambian Enterprise Ltd,2026-10,50000,50000,50000,2026-10-25,TX-UNMATCHED-01
EMP-ZM-1003,Lusaka Central Wholesale Ltd,2026-10,148000,148000,-15000,2026-10-25,ERR-NEGATIVE-PAY
EMP-ZM-1004,Kafue Heavy Engineering Plc,2026-10,235000,235000,235000,INVALID_DATE_FORMAT,TX-KHE-202610
EMP-ZM-1006,Zambezi Grains & Agri-Ventures,2026-10,175000,175000,175000,2026-10-25,PR-ZGA-202610-03`;

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCSVTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pension_contribution_batch_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSampleProblematic = () => {
    setRawText(sampleProblematicCSV);
    validateCSVText(sampleProblematicCSV);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      validateCSVText(text);
    };
    reader.readAsText(file);
  };

  const validateCSVText = (text: string) => {
    const startTime = performance.now();
    const rows = parseCSV(text);
    if (rows.length < 2) return;

    const header = rows[0].map((h) => h.toLowerCase());
    const validEmployerIds = new Set(employers.map((e) => e.id));

    const validated: ValidatedRow[] = [];
    const seenHashes = new Set<string>();
    let duplicates = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 6 || !row[0]) continue;

      const empId = row[0];
      const empName = row[1] || 'Unknown';
      const period = row[2];
      const expected = parseFloat(row[3]) || 0;
      const reported = parseFloat(row[4]) || 0;
      const remitted = parseFloat(row[5]) || 0;
      const subDate = row[6] || null;
      const payRef = row[7] || '';

      const errors: string[] = [];

      // Check 1: Employer Reference Match
      if (!validEmployerIds.has(empId)) {
        errors.push(`Unmatched Employer Reference: ${empId} not found in registered employer database.`);
      }

      // Check 2: Negative amounts
      if (remitted < 0 || reported < 0 || expected < 0) {
        errors.push('Schema Violation: Negative numeric contribution figures are prohibited.');
      }

      // Check 3: Date formatting
      if (subDate && subDate !== 'N/A' && !/^\d{4}-\d{2}-\d{2}$/.test(subDate)) {
        errors.push(`Invalid Submission Date format: "${subDate}". Expected YYYY-MM-DD.`);
      }

      // Check 4: Duplicate Hash
      const hashKey = `${empId}_${period}_${reported}_${remitted}`;
      if (seenHashes.has(hashKey)) {
        errors.push(`Suspected Duplicate: Identical payload hash already submitted for ${empId} / ${period}.`);
        duplicates++;
      } else {
        seenHashes.add(hashKey);
      }

      validated.push({
        rowIndex: i + 1,
        employerId: empId,
        employerName: empName,
        period,
        expectedAmount: expected,
        reportedAmount: reported,
        remittedAmount: remitted,
        submissionDate: subDate,
        paymentReference: payRef,
        isValid: errors.length === 0,
        errors,
      });
    }

    const duration = Math.round(performance.now() - startTime);

    setParsedRows(validated);
    setValidationStats({
      total: validated.length,
      valid: validated.filter((r) => r.isValid).length,
      invalid: validated.filter((r) => !r.isValid).length,
      duplicates,
      durationMs: duration,
    });
  };

  const handleDownloadErrorReport = () => {
    const invalidRows = parsedRows.filter((r) => !r.isValid);
    const headers = ['Row Number', 'Employer ID', 'Employer Name', 'Period', 'Detected Schema Violations'];
    const rows = invalidRows.map((r) => [r.rowIndex, r.employerId, r.employerName, r.period, r.errors.join(' | ')]);
    exportToCSV(`validation_errors_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const newContributionRecords: ContributionRecord[] = validRows.map((v) => ({
      id: `CR-IMP-${Date.now().toString(36)}-${v.rowIndex}`,
      employerId: v.employerId,
      employerName: v.employerName,
      period: v.period,
      expectedAmount: v.expectedAmount,
      reportedAmount: v.reportedAmount,
      remittedAmount: v.remittedAmount,
      submissionDate: v.submissionDate,
      remittanceDate: v.submissionDate,
      dueDate: `${v.period}-10`,
      memberCount: 50,
      status: v.expectedAmount === v.remittedAmount ? 'RECONCILED' : 'PARTIAL_PAYMENT',
      paymentReference: v.paymentReference || `IMP-REF-${Date.now().toString(36)}`,
      sourceChannel: 'BATCH_CSV',
      discrepancyAmount: Math.max(0, v.expectedAmount - v.remittedAmount),
      discrepancyPercent:
        v.expectedAmount > 0 ? (Math.max(0, v.expectedAmount - v.remittedAmount) / v.expectedAmount) * 100 : 0,
    }));

    importValidatedRecords(newContributionRecords, 'Batch_Contribution_Upload.csv');
    setImportSuccessMsg(`Successfully imported ${validRows.length} valid contribution records into active ledger!`);
    setTimeout(() => {
      setImportSuccessMsg(null);
      setActiveTab('contributions');
    }, 2500);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Contribution Data Import & Batch Validation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict schema verification, duplicate detection, and unmatched employer reference isolation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </button>

          <button
            onClick={handleLoadSampleProblematic}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
            <span>Load Test CSV with Mixed Errors</span>
          </button>
        </div>
      </div>

      {importSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* Upload & Paste Zone */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-lg p-6 text-center transition-colors">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-800">
            Select a contribution CSV file or drag and drop
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Expected headers: employer_id, employer_name, period, expected_amount, reported_amount, remitted_amount,
            submission_date, payment_ref
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="mt-3 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
          />
        </div>

        {/* Or Paste CSV Directly */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Or Paste Raw CSV Stream for Immediate Verification:
          </label>
          <textarea
            rows={4}
            placeholder="Paste CSV text with header row here..."
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              validateCSVText(e.target.value);
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white resize-y"
          />
        </div>
      </div>

      {/* Validation Summary Strip */}
      {validationStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500 font-medium">Total Rows Evaluated</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">{validationStats.total}</div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">Valid for Ingestion</div>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">{validationStats.valid}</div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">Rejected / Invalid</div>
              <div className="text-lg font-bold font-mono text-rose-600 mt-0.5">{validationStats.invalid}</div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">Duplicates Flagged</div>
              <div className="text-lg font-bold font-mono text-amber-600 mt-0.5">{validationStats.duplicates}</div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">Parsing Duration</div>
              <div className="text-lg font-bold font-mono text-slate-700 mt-0.5">{validationStats.durationMs}ms</div>
            </div>
          </div>

          {/* Validation Action Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-xs text-slate-600 font-medium">
              {validationStats.valid > 0 ? (
                <span>
                  Ready to import <strong className="text-slate-900">{validationStats.valid}</strong> clean records.{' '}
                  {validationStats.invalid > 0 && (
                    <span className="text-rose-600">
                      {validationStats.invalid} corrupt rows will be quarantined and excluded.
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-rose-600">No valid rows available to import. Resolve schema violations below.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {validationStats.invalid > 0 && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold shadow-2xs flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Download Error Log CSV</span>
                </button>
              )}

              <button
                onClick={handleConfirmImport}
                disabled={validationStats.valid === 0}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm disabled:opacity-40"
              >
                Confirm & Import Valid Records
              </button>
            </div>
          </div>

          {/* Parsed Preview Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
              Row-by-Row Ingestion Validation Preview
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Employer Ref</th>
                    <th className="py-2.5 px-3">Employer Name</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Expected (ZMW)</th>
                    <th className="py-2.5 px-3 text-right">Remitted (ZMW)</th>
                    <th className="py-2.5 px-3">Validation Findings & Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/70'}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-500 font-semibold">{row.rowIndex}</td>
                      <td className="py-2.5 px-3">
                        {row.isValid ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            VALID
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            REJECTED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{row.employerId}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{row.employerName}</td>
                      <td className="py-2.5 px-3 font-mono">{row.period}</td>
                      <td className="py-2.5 px-3 font-mono text-right">{formatZMW(row.expectedAmount)}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-semibold">{formatZMW(row.remittedAmount)}</td>
                      <td className="py-2.5 px-3 text-[11px]">
                        {row.isValid ? (
                          <span className="text-emerald-700 font-medium">Schema verified successfully</span>
                        ) : (
                          <ul className="list-disc list-inside text-rose-700 font-medium space-y-0.5">
                            {row.errors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
