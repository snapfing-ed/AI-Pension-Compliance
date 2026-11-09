import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { Employer, module2Api } from '../../api/module2Api';

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

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRef, setNewRef] = useState('');
  const [newLegalName, setNewLegalName] = useState('');
  const [newTradingName, setNewTradingName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLegalName, setEditLegalName] = useState('');
  const [editTradingName, setEditTradingName] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

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
            Manage registered employers, legal/trading names, and operational status.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showCreateForm ? 'Close Form' : 'New Employer'}
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

      {/* Create Employer Card */}
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Employer Reference</label>
              <input
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g. EMP-2026-001"
                value={newRef}
                onChange={(e) => setNewRef(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Legal Name</label>
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
                {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-10 text-center text-slate-500">
                    Loading employers...
                  </td>
                </tr>
              ) : (items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-10 text-center text-slate-500">
                    No employers found.
                  </td>
                </tr>
              ) : (
                (items ?? []).map((emp) => {
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
                          emp.tradingName || <span className="text-slate-400">—</span>
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
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1.5">
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
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-medium text-slate-700 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          )}
                        </td>
                      )}
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
    </div>
  );
};