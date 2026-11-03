import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/authService';
import type { User, UserRole } from '../types';
import { AccessDeniedView } from '../components/auth/AccessDeniedView';

export const UserManagementView: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ user: User; temporaryPassword: string } | null>(null);
  const [form, setForm] = useState({ username: '', institutionalEmail: '', displayName: '', roleCode: 'COMPLIANCE_MONITOR' as UserRole });
  const admin = currentUser?.role === 'SYSTEM_ADMINISTRATOR';
  const load = async () => { try { setUsers(await AuthService.listUsers()); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load user accounts.'); } };
  useEffect(() => { if (admin) void load(); }, [admin]);
  if (!admin) return <AccessDeniedView requiredRole="SYSTEM_ADMINISTRATOR" attemptedResource="User account administration" />;
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setCreated(null);
    try { setCreated(await AuthService.createUser(form)); setForm({ username: '', institutionalEmail: '', displayName: '', roleCode: 'COMPLIANCE_MONITOR' }); await load(); }
    catch (ex) { setError(ex instanceof Error ? ex.message : 'Unable to create the account.'); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto max-w-6xl space-y-6 p-6">
    <header><h1 className="text-xl font-bold text-slate-900">User account administration</h1><p className="mt-1 text-sm text-slate-600">Provision staff accounts with a one-time temporary password.</p></header>
    <form onSubmit={create} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <label className="text-sm font-medium">Full name<input required maxLength={150} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm font-medium">Username<input required maxLength={80} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm font-medium">Institutional email<input required type="email" value={form.institutionalEmail} onChange={e => setForm({ ...form, institutionalEmail: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm font-medium">Role<select value={form.roleCode} onChange={e => setForm({ ...form, roleCode: e.target.value as UserRole })} className="mt-1 w-full rounded border p-2"><option value="COMPLIANCE_MONITOR">Compliance Monitor</option><option value="COMPLIANCE_SUPERVISOR">Compliance Supervisor</option><option value="SYSTEM_ADMINISTRATOR">System Administrator</option></select></label>
      <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60 sm:col-span-2">{busy ? 'Creating…' : 'Create account'}</button>
    </form>
    {error && <p role="alert" className="rounded bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {created && <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm"><strong>Temporary password for {created.user.name}</strong><p className="mt-1 font-mono select-all">{created.temporaryPassword}</p><p className="mt-1 text-amber-900">Copy and deliver this securely. It will only be shown here once.</p></div>}
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Name', 'Username', 'Institutional email', 'Role', 'Status', 'First login password change'].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y">{users.map(u => <tr key={u.id}><td className="p-3">{u.name}</td><td className="p-3">{u.username}</td><td className="p-3">{u.email}</td><td className="p-3">{u.role.replaceAll('_', ' ')}</td><td className="p-3">{u.status}</td><td className="p-3">{u.mustChangePassword ? 'Required' : 'Complete'}</td></tr>)}</tbody></table></div>
  </section>;
};
