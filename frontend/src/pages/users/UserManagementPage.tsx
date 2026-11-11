import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { adminUsersApi, AdminUser, RoleCode, AccountStatus } from '../../api/adminUsersApi';

const ROLES: RoleCode[] = ['SYSTEM_ADMINISTRATOR', 'COMPLIANCE_SUPERVISOR', 'COMPLIANCE_MONITOR'];

const ROLE_BADGE: Record<RoleCode, string> = {
  SYSTEM_ADMINISTRATOR: 'bg-slate-900 text-white border-slate-900',
  COMPLIANCE_SUPERVISOR: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLIANCE_MONITOR: 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_BADGE: Record<AccountStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  LOCKED: 'bg-red-50 text-red-700 border-red-200',
  DISABLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState<RoleCode>('COMPLIANCE_MONITOR');
  const [submitting, setSubmitting] = useState(false);

  const [tempPasswordBanner, setTempPasswordBanner] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminUsersApi.listUsers({
        page,
        size: 15,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res?.content ?? []);
      setTotalPages(Math.max(1, res?.totalPages ?? 1));
      setTotalElements(res?.totalElements ?? 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, statusFilter, roleFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await adminUsersApi.createUser({
        username: username.trim(),
        displayName: displayName.trim(),
        institutionalEmail: email.trim(),
        roleCode,
      });
      setTempPasswordBanner({
        username: res.user.username,
        password: res.temporaryPassword,
      });
      setCopied(false);
      setUsername('');
      setDisplayName('');
      setEmail('');
      setRoleCode('COMPLIANCE_MONITOR');
      setShowCreateForm(false);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (userId: number, status: 'ACTIVE' | 'LOCKED' | 'DISABLED') => {
    try {
      setError(null);
      await adminUsersApi.updateStatus(userId, status);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to update account status.');
    }
  };

  const handleRoleChange = async (user: AdminUser, newRole: RoleCode) => {
    if (user.roleCode === newRole) return;
    try {
      setError(null);
      await adminUsersApi.updateRole(user.userId, newRole);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to update user role.');
    }
  };

  const copyTempPassword = async () => {
    if (!tempPasswordBanner) return;
    await navigator.clipboard.writeText(tempPasswordBanner.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            Access Control &amp; Identity
          </div>
          <h1 className="text-2xl font-bold tracking-tight">User &amp; Role Management</h1>
          <p className="text-slate-300 text-sm mt-1">
            Manage authorised accounts, hierarchical roles, and account lifecycle states.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shrink-0"
        >
          {showCreateForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showCreateForm ? 'Close Form' : 'New User Account'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* One-Time Temporary Password Banner */}
      {tempPasswordBanner && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold">
              Account &ldquo;{tempPasswordBanner.username}&rdquo; created successfully
            </div>
            <div className="text-xs text-amber-800">
              Share this one-time temporary password securely. It will not be shown again.
            </div>
            <div className="flex items-center gap-2 pt-1">
              <code className="bg-white px-3 py-1.5 rounded-md border border-amber-300 font-mono text-sm font-semibold text-slate-900">
                {tempPasswordBanner.password}
              </code>
              <button
                onClick={copyTempPassword}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-xs font-medium text-amber-900 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <button
            onClick={() => setTempPasswordBanner(null)}
            className="text-xs font-medium text-amber-800 hover:text-amber-950 underline self-start sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create User Card */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Create New User Account</h2>
            <span className="text-xs text-slate-500">
              A secure temporary password will be generated automatically
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
              <input
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g. monitor01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Display Name</label>
              <input
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g. Jane Banda"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Institutional Email</label>
              <input
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                type="email"
                placeholder="user@institution.edu.zm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Role</label>
              <select
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value as RoleCode)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      {/* Filters & Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Registered Accounts</span>
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
              <option value="ACTIVE">ACTIVE</option>
              <option value="LOCKED">LOCKED</option>
              <option value="DISABLED">DISABLED</option>
              <option value="PENDING">PENDING</option>
            </select>
            <select
              className="border border-slate-300 px-3 py-1.5 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={roleFilter}
              onChange={(e) => {
                setPage(0);
                setRoleFilter(e.target.value);
              }}
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Institutional Email</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Loading user accounts...
                  </td>
                </tr>
              ) : (users ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    No user accounts match the selected filters.
                  </td>
                </tr>
              ) : (
                (users ?? []).map((u) => (
                  <tr key={u.userId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{u.displayName}</div>
                      <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{u.institutionalEmail}</td>
                    <td className="py-3.5 px-4">
                      <select
                        className={`border px-2.5 py-1 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          ROLE_BADGE[u.roleCode] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        value={u.roleCode}
                        onChange={(e) => handleRoleChange(u, e.target.value as RoleCode)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="bg-white text-slate-900">
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        className={`border px-2.5 py-1 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          STATUS_BADGE[u.accountStatus] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        value={u.accountStatus}
                        onChange={(e) =>
                          handleStatusChange(u.userId, e.target.value as 'ACTIVE' | 'LOCKED' | 'DISABLED')
                        }
                      >
                        {u.accountStatus === 'PENDING' && (
                          <option value="PENDING" disabled className="bg-white text-slate-900">
                            PENDING
                          </option>
                        )}
                        <option value="ACTIVE" className="bg-white text-slate-900">
                          ACTIVE
                        </option>
                        <option value="LOCKED" className="bg-white text-slate-900">
                          LOCKED
                        </option>
                        <option value="DISABLED" className="bg-white text-slate-900">
                          DISABLED
                        </option>
                      </select>
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
