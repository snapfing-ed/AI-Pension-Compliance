import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  UserCheck,
  X,
  FileText,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  ListOrdered,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InvestigationCase, CaseStatus, CaseOutcome, CasePriority } from '../types';
import { formatZMW, formatDate, formatDateTime } from '../utils/formatters';

export const InvestigationCasesView: React.FC = () => {
  const {
    cases,
    currentUser,
    activeDetailId,
    setActiveDetailId,
    updateCaseStatus,
    addCaseNote,
    assignCaseOfficer,
    overrideCasePriority,
    findings,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTabMode] = useState<'ALL_CASES' | 'PRIORITY_QUEUE'>('ALL_CASES');

  // Selected case for detail
  const selectedCase = useMemo(() => {
    return cases.find((c) => c.id === activeDetailId) || null;
  }, [cases, activeDetailId]);

  // Note form in detail modal
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<'NOTE' | 'COMMUNICATION' | 'EVIDENCE'>('NOTE');

  // Status transition form modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [nextStatus, setNextStatus] = useState<CaseStatus>('UNDER_REVIEW');
  const [selectedOutcome, setSelectedOutcome] = useState<CaseOutcome>('CONTRIBUTION_RECONCILED');
  const [outcomeSummary, setOutcomeSummary] = useState('');

  // Priority override modal
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [overridePriorityVal, setOverridePriorityVal] = useState<CasePriority>('HIGH');
  const [overrideReason, setOverrideReason] = useState('');

  // Officer reassignment state
  const [reassignOfficerId, setReassignOfficerId] = useState('USR-001');

  // Filtered cases
  const filteredCases = useMemo(() => {
    let list = [...cases];

    if (activeTab === 'PRIORITY_QUEUE') {
      // Show open/active cases sorted descending by priority score
      list = list.filter((c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED');
      list.sort((a, b) => b.priorityScore - a.priorityScore);
    }

    return list.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
      const matchesSearch =
        c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.employerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [cases, statusFilter, priorityFilter, searchQuery, activeTab]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !noteText.trim()) return;
    addCaseNote(selectedCase.id, noteText.trim(), noteType);
    setNoteText('');
  };

  const handleConfirmStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    updateCaseStatus(
      selectedCase.id,
      nextStatus,
      nextStatus === 'CLOSED' || nextStatus === 'RESOLVED' ? selectedOutcome : undefined,
      outcomeSummary
    );

    setShowStatusModal(false);
    setOutcomeSummary('');
  };

  const handleConfirmPriorityOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !overrideReason.trim()) return;

    overrideCasePriority(selectedCase.id, overridePriorityVal, overrideReason.trim());
    setShowPriorityModal(false);
    setOverrideReason('');
  };

  const handleReassignOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    assignCaseOfficer(selectedCase.id, reassignOfficerId);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Investigation Case Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Human-in-the-loop case lifecycle, officer assignment, and evidence-grounded outcomes
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTabMode('ALL_CASES')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'ALL_CASES'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Investigations ({cases.length})
          </button>
          <button
            onClick={() => setActiveTabMode('PRIORITY_QUEUE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'PRIORITY_QUEUE'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
            <span>Prioritised Work Queue</span>
          </button>
        </div>
      </div>

      {activeTab === 'PRIORITY_QUEUE' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Queue Prioritisation Methodology: </span>
          <span>
            Ranked by explicit multi-factor scoring: Monetary Exposure (up to 40 pts), Aging Overdue Latency (up to 25 pts),
            Absence of Schedule (20 pts), Employer Watch Status (15 pts), and Statistical Anomaly Divergence (15 pts).
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search cases by case number, employer, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="AWAITING_INFO">Awaiting Info</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent (80+ pts)</option>
            <option value="HIGH">High (60-79 pts)</option>
            <option value="MEDIUM">Medium (35-59 pts)</option>
            <option value="LOW">Low (&lt;35 pts)</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-3">Case Number</th>
                <th className="py-3 px-3">Employer</th>
                <th className="py-3 px-3">Subject / Allegation</th>
                <th className="py-3 px-3 text-right">Exposure (ZMW)</th>
                <th className="py-3 px-3">Priority Score</th>
                <th className="py-3 px-3">Workflow State</th>
                <th className="py-3 px-3">Assigned Officer</th>
                <th className="py-3 px-3">Target Due Date</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No investigation cases match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">{c.caseNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{c.employerName}</td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs truncate" title={c.title}>
                      {c.title}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-right text-slate-900">
                      {formatZMW(c.monetaryDiscrepancy)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                            c.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-800'
                              : c.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {c.priorityScore}
                        </span>
                        <span className="text-[11px] text-slate-500">{c.priority}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.status === 'RESOLVED' || c.status === 'CLOSED'
                            ? 'bg-emerald-50 text-emerald-800'
                            : c.status === 'ESCALATED'
                            ? 'bg-purple-100 text-purple-800'
                            : c.status === 'AWAITING_INFO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{c.assignedOfficerName}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{formatDate(c.dueDate)}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setActiveDetailId(c.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px]"
                      >
                        Open Case
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail & Workflow Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                    {selectedCase.caseNumber}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      selectedCase.status === 'RESOLVED' || selectedCase.status === 'CLOSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedCase.status === 'ESCALATED'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedCase.status.replace('_', ' ')}
                  </span>
                  <span className="text-slate-500 text-xs">Period: {selectedCase.reportingPeriod}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedCase.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Employer: <span className="font-semibold text-slate-900">{selectedCase.employerName}</span> (
                  {selectedCase.employerId})
                </p>
              </div>
              <button onClick={() => setActiveDetailId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Case Overview Strip */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Assigned Investigator:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{selectedCase.assignedOfficerName}</div>
                  <div className="text-[10px] text-slate-500">ID: {selectedCase.assignedOfficerId}</div>
                </div>

                <div>
                  <span className="text-slate-500">Monetary Exposure:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {formatZMW(selectedCase.monetaryDiscrepancy)}
                  </div>
                  <div className="text-[10px] text-slate-500">Target Discrepancy</div>
                </div>

                <div>
                  <span className="text-slate-500">Priority Score:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedCase.priorityScore}/100 ({selectedCase.priority})
                  </div>
                  <div className="text-[10px] text-slate-500 truncate" title={selectedCase.priorityReason}>
                    {selectedCase.priorityReason}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500">Compliance Due Date:</span>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {formatDate(selectedCase.dueDate)}
                  </div>
                  <div className="text-[10px] text-slate-500">Opened: {formatDate(selectedCase.openedAt)}</div>
                </div>
              </div>

              {/* Consequential Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100/70 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">Workflow Transitions:</span>
                  <button
                    onClick={() => {
                      setNextStatus('UNDER_REVIEW');
                      setShowStatusModal(true);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded font-medium shadow-2xs"
                  >
                    Set Under Review
                  </button>
                  <button
                    onClick={() => {
                      setNextStatus('AWAITING_INFO');
                      setShowStatusModal(true);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded font-medium shadow-2xs"
                  >
                    Awaiting Info
                  </button>
                  <button
                    onClick={() => {
                      setNextStatus('ESCALATED');
                      setShowStatusModal(true);
                    }}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded font-medium shadow-2xs"
                  >
                    Escalate to Supervisor
                  </button>
                  <button
                    onClick={() => {
                      setNextStatus('RESOLVED');
                      setShowStatusModal(true);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-2xs"
                  >
                    Record Outcome & Resolve
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPriorityModal(true)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded font-medium shadow-2xs"
                  >
                    Override Priority
                  </button>
                </div>
              </div>

              {/* Resolved Outcome Card if exists */}
              {selectedCase.finalOutcome && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900">
                      Final Investigation Outcome: {selectedCase.finalOutcome.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-mono">
                      Closed by {selectedCase.closedBy} · {formatDateTime(selectedCase.closedAt)}
                    </span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed mt-1">{selectedCase.outcomeSummary}</p>
                </div>
              )}

              {/* Reassignment Row */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-medium text-slate-700">Reassign Investigator:</span>
                <select
                  value={reassignOfficerId}
                  onChange={(e) => setReassignOfficerId(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1"
                >
                  <option value="USR-001">Kondwani Phiri (Compliance Officer)</option>
                  <option value="USR-002">Mutale Mwamba (Compliance Supervisor)</option>
                  <option value="USR-003">Chileshe Banda (System Administrator)</option>
                </select>
                <button
                  onClick={handleReassignOfficer}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium"
                >
                  Update Assignment
                </button>
              </div>

              {/* Investigation Audit / Notes Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Investigation Activity & Evidence Log
                </h4>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedCase.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800">{note.authorName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{formatDateTime(note.timestamp)}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            {note.noteType}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Add Entry or Evidence Note:</label>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Entry Type:</span>
                    <select
                      value={noteType}
                      onChange={(e: any) => setNoteType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700"
                    >
                      <option value="NOTE">Standard Progress Note</option>
                      <option value="COMMUNICATION">Employer Communication</option>
                      <option value="EVIDENCE">Bank / Treasury Evidence</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter factual case notes, verification steps, or communication log..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white resize-none"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Log Note</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveDetailId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Transition Modal with Required Outcome for Resolution */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900">Transition Investigation Case Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Status: <span className="font-semibold text-slate-900">{nextStatus}</span>
            </p>

            <form onSubmit={handleConfirmStatusChange} className="mt-4 space-y-3.5 text-xs">
              {(nextStatus === 'RESOLVED' || nextStatus === 'CLOSED') && (
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Recorded Investigation Outcome *
                  </label>
                  <select
                    value={selectedOutcome}
                    onChange={(e: any) => setSelectedOutcome(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-medium focus:outline-none focus:border-teal-500"
                  >
                    <option value="CONTRIBUTION_RECONCILED">Contribution Reconciled</option>
                    <option value="EXPLANATION_RECEIVED">Explanation Received & Accepted</option>
                    <option value="CONFIRMED_DATA_ERROR">Confirmed Data / Submission Error</option>
                    <option value="NO_ISSUE_IDENTIFIED">No Issue Identified (Legitimate Shift)</option>
                    <option value="FURTHER_ACTION_REQUIRED">Further Action Required (Audit Referral)</option>
                    <option value="INCONCLUSIVE">Inconclusive (Awaiting Third-Party)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Resolution Summary / Rationale *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize the verification steps taken and factual justification for this transition..."
                  value={outcomeSummary}
                  onChange={(e) => setOutcomeSummary(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-sm"
                >
                  Confirm Transition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Priority Override Modal */}
      {showPriorityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900">Manual Priority Override</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorised officers may adjust urgency with an auditable justification.
            </p>

            <form onSubmit={handleConfirmPriorityOverride} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Override Priority Level</label>
                <select
                  value={overridePriorityVal}
                  onChange={(e: any) => setOverridePriorityVal(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                >
                  <option value="URGENT">Urgent Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Justification for Override *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record why this case priority is being manually modified..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPriorityModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-sm"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
