import React, { useEffect, useState } from 'react';
import { Receipt, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { module34Api, SubmittedReturnItem, PaymentTransactionItem, CompletenessItem } from '../../api/module34';

interface Props {
  isAdmin: boolean;
}

export const ReturnsPaymentsPage: React.FC<Props> = ({ isAdmin }) => {
  const [employers, setEmployers] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [returnsList, setReturnsList] = useState<SubmittedReturnItem[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentTransactionItem[]>([]);
  const [completenessList, setCompletenessList] = useState<CompletenessItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Return form
  const [employerId, setEmployerId] = useState<number>(0);
  const [periodId, setPeriodId] = useState<number>(0);
  const [sourceId, setSourceId] = useState<number>(0);
  const [returnRef, setReturnRef] = useState('');
  const [reportedEe, setReportedEe] = useState('1000.00');
  const [reportedEr, setReportedEr] = useState('1000.00');

  // Payment + Allocation form
  const [txRef, setTxRef] = useState('');
  const [txAmount, setTxAmount] = useState('2000.00');
  const [assessmentStatus, setAssessmentStatus] = useState('COMPLETE');

  const loadAll = async () => {
    try {
      setError(null);
      const [empRes, perRes, srcRes, retRes, payRes, compRes] = await Promise.all([
        fetch('/api/employers?size=100', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/contribution-periods?size=100', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/data-sources?size=100', { credentials: 'include' }).then((r) => r.json()),
        module34Api.listReturns(),
        module34Api.listPayments(),
        module34Api.listCompleteness(),
      ]);
      const emps = empRes.content || empRes || [];
      const pers = perRes.content || perRes || [];
      const srcs = srcRes.content || srcRes || [];
      setEmployers(emps);
      setPeriods(pers);
      setSources(srcs);
      setReturnsList(Array.isArray(retRes) ? retRes : ((retRes as any)?.content ?? []));
      setPaymentsList(Array.isArray(payRes) ? payRes : ((payRes as any)?.content ?? []));
      setCompletenessList(Array.isArray(compRes) ? compRes : ((compRes as any)?.content ?? []));
      if (!employerId && emps.length) setEmployerId(emps[0].employerId);
      if (!periodId && pers.length) setPeriodId(pers[0].periodId);
      if (!sourceId && srcs.length) setSourceId(srcs[0].sourceId);
    } catch (e: any) {
      setError(e.message || 'Failed to load returns and payments.');
    }
  };

  useEffect(() => { void loadAll(); }, []);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const ee = Number(reportedEe);
      const er = Number(reportedEr);
      const tot = ee + er;
      await module34Api.submitReturn({
        employerId,
        periodId,
        sourceId,
        returnType: 'STANDARD',
        returnRef: returnRef.trim(),
        reportedEmployeeAmount: ee,
        reportedEmployerAmount: er,
        reportedTotalAmount: tot,
        completenessStatus: 'COMPLETE',
        lines: [
          {
            lineRef: 'L1',
            reportedPay: tot * 10,
            reportedEmployeeAmount: ee,
            reportedEmployerAmount: er,
            reportedTotalAmount: tot,
            lineStatus: 'VALID',
          },
        ],
      });
      setReturnRef('');
      setSuccess('Contribution return submitted and versioned in PostgreSQL.');
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRecordAndAllocatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const amt = Number(txAmount);
      const emp = employers.find((x) => x.employerId === employerId);
      const pay = await module34Api.recordPayment({
        sourceId,
        externalTransactionRef: txRef.trim(),
        employerRefAsReceived: emp?.employerRef || `EMP-${employerId}`,
        transactionAmount: amt,
        currencyCode: 'ZMW',
        transactionStatus: 'CONFIRMED',
      });
      await module34Api.allocatePayment({
        paymentId: pay.paymentId,
        employerId,
        periodId,
        allocatedAmount: amt,
      });
      setTxRef('');
      setSuccess(`Recorded payment ${pay.externalTransactionRef} and allocated ${amt.toFixed(2)} ZMW.`);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRecordCompleteness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const per = periods.find((p) => p.periodId === periodId);
      await module34Api.recordCompleteness({
        sourceId,
        scopeType: 'EMPLOYER_PERIOD',
        scopeStart: per?.periodStart || '2026-01-01',
        scopeEnd: per?.periodEnd || '2026-01-31',
        employerId,
        periodId,
        assessmentStatus,
        evidenceNotes: 'Recorded via Returns & Payments reconciliation console.',
      });
      setSuccess(`Recorded scope completeness assessment (${assessmentStatus}).`);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold">
            Reconciliation Ledger
          </span>
          <h1 className="text-xl font-bold mt-1">Returns, Payments &amp; Scope Completeness</h1>
          <p className="text-xs text-slate-300 mt-1">
            Submit employer contribution returns, allocate confirmed bank remittances, and attest period data completeness.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Shared Context Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Target Employer</label>
          <select
            value={employerId}
            onChange={(e) => setEmployerId(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
          >
            {employers.map((em) => (
              <option key={em.employerId} value={em.employerId}>
                {em.employerRef} — {em.legalName || em.employerName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Contribution Period</label>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
          >
            {periods.map((p) => (
              <option key={p.periodId} value={p.periodId}>
                {p.periodLabel || `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`} ({p.status})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Data Source</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
          >
            {sources.map((s) => (
              <option key={s.sourceId} value={s.sourceId}>
                {s.sourceName} ({s.sourceType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submit Return */}
          <form onSubmit={handleSubmitReturn} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>1. Submit Contribution Return</span>
            </div>
            <input
              required
              placeholder="Return Ref (e.g. RET-2026-001)"
              value={returnRef}
              onChange={(e) => setReturnRef(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Employee (ZMW)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={reportedEe}
                  onChange={(e) => setReportedEe(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Employer (ZMW)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={reportedEr}
                  onChange={(e) => setReportedEr(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              Submit Return
            </button>
          </form>

          {/* Record & Allocate Payment */}
          <form onSubmit={handleRecordAndAllocatePayment} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>2. Record &amp; Allocate Payment</span>
            </div>
            <input
              required
              placeholder="Bank Transaction Ref (e.g. BOZ-TX-901)"
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Confirmed Remittance Amount (ZMW)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              Record &amp; Allocate
            </button>
          </form>

          {/* Completeness Assessment */}
          <form onSubmit={handleRecordCompleteness} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>3. Scope Completeness</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Assessment Status</label>
              <select
                value={assessmentStatus}
                onChange={(e) => setAssessmentStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
              >
                <option value="COMPLETE">COMPLETE</option>
                <option value="INCOMPLETE">INCOMPLETE</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-500">
              Attests whether all expected payroll, return, and remittance feeds for the selected employer and period have arrived.
            </p>
            <button
              type="submit"
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Save Completeness Assessment
            </button>
          </form>
        </div>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider">
            Submitted Returns ({returnsList.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Return Ref</th>
                  <th className="py-2.5 px-3">Employer</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnsList.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-400">No returns recorded yet.</td></tr>
                ) : (Array.isArray(returnsList) ? returnsList : []).map((r) => (
                  <tr key={r.returnId}>
                    <td className="py-2.5 px-3 font-mono font-semibold">{r.returnRef}</td>
                    <td className="py-2.5 px-3">#{r.employerId}</td>
                    <td className="py-2.5 px-3">#{r.periodId}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">{r.returnStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider">
            Payment Transactions ({paymentsList.length}) · Assessments ({completenessList.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Transaction Ref</th>
                  <th className="py-2.5 px-3">Amount (ZMW)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsList.length === 0 ? (
                  <tr><td colSpan={3} className="py-6 text-center text-slate-400">No payment transactions recorded yet.</td></tr>
                ) : (Array.isArray(paymentsList) ? paymentsList : []).map((p) => (
                  <tr key={p.paymentId}>
                    <td className="py-2.5 px-3 font-mono font-semibold">{p.externalTransactionRef || `#${p.paymentId}`}</td>
                    <td className="py-2.5 px-3 font-mono">{Number(p.transactionAmount).toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">{p.transactionStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};