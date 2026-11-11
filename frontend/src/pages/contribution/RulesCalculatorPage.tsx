import React, { useEffect, useState } from 'react';
import {
  Calculator,
  Scale,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  ContributionRule,
  ContributionPeriod,
  CalculationPreviewResponse,
  module2Api,
} from '../../api/module2Api';

export const RulesCalculatorPage: React.FC = () => {
  const [rules, setRules] = useState<ContributionRule[]>([]);
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [grossPay, setGrossPay] = useState<string>('20000.00');
  const [periodId, setPeriodId] = useState<number | ''>('');
  const [calculating, setCalculating] = useState(false);
  const [preview, setPreview] = useState<CalculationPreviewResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [rulesRes, periodsRes] = await Promise.all([
          module2Api.listRules(),
          module2Api.listPeriods(),
        ]);
        const rList = Array.isArray(rulesRes) ? rulesRes : [];
        const pList = Array.isArray(periodsRes) ? periodsRes : [];
        setRules(rList);
        setPeriods(pList);
        if (pList.length > 0) {
          setPeriodId(pList[0].periodId);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load contribution rules.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodId) return;
    try {
      setCalculating(true);
      setError(null);
      const res = await module2Api.previewCalculation({
        grossPay: Number(grossPay),
        periodId: Number(periodId),
      });
      setPreview(res);
    } catch (e: any) {
      setError(e.message || 'Calculation preview failed.');
    } finally {
      setCalculating(false);
    }
  };

  const fmt = (val: number | null | undefined) =>
    val === null || val === undefined
      ? 'â€”'
      : `ZMW ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" />
            Statutory Rule Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Contribution Rules &amp; Calculator</h1>
          <p className="text-slate-300 text-sm mt-1">
            Review verified statutory rule versions and preview exact decimal contribution calculations.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Preview Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calculator className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Calculation Preview</h2>
          </div>

          <form onSubmit={handleCalculate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contribution Period</label>
              <select
                required
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={periodId}
                onChange={(e) => setPeriodId(Number(e.target.value))}
              >
                {periods.length === 0 ? (
                  <option value="">No periods available</option>
                ) : (
                  periods.map((p) => (
                    <option key={p.periodId} value={p.periodId}>
                      {p.periodLabel || `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`} ({p.status})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gross Pay (ZMW)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={grossPay}
                onChange={(e) => setGrossPay(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={calculating || !periodId}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              <span>{calculating ? 'Calculating...' : 'Preview Contribution'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {preview && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2.5 text-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Rule: {preview.ruleCode || `v${preview.ruleVersionNo}`}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Employee (5%)</span>
                <span className="font-mono font-semibold text-slate-900">{fmt(preview.employeeAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Employer (5%)</span>
                <span className="font-mono font-semibold text-slate-900">{fmt(preview.employerAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="font-semibold text-slate-900">Total Expected</span>
                <span className="font-mono font-bold text-blue-700">{fmt(preview.totalAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Seeded Rules Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Scale className="w-4 h-4 text-slate-500" />
              <span>Verified Contribution Rule Versions</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
                {rules.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Rule Code</th>
                  <th className="py-3 px-4 font-semibold">Effective Window</th>
                  <th className="py-3 px-4 font-semibold">Rates (EE / ER)</th>
                  <th className="py-3 px-4 font-semibold">Earnings ceiling (monthly)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      Loading contribution rules...
                    </td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      No contribution rules found.
                    </td>
                  </tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.ruleVersionId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                        {r.ruleCode}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {r.effectiveFrom} → {r.effectiveTo || 'Present'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {(r.employeeRate * 100).toFixed(2)}% / {(r.employerRate * 100).toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-900">
                        {r.ceilingAmount != null ? fmt(r.ceilingAmount) : 'No ceiling'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
