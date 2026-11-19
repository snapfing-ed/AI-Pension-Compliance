import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { module2Api, Employer, ContributionPeriod } from '../../api/module2Api';
import {
  module34Api,
  ComplianceFindingItem,
  InvestigationCaseItem,
  SubmittedReturnItem,
  PaymentTransactionItem,
} from '../../api/module34';
import {
  StatusBadge,
  ContextualKpiCard,
  ActionableErrorBanner,
} from '../../components/ui/DesignSystem';

const formatZMW = (amount: number): string =>
  `ZMW ${amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface NormalizedFinding {
  findingId: number;
  category: string;
  summary: string;
  severity: string;
  status: string;
  priorityScore: number;
}

const deriveSeverity = (raw: Record<string, any>): string => {
  if (raw.severity || raw.severityLevel) {
    return String(raw.severity ?? raw.severityLevel).toUpperCase();
  }
  const score = Number(raw.priorityScore ?? 0);
  if (score >= 90) return 'CRITICAL';
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
};

const normalizeFinding = (raw: ComplianceFindingItem): NormalizedFinding => {
  const f = raw as Record<string, any>;
  return {
    findingId: Number(f.findingId ?? f.id ?? 0),
    category: String(f.findingCode ?? f.findingType ?? f.ruleCode ?? 'COMPLIANCE'),
    summary: String(f.description ?? f.summary ?? f.explanation ?? 'Compliance variance detected'),
    severity: deriveSeverity(f),
    status: String(f.status ?? f.resolutionStatus ?? 'NEW').toUpperCase(),
    priorityScore: Number(f.priorityScore ?? 0),
  };
};

const extractReturnTotal = (raw: SubmittedReturnItem): number => {
  const r = raw as Record<string, any>;
  return Number(
    r.reportedTotalAmount ??
      r.latestVersion?.reportedTotalAmount ??
      r.totalAmount ??
      0
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { setActiveTab } = useApp();

  const [employers, setEmployers] = useState<Employer[]>([]);
  const [totalEmployers, setTotalEmployers] = useState(0);
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [rawFindings, setRawFindings] = useState<ComplianceFindingItem[]>([]);
  const [cases, setCases] = useState<InvestigationCaseItem[]>([]);
  const [returnsList, setReturnsList] = useState<SubmittedReturnItem[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentTransactionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [empRes, periodRes, findingRes, caseRes, retRes, payRes] =
        await Promise.all([
          module2Api.listEmployers({ page: 0, size: 100 }),
          module2Api.listPeriods(),
          module34Api.listComplianceFindings(),
          module34Api.listCases(),
          module34Api.listReturns(),
          module34Api.listPayments(),
        ]);

      setEmployers(empRes?.content ?? []);
      setTotalEmployers(empRes?.totalElements ?? (empRes?.content?.length ?? 0));
      setPeriods(periodRes ?? []);
      setRawFindings(findingRes ?? []);
      setCases(caseRes ?? []);
      setReturnsList(retRes ?? []);
      setPaymentsList(payRes ?? []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Unable to reach compliance services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const activeEmployers = employers.filter((e) => e.status === 'ACTIVE').length;
    const openPeriods = periods.filter((p) => p.status === 'OPEN').length;

    const normalized = rawFindings.map(normalizeFinding);
    const filteredFindings =
      severityFilter === 'ALL'
        ? normalized
        : normalized.filter((f) => f.severity === severityFilter);

    // Unresolved findings in DB have status NEW, UNDER_REVIEW, or CONFIRMED
    const openFindings = filteredFindings
      .filter((f) => ['NEW', 'UNDER_REVIEW', 'CONFIRMED', 'OPEN'].includes(f.status))
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const highRiskFindings = openFindings.filter((f) =>
      ['HIGH', 'CRITICAL'].includes(f.severity)
    );

    const openCases = cases.filter((c) => !['CLOSED', 'RESOLVED'].includes((c.caseStatus || '').toUpperCase()));
    const highPriorityCases = openCases.filter((c) =>
      ['HIGH', 'CRITICAL'].includes((c.priority || '').toUpperCase())
    );

    const totalReportedZmw = returnsList.reduce(
      (sum, r) => sum + extractReturnTotal(r),
      0
    );
    const totalRemittedZmw = paymentsList.reduce(
      (sum, p) => sum + Number((p as Record<string, any>).transactionAmount ?? 0),
      0
    );
    const varianceZmw = totalReportedZmw - totalRemittedZmw;

    const byTypeMap = new Map<string, number>();
    openFindings.forEach((f) => {
      byTypeMap.set(f.category, (byTypeMap.get(f.category) ?? 0) + 1);
    });
    const findingBreakdown = Array.from(byTypeMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      activeEmployers,
      openPeriods,
      filteredFindings,
      openFindings,
      highRiskFindings,
      openCases,
      highPriorityCases,
      totalReportedZmw,
      totalRemittedZmw,
      varianceZmw,
      findingBreakdown,
    };
  }, [employers, periods, rawFindings, cases, returnsList, paymentsList, severityFilter]);

  const maxFindingCount = Math.max(1, ...metrics.findingBreakdown.map((d) => d.count));
  const maxFinancialZmw = Math.max(
    1,
    metrics.totalReportedZmw,
    metrics.totalRemittedZmw
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Clean Executive Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            <span>Statutory Pension Compliance Oversight</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Compliance &amp; Contribution Monitoring Overview
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm">
            Active scope: {metrics.activeEmployers} of {totalEmployers} employers active &bull; {metrics.openPeriods} open contribution period(s) &bull; {returnsList.length} submitted return(s)
          </p>
        </div>

        {/* User Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <label htmlFor="dash-severity" className="text-xs text-slate-300">
              Severity:
            </label>
            <select
              id="dash-severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              <option value="ALL" className="text-slate-900">All Severities</option>
              <option value="CRITICAL" className="text-slate-900">Critical</option>
              <option value="HIGH" className="text-slate-900">High</option>
              <option value="MEDIUM" className="text-slate-900">Medium</option>
              <option value="LOW" className="text-slate-900">Low</option>
            </select>
          </div>

          {severityFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSeverityFilter('ALL')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <ActionableErrorBanner
          whatHappened="Dashboard metrics could not be refreshed."
          why={errorMsg}
          nextStep="Verify the Spring Boot backend is running on port 8080 and click Retry Request."
          onRetry={loadDashboard}
        />
      )}

      {/* 4 Contextual KPIs */}
      <section aria-label="Key Compliance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ContextualKpiCard
          title="Active Employers"
          value={`${metrics.activeEmployers} / ${totalEmployers}`}
          context={
            totalEmployers > 0
              ? `${Math.round((metrics.activeEmployers / totalEmployers) * 100)}% of registered employer cadastre currently active`
              : 'No employers registered in cadastre yet'
          }
          tone="info"
          actionLabel="Manage Employers"
          onAction={() => setActiveTab('employers')}
        />

        <ContextualKpiCard
          title="Open Compliance Findings"
          value={metrics.openFindings.length}
          context={`${metrics.highRiskFindings.length} High/Critical severity out of ${metrics.filteredFindings.length} total findings`}
          tone={metrics.highRiskFindings.length > 0 ? 'danger' : metrics.openFindings.length > 0 ? 'warning' : 'success'}
          actionLabel="Inspect Findings"
          onAction={() => setActiveTab('compliance')}
        />

        <ContextualKpiCard
          title="Reported vs. Remitted Gap"
          value={formatZMW(Math.max(0, metrics.varianceZmw))}
          context={`Reported ${formatZMW(metrics.totalReportedZmw)} vs. Remitted ${formatZMW(metrics.totalRemittedZmw)}`}
          tone={metrics.varianceZmw > 0 ? 'warning' : 'success'}
          actionLabel="View Returns & Payments"
          onAction={() => setActiveTab('returns-payments')}
        />

        <ContextualKpiCard
          title="Active Investigation Cases"
          value={metrics.openCases.length}
          context={`${metrics.highPriorityCases.length} High/Critical priority cases requiring officer action`}
          tone={metrics.highPriorityCases.length > 0 ? 'warning' : 'neutral'}
          actionLabel="Open Case Queue"
          onAction={() => setActiveTab('cases')}
        />
      </section>

      {/* Visual Analytics */}
      <section aria-label="Compliance Visual Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <figure
          role="img"
          aria-label="Horizontal bar chart of open compliance findings by category"
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Open Findings by Violation Category
              </h2>
              <figcaption className="text-xs text-slate-500 mt-0.5">
                Direct count comparison across active anomaly and variance rules
              </figcaption>
            </div>
            <span className="text-xs font-mono text-slate-500">
              n = {metrics.openFindings.length}
            </span>
          </div>

          {metrics.findingBreakdown.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No open findings match the current filter.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {metrics.findingBreakdown.map((item) => {
                const widthPct = Math.max(6, Math.round((item.count / maxFindingCount) * 100));
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 font-mono">
                        {item.label}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {item.count} {item.count === 1 ? 'finding' : 'findings'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-sm overflow-hidden">
                      <div
                        className="bg-slate-800 h-3 rounded-sm transition-all duration-300"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </figure>

        <figure
          role="img"
          aria-label="Comparison bar chart of reported contributions versus remitted payments"
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Reported Returns vs. Actual Remittances
              </h2>
              <figcaption className="text-xs text-slate-500 mt-0.5">
                Aggregate ZMW comparison showing collection realization against declared liabilities
              </figcaption>
            </div>
            <StatusBadge
              status={metrics.varianceZmw > 0 ? 'SHORTFALL' : 'BALANCED'}
              tone={metrics.varianceZmw > 0 ? 'warning' : 'success'}
            />
          </div>

          <div className="space-y-4 pt-2 border-l border-slate-200 pl-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700">Declared / Reported Returns</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatZMW(metrics.totalReportedZmw)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-4 rounded-sm overflow-hidden">
                <div
                  className="bg-blue-700 h-4 rounded-sm"
                  style={{
                    width: `${
                      metrics.totalReportedZmw > 0
                        ? Math.max(4, Math.round((metrics.totalReportedZmw / maxFinancialZmw) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700">Verified Bank Remittances</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatZMW(metrics.totalRemittedZmw)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-4 rounded-sm overflow-hidden">
                <div
                  className="bg-emerald-700 h-4 rounded-sm"
                  style={{
                    width: `${
                      metrics.totalRemittedZmw > 0
                        ? Math.max(4, Math.round((metrics.totalRemittedZmw / maxFinancialZmw) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Unremitted Variance (Reported &minus; Remitted):</span>
              <span className="font-mono font-bold text-slate-900">
                {formatZMW(metrics.varianceZmw)}
              </span>
            </div>
          </div>
        </figure>
      </section>

      {/* Priority Queue Table */}
      <section aria-label="Priority Compliance Findings Queue" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Priority Open Compliance Findings
            </h2>
            <p className="text-xs text-slate-500">
              Showing top 8 unresolved items requiring verification or escalation
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            View All Findings
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Finding ID</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Summary</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    Loading priority findings...
                  </td>
                </tr>
              ) : metrics.openFindings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No open compliance findings found. Run an analysis in Analysis &amp; Findings to populate results.
                  </td>
                </tr>
              ) : (
                metrics.openFindings.slice(0, 8).map((f) => (
                  <tr key={f.findingId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">
                      #{f.findingId}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {f.category}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-md truncate">
                      {f.summary}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={f.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={f.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};