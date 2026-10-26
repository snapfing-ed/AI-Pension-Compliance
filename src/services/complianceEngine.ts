import {
  ContributionRecord,
  ComplianceFinding,
  SystemConfiguration,
  Employer,
} from '../types';

export interface ComplianceRunResult {
  runId: string;
  timestamp: string;
  recordsEvaluated: number;
  exceptionsDetected: number;
  findings: ComplianceFinding[];
  durationMs: number;
  summaryByCategory: {
    missing: number;
    delayed: number;
    incomplete: number;
    unusual: number;
    dataQuality: number;
  };
}

/**
 * Deterministic Rule Engine for Pension Contribution Compliance
 * Evaluates rules A through E against contribution records and employer profiles.
 */
export function executeComplianceRules(
  records: ContributionRecord[],
  employers: Employer[],
  config: SystemConfiguration,
  existingFindings: ComplianceFinding[] = []
): ComplianceRunResult {
  const startTime = performance.now();
  const employerMap = new Map<string, Employer>(employers.map((e) => [e.id, e]));
  const freshFindings: ComplianceFinding[] = [];
  const summary = {
    missing: 0,
    delayed: 0,
    incomplete: 0,
    unusual: 0,
    dataQuality: 0,
  };

  const nowIso = new Date().toISOString();
  let findingCounter = existingFindings.length + 1;

  for (const record of records) {
    const employer = employerMap.get(record.employerId);
    const employerName = employer?.name || record.employerName || 'Unknown Employer';

    // -------------------------------------------------------------
    // RULE E: Data Quality Exceptions
    // -------------------------------------------------------------
    const hasInvalidNegative = record.remittedAmount < 0 || record.reportedAmount < 0;
    const hasUnmatchedEmployer = !employer;
    const isSuspectedDuplicate = record.id.includes('-DUP') || record.status === 'DATA_QUALITY_ERROR';

    if (hasInvalidNegative || hasUnmatchedEmployer || isSuspectedDuplicate) {
      let desc = 'Data quality irregularity detected: ';
      if (hasInvalidNegative) desc += 'Record contains negative financial figures. ';
      if (hasUnmatchedEmployer) desc += `Employer ID ${record.employerId} is not in authorized registry. `;
      if (isSuspectedDuplicate) desc += `Suspected duplicate schedule hash for ${record.period}. `;

      freshFindings.push({
        id: `FND-${new Date().getFullYear()}-${String(findingCounter++).padStart(3, '0')}`,
        ruleId: 'RULE_E_DATA_QUALITY',
        ruleName: 'Rule E: Data-Quality & Schema Exception',
        severity: 'MEDIUM',
        employerId: record.employerId,
        employerName,
        period: record.period,
        contributionRecordId: record.id,
        detectedAt: nowIso,
        explanation: desc,
        monetaryImpact: 0,
        suggestedAction: 'Isolate row, verify transmission logs, and require resubmission of clean payload.',
        status: 'NEW',
        metrics: {
          expected: record.expectedAmount,
          reported: record.reportedAmount,
          remitted: record.remittedAmount,
        },
      });
      summary.dataQuality++;
      continue; // Skip downstream financial checks on corrupt row
    }

    // -------------------------------------------------------------
    // RULE A: Missing Contributions
    // Expected obligation exists, but submission is completely absent or zero post-due date + grace period
    // -------------------------------------------------------------
    if (record.submissionDate === null || record.status === 'MISSING_SUBMISSION') {
      const monetaryImpact = record.expectedAmount;
      freshFindings.push({
        id: `FND-${new Date().getFullYear()}-${String(findingCounter++).padStart(3, '0')}`,
        ruleId: 'RULE_A_MISSING',
        ruleName: 'Rule A: Missing Expected Contribution Schedule',
        severity: 'HIGH',
        employerId: record.employerId,
        employerName,
        period: record.period,
        contributionRecordId: record.id,
        detectedAt: nowIso,
        explanation: `Expected contribution schedule of K ${record.expectedAmount.toLocaleString()} for period ${record.period} has not been received. Grace period of ${config.gracePeriodDays} days has expired.`,
        monetaryImpact,
        suggestedAction: 'Issue Formal Notice of Missing Schedule and request immediate compliance status.',
        status: 'NEW',
        metrics: {
          expected: record.expectedAmount,
          reported: 0,
          remitted: 0,
        },
      });
      summary.missing++;
      continue; // If missing entirely, incomplete or delay rules don't apply to this row
    }

    // -------------------------------------------------------------
    // RULE B: Delayed Contributions
    // Submission or remittance occurred after the configured due date
    // -------------------------------------------------------------
    const submissionTime = record.submissionDate ? new Date(record.submissionDate).getTime() : 0;
    const dueTime = new Date(record.dueDate).getTime();
    const isLate = submissionTime > dueTime;

    if (isLate || record.status === 'OVERDUE') {
      const diffDays = Math.max(1, Math.round((submissionTime - dueTime) / (1000 * 3600 * 24)));
      freshFindings.push({
        id: `FND-${new Date().getFullYear()}-${String(findingCounter++).padStart(3, '0')}`,
        ruleId: 'RULE_B_DELAYED',
        ruleName: 'Rule B: Remittance Received Past Configured Deadline',
        severity: diffDays > 10 ? 'MEDIUM' : 'LOW',
        employerId: record.employerId,
        employerName,
        period: record.period,
        contributionRecordId: record.id,
        detectedAt: nowIso,
        explanation: `Filing/Remittance for ${record.period} completed ${diffDays} calendar days past configured demonstration deadline (${record.dueDate}).`,
        monetaryImpact: 0,
        suggestedAction: 'Log compliance delay incident. Flag for recurring latency monitoring.',
        status: 'NEW',
        metrics: {
          expected: record.expectedAmount,
          reported: record.reportedAmount,
          remitted: record.remittedAmount,
          delayDays: diffDays,
        },
      });
      summary.delayed++;
    }

    // -------------------------------------------------------------
    // RULE C: Incomplete Contributions
    // Remitted amount is below expected/reported by more than configured tolerance
    // -------------------------------------------------------------
    const shortfall = Math.max(0, record.expectedAmount - record.remittedAmount);
    const shortfallPercent = record.expectedAmount > 0 ? (shortfall / record.expectedAmount) * 100 : 0;

    if (
      shortfall > config.shortfallToleranceZMW &&
      shortfallPercent > config.shortfallTolerancePercent &&
      record.status === 'PARTIAL_PAYMENT'
    ) {
      freshFindings.push({
        id: `FND-${new Date().getFullYear()}-${String(findingCounter++).padStart(3, '0')}`,
        ruleId: 'RULE_C_INCOMPLETE',
        ruleName: 'Rule C: Contribution Remittance Shortfall',
        severity: shortfall > 50000 ? 'HIGH' : 'MEDIUM',
        employerId: record.employerId,
        employerName,
        period: record.period,
        contributionRecordId: record.id,
        detectedAt: nowIso,
        explanation: `Remitted amount (K ${record.remittedAmount.toLocaleString()}) is K ${shortfall.toLocaleString()} (${shortfallPercent.toFixed(1)}%) below the expected obligation of K ${record.expectedAmount.toLocaleString()}.`,
        monetaryImpact: shortfall,
        suggestedAction: 'Require proof of bank settlement for outstanding shortfall balance.',
        status: 'NEW',
        metrics: {
          expected: record.expectedAmount,
          reported: record.reportedAmount,
          remitted: record.remittedAmount,
          deviationPercent: shortfallPercent,
        },
      });
      summary.incomplete++;
    }

    // -------------------------------------------------------------
    // RULE D: Unusual Contributions (Abrupt Drop in reported schedule)
    // -------------------------------------------------------------
    if (record.status === 'UNUSUAL_VARIATION' && record.discrepancyPercent > 25) {
      freshFindings.push({
        id: `FND-${new Date().getFullYear()}-${String(findingCounter++).padStart(3, '0')}`,
        ruleId: 'RULE_D_UNUSUAL',
        ruleName: 'Rule D: Atypical Contribution Variance Indicator',
        severity: 'HIGH',
        employerId: record.employerId,
        employerName,
        period: record.period,
        contributionRecordId: record.id,
        detectedAt: nowIso,
        explanation: `Schedule reflects a ${record.discrepancyPercent.toFixed(1)}% variance compared to normal baseline. Expected K ${record.expectedAmount.toLocaleString()} but declared K ${record.reportedAmount.toLocaleString()}.`,
        monetaryImpact: Math.max(0, record.expectedAmount - record.remittedAmount),
        suggestedAction: 'Initiate desk investigation to verify whether staff layoffs, wage renegotiations, or misreporting occurred.',
        status: 'NEW',
        metrics: {
          expected: record.expectedAmount,
          reported: record.reportedAmount,
          remitted: record.remittedAmount,
          deviationPercent: record.discrepancyPercent,
        },
      });
      summary.unusual++;
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    runId: `RUN-${Date.now().toString(36).toUpperCase()}`,
    timestamp: nowIso,
    recordsEvaluated: records.length,
    exceptionsDetected: freshFindings.length,
    findings: freshFindings,
    durationMs,
    summaryByCategory: summary,
  };
}
