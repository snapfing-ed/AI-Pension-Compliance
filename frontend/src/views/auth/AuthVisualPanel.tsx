import React from 'react';
import { FileCheck, Cpu, FolderKanban, ShieldCheck } from 'lucide-react';

interface AuthVisualPanelProps {
  mode?: 'login' | 'register' | 'bootstrap';
}

export const AuthVisualPanel: React.FC<AuthVisualPanelProps> = ({ mode = 'login' }) => {
  return (
    <div className="w-full lg:w-[55%] min-h-[380px] lg:min-h-screen relative overflow-hidden bg-[#101A30] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 select-none">
      {/* Background Image with Fallback and Measured Dark Navy Scrim */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/src/assets/images/institutional_compliance_office_1793042816025.jpg"
          alt="Institutional Compliance Operations"
          className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity filter contrast-125 transition-opacity duration-700"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Zero-broken-image graceful fallback: hide broken img, gradient remains intact
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Ambient Institutional Navy-to-Teal Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#101A30]/95 via-[#101A30]/85 to-[#172B46]/95" />

        {/* Subtle Decorative Financial/Data Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #00A99D 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Subtle Radial Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00A99D]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-800/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* TOP BRAND SECTION */}
      <div className="relative z-10 space-y-4">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00A99D] to-[#0a665f] text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-teal-950/40 ring-1 ring-teal-300/30 shrink-0">
            SF
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[#00A99D]">
              SnapFing
            </div>
          </div>
        </div>

        {/* Main Title & Tagline */}
        <div className="pt-2">
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight text-white max-w-xl text-balance">
            Pension Compliance Intelligence System
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-lg mt-3 font-normal">
            Bringing pension contribution records, compliance analysis, and investigation workflows together in one intelligent decision-support platform.
          </p>
        </div>
      </div>

      {/* MIDDLE FEATURE HIGHLIGHTS (Hidden on narrow mobile, visible sm+) */}
      <div className="relative z-10 py-6 sm:py-8 space-y-3 max-w-xl">
        {/* Feature 1: Contribution Monitoring */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.06] transition-colors">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[#00A99D] flex items-center justify-center shrink-0 mt-0.5">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-white">
              Contribution Monitoring
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300/90 leading-relaxed mt-0.5">
              Review expected obligations, track monthly reporting periods, and identify potential remittance gaps.
            </p>
          </div>
        </div>

        {/* Feature 2: AI-Assisted Risk Analysis */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.06] transition-colors">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[#00A99D] flex items-center justify-center shrink-0 mt-0.5">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-white">
              AI-Assisted Risk Analysis
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300/90 leading-relaxed mt-0.5">
              Detect subtle contribution anomalies and prioritise cases based on configurable compliance indicators.
            </p>
          </div>
        </div>

        {/* Feature 3: Investigation Prioritisation */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.06] transition-colors">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[#00A99D] flex items-center justify-center shrink-0 mt-0.5">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold text-white">
              Investigation Prioritisation
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300/90 leading-relaxed mt-0.5">
              Manage officer case queues, record findings, and ensure transparent, auditable compliance decisions.
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM INSTITUTIONAL FOOTER */}
      <div className="relative z-10 pt-4 border-t border-white/10 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-200">
            Academic Capstone Prototype | Mulungushi University
          </span>
         
        </div>
        <p className="text-[11px] text-slate-400">
          AI-Based Pension Contribution Compliance Monitoring System
        </p>
      </div>
    </div>
  );
};
