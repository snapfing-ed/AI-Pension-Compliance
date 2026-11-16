import React, { useEffect, useState } from 'react';
import { Building2, Plus, Upload, Users, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Employer, Member, module2Api } from '../../api/module2Api';

export const EmployersPage: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Employee Drill-Down Modal State
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [employerMembers, setEmployerMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadEmployers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await module2Api.listEmployers({});
      setEmployers(res.content || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load employers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployers();
  }, []);

  // Handle CSV Import submission
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
      const startIndex = lines[0].toLowerCase().includes('employerref') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [employerRef, legalName, tradingName, status] = line.split(',').map(s => s.trim());
        if (employerRef && legalName) {
          try {
            await module2Api.createEmployer({
              employerRef,
              legalName,
              tradingName: tradingName || undefined,
            });
            successCount++;
          } catch {
            // Ignore individual duplicates or log
          }
        }
      }

      setImportResult(`Successfully imported ${successCount} employers.`);
      setCsvContent('');
      loadEmployers();
    } catch (e: any) {
      setError(e.message || 'CSV import failed.');
    } finally {
      setImporting(false);
    }
  };

  // Open drill-down view for an employer's employees
  const handleSelectEmployer = async (emp: Employer) => {
    setSelectedEmployer(emp);
    try {
      setLoadingMembers(true);
      const res = await module2Api.listMembers({ size: 100 });
      setEmployerMembers(res.content || []);
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
            Cadastre &amp; Governance
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Employers Directory</h1>
          <p className="text-slate-300 text-sm mt-1">
            Manage registered employers, view active headcounts, and inspect staff rosters.
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

      {/* Employers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Registered Employers ({employers.length})</span>
          <span className="text-xs text-slate-500">Click any employer row to view their registered employees</span>
        </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">Employer Ref</th>
              <th className="py-3 px-4 font-semibold">Legal Name</th>
              <th className="py-3 px-4 font-semibold">Trading Name</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">Loading employers...</td></tr>
            ) : employers.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-500">No employers registered yet. Click Import CSV to onboard.</td></tr>
            ) : (
              employers.map((emp) => (
                <tr
                  key={emp.employerId}
                  onClick={() => handleSelectEmployer(emp)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{emp.employerRef}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">{emp.legalName}</td>
                  <td className="py-3.5 px-4 text-slate-600">{emp.tradingName || '—'}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-semibold">
                      <Users className="w-3.5 h-3.5" /> View Employees
                    </button>
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
              <h3 className="text-base font-semibold text-slate-900">Import Employers CSV</h3>
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
                  placeholder="EMP-ZM-3001, Zambia Sugar PLC, Zambia Sugar, ACTIVE"
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

      {/* Employee Drill-Down Modal */}
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
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Registered Members / Employees Roster</h4>
              {loadingMembers ? (
                <p className="text-center py-8 text-slate-500 text-sm">Loading staff roster...</p>
              ) : employerMembers.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-sm">No employees registered for this employer.</p>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold">Member Ref</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employerMembers.map((m) => (
                      <tr key={m.memberId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-900">{m.memberRef}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
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