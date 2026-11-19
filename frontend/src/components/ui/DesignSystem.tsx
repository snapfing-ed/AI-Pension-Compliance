import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  Info,
} from 'lucide-react';

export type SemanticTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_CONFIG: Record<
  SemanticTone,
  { classes: string; Icon: React.ElementType }
> = {
  success: {
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    Icon: CheckCircle2,
  },
  warning: {
    classes: 'bg-amber-50 text-amber-800 border-amber-300',
    Icon: AlertTriangle,
  },
  danger: {
    classes: 'bg-rose-50 text-rose-800 border-rose-300',
    Icon: XCircle,
  },
  info: {
    classes: 'bg-blue-50 text-blue-800 border-blue-300',
    Icon: Info,
  },
  neutral: {
    classes: 'bg-slate-100 text-slate-700 border-slate-300',
    Icon: Clock,
  },
};

const STATUS_TO_TONE: Record<string, SemanticTone> = {
  ACTIVE: 'success',
  VERIFIED: 'success',
  RESOLVED: 'success',
  CLOSED: 'success',
  COMPLETE: 'success',
  POSTED: 'success',
  ALLOCATED: 'success',
  CALCULATED: 'success',
  OPEN: 'info',
  IN_PROGRESS: 'info',
  UNDER_REVIEW: 'info',
  PENDING: 'warning',
  SUSPENDED: 'warning',
  PARTIAL: 'warning',
  MEDIUM: 'warning',
  LOW: 'neutral',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
  DISMISSED: 'neutral',
  HIGH: 'danger',
  CRITICAL: 'danger',
  QUARANTINED: 'danger',
  FAILED: 'danger',
  MISSING: 'danger',
  EXCLUDED: 'danger',
};

/**
 * ICD322 Rule #7, #8, #15: Redundant Coding (Color + Icon + Border + Text Label)
 * Ensures status remains legible in grayscale and for colorblind users.
 */
export const StatusBadge: React.FC<{ status: string; tone?: SemanticTone }> = ({
  status,
  tone,
}) => {
  const normalized = (status || 'UNKNOWN').toUpperCase();
  const resolvedTone = tone ?? STATUS_TO_TONE[normalized] ?? 'neutral';
  const { classes, Icon } = TONE_CONFIG[resolvedTone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{normalized.replace(/_/g, ' ')}</span>
    </span>
  );
};

/**
 * ICD322 Rule #2, #3, #29: High Data-Ink KPI Card with Mandatory Context/Baseline
 */
export const ContextualKpiCard: React.FC<{
  title: string;
  value: string | number;
  context: string;
  tone?: SemanticTone;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, value, context, tone = 'neutral', actionLabel, onAction }) => {
  const accentBar: Record<SemanticTone, string> = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-600',
    info: 'bg-blue-600',
    neutral: 'bg-slate-400',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${accentBar[tone]}`}
            aria-hidden="true"
          />
        </div>
        <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {value}
        </div>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{context}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 pt-3 border-t border-slate-100 text-left text-xs font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {actionLabel} &rarr;
        </button>
      )}
    </div>
  );
};

/**
 * ICD322 Rule #22: Understandable Error Banner (What happened + Why + Next step)
 */
export const ActionableErrorBanner: React.FC<{
  whatHappened: string;
  why: string;
  nextStep: string;
  onRetry?: () => void;
}> = ({ whatHappened, why, nextStep, onRetry }) => (
  <div
    role="alert"
    className="bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
  >
    <div className="flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-0.5">
        <div className="font-semibold">{whatHappened}</div>
        <div className="text-xs text-rose-800">
          <strong>Cause:</strong> {why} &bull; <strong>Next step:</strong> {nextStep}
        </div>
      </div>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
      >
        Retry Request
      </button>
    )}
  </div>
);