import React, { useState, useMemo } from 'react';
import { Users, Search, Filter, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Member } from '../types';
import { formatZMW } from '../utils/formatters';

export const MembersView: React.FC = () => {
  const { members, employers, records } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [employerFilter, setEmployerFilter] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.employerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEmployer = employerFilter === 'ALL' || m.employerId === employerFilter;
      return matchesSearch && matchesEmployer;
    });
  }, [members, searchQuery, employerFilter]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Registered Members Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Anonymized member records, statutory tier obligations, and individual contribution trackability
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded">
          Privacy Policy: Personal names anonymized per Data Protection compliance
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by member ref (e.g. MEM-ZM-80101) or initial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Employer Filter:</span>
          <select
            value={employerFilter}
            onChange={(e) => setEmployerFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Employers</option>
            {employers.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Member Ref</th>
                <th className="py-3 px-4">Anonymized Identifier</th>
                <th className="py-3 px-4">Affiliated Employer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Base Salary Tier (ZMW)</th>
                <th className="py-3 px-4 text-right">Monthly Contribution Obligation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No member records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{m.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{m.displayName}</td>
                    <td className="py-3 px-4 text-slate-700">{m.employerName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800">
                        {m.membershipStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-700">
                      {formatZMW(m.baseSalaryTier)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-right text-slate-900">
                      {formatZMW(m.expectedMonthlyContribution)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedMember(m)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedMember.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedMember.displayName}</h3>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Employer:</span>
                <span className="font-semibold text-slate-900">{selectedMember.employerName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Membership Date:</span>
                <span className="font-mono text-slate-800">{selectedMember.joinedDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Monthly Wage Tier:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatZMW(selectedMember.baseSalaryTier)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Standard Statutory Rate (10% Combined):</span>
                <span className="font-mono font-bold text-teal-700">
                  {formatZMW(selectedMember.expectedMonthlyContribution)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Filing Status:</span>
                <span className="text-emerald-700 font-semibold">Active Member Roster</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
