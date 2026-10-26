import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Play,
  Filter,
  Search,
  AlertTriangle,
  FolderPlus,
  Clock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ComplianceFinding, RuleIdentifier } from '../types';
import { formatZMW, formatDate, formatDateTime } from '../utils/formatters';

export const ComplianceMonitoringView: React.FC = () => {
  const {
    findings,
    runComplianceChecks,
    createCaseFromFinding,
    setActiveTab,
    setActiveDetailId,
    systemConfig,
  } = useApp();

  const [ruleFilter, setRuleFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchesRule = ruleFilter === 'ALL' || f.ruleId === ruleFilter;
      const matchesSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
      const matchesSearch =
        f.employerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.explanation.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRule && matchesSeverity && matchesSearch;
    });
  }, [findings, ruleFilter, severityFilter, searchQuery]);

  const handleExecuteEngine = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = runComplianceChecks();
      setIsProcessing(false);
      setLastRunSummary(
        `Engine processed ${result.recordsEvaluated} records in ${result.durationMs}ms. Identified ${result.exceptionsDetected} active exceptions.`
      );
      setTimeout(() => setLastRunSummary(null), 6000);
    }, 450);
  };

  const handleCreateCase = (findingId: string) => {
    const caseId = createCaseFromFinding(findingId);
    if (caseId) {
      setActiveTab('cases');
      setActiveDetailId(caseId);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Deterministic Compliance Monitoring Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent, testable administrative rules operating independently of machine-learning models
          </p>
        </div>
        <button
          onClick={handleExecuteEngine}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
        >
          <Play className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'Evaluating Records...' : 'Execute Full Compliance Run'}</span>
        </button>
      </div>

      {/* Execution Feedback Notification */}
      {lastRunSummary && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-medium">{lastRunSummary}</span>
        </div>
      )}

      {/* Rules Architecture Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="font-bold text-slate-900">Rule A: Missing</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Flags missing schedules &gt;{systemConfig.gracePeriodDays} days post due date.
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="font-bold text-slate-900">Rule B: Delayed</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Flags submissions completed after the {systemConfig.monthlyDueDay}th proximo.
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="font-bold text-slate-900">Rule C: Incomplete</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Flags shortfalls exceeding K {systemConfig.shortfallToleranceZMW} ({systemConfig.shortfallTolerancePercent}%).
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="font-bold text-slate-900">Rule D: Unusual</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Identifies sudden shifts (&gt;25% variance) in reported wage totals.
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-lg">
          <div className="font-bold text-slate-900">Rule E: Schema</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Detects duplicate hash payloads, negative figures, and unmatched IDs.
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search findings by employer or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Rule Filter:</span>
          <select
            value={ruleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Detection Rules</option>
            <option value="RULE_A_MISSING">Rule A: Missing Schedule</option>
            <option value="RULE_B_DELAYED">Rule B: Delayed Remittance</option>
            <option value="RULE_C_INCOMPLETE">Rule C: Incomplete Shortfall</option>
            <option value="RULE_D_UNUSUAL">Rule D: Unusual Variance</option>
            <option value="RULE_E_DATA_QUALITY">Rule E: Data Quality</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
            No active compliance findings match the current filter.
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {finding.id}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        finding.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : finding.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : finding.severity === 'MEDIUM'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-slate-500 font-mono">Period {finding.period}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">Detected: {formatDate(finding.detectedAt)}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{finding.ruleName}</h3>
                  <div className="text-xs text-slate-700 font-medium">
                    Employer: <span className="text-slate-900 font-semibold">{finding.employerName}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">{finding.explanation}</p>

                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div className="bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                      <span className="text-slate-500">Suggested Action: </span>
                      <span className="font-medium text-slate-800">{finding.suggestedAction}</span>
                    </div>

                    {finding.monetaryImpact > 0 && (
                      <div className="font-mono">
                        <span className="text-slate-500">Exposure: </span>
                        <span className="font-bold text-rose-700">{formatZMW(finding.monetaryImpact)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0 pt-1">
                  {finding.status === 'LINKED_TO_CASE' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Case Active: {finding.linkedCaseId}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCreateCase(finding.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Open Investigation Case</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
