import React, { useEffect, useState } from 'react';
import { ShieldCheck, Play, FolderPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  module34Api,
  SnapshotResponse,
  ComplianceFindingItem,
  DataQualityFindingItem,
} from '../../api/module34';
import { useApp } from '../../context/AppContext';

export const AnalysisFindingsPage: React.FC = () => {
  const { setActiveTab } = useApp();
  const [employers, setEmployers] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [employerId, setEmployerId] = useState<number>(0);
  const [periodId, setPeriodId] = useState<number>(0);
  const [lastSnapshot, setLastSnapshot] = useState<SnapshotResponse | null>(null);
  const [findings, setFindings] = useState<ComplianceFindingItem[]>([]);
  const [dqFindings, setDqFindings] = useState<DataQualityFindingItem[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [empRes, perRes, fRes, dqRes] = await Promise.all([
        fetch('/api/employers?size=100', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/contribution-periods?size=100', { credentials: 'include' }).then((r) => r.json()),
        module34Api.listComplianceFindings(),
        module34Api.listDataQualityFindings(),
      ]);
      const emps = empRes.content || empRes || [];
      const pers = perRes.content || perRes || [];
      setEmployers(emps);
      setPeriods(pers);
      setFindings(fRes);
      setDqFindings(dqRes);
      if (!employerId && emps.length) setEmployerId(emps[0].employerId);
      if (!periodId && pers.length) setPeriodId(pers[0].periodId);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRunning(true);
      setError(null);
      setMessage(null);
      const snap = await module34Api.executeAnalysis({ employerId, periodId, ruleCode: 'NAPSA_FORMAL' });
      setLastSnapshot(snap);
      setMessage(`Snapshot #${snap.snapshotId} (Run #${snap.runNumber}) completed: ${snap.overallResult}`);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleOpenCase = async (f: ComplianceFindingItem) => {
    try {
      setError(null);
      const created = await module34Api.createCase({
        title: `${f.findingCode}: Snapshot #${f.snapshotId}`,
        description: f.explanation,
        priority: (f.priorityScore ?? 0) >= 80 ? 'HIGH' : 'MEDIUM',
        findingIds: [f.findingId],
      });
      setMessage(`Opened Investigation Case ${created.caseRef} for finding #${f.findingId}.`);
      setActiveTab('cases');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm">
        <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold">
          Deterministic Compliance Engine
        </span>
        <h1 className="text-xl font-bold mt-1">Analysis Snapshots &amp; Compliance Findings</h1>
        <p className="text-xs text-slate-300 mt-1">
          Execute immutable SHA-256 sealed compliance runs against PostgreSQL evidence and escalate findings to investigation cases.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Run Analysis Form */}
      <form onSubmit={handleExecute} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Employer</label>
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
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Contribution Period</label>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
          >
            {periods.map((p) => (
              <option key={p.periodId} value={p.periodId}>
                {p.periodLabel || `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={running || !employerId || !periodId}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{running ? 'Executing Snapshot...' : 'Execute Compliance Snapshot'}</span>
        </button>
      </form>

      {/* Latest Snapshot Result Banner */}
      {lastSnapshot && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm text-slate-900">
              Snapshot #{lastSnapshot.snapshotId} · Run #{lastSnapshot.runNumber}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              lastSnapshot.overallResult === 'NO_ISSUE_DETECTED'
                ? 'bg-emerald-100 text-emerald-800'
                : lastSnapshot.overallResult === 'REQUIRES_REVIEW'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-200 text-slate-800'
            }`}>
              {lastSnapshot.overallResult}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500">Expected Statutory (ZMW)</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                {Number(lastSnapshot.totalExpected ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500">Employer Reported (ZMW)</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                {Number(lastSnapshot.totalReported ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-slate-500">Allocated Payments (ZMW)</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                {Number(lastSnapshot.totalAllocatedPayments ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-500 truncate">
            SHA-256 Fingerprint: {lastSnapshot.inputFingerprint}
          </div>
        </div>
      )}

      {/* Compliance Findings Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Persisted Compliance Findings ({findings.length})</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Snapshot</th>
                <th className="py-2.5 px-3">Rule / Code</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description &amp; Explanation</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {findings.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">No compliance findings persisted yet.</td></tr>
              ) : findings.map((f) => (
                <tr key={f.findingId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono">#{f.findingId}</td>
                  <td className="py-2.5 px-3 font-mono">#{f.snapshotId}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{f.findingCode}</td>
                  <td className="py-2.5 px-3">{f.category}</td>
                  <td className="py-2.5 px-3 max-w-md">
                    <div className="font-medium text-slate-900">{f.description}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{f.explanation}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold">{f.priorityScore ?? '-'}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold">{f.status}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => void handleOpenCase(f)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-blue-700 text-white rounded text-[11px] font-semibold"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>Open Case</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Quality Findings Table */}
      {dqFindings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider">
            Data Quality Findings ({dqFindings.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Snapshot</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dqFindings.map((dq) => (
                  <tr key={dq.dqFindingId}>
                    <td className="py-2.5 px-3 font-mono">#{dq.dqFindingId}</td>
                    <td className="py-2.5 px-3 font-mono">#{dq.snapshotId}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold">{dq.findingCode}</td>
                    <td className="py-2.5 px-3">{dq.severity}</td>
                    <td className="py-2.5 px-3">{dq.description}</td>
                    <td className="py-2.5 px-3">{dq.resolutionStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};