import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Upload,
  Search,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Member, module2Api } from '../../api/module2Api';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const MembersPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Create Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMemberRef, setNewMemberRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await module2Api.listMembers({
        q: q || undefined,
        page,
        size: 15,
      });
      setMembers(res?.content ?? []);
      setTotalPages(Math.max(1, res?.totalPages ?? 1));
      setTotalElements(res?.totalElements ?? 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load members directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [page, q]);

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

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberRef.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await module2Api.createMember({
        memberRef: newMemberRef.trim(),
      });
      setNewMemberRef('');
      setShowCreateForm(false);
      setPage(0);
      loadMembers();
    } catch (e: any) {
      setError(e.message || 'Failed to register member.');
    } finally {
      setSubmitting(false);
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

      const startIndex = lines[0].toLowerCase().includes('memberref') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [memberRef] = line.split(',').map((s) => s.trim());
        if (memberRef) {
          try {
            await module2Api.createMember({ memberRef });
            successCount++;
          } catch {
            skippedCount++;
          }
        }
      }

      setImportResult(
        `Imported ${successCount} member(s)${skippedCount > 0 ? ` (${skippedCount} skipped/duplicate)` : ''}.`
      );
      setCsvContent('');
      setPage(0);
      loadMembers();
    } catch (e: any) {
      setError(e.message || 'Members CSV import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Pseudonymous Roster
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Members / Employees Directory</h1>
          <p className="text-slate-300 text-sm mt-1">
            Register pseudonymous employee members individually or via CSV for payroll and compliance tracking.
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
              {showCreateForm ? 'Close Form' : 'New Member'}
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

      {/* Manual Create Member Form */}
      {isAdmin && showCreateForm && (
        <form
          onSubmit={handleCreateMember}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Register New Member / Employee</h2>
            <span className="text-xs text-slate-500">Pseudonymous member reference is unique and immutable</span>
          </div>
          <div className="max-w-md">
            <label className="block text-xs font-medium text-slate-600 mb-1">Member Reference *</label>
            <input
              className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g. MEM-2026-0001"
              value={newMemberRef}
              onChange={(e) => setNewMemberRef(e.target.value)}
            />
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
              {submitting ? 'Saving...' : 'Create Member'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                placeholder="Search member reference..."
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
                <th className="py-3 px-4 font-semibold">Member Reference</th>
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
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-slate-500">
                    No members registered yet. Click <strong>New Member</strong> or <strong>Import CSV</strong> to add one.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.memberId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">{m.memberId}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{m.memberRef}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          STATUS_BADGE[m.status] ?? 'bg-emerald-50 text-emerald-700 border-emerald-200'
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

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Import Members CSV</h3>
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
                  Or Paste CSV Rows (memberRef)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={"memberRef\nMEM-9001-A\nMEM-9002-B"}
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
    </div>
  );
};