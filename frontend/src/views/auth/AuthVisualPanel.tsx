import React from 'react';
import { ShieldCheck, Building2, Users } from 'lucide-react';

interface AuthVisualPanelProps {
  mode?: 'login' | 'register' | 'bootstrap';
}

export const AuthVisualPanel: React.FC<AuthVisualPanelProps> = ({ mode = 'login' }) => {
  const headline =
    mode === 'login'
      ? 'Pension contribution compliance monitoring for Zambia.'
      : 'Controlled access provisioning.';

  return (
    <div className="hidden lg:flex w-[42%] shrink-0 min-h-screen flex-col justify-between bg-slate-900 text-white p-14 xl:p-16">

      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          SC
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-tight">SmartCompliance</div>
          <div className="text-[11px] text-slate-400 leading-tight">Pension Compliance System</div>
        </div>
      </div>

      {/* Central statement */}
      <div className="space-y-6">
        <h1 className="text-3xl xl:text-4xl font-bold text-white leading-snug max-w-xs">
          {headline}
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
          A decision-support system that identifies potentially missing, delayed, incomplete
          or unusual contribution records and prioritises cases for human investigation.
        </p>

      </div>

    </div>
  );
};