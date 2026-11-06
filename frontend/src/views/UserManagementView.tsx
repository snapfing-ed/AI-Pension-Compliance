import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/authService';
import type { User, UserRole } from '../types';
import { AccessDeniedView } from '../components/auth/AccessDeniedView';
import {
  UserPlus, RefreshCw, Shield, Lock, Unlock,
  UserX, KeyRound, ChevronDown, AlertCircle, CheckCircle2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Feedback = { kind: 'success' | 'error'; message: string } | null;

// ── Main component ────────────────────────────────────────────────────────────

export const UserManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const admin = currentUser?.role === 'SYSTEM_ADMINISTRATOR';

  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Create-user form state
  const [form, setForm] = useState({
    username: '', institutionalEmail: '', displayName: '',
    roleCode: 'COMPLIANCE_MONITOR' as UserRole,
  });
  const [creating, setCreating] = useState(false);
  const [created,  setCreated]  = useState<{ user: User; temporaryPassword: string } | null>(null);

  // ── Load users ──────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      setUsers(await AuthService.listUsers());
    } catch (e) {
      setFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Unable to load accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (admin) void load(); }, [admin]);

  if (!admin) return <AccessDeniedView requiredRole="SYSTEM_ADMINISTRATOR" attemptedResource="User account administration" />;

  // ── Create user ─────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    setCreated(null);
    try {
      const result = await AuthService.createUser(form);
      setCreated(result);
      setForm({ username: '', institutionalEmail: '', displayName: '', roleCode: 'COMPLIANCE_MONITOR' });
      await load();
    } catch (ex) {
      setFeedback({ kind: 'error', message: ex instanceof Error ? ex.message : 'Unable to create account.' });
    } finally {
      setCreating(false);
    }
  };

  // ── Status change ───────────────────────────────────────────────────────────

  const handleStatusChange = async (userId: number, newStatus: 'ACTIVE' | 'LOCKED' | 'DISABLED') => {
    setFeedback(null);
    try {
      await AuthService.changeUserStatus(userId, newStatus);
      setFeedback({ kind: 'success', message: `Account status changed to ${newStatus}.` });
      await load();
    } catch (e) {
      setFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Status change failed.' });
    }
  };

  // ── Role change ─────────────────────────────────────────────────────────────

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setFeedback(null);
    try {
      await AuthService.changeUserRole(userId, newRole);
      setFeedback({ kind: 'success', message: `Role changed to ${newRole.replaceAll('_', ' ')}.` });
      await load();
    } catch (e) {
      setFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Role change failed.' });
    }
  };

  // ── Password reset ──────────────────────────────────────────────────────────

  const handlePasswordReset = async (userId: number, username: string) => {
    if (!window.confirm(`Reset the temporary password for ${username}? A new one-time password will be generated.`)) return;
    setFeedback(null);
    try {
      const result = await AuthService.resetUserPassword(userId);
      setCreated(result);
      setFeedback({ kind: 'success', message: `Temporary password reset for ${username}. Copy it below.` });
    } catch (e) {
      setFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Password reset failed.' });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">User account administration</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Provision staff accounts and manage roles, status and credentials.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          aria-label="Refresh user list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-xs ${
            feedback.kind === 'success'
              ? 'bg-teal-50 border-teal-200 text-teal-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.kind === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
            : <AlertCircle  className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Temporary password display */}
      {created && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-1.5">
          <p className="text-xs font-semibold text-amber-900">
            Temporary password for {created.user.name}
          </p>
          <p className="font-mono text-sm select-all bg-white border border-amber-200 rounded px-3 py-2 text-slate-900">
            {created.temporaryPassword}
          </p>
          <p className="text-[11px] text-amber-800">
            Copy and deliver this securely over a separate channel. It will not be shown again.
          </p>
          <button
            onClick={() => setCreated(null)}
            className="text-[11px] text-amber-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create-user form */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Provision new account</h2>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700" htmlFor="displayName">Full name</label>
            <input id="displayName" required maxLength={150} value={form.displayName}
              onChange={e => setForm({ ...form, displayName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700" htmlFor="username">Username</label>
            <input id="username" required maxLength={80} value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700" htmlFor="email">Institutional email</label>
            <input id="email" required type="email" value={form.institutionalEmail}
              onChange={e => setForm({ ...form, institutionalEmail: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700" htmlFor="roleCode">Role</label>
            <select id="roleCode" value={form.roleCode}
              onChange={e => setForm({ ...form, roleCode: e.target.value as UserRole })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="COMPLIANCE_MONITOR">Compliance Monitor</option>
              <option value="COMPLIANCE_SUPERVISOR">Compliance Supervisor</option>
              <option value="SYSTEM_ADMINISTRATOR">System Administrator</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2">
              <UserPlus className="w-4 h-4" />
              <span>{creating ? 'Creating…' : 'Create account'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* User table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Username', 'Institutional email', 'Role', 'Status', 'First login', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    {loading ? 'Loading…' : 'No accounts found.'}
                  </td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{u.username}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{u.email}</td>

                  {/* Role selector */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="relative inline-flex items-center">
                      <select
                        value={u.role}
                        onChange={e => void handleRoleChange(Number(u.id), e.target.value as UserRole)}
                        disabled={u.id === String(currentUser?.id)}
                        className="appearance-none pr-6 pl-2 py-1 rounded border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Role for ${u.name}`}
                      >
                        <option value="COMPLIANCE_MONITOR">Monitor</option>
                        <option value="COMPLIANCE_SUPERVISOR">Supervisor</option>
                        <option value="SYSTEM_ADMINISTRATOR">Administrator</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1 pointer-events-none" />
                    </div>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                      u.status === 'ACTIVE'    ? 'bg-teal-50 text-teal-700' :
                      u.status === 'LOCKED'    ? 'bg-amber-50 text-amber-700' :
                      u.status === 'DISABLED'  ? 'bg-rose-50 text-rose-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {u.status}
                    </span>
                  </td>

                  {/* First login */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-medium ${u.mustChangePassword ? 'text-amber-600' : 'text-teal-600'}`}>
                      {u.mustChangePassword ? 'Required' : 'Complete'}
                    </span>
                  </td>

                  {/* Action buttons */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {u.status !== 'ACTIVE' && (
                        <button
                          onClick={() => void handleStatusChange(Number(u.id), 'ACTIVE')}
                          className="p-1.5 rounded hover:bg-teal-50 text-teal-600 transition-colors"
                          title="Activate account"
                          aria-label={`Activate ${u.name}`}
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {u.status === 'ACTIVE' && u.id !== String(currentUser?.id) && (
                        <button
                          onClick={() => void handleStatusChange(Number(u.id), 'LOCKED')}
                          className="p-1.5 rounded hover:bg-amber-50 text-amber-600 transition-colors"
                          title="Lock account"
                          aria-label={`Lock ${u.name}`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {u.status !== 'DISABLED' && u.id !== String(currentUser?.id) && (
                        <button
                          onClick={() => void handleStatusChange(Number(u.id), 'DISABLED')}
                          className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition-colors"
                          title="Disable account"
                          aria-label={`Disable ${u.name}`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => void handlePasswordReset(Number(u.id), u.username ?? u.name)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                        title="Reset temporary password"
                        aria-label={`Reset password for ${u.name}`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};