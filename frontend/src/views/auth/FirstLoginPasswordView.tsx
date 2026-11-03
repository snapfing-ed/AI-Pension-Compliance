import React, { useState } from 'react';
import { AuthService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export const FirstLoginPasswordView: React.FC = () => {
  const { refreshSession, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (next.length < 12 || next.length > 72) { setError('Use a password between 12 and 72 characters.'); return; }
    if (next !== confirm) { setError('The new passwords do not match.'); return; }
    setBusy(true);
    try { await AuthService.changePassword(current, next); await refreshSession(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to change password.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <form onSubmit={submit} className="w-full max-w-md bg-white rounded-xl p-7 space-y-4 shadow-xl">
      <h1 className="text-xl font-bold text-slate-900">Set your password</h1>
      <p className="text-sm text-slate-600">Your administrator issued a temporary password. Choose a new password to continue.</p>
      {[['Temporary password', current, setCurrent], ['New password', next, setNext], ['Confirm new password', confirm, setConfirm]].map(([label, value, setter]: any) =>
        <label key={label} className="block text-sm font-medium text-slate-700">{label}<input required type="password" autoComplete="new-password" value={value} onChange={e => setter(e.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2.5" /></label>)}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-slate-900 p-2.5 text-white disabled:opacity-60">{busy ? 'Saving…' : 'Change password'}</button>
      <button type="button" onClick={() => void logout()} className="w-full p-2 text-sm text-slate-600">Sign out</button>
    </form>
  </main>;
};
