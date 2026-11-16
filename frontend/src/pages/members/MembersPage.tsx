import React, { useEffect, useState } from 'react';
import { Users, Plus, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Member, module2Api } from '../../api/module2Api';

export const MembersPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await module2Api.listMembers({ size: 100 });
      setMembers(res.content || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load members directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Handle CSV Import submission for Members
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    try {
      setImporting(true);
      setError(null);
      setImportResult(null);

      const lines = csvContent.trim().split('\n');
      let successCount = 0;

      // Skip header row if present
      const startIndex = lines[0].toLowerCase().includes('memberref') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [memberRef] = line.split(',').map(s => s.trim());
        if (memberRef) {
          try {
            await module2Api.createMember({ memberRef });
            successCount++;
          } catch {
            // Ignore individual duplicates or log
          }
        }
      }

      setImportResult(`Successfully imported ${successCount} members.`);
      setCsvContent('');
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
          <h1 className="text-2xl font-bold tracking-tight">Members Directory</h1>
          <p className="text-slate-300 text-sm mt-1">
            Manage registered pseudonymous employee members and compliance records.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Registered Members ({members.length})</span>
        </div>
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
              <tr><td colSpan={3} className="py-8 text-center text-slate-500">Loading members...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-slate-500">No members registered yet. Click Import CSV to onboard.</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.memberId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{m.memberId}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{m.memberRef}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Import Members CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Paste CSV Data or Format</label>
                <textarea
                  rows={6}
                  required
                  placeholder="memberRef,employerRef,status&#10;MEM-9001-A,EMP-ZM-3001,ACTIVE"
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
                  onClick={() => setShowImportModal(false)}
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