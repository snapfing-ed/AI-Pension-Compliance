import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { module34Api, InvestigationCaseItem } from '../../api/module34';

export const InvestigationCasesPage: React.FC = () => {
  const [casesList, setCasesList] = useState<InvestigationCaseItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      setError(null);
      const data = await module34Api.listCases(statusFilter || undefined);
      setCasesList(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { void loadCases(); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const created = await module34Api.createCase({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setTitle('');
      setDescription('');
      setSuccess(`Created investigation case ${created.caseRef}.`);
      await loadCases();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleStatusChange = async (caseId: number, nextStatus: string) => {
    try {
      setError(null);
      await module34Api.updateCaseStatus(caseId, nextStatus, `Transitioned to ${nextStatus} via Case Workbench`);
      setSuccess(`Case #${caseId} updated to ${nextStatus}.`);
      await loadCases();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm">
        <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold">
          Module 4 · Compliance Case Management
        </span>
        <h1 className="text-xl font-bold mt-1">Investigation Cases &amp; Audit Disposition</h1>
        <p className="text-xs text-slate-300 mt-1">
          Track formal compliance investigations, linked snapshot findings, officer assignments, and statutory closures.
        </p>
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

      {/* Open New Case */}
      <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Open Investigation Case</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            required
            placeholder="Case Title (e.g. Q2 Under-Remittance Review)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
          />
          <input
            placeholder="Investigation Scope / Notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              Create Case
            </button>
          </div>
        </div>
      </form>

      {/* Filter + Cases Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>Investigation Cases ({casesList.length})</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="CLOSED">CLOSED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Case Ref</th>
                <th className="py-2.5 px-3">Title &amp; Notes</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Linked Findings</th>
                <th className="py-2.5 px-3">Assignee</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Workflow Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {casesList.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">No investigation cases found.</td></tr>
              ) : casesList.map((c) => (
                <tr key={c.caseId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{c.caseRef}</td>
                  <td className="py-2.5 px-3 max-w-md">
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    {c.description && <div className="text-[11px] text-slate-500 mt-0.5">{c.description}</div>}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      c.priority === 'CRITICAL' || c.priority === 'HIGH'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {c.linkedFindings.length > 0
                      ? c.linkedFindings.map((lf) => `#${lf.findingId}`).join(', ')
                      : 'None'}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {c.currentAssignedUserId ? `User #${c.currentAssignedUserId}` : 'Unassigned'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">{c.caseStatus}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={c.caseStatus}
                      onChange={(e) => void handleStatusChange(c.caseId, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-[11px]"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                      <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
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