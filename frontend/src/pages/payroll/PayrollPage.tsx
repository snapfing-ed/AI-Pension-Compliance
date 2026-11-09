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
} from 'lucide-react';
import { PayrollBatch, PayrollRecord, module2Api } from '../../api/module2Api';

const BATCH_STATUS_BADGE: Record<string, string> = {
  VALIDATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIALLY_QUARANTINED: 'bg-amber-50 text-amber-700 border-amber-200',
  SUPERSEDED: 'bg-slate-100 text-slate-600 border-slate-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const RECORD_STATUS_BADGE: Record<string, string> = {
  VALID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  QUARANTINED: 'bg-red-50 text-red-700 border-red-200',
};

export const PayrollPage: React.FC<{ isAdmin: boolean }> = () => {
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const loadBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await module2Api.listBatches({ page, size: 15 });
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
    try {
      setRecordsLoading(true);
      const res = await module2Api.listBatchRecords(batch.batchId, { page: 0, size: 50 });
      setRecords(res?.content ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load batch records.');
    } finally {
      setRecordsLoading(false);
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
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
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
                <th className="py-3 px-4 font-semibold text-right">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Loading payroll batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No payroll batches imported yet.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr
                    key={b.batchId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedBatch?.batchId === b.batchId ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {b.batchRef}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      v{b.versionNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {b.employerRef || `Employer #${b.employerId}`}
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
              <span className="text-xs text-slate-400">(v{selectedBatch.versionNumber})</span>
            </div>
            <button
              onClick={() => setSelectedBatch(null)}
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
                  <th className="py-3 px-4 font-semibold">Quarantine Reason</th>
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
                    <tr key={r.recordId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {r.memberRef || `Member #${r.memberId}`}
                      </td>
                      <td className="py-3 px-4">{formatPay(r.grossPay)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                            RECORD_STATUS_BADGE[r.qualityStatus] ??
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {r.qualityStatus === 'VALID' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          {r.qualityStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {r.quarantineReason || <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};