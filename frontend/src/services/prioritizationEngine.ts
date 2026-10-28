import { CasePriority } from '../types';

export interface PriorityCalculation {
  score: number; // 0 to 100
  priority: CasePriority;
  factors: Array<{ factor: string; points: number; explanation: string }>;
  reasonSummary: string;
}

/**
 * Calculates a transparent, explainable investigation priority score (0-100)
 */
export function calculateInvestigationPriority(params: {
  monetaryDiscrepancy: number;
  daysUnresolved: number;
  isMissingSubmission: boolean;
  employerStatus: string;
  anomalyScore?: number;
}): PriorityCalculation {
  const factors: Array<{ factor: string; points: number; explanation: string }> = [];
  let score = 0;

  // Factor 1: Potential Monetary Discrepancy
  if (params.monetaryDiscrepancy >= 200000) {
    score += 40;
    factors.push({
      factor: 'Monetary Exposure',
      points: 40,
      explanation: `Substantial exposure of K ${params.monetaryDiscrepancy.toLocaleString()} (>= K200,000 threshold).`,
    });
  } else if (params.monetaryDiscrepancy >= 50000) {
    score += 25;
    factors.push({
      factor: 'Monetary Exposure',
      points: 25,
      explanation: `Moderate exposure of K ${params.monetaryDiscrepancy.toLocaleString()} (>= K50,000 threshold).`,
    });
  } else if (params.monetaryDiscrepancy > 0) {
    score += 10;
    factors.push({
      factor: 'Monetary Exposure',
      points: 10,
      explanation: `Minor exposure of K ${params.monetaryDiscrepancy.toLocaleString()}.`,
    });
  }

  // Factor 2: Age of Unresolved Exception (Days)
  if (params.daysUnresolved >= 30) {
    score += 25;
    factors.push({
      factor: 'Aging Exception',
      points: 25,
      explanation: `Unresolved for ${params.daysUnresolved} days (>= 30 days overdue).`,
    });
  } else if (params.daysUnresolved >= 14) {
    score += 15;
    factors.push({
      factor: 'Aging Exception',
      points: 15,
      explanation: `Unresolved for ${params.daysUnresolved} days (>= 14 days overdue).`,
    });
  } else if (params.daysUnresolved > 5) {
    score += 5;
    factors.push({
      factor: 'Aging Exception',
      points: 5,
      explanation: `Unresolved for ${params.daysUnresolved} days.`,
    });
  }

  // Factor 3: Complete Non-Submission vs Partial Filing
  if (params.isMissingSubmission) {
    score += 20;
    factors.push({
      factor: 'Total Absence of Schedule',
      points: 20,
      explanation: 'No reporting schedule submitted post-grace period.',
    });
  }

  // Factor 4: Employer Monitoring Status / Prior Risk
  if (params.employerStatus === 'HIGH_RISK' || params.employerStatus === 'UNDER_AUDIT') {
    score += 15;
    factors.push({
      factor: 'Employer Watch Status',
      points: 15,
      explanation: `Employer is flagged under ${params.employerStatus.replace('_', ' ')}.`,
    });
  }

  // Factor 5: AI / Statistical Anomaly Score
  if (params.anomalyScore && params.anomalyScore >= 80) {
    score += 15;
    factors.push({
      factor: 'Statistical Anomaly Divergence',
      points: 15,
      explanation: `High anomaly intensity score of ${params.anomalyScore}/100.`,
    });
  }

  // Bound score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine priority band
  let priority: CasePriority = 'LOW';
  if (finalScore >= 80) priority = 'URGENT';
  else if (finalScore >= 60) priority = 'HIGH';
  else if (finalScore >= 35) priority = 'MEDIUM';

  const reasonSummary = factors.map((f) => `+${f.points} pts for ${f.factor.toLowerCase()}`).join(', ');

  return {
    score: finalScore,
    priority,
    factors,
    reasonSummary,
  };
}
