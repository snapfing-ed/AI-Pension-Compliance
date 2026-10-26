import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck, Shield, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validatePasswordPolicy, validateEmailFormat } from '../../services/security/cryptoUtils';
import { AuthVisualPanel } from './AuthVisualPanel';

interface RegisterViewProps {
  onNavigateToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigateToLogin }) => {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordPolicy = validatePasswordPolicy(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage('All registration fields are required.');
      return;
    }

    if (!validateEmailFormat(email.trim())) {
      setErrorMessage('Please provide a valid institutional email address.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password and confirmation password do not match.');
      return;
    }

    if (!passwordPolicy.valid) {
      setErrorMessage(passwordPolicy.errors[0]);
      return;
    }

    setIsSubmitting(true);
    const result = await register(name.trim(), email.trim(), password, confirmPassword);

    if (!result.success) {
      setErrorMessage(result.error || 'Registration failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-[#00A99D] selection:text-white">
      {/* LEFT 55% PANEL: Institutional Visual Storytelling */}
      <AuthVisualPanel mode="register" />

      {/* RIGHT 45% PANEL: Clean, Focused Registration Area */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-[560px] lg:min-h-screen bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800">
        {/* Top Header info */}
        <div className="hidden lg:flex items-center justify-end text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#00A99D]" />
            <span>Officer Provisioning Gateway</span>
          </span>
        </div>

        {/* Form Container (constrained 400px - 440px) */}
        <div className="w-full max-w-[420px] mx-auto my-auto space-y-6 py-4">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="lg:hidden inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#00A99D] text-white font-bold text-sm flex items-center justify-center">
                PC
              </div>
              <span className="font-semibold text-xs tracking-tight text-slate-700 dark:text-slate-300">
                Pension Compliance
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Create your account
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Register as a Compliance Monitor to begin reviewing contribution records and investigation workflows.
            </p>
          </div>

          {/* Strict Role Policy Banner */}
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#00A99D] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-teal-900 dark:text-teal-200">
                Assigned Role: Compliance Monitor
              </div>
              <p className="text-[11px] text-teal-800/90 dark:text-teal-300/90 mt-0.5 leading-relaxed">
                Per institutional policy, public registration exclusively provisions Compliance Monitor accounts.
                Administrator privileges require controlled bootstrap authorization.
              </p>
            </div>
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
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name & Title
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Bwalya Kangwa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Institutional Email Address */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="b.kangwa@compliance.pension.gov.zm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Min 8 characters with symbol & number"
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

            {/* Confirm Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                {confirmPassword.length > 0 && (
                  <span
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" /> Passwords do not match
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password to confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Policy Feedback */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-600 dark:text-slate-400 text-[11px]">
                Password Requirements:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div
                  className={`flex items-center gap-1.5 ${
                    password.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>8+ Characters</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    /[A-Z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Uppercase Letter</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    /[a-z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Lowercase Letter</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    /[0-9]/.test(password) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Number & Symbol</span>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-[#00A99D] hover:bg-[#009287] active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-teal-900/10 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
            >
              <span>{isSubmitting ? 'Registering Account...' : 'Create Officer Account'}</span>
              <UserPlus className="w-4 h-4" />
            </button>
          </form>

          {/* Link to Login */}
          <div className="pt-2 text-center text-xs text-slate-600 dark:text-slate-400">
            Already have an active account?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-[#00A99D] hover:text-[#008177] dark:hover:text-teal-300 font-semibold underline underline-offset-4 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>

        {/* Security Disclaimer Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-600 dark:text-slate-400">
            Protected access for authorised compliance personnel.
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            All registration requests and role allocations are cryptographically audited.
          </div>
        </div>
      </div>
    </div>
  );
};
