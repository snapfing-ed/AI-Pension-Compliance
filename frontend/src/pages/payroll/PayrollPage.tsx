import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldAlert,
  CheckCircle2,
  X,
  Upload,
} from 'lucide-react';
import {
  ContributionPeriod,
  DataSource,
  Employer,
  PayrollBatch,
  PayrollImportResponse,
  PayrollQuarantineRecord,
  PayrollRecord,
  module2Api,
} from '../../api/module2Api';

const BATCH_STATUS_BADGE: Record<string, string> = {
  RECEIVED: 'bg-blue-50 text-blue-700 border-blue-200',
  VALIDATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  SUPERSEDED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const RECORD_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  VALID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ISSUE: 'bg-orange-50 text-orange-700 border-orange-200',
};

export const PayrollPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [quarantineRecords, setQuarantineRecords] = useState<PayrollQuarantineRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importOptionsLoading, setImportOptionsLoading] = useState(false);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [correctionCandidates, setCorrectionCandidates] = useState<PayrollBatch[]>([]);
  const [supersedesBatchId, setSupersedesBatchId] = useState('');
  const [employerId, setEmployerId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [batchRef, setBatchRef] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<PayrollImportResponse | null>(null);

  const loadBatches = async (pageIndex = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await module2Api.listBatches({ page: pageIndex, size: 15 });
      setBatches(res?.content ?? []);
      setTotalPages(Math.max(1, res?.totalPages ?? 1));
      setTotalElements(res?.totalElements ?? 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load payroll batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [page]);

  const inspectBatch = async (batch: PayrollBatch) => {
    setSelectedBatch(batch);
    setRecords([]);
    setQuarantineRecords([]);
    setError(null);
    try {
      setRecordsLoading(true);
      const [recordsRes, quarantineRes] = await Promise.all([
        module2Api.listBatchRecords(batch.payrollBatchId, { page: 0, size: 50 }),
        module2Api.listBatchQuarantine(batch.payrollBatchId, { page: 0, size: 50 }),
      ]);
      setRecords(recordsRes?.content ?? []);
      setQuarantineRecords(quarantineRes?.content ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load batch records.');
    } finally {
      setRecordsLoading(false);
    }
  };

  const openImportForm = async () => {
    setShowImportForm(true);
    if (employers.length || importOptionsLoading) return;
    try {
      setImportOptionsLoading(true);
      const [employerPage, availablePeriods, availableSources] = await Promise.all([
        module2Api.listEmployers({ page: 0, size: 100 }),
        module2Api.listPeriods(),
        module2Api.listDataSources(),
      ]);
      setEmployers(employerPage.content.filter((employer) => employer.status === 'ACTIVE'));
      setPeriods(availablePeriods.filter((period) => period.status !== 'ARCHIVED'));
      setSources(availableSources.filter((source) => source.status === 'ACTIVE'));
      const existingBatchPage = await module2Api.listBatches({ page: 0, size: 100 });
      setCorrectionCandidates(existingBatchPage.content.filter((batch) => batch.current && batch.status === 'VALIDATED'));
    } catch (e: any) {
      setError(e.message || 'Could not load employers, periods, and data sources for import.');
    } finally {
      setImportOptionsLoading(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employerId || !periodId || !sourceId || !batchRef.trim() || !csvFile) return;
    try {
      setImportSubmitting(true);
      setError(null);
      const result = await module2Api.importPayrollCsv({
        employerId: Number(employerId),
        periodId: Number(periodId),
        sourceId: Number(sourceId),
        batchRef: batchRef.trim(),
        file: csvFile,
        supersedesBatchId: supersedesBatchId ? Number(supersedesBatchId) : undefined,
      });
      setImportResult(result);
      setShowImportForm(false);
      setCsvFile(null);
      setSupersedesBatchId('');
      setSelectedBatch(null);
      setRecords([]);
      setQuarantineRecords([]);
      setPage(0);
      await loadBatches(0);
    } catch (e: any) {
      setError(e.message || 'Payroll batch import failed.');
    } finally {
      setImportSubmitting(false);
    }
  };

  const formatPay = (val: number | null | undefined) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-400 italic font-mono text-xs">NULL (Missing)</span>;
    }
    return (
      <span className="font-mono text-slate-900">
        {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            Immutable Payroll Ingestion
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Batches &amp; Records</h1>
          <p className="text-slate-300 text-sm mt-1">
            Inspect versioned payroll imports, supersession history, and row-level quarantine findings.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openImportForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {importResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-semibold">
            Import complete: {importResult.batch.batchRef} v{importResult.batch.versionNo} ({importResult.batch.status})
          </div>
          <p className="mt-1">
            {importResult.totalRowsEvaluated} rows checked; {importResult.validRecordCount + importResult.missingPayRecordCount} stored; {importResult.quarantinedRecordCount} quarantined; {importResult.autoCreatedMemberCount} members created.
          </p>
          {importResult.quarantinedRowsTruncated && (
            <p className="mt-1 text-xs">The import response shortened its quarantine preview. Use Inspect for the full paginated list.</p>
          )}
          <button
            onClick={() => setImportResult(null)}
            className="mt-2 text-xs font-semibold text-emerald-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showImportForm && isAdmin && (
        <form onSubmit={handleImportCsv} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Import payroll CSV</h2>
              <p className="mt-1 text-xs text-slate-500">
                Required columns: member_ref and eligible_gross_pay. Optional: source_member_ref, source_row_ref, payroll_status.
              </p>
              <a
                href="data:text/csv;charset=utf-8,member_ref%2Celigible_gross_pay%2Csource_member_ref%2Csource_row_ref%2Cpayroll_status%0AMBR-001%2C20000.00%2CPAYROLL-001%2CROW-1%2CACTIVE"
                download="payroll-import-template.csv"
                className="mt-2 inline-block text-xs font-semibold text-blue-700 underline"
              >
                Download CSV template
              </a>
            </div>
            <button
              type="button"
              onClick={() => setShowImportForm(false)}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close import form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {importOptionsLoading ? (
            <p className="text-sm text-slate-500">Loading import options…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Correct existing batch (optional)</span>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={supersedesBatchId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSupersedesBatchId(id);
                      const prior = correctionCandidates.find((batch) => String(batch.payrollBatchId) === id);
                      if (prior) {
                        setEmployerId(String(prior.employerId));
                        setPeriodId(String(prior.periodId));
                        setSourceId(String(prior.sourceId));
                        setBatchRef(prior.batchRef);
                      }
                    }}
                  >
                    <option value="">New batch</option>
                    {correctionCandidates.map((batch) => (
                      <option key={batch.payrollBatchId} value={batch.payrollBatchId}>
                        {batch.batchRef} v{batch.versionNo} · {batch.employerLegalName} · {batch.periodLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Employer</span>
                  <select required value={employerId} onChange={(e) => setEmployerId(e.target.value)} disabled={Boolean(supersedesBatchId)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100">
                    <option value="">Select employer</option>
                    {employers.map((employer) => <option key={employer.employerId} value={employer.employerId}>{employer.legalName} ({employer.employerRef})</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Contribution period</span>
                  <select required value={periodId} onChange={(e) => setPeriodId(e.target.value)} disabled={Boolean(supersedesBatchId)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100">
                    <option value="">Select period</option>
                    {periods.map((period) => <option key={period.periodId} value={period.periodId}>{period.periodLabel} ({period.status})</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Data source</span>
                  <select required value={sourceId} onChange={(e) => setSourceId(e.target.value)} disabled={Boolean(supersedesBatchId)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100">
                    <option value="">Select data source</option>
                    {sources.map((source) => <option key={source.sourceId} value={source.sourceId}>{source.sourceCode} · {source.sourceName}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Batch reference</span>
                  <input required maxLength={100} value={batchRef} onChange={(e) => setBatchRef(e.target.value)} disabled={Boolean(supersedesBatchId)} placeholder="e.g. PAYROLL-2026-11" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>CSV file</span>
                  <input required type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
              {(employers.length === 0 || periods.length === 0 || sources.length === 0) && (
                <p className="text-sm text-amber-700">
                  Import needs an active employer, a non-archived period, and an active data source. Configure these in their management pages first.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowImportForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                <button type="submit" disabled={importSubmitting || importOptionsLoading || !employers.length || !periods.length || !sources.length || !csvFile} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {importSubmitting ? 'Importing…' : 'Import batch'}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Batches Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>Imported Payroll Batches</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
              {totalElements}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Batch Ref</th>
                <th className="py-3 px-4 font-semibold">Version</th>
                <th className="py-3 px-4 font-semibold">Employer</th>
                <th className="py-3 px-4 font-semibold">Period</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Stored / Quarantined</th>
                <th className="py-3 px-4 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Loading payroll batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No payroll batches imported yet.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr
                    key={b.payrollBatchId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedBatch?.payrollBatchId === b.payrollBatchId ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {b.batchRef}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      v{b.versionNo}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {b.employerLegalName || b.employerRef || `Employer #${b.employerId}`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {b.periodLabel || `Period #${b.periodId}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          BATCH_STATUS_BADGE[b.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono text-xs text-slate-700">
                        {b.totalRecordsStored} / {b.quarantinedRecordCount}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => inspectBatch(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-medium text-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
          <span>
            Page <strong className="text-slate-900">{page + 1}</strong> of{' '}
            <strong className="text-slate-900">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 font-medium"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Batch Records Inspector */}
      {selectedBatch && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>Batch Records:</span>
              <code className="font-mono text-blue-300">{selectedBatch.batchRef}</code>
              <span className="text-xs text-slate-400">(v{selectedBatch.versionNo})</span>
              <span className="text-xs text-slate-400">{selectedBatch.status}</span>
            </div>
            <button
              onClick={() => {
                setSelectedBatch(null);
                setRecords([]);
                setQuarantineRecords([]);
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Member Ref</th>
                  <th className="py-3 px-4 font-semibold">Gross Pay (ZMW)</th>
                  <th className="py-3 px-4 font-semibold">Quality Status</th>
                  <th className="py-3 px-4 font-semibold">Payroll Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recordsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Loading batch records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No records found in this batch.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.payrollRecordId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {r.memberRef || `Member #${r.memberId}`}
                      </td>
                      <td className="py-3 px-4">{formatPay(r.eligibleGrossPay)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                            RECORD_STATUS_BADGE[r.dataQualityStatus] ??
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {r.dataQualityStatus === 'VALID' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          {r.dataQualityStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {r.payrollStatus || <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200">
            <div className="px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700">
              Quarantined rows ({selectedBatch.quarantinedRecordCount})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Row</th>
                    <th className="py-3 px-4 font-semibold">Member Ref</th>
                    <th className="py-3 px-4 font-semibold">Raw Gross Pay</th>
                    <th className="py-3 px-4 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recordsLoading ? (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-500">Loading quarantine details...</td></tr>
                  ) : quarantineRecords.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-500">No quarantined rows in this batch.</td></tr>
                  ) : quarantineRecords.map((q) => (
                    <tr key={q.quarantineRecordId} className="align-top">
                      <td className="py-3 px-4">{q.rowNumber}</td>
                      <td className="py-3 px-4 font-mono">{q.rawMemberRef || '—'}</td>
                      <td className="py-3 px-4 font-mono">{q.rawEligibleGrossPay || '—'}</td>
                      <td className="py-3 px-4 text-xs text-slate-600"><span className="font-semibold text-red-700">{q.reasonCode}: </span>{q.reasonDetail}</td>
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
