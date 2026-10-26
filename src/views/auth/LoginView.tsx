import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthVisualPanel } from './AuthVisualPanel';

interface LoginViewProps {
  onNavigateToRegister: () => void;
  onNavigateToBootstrap: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigateToRegister, onNavigateToBootstrap }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await login(email.trim(), password, rememberMe);
    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-[#00A99D] selection:text-white">
      {/* LEFT 55% PANEL: Institutional Visual Storytelling */}
      <AuthVisualPanel mode="login" />

      {/* RIGHT 45% PANEL: Clean, Focused Authentication Area */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-[520px] lg:min-h-screen bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800">
        {/* Top spacer / institutional badge for right panel */}
        <div className="hidden lg:flex items-center justify-end text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#00A99D]" />
            <span>Secure Compliance Gateway</span>
          </span>
        </div>

        {/* Form Container (constrained 400px - 440px) */}
        <div className="w-full max-w-[420px] mx-auto my-auto space-y-7 py-4">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="lg:hidden inline-flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#00A99D] text-white font-bold text-sm flex items-center justify-center">
                PC
              </div>
              <span className="font-semibold text-xs tracking-tight text-slate-700 dark:text-slate-300">
                Pension Compliance
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter your institutional email and password to access the compliance workspace.
            </p>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Institutional Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="officer@pension.gov.zm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Session Options & Bootstrap Link */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#00A99D] focus:ring-[#00A99D] cursor-pointer"
                />
                <span>Remember this session</span>
              </label>

              <button
                type="button"
                onClick={onNavigateToBootstrap}
                className="text-xs text-slate-500 hover:text-[#00A99D] dark:hover:text-teal-300 font-medium transition-colors"
              >
                Admin Setup Key?
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-[#00A99D] hover:bg-[#009287] active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-teal-900/10 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
            >
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Link to Registration */}
          <div className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
            Don't have an officer account?{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-[#00A99D] hover:text-[#008177] dark:hover:text-teal-300 font-semibold underline underline-offset-4 transition-colors"
            >
              Create an officer account
            </button>
          </div>
        </div>

        {/* Security Disclaimer Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-600 dark:text-slate-400">
            Protected access for authorised compliance personnel.
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            All authentication attempts and session operations are cryptographically audited.
          </div>
        </div>
      </div>
    </div>
  );
};
