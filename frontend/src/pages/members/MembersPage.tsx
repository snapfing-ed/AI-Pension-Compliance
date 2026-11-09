import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import { Member, module2Api } from '../../api/module2Api';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const MembersPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [items, setItems] = useState<Member[]>([]);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRef, setNewRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await module2Api.listMembers({ q: q || undefined, page, size: 15 });
      setItems(res?.content ?? []);
      setTotalPages(Math.max(1, res?.totalPages ?? 1));
      setTotalElements(res?.totalElements ?? 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, q]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setQ(searchInput.trim());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRef.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await module2Api.createMember({ memberRef: newRef.trim() });
      setNewRef('');
      setShowCreateForm(false);
      setPage(0);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to create member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            Privacy-Preserving Registry
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Members Directory</h1>
          <p className="text-slate-300 text-sm mt-1">
            Pseudonymous member references only — no personal identifiable data is stored or displayed.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            {showCreateForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showCreateForm ? 'Close Form' : 'New Member'}
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

      {/* Create Member Card */}
      {isAdmin && showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Register Pseudonymous Member</h2>
            <span className="text-xs text-slate-500">
              Members are also auto-created during payroll batch imports
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g. MEM-2026-0001"
              value={newRef}
              onChange={(e) => setNewRef(e.target.value)}
            />
            <div className="flex gap-2">
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
                {submitting ? 'Saving...' : 'Save Member'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search & Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Registered Members</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
              {totalElements}
            </span>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="border border-slate-300 pl-9 pr-3 py-1.5 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search member ref..."
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Member ID</th>
                <th className="py-3 px-4 font-semibold">Pseudonymous Reference</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-slate-500">
                    Loading members...
                  </td>
                </tr>
              ) : (items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-slate-500">
                    No members found.
                  </td>
                </tr>
              ) : (
                (items ?? []).map((m) => (
                  <tr key={m.memberId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">#{m.memberId}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{m.memberRef}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          STATUS_BADGE[m.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.status}
                      </span>
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
    </div>
  );
};