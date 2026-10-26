import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Sparkles,
  Search,
  Filter,
  Play,
  Info,
  CheckCircle2,
  FolderPlus,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Activity,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnomalyFinding, RiskBand } from '../types';
import { CURRENT_MODEL_METADATA } from '../services/anomalyService';
import { formatDate } from '../utils/formatters';

export const AIRiskAnalysisView: React.FC = () => {
  const {
    anomalies,
    runAnomalyScan,
    createCaseFromAnomaly,
    setActiveTab,
    setActiveDetailId,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [riskBandFilter, setRiskBandFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanToast, setScanToast] = useState<string | null>(null);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => {
      const matchesCategory = categoryFilter === 'ALL' || a.anomalyCategory === categoryFilter;
      const matchesBand = riskBandFilter === 'ALL' || a.riskBand === riskBandFilter;
      const matchesSearch =
        a.employerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.reason.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesBand && matchesSearch;
    });
  }, [anomalies, categoryFilter, riskBandFilter, searchQuery]);

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      runAnomalyScan();
      setIsScanning(false);
      setScanToast('AI Anomaly Scan completed across all active contribution records.');
      setTimeout(() => setScanToast(null), 4000);
    }, 500);
  };

  const handleOpenCase = (anomalyId: string) => {
    const caseId = createCaseFromAnomaly(anomalyId);
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
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">AI Risk Analysis & Anomaly Explainability</h2>
            <span className="text-[11px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
              Replaceable ML Service Layer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical deviation scoring & feature-attribution explainability for non-obvious contribution distortions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModelInfo(!showModelInfo)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold shadow-2xs"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showModelInfo ? 'Hide Model Specs' : 'Model Specs & Limitations'}</span>
          </button>

          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm disabled:opacity-50"
          >
            <Cpu className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Evaluating Algorithms...' : 'Run Anomaly Scan'}</span>
          </button>
        </div>
      </div>

      {scanToast && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-medium">{scanToast}</span>
        </div>
      )}

      {/* Domain Guidance Disclosure */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2.5">
        <Activity className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900">Explainability Standard: </span>
          <span>
            Anomaly scores indicate mathematical deviation distance from historical baselines. They are decision-support
            indicators for investigation prioritisation and do NOT establish guilt, intent, or automatic legal
            non-compliance.
          </span>
        </div>
      </div>

      {/* Model Information Panel (Collapsible) */}
      {showModelInfo && (
        <div className="bg-white border border-slate-300 rounded-lg p-5 space-y-4 text-xs animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <div className="font-bold text-slate-900 text-sm">{CURRENT_MODEL_METADATA.modelName}</div>
              <div className="text-slate-500 font-mono text-[11px]">
                Version: {CURRENT_MODEL_METADATA.modelVersion} · Algorithm: {CURRENT_MODEL_METADATA.algorithm}
              </div>
            </div>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-semibold">
              Status: {CURRENT_MODEL_METADATA.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-semibold text-slate-800 mb-1">Observed Feature Vectors:</div>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                {CURRENT_MODEL_METADATA.featureList.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-1">Training & Baseline Corpus:</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {CURRENT_MODEL_METADATA.trainingDatasetDescription}
              </p>
              <div className="mt-2 text-slate-500 font-mono text-[11px]">
                Sample Size: {CURRENT_MODEL_METADATA.sampleSize} cycles · Evaluated: {CURRENT_MODEL_METADATA.lastEvaluationDate}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="font-semibold text-slate-800 mb-1">Known Model Limitations:</div>
            <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
              {CURRENT_MODEL_METADATA.knownLimitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search anomalies by employer name or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Categories</option>
            <option value="ABRUPT_DROP">Abrupt Volume Drop</option>
            <option value="RECURRENT_UNDERPAYMENT">Recurrent Underpayment</option>
            <option value="LATENCY_CLUSTER">Latency Cluster</option>
            <option value="HEADCOUNT_DIVERGENCE">Headcount Divergence</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Risk Band:</span>
          <select
            value={riskBandFilter}
            onChange={(e) => setRiskBandFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Risk Bands</option>
            <option value="CRITICAL">Critical (&gt;80)</option>
            <option value="HIGH">High (60-79)</option>
            <option value="MEDIUM">Medium (40-59)</option>
            <option value="LOW">Low (&lt;40)</option>
          </select>
        </div>
      </div>

      {/* Anomalies Card Grid */}
      <div className="space-y-4">
        {filteredAnomalies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
            No statistical anomaly findings match the selected filters.
          </div>
        ) : (
          filteredAnomalies.map((anom) => (
            <div
              key={anom.id}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {anom.id}
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        anom.riskBand === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : anom.riskBand === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      Risk Band: {anom.riskBand} ({anom.riskScore}/100)
                    </span>
                    <span className="font-mono text-slate-500">Period {anom.period}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-600 font-semibold">Z-Score: {anom.zScore}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {anom.employerName} —{' '}
                    <span className="text-slate-600 font-medium">{anom.anomalyCategory.replace('_', ' ')}</span>
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {anom.reviewStatus === 'INVESTIGATION_OPENED' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Investigation Open ({anom.linkedCaseId})</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenCase(anom.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Open Case from Anomaly</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Statistical Explanation */}
              <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-900">Detection Rationale: </span>
                <span>{anom.reason}</span>
              </div>

              {/* Feature Attribution Table */}
              <div>
                <div className="text-xs font-bold text-slate-800 mb-1.5">
                  Explainable Feature Weights & Observed Baselines:
                </div>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <tr>
                        <th className="py-2 px-3">Evaluated Feature</th>
                        <th className="py-2 px-3">Observed In Submission</th>
                        <th className="py-2 px-3">Historical Baseline Context</th>
                        <th className="py-2 px-3 text-right">Model Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {anom.features.map((feat, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-slate-900">{feat.name}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-rose-700">{feat.observedValue}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{feat.baselineValue}</td>
                          <td className="py-2 px-3 font-mono text-right text-slate-800 font-bold">
                            {(feat.contributionWeight * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suggested Investigation Protocol */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                <div className="font-bold text-slate-900 mb-1">Recommended Investigation Protocol:</div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  {anom.suggestedSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
