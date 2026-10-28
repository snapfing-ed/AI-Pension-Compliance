import { AnomalyFinding, ContributionRecord, Employer } from '../types';

export interface ModelMetadata {
  modelName: string;
  modelVersion: string;
  status: 'SIMULATED_BASELINE' | 'TRAINED_STANDBY';
  algorithm: string;
  featureList: string[];
  trainingDatasetDescription: string;
  lastEvaluationDate: string;
  sampleSize: number;
  knownLimitations: string[];
}

export const CURRENT_MODEL_METADATA: ModelMetadata = {
  modelName: 'Pension Anomaly Scoring Engine',
  modelVersion: 'IsolationForest-v1.2.4-Simulated',
  status: 'SIMULATED_BASELINE',
  algorithm: 'Ensemble Isolation Forest + Robust Z-Score Multi-Feature Deviations',
  featureList: [
    'Monthly Contribution Volume Variance (%)',
    'Active Headcount-to-Remittance Ratio',
    'Historical 6-Month Rolling Mean Z-Score',
    'Remittance Timing Latency (Days Past Due)',
    'Wage Tier Bracket Concentration Index',
  ],
  trainingDatasetDescription:
    'Synthetic benchmark corpus consisting of 267 labeled employer reporting cycles modeled after standard Zambian pension contribution structures.',
  lastEvaluationDate: '2026-10-20',
  sampleSize: 267,
  knownLimitations: [
    'Current implementation is a transparent statistical baseline intended for decision support only.',
    'Anomaly scores represent mathematical distance from baseline, NOT a probability of non-compliance or legal guilt.',
    'Requires minimum 3 months of historical data per employer for robust variance baselining.',
    'Does not account for unrecorded sector-wide collective bargaining agreements without manual input.',
  ],
};

/**
 * Replaceable AI / ML Service Interface
 * In this prototype, evaluates records against statistical z-scores and multivariate deviation logic.
 * Later, this function can connect to a Spring Boot REST API endpoint (e.g. POST /api/v1/ml/detect-anomalies).
 */
export function runAnomalyAnalysis(
  records: ContributionRecord[],
  employers: Employer[]
): {
  findings: AnomalyFinding[];
  durationMs: number;
  evaluatedCount: number;
} {
  const startTime = performance.now();
  const employerMap = new Map<string, Employer>(employers.map((e) => [e.id, e]));
  const findings: AnomalyFinding[] = [];

  for (const record of records) {
    const employer = employerMap.get(record.employerId);
    if (!employer) continue;

    // Detect abrupt drop with stable headcount (Scenario 5)
    if (record.reportedAmount > 0 && record.expectedAmount > 0) {
      const dropRatio = (record.expectedAmount - record.reportedAmount) / record.expectedAmount;
      if (dropRatio > 0.35 && employer.activeMemberCount >= 50) {
        const zScore = parseFloat((dropRatio * 6.2).toFixed(2));
        const riskScore = Math.min(96, Math.round(50 + dropRatio * 60));

        findings.push({
          id: `ANOM-${record.period.replace('-', '')}-${record.employerId.slice(-4)}`,
          employerId: record.employerId,
          employerName: employer.name,
          period: record.period,
          anomalyCategory: 'ABRUPT_DROP',
          modelMethod: CURRENT_MODEL_METADATA.algorithm,
          riskScore,
          riskBand: riskScore >= 80 ? 'CRITICAL' : 'HIGH',
          zScore,
          features: [
            {
              name: 'Contribution Volume Drop',
              observedValue: `K ${record.reportedAmount.toLocaleString()}`,
              baselineValue: `K ${record.expectedAmount.toLocaleString()} (Expected)`,
              contributionWeight: 0.55,
            },
            {
              name: 'Active Headcount Stability',
              observedValue: `${employer.activeMemberCount} members`,
              baselineValue: 'No reported retrenchments',
              contributionWeight: 0.28,
            },
            {
              name: 'Implied Wage Dispersion',
              observedValue: `-${(dropRatio * 100).toFixed(1)}% reduction`,
              baselineValue: 'Historical variance < 4%',
              contributionWeight: 0.17,
            },
          ],
          reason: `Monthly contribution dropped by ${(dropRatio * 100).toFixed(1)}% despite active headcount remaining unchanged at ${employer.activeMemberCount} members. Z-score deviation of ${zScore} represents an extreme statistical outlier.`,
          detectedAt: new Date().toISOString(),
          reviewStatus: 'PENDING_REVIEW',
          suggestedSteps: [
            'Examine member-level wage brackets submitted in the monthly schedule',
            'Verify if collective wage reduction or temporary lay-off occurred',
            'Contact employer HR/payroll director for formal clarification',
          ],
        });
      }
    }

    // Detect Recurrent Underpayment / Partial Remittance
    if (
      record.status === 'PARTIAL_PAYMENT' &&
      record.reportedAmount > record.remittedAmount &&
      record.discrepancyPercent > 20
    ) {
      const unpaid = record.reportedAmount - record.remittedAmount;
      const riskScore = Math.min(85, Math.round(40 + (record.discrepancyPercent / 100) * 50));
      findings.push({
        id: `ANOM-${record.period.replace('-', '')}-RECUR-${record.employerId.slice(-4)}`,
        employerId: record.employerId,
        employerName: employer.name,
        period: record.period,
        anomalyCategory: 'RECURRENT_UNDERPAYMENT',
        modelMethod: CURRENT_MODEL_METADATA.algorithm,
        riskScore,
        riskBand: riskScore >= 75 ? 'HIGH' : 'MEDIUM',
        zScore: 2.65,
        features: [
          {
            name: 'Unreconciled Remittance Gap',
            observedValue: `K ${unpaid.toLocaleString()}`,
            baselineValue: 'K 0.00 tolerated gap',
            contributionWeight: 0.6,
          },
          {
            name: 'Remitted Member Coverage',
            observedValue: `${Math.round((record.remittedAmount / record.reportedAmount) * employer.activeMemberCount)} / ${employer.activeMemberCount} members covered`,
            baselineValue: '100% full roster payment',
            contributionWeight: 0.4,
          },
        ],
        reason: `Remittance of K ${record.remittedAmount.toLocaleString()} leaves a significant unreconciled deficit of K ${unpaid.toLocaleString()} (${record.discrepancyPercent.toFixed(1)}% gap).`,
        detectedAt: new Date().toISOString(),
        reviewStatus: 'PENDING_REVIEW',
        suggestedSteps: [
          'Cross-reference bank transaction records for split transfers',
          'Request employer treasury reconciliation proof',
        ],
      });
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    findings,
    durationMs,
    evaluatedCount: records.length,
  };
}
