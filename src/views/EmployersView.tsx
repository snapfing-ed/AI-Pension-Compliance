import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileText,
  X,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Employer, EmployerRegistrationStatus, MonitoringStatus } from '../types';
import { formatZMW, formatDate } from '../utils/formatters';

export const EmployersView: React.FC = () => {
  const {
    employers,
    records,
    findings,
    cases,
    addEmployer,
    updateEmployer,
    activeDetailId,
    setActiveDetailId,
    setActiveTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New employer form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpSector, setNewEmpSector] = useState('Mining & Mineral Extraction');
  const [newEmpLocation, setNewEmpLocation] = useState('Kitwe, Copperbelt Province');
  const [newEmpMembers, setNewEmpMembers] = useState('100');
  const [newEmpContrib, setNewEmpContrib] = useState('200000');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('+260 ');

  // Distinct sectors
  const sectors = useMemo(() => {
    return Array.from(new Set(employers.map((e) => e.sector)));
  }, [employers]);

  // Filtered employer list
  const filteredEmployers = useMemo(() => {
    return employers.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = sectorFilter === 'ALL' || emp.sector === sectorFilter;
      const matchesStatus = statusFilter === 'ALL' || emp.monitoringStatus === statusFilter;
      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [employers, searchQuery, sectorFilter, statusFilter]);

  // Selected employer for detail view
  const selectedEmployer = useMemo(() => {
    return employers.find((e) => e.id === activeDetailId) || null;
  }, [employers, activeDetailId]);

  // Selected employer's contribution records
  const employerRecords = useMemo(() => {
    if (!selectedEmployer) return [];
    return records.filter((r) => r.employerId === selectedEmployer.id);
  }, [records, selectedEmployer]);

  // Selected employer's findings
  const employerFindings = useMemo(() => {
    if (!selectedEmployer) return [];
    return findings.filter((f) => f.employerId === selectedEmployer.id);
  }, [findings, selectedEmployer]);

  // Selected employer's cases
  const employerCases = useMemo(() => {
    if (!selectedEmployer) return [];
    return cases.filter((c) => c.employerId === selectedEmployer.id);
  }, [cases, selectedEmployer]);

  const handleCreateEmployer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    addEmployer({
      name: newEmpName.trim(),
      sector: newEmpSector,
      location: newEmpLocation,
      registrationStatus: 'ACTIVE',
      activeMemberCount: parseInt(newEmpMembers, 10) || 10,
      expectedMonthlyContribution: parseFloat(newEmpContrib) || 50000,
      monitoringStatus: 'NORMAL',
      lastSubmissionDate: null,
      contactEmail: newEmpEmail || 'admin@synthetic-corp.co.zm',
      contactPhone: newEmpPhone || '+260 211 000 000',
    });

    setShowAddModal(false);
    setNewEmpName('');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Registered Employer Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor contributing entities, statutory obligations, and active compliance standings
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Synthetic Employer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by employer name, ID (e.g. EMP-ZM-1001), or town..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Sector:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Sectors ({sectors.length})</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Watch Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NORMAL">Normal Standing</option>
              <option value="ELEVATED_WATCH">Elevated Watch</option>
              <option value="INVESTIGATION_OPEN">Investigation Open</option>
              <option value="HIGH_RISK">High Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employers Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Employer Ref</th>
                <th className="py-3 px-4">Entity Name</th>
                <th className="py-3 px-4">Industry Sector</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Active Members</th>
                <th className="py-3 px-4 text-right">Expected Monthly Obligation</th>
                <th className="py-3 px-4">Monitoring Standing</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No employers match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployers.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{emp.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                    <td className="py-3 px-4 text-slate-600">{emp.sector}</td>
                    <td className="py-3 px-4 text-slate-600">{emp.location}</td>
                    <td className="py-3 px-4 font-mono text-center text-slate-800">{emp.activeMemberCount}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-right text-slate-900">
                      {formatZMW(emp.expectedMonthlyContribution)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          emp.monitoringStatus === 'HIGH_RISK'
                            ? 'bg-rose-100 text-rose-800'
                            : emp.monitoringStatus === 'INVESTIGATION_OPEN'
                            ? 'bg-amber-100 text-amber-800'
                            : emp.monitoringStatus === 'ELEVATED_WATCH'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {emp.monitoringStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveDetailId(emp.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employer Detail Modal */}
      {selectedEmployer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedEmployer.id}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      selectedEmployer.monitoringStatus === 'HIGH_RISK'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedEmployer.monitoringStatus === 'INVESTIGATION_OPEN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedEmployer.monitoringStatus.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedEmployer.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEmployer.sector} · Registered {selectedEmployer.registeredDate}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailId(null)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6">
              {/* Info Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-500">Contact Address & Province</div>
                  <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedEmployer.location}</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Official Contact Channels</div>
                  <div className="font-mono text-slate-800 mt-1 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span>{selectedEmployer.contactEmail}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{selectedEmployer.contactPhone}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Active Member Roster</div>
                  <div className="font-mono text-slate-900 font-bold mt-1">
                    {selectedEmployer.activeMemberCount} Employees
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Est. Obligation: {formatZMW(selectedEmployer.expectedMonthlyContribution)}/mo
                  </div>
                </div>
              </div>

              {/* Monthly Contribution History */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Recorded Contribution Filing History
                </h4>
                {employerRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No contribution records logged for this employer.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Period</th>
                          <th className="py-2 px-3 text-right">Expected (ZMW)</th>
                          <th className="py-2 px-3 text-right">Reported (ZMW)</th>
                          <th className="py-2 px-3 text-right">Remitted (ZMW)</th>
                          <th className="py-2 px-3">Submission Date</th>
                          <th className="py-2 px-3">Reconciliation Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employerRecords.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 px-3 font-mono font-semibold">{r.period}</td>
                            <td className="py-2 px-3 font-mono text-right">{formatZMW(r.expectedAmount)}</td>
                            <td className="py-2 px-3 font-mono text-right">{formatZMW(r.reportedAmount)}</td>
                            <td className="py-2 px-3 font-mono text-right font-semibold text-slate-900">
                              {formatZMW(r.remittedAmount)}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{r.submissionDate || 'Not Submitted'}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  r.status === 'RECONCILED'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : r.status === 'PARTIAL_PAYMENT'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {r.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Related Exceptions & Cases */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Detected Compliance Exceptions</h4>
                  {employerFindings.length === 0 ? (
                    <p className="text-xs text-slate-400">No active exceptions for this employer.</p>
                  ) : (
                    <div className="space-y-2">
                      {employerFindings.map((f) => (
                        <div key={f.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-900">{f.ruleName}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{f.explanation}</div>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-500">Period: {f.period}</span>
                            <span className="font-mono font-semibold text-rose-700">
                              {f.monetaryImpact > 0 ? `Shortfall: ${formatZMW(f.monetaryImpact)}` : 'Timing issue'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Investigation History</h4>
                  {employerCases.length === 0 ? (
                    <p className="text-xs text-slate-400">No open or resolved investigation cases.</p>
                  ) : (
                    <div className="space-y-2">
                      {employerCases.map((c) => (
                        <div key={c.id} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex justify-between font-mono font-semibold text-slate-800">
                            <span>{c.caseNumber}</span>
                            <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded">
                              {c.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-slate-900 font-medium mt-1">{c.title}</div>
                          {c.finalOutcome && (
                            <div className="text-[11px] text-teal-700 font-medium mt-1">
                              Outcome: {c.finalOutcome.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setActiveDetailId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Register Synthetic Demonstration Employer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployer} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Company / Entity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Copperbelt Agro Logistics Ltd"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Economic Sector</label>
                  <select
                    value={newEmpSector}
                    onChange={(e) => setNewEmpSector(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-teal-500"
                  >
                    <option value="Mining & Mineral Extraction">Mining & Mineral Extraction</option>
                    <option value="Banking & Financial Services">Banking & Financial Services</option>
                    <option value="FMCG Retail & Wholesale Logistics">FMCG Retail & Wholesale Logistics</option>
                    <option value="Commercial Agriculture & Agro-Processing">Commercial Agriculture</option>
                    <option value="Manufacturing & Structural Fabrication">Manufacturing</option>
                    <option value="Construction & Building Materials">Construction & Cement</option>
                    <option value="Freight Transport & Bulk Haulage">Freight & Transport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Operating Town / Province</label>
                  <input
                    type="text"
                    value={newEmpLocation}
                    onChange={(e) => setNewEmpLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Active Headcount</label>
                  <input
                    type="number"
                    min="1"
                    value={newEmpMembers}
                    onChange={(e) => setNewEmpMembers(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Monthly Expected (ZMW)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={newEmpContrib}
                    onChange={(e) => setNewEmpContrib(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="payroll@company.co.zm"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-sm"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
