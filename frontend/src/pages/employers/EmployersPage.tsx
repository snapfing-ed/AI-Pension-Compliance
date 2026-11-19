import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Upload,
  Search,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  Filter,
  Users,
} from 'lucide-react';
import { Employer, Member, module2Api } from '../../api/module2Api';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
};

const EMPLOYER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

export const EmployersPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [items, setItems] = useState<Employer[]>([]);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Create Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRef, setNewRef] = useState('');
  const [newLegalName, setNewLegalName] = useState('');
  const [newTradingName, setNewTradingName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inline Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLegalName, setEditLegalName] = useState('');
  const [editTradingName, setEditTradingName] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Employee Roster Drill-Down State
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [employerMembers, setEmployerMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await module2Api.listEmployers({
        q: q || undefined,
        status: statusFilter || undefined,
        page,
        size: 15,
      });
      setItems(res?.content ?? []);
      setTotalPages(Math.max(1, res?.totalPages ?? 1));
      setTotalElements(res?.totalElements ?? 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load employers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, q, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== q) {
        setPage(0);
        setQ(trimmed);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, q]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setQ(searchInput.trim());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRef.trim() || !newLegalName.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await module2Api.createEmployer({
        employerRef: newRef.trim(),
        legalName: newLegalName.trim(),
        tradingName: newTradingName.trim() || undefined,
      });
      setNewRef('');
      setNewLegalName('');
      setNewTradingName('');
      setShowCreateForm(false);
      setPage(0);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to create employer.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (emp: Employer) => {
    setEditingId(emp.employerId);
    setEditLegalName(emp.legalName);
    setEditTradingName(emp.tradingName ?? '');
    setEditStatus(emp.status);
  };

  const saveEdit = async (employerId: number) => {
    try {
      setError(null);
      await module2Api.updateEmployer(employerId, {
        legalName: editLegalName.trim(),
        tradingName: editTradingName.trim() || undefined,
        status: editStatus,
      });
      setEditingId(null);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to update employer.');
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvContent(String(ev.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    try {
      setImporting(true);
      setError(null);
      setImportResult(null);

      const lines = csvContent.trim().split(/\r?\n/);
      let successCount = 0;
      let skippedCount = 0;

      const startIndex = lines[0].toLowerCase().includes('employerref') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [employerRef, legalName, tradingName] = line.split(',').map((s) => s.trim());
        if (employerRef && legalName) {
          try {
            await module2Api.createEmployer({
              employerRef,
              legalName,
              tradingName: tradingName || undefined,
            });
            successCount++;
          } catch {
            skippedCount++;
          }
        }
      }

      setImportResult(
        `Imported ${successCount} employer(s)${skippedCount > 0 ? ` (${skippedCount} skipped/duplicate)` : ''}.`
      );
      setCsvContent('');
      setPage(0);
      load();
    } catch (e: any) {
      setError(e.message || 'CSV import failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleViewRoster = async (emp: Employer) => {
    setSelectedEmployer(emp);
    setEmployerMembers([]);
    try {
      setLoadingMembers(true);
      const batchPage = await module2Api.listBatches({ employerId: emp.employerId, size: 20 });
      const currentBatch = (batchPage?.content ?? []).find((b) => b.current) ?? (batchPage?.content ?? [])[0];
      if (!currentBatch) {
        setEmployerMembers([]);
        return;
      }
      const recordsPage = await module2Api.listBatchRecords(currentBatch.payrollBatchId, { page: 0, size: 200 });
      const seen = new Set<string>();
      const scopedMembers: Member[] = [];
      for (const r of recordsPage?.content ?? []) {
        if (r.memberRef && !seen.has(r.memberRef)) {
          seen.add(r.memberRef);
          scopedMembers.push({
            memberId: r.memberId,
            memberRef: r.memberRef,
            status: r.payrollStatus || 'ACTIVE',
          } as Member);
        }
      }
      setEmployerMembers(scopedMembers);
    } catch (e: any) {
      setError(e.message || 'Failed to load employer members.');
    } finally {
      setLoadingMembers(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            Employer Cadastre
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Employers Directory</h1>
          <p className="text-slate-300 text-sm mt-1">
            Register new employers individually or via CSV, manage legal/trading names, and update operational status.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button
              onClick={() => setShowCreateForm((v) => !v)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? 'Close Form' : 'New Employer'}
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manual Create Employer Form */}
      {isAdmin && showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Register New Employer</h2>
            <span className="text-xs text-slate-500">Employer reference is unique and immutable</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Employer Reference *</label>
              <input
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g. EMP-2026-001"
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Legal Name *</label>
              <input
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g. Zambezi Holdings Ltd"
                value={newLegalName}
                onChange={(e) => setNewLegalName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Trading Name (Optional)</label>
              <input
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Zambezi Logistics"
                value={newTradingName}
                onChange={(e) => setNewTradingName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {submitting ? 'Saving...' : 'Create Employer'}
            </button>
          </div>
        </form>
      )}

      {/* Filters & Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>Registered Employers</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
              {totalElements}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              className="border border-slate-300 px-3 py-1.5 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => {
                setPage(0);
                setStatusFilter(e.target.value);
              }}
            >
              <option value="">All Statuses</option>
              {EMPLOYER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="border border-slate-300 pl-9 pr-3 py-1.5 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search ref or name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Reference</th>
                <th className="py-3 px-4 font-semibold">Legal Name</th>
                <th className="py-3 px-4 font-semibold">Trading Name</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Loading employers...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    No employers found. Click <strong>New Employer</strong> or <strong>Import CSV</strong> to add one.
                  </td>
                </tr>
              ) : (
                items.map((emp) => {
                  const isEditing = editingId === emp.employerId;
                  return (
                    <tr key={emp.employerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {emp.employerRef}
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input
                            className="w-full border border-slate-300 px-2.5 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editLegalName}
                            onChange={(e) => setEditLegalName(e.target.value)}
                          />
                        ) : (
                          <span className="font-medium text-slate-900">{emp.legalName}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {isEditing ? (
                          <input
                            className="w-full border border-slate-300 px-2.5 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editTradingName}
                            onChange={(e) => setEditTradingName(e.target.value)}
                          />
                        ) : (
                          emp.tradingName || <span className="text-slate-400">Ã¢â‚¬â€</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <select
                            className="border border-slate-300 px-2.5 py-1 rounded-md text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                          >
                            {EMPLOYER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                              STATUS_BADGE[emp.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {emp.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleViewRoster(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-medium text-blue-600 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Employees
                          </button>
                          {isAdmin && (
                            isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(emp.employerId)}
                                  className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                                  title="Save changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-600"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEdit(emp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-medium text-slate-700 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Import Employers CSV</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Upload .CSV File (Optional)
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Or Paste CSV Rows (employerRef, legalName, tradingName)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={"employerRef,legalName,tradingName\nEMP-ZM-3001,Zambia Sugar PLC,Zambia Sugar"}
                  className="w-full border border-slate-300 p-3 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                />
              </div>
              {importResult && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importResult}</span>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportResult(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
                >
                  {importing ? 'Importing...' : 'Upload & Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Roster Modal */}
      {selectedEmployer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selectedEmployer.legalName}</h3>
                <span className="text-xs font-mono text-slate-500">Ref: {selectedEmployer.employerRef}</span>
              </div>
              <button onClick={() => setSelectedEmployer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">
                Registered Members / Employees Roster
              </h4>
              {loadingMembers ? (
                <p className="text-center py-8 text-slate-500 text-sm">Loading staff roster...</p>
              ) : employerMembers.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-sm">No payroll employees recorded for this employer yet.</p>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold">Member ID</th>
                      <th className="py-2.5 px-3 font-semibold">Member Ref</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employerMembers.map((m) => (
                      <tr key={m.memberId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{m.memberId}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{m.memberRef}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEmployer(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};