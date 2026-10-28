import React, { useState } from 'react';
import { KeyRound, ArrowLeft, Mail, Lock, User, AlertCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validatePasswordPolicy, validateEmailFormat } from '../../services/security/cryptoUtils';
import { AuthVisualPanel } from './AuthVisualPanel';

interface BootstrapAdminViewProps {
  onNavigateToLogin: () => void;
}

export const BootstrapAdminView: React.FC<BootstrapAdminViewProps> = ({ onNavigateToLogin }) => {
  const { bootstrapAdmin } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState('MULUNGUSHI-2026-ADMIN-SETUP');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword || !bootstrapKey.trim()) {
      setErrorMessage('All administrator bootstrap fields are mandatory.');
      return;
    }

    if (!validateEmailFormat(email.trim())) {
      setErrorMessage('Please provide a valid institutional email address.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      setErrorMessage(policy.errors[0]);
      return;
    }

    setIsSubmitting(true);
    const result = await bootstrapAdmin(name.trim(), email.trim(), password, bootstrapKey.trim());

    if (!result.success) {
      setErrorMessage(result.error || 'Administrator bootstrap failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-purple-600 selection:text-white">
      {/* LEFT 55% PANEL: Institutional Visual Storytelling */}
      <AuthVisualPanel mode="bootstrap" />

      {/* RIGHT 45% PANEL: Controlled Privileged Setup Area */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-[560px] lg:min-h-screen bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800">
        <div className="hidden lg:flex items-center justify-end text-xs text-purple-600 dark:text-purple-400 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Controlled Administrative Setup</span>
          </span>
        </div>

        <div className="w-full max-w-[420px] mx-auto my-auto space-y-6 py-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold text-sm flex items-center justify-center">
                SA
              </div>
              <span className="font-semibold text-xs text-purple-700 dark:text-purple-300">
                Privileged System Gateway
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Administrator Setup
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              One-time provisioning gateway for System Administrators using institutional authorization keys.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-purple-950 dark:text-purple-200">
                Protected Provisioning Protocol
              </div>
              <p className="text-[11px] text-purple-800/90 dark:text-purple-300/90 mt-0.5 leading-relaxed">
                Administrator privileges cannot be self-selected via public registration. Provisioning requires the
                controlled master institutional setup key.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Master Setup Bootstrap Key *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-purple-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={bootstrapKey}
                  onChange={(e) => setBootstrapKey(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-purple-50/50 dark:bg-slate-800/80 border border-purple-300 dark:border-purple-700/60 rounded-xl text-purple-900 dark:text-purple-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Administrator Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Chileshe Banda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Administrator Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin.secondary@pension.gov.zm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 8 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-purple-900/10 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <span>{isSubmitting ? 'Provisioning Administrator...' : 'Bootstrap Administrator Account'}</span>
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:underline font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Standard Sign In</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-600 dark:text-slate-400">
            Controlled administrative initialization.
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            All setup attempts require cryptographic validation of master key.
          </div>
        </div>
      </div>
    </div>
  );
};
