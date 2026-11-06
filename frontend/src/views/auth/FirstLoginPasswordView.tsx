import React, { useState } from 'react';
import { AlertCircle, KeyRound, LogOut } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export const FirstLoginPasswordView: React.FC = () => {
  const { refreshSession, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  const passwordsMatch = next.length > 0 && confirm.length > 0 && next === confirm;
  const lengthOk       = next.length >= 12 && next.length <= 72;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!lengthOk) {
      setError('New password must be between 12 and 72 characters.');
      return;
    }
    if (!passwordsMatch) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await AuthService.changePassword(current, next);
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand strip */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            SC
          </div>
          <span className="text-sm font-semibold text-slate-900">SmartCompliance</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">

          {/* Icon and heading */}
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
              <KeyRound className="w-5 h-5 text-teal-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Set your password</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your account was provisioned with a temporary password. Set a permanent password to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {([
              { id: 'current',  label: 'Temporary password', value: current, setter: setCurrent, complete: 'current-password' },
              { id: 'next',     label: 'New password',       value: next,    setter: setNext,    complete: 'new-password' },
              { id: 'confirm',  label: 'Confirm new password', value: confirm, setter: setConfirm, complete: 'new-password' },
            ] as const).map(({ id, label, value, setter, complete }) => (
              <div key={id} className="space-y-1.5">
                <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
                  {label}
                </label>
                <input
                  id={id}
                  required
                  type="password"
                  autoComplete={complete}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow"
                />
              </div>
            ))}

            {/* Inline hints */}
            <ul className="space-y-1 text-[11px] text-slate-500">
              <li className={lengthOk && next.length > 0 ? 'text-teal-600' : ''}>
                · 12 to 72 characters
              </li>
              <li className={passwordsMatch ? 'text-teal-600' : ''}>
                · New passwords match
              </li>
            </ul>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2"
            >
              {busy ? 'Saving…' : 'Set password and continue'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out instead</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Mulungushi University · AI-Based Pension Contribution Compliance Monitoring System
        </p>
      </div>
    </div>
  );
};