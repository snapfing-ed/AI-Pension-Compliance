export type UserRole = 'SYSTEM_ADMINISTRATOR' | 'COMPLIANCE_MONITOR';
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED';

export interface User {
  id: string; // e.g. USR-001
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: AccountStatus;
  createdAt: string;
  lastLogin: string | null;
  passwordHash?: string;
  passwordSalt?: string;
}

export type SessionUser = Omit<User, 'passwordHash' | 'passwordSalt'>;

export type EmployerRegistrationStatus = 'ACTIVE' | 'SUSPENDED' | 'UNDER_AUDIT' | 'DEREGISTERED';
export type MonitoringStatus = 'NORMAL' | 'ELEVATED_WATCH' | 'INVESTIGATION_OPEN' | 'HIGH_RISK';

export interface Employer {
  id: string; // e.g. EMP-ZM-1001
  name: string;
  sector: string;
  location: string;
  registrationStatus: EmployerRegistrationStatus;
  activeMemberCount: number;
  expectedMonthlyContribution: number; // in ZMW
  monitoringStatus: MonitoringStatus;
  lastSubmissionDate: string | null;
  registeredDate: string;
  contactEmail: string;
  contactPhone: string;
}

export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'RETIRED';

export interface Member {
  id: string; // e.g. MEM-ZM-80214
  employerId: string;
  employerName: string;
  displayName: string; // Anonymized e.g. "K. Banda"
  membershipStatus: MembershipStatus;
  joinedDate: string;
  baseSalaryTier: number; // in ZMW
  expectedMonthlyContribution: number; // in ZMW
}

export type ContributionStatus =
  | 'RECONCILED'
  | 'MISSING_SUBMISSION'
  | 'MISSING_REMITTANCE'
  | 'PARTIAL_PAYMENT'
  | 'OVERDUE'
  | 'UNUSUAL_VARIATION'
  | 'DATA_QUALITY_ERROR';

export type PaymentChannel = 'ELECTRONIC_PORTAL' | 'BATCH_CSV' | 'DIRECT_DEBIT' | 'MANUAL_DEPOSIT';

export interface ContributionRecord {
  id: string; // e.g. CR-2026-10-001
  employerId: string;
  employerName: string;
  period: string; // e.g. "2026-09"
  expectedAmount: number; // ZMW
  reportedAmount: number; // ZMW
  remittedAmount: number; // ZMW
  submissionDate: string | null;
  remittanceDate: string | null;
  dueDate: string;
  memberCount: number;
  status: ContributionStatus;
  paymentReference: string | null;
  sourceChannel: PaymentChannel;
  discrepancyAmount: number; // expected - remitted
  discrepancyPercent: number;
}

export type RuleIdentifier =
  | 'RULE_A_MISSING'
  | 'RULE_B_DELAYED'
  | 'RULE_C_INCOMPLETE'
  | 'RULE_D_UNUSUAL'
  | 'RULE_E_DATA_QUALITY';

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FindingStatus = 'NEW' | 'LINKED_TO_CASE' | 'DISMISSED' | 'RECONCILED';

export interface ComplianceFinding {
  id: string; // e.g. FND-2026-0042
  ruleId: RuleIdentifier;
  ruleName: string;
  severity: FindingSeverity;
  employerId: string;
  employerName: string;
  period: string;
  contributionRecordId: string | null;
  detectedAt: string;
  explanation: string;
  monetaryImpact: number; // ZMW shortfall
  suggestedAction: string;
  status: FindingStatus;
  linkedCaseId?: string;
  metrics?: {
    expected: number;
    reported: number;
    remitted: number;
    delayDays?: number;
    deviationPercent?: number;
  };
}

export type AnomalyCategory =
  | 'ABRUPT_DROP'
  | 'HEADCOUNT_DIVERGENCE'
  | 'LATENCY_CLUSTER'
  | 'STATISTICAL_OUTLIER'
  | 'RECURRENT_UNDERPAYMENT';

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnomalyReviewStatus = 'PENDING_REVIEW' | 'INVESTIGATION_OPENED' | 'DISMISSED_EXPLAINED';

export interface AnomalyFeature {
  name: string;
  observedValue: string;
  baselineValue: string;
  contributionWeight: number; // 0 to 1
}

export interface AnomalyFinding {
  id: string; // e.g. ANOM-2026-018
  employerId: string;
  employerName: string;
  period: string;
  anomalyCategory: AnomalyCategory;
  modelMethod: string;
  riskScore: number; // 0-100 anomaly intensity index
  riskBand: RiskBand;
  zScore: number;
  features: AnomalyFeature[];
  reason: string;
  detectedAt: string;
  reviewStatus: AnomalyReviewStatus;
  suggestedSteps: string[];
  linkedCaseId?: string;
}

export type CaseStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'AWAITING_INFO'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type CaseOutcome =
  | 'CONFIRMED_DATA_ERROR'
  | 'CONTRIBUTION_RECONCILED'
  | 'EXPLANATION_RECEIVED'
  | 'FURTHER_ACTION_REQUIRED'
  | 'NO_ISSUE_IDENTIFIED'
  | 'INCONCLUSIVE';

export interface CaseNote {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  text: string;
  noteType: 'NOTE' | 'STATUS_CHANGE' | 'EVIDENCE' | 'COMMUNICATION';
}

export interface InvestigationCase {
  id: string; // e.g. CASE-2026-0012
  caseNumber: string;
  title: string;
  employerId: string;
  employerName: string;
  reportingPeriod: string;
  priority: CasePriority;
  priorityScore: number; // 0-100
  priorityReason: string;
  status: CaseStatus;
  assignedOfficerId: string;
  assignedOfficerName: string;
  openedAt: string;
  dueDate: string;
  linkedFindingIds: string[];
  monetaryDiscrepancy: number; // ZMW
  notes: CaseNote[];
  finalOutcome?: CaseOutcome;
  outcomeSummary?: string;
  closedAt?: string;
  closedBy?: string;
}

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  type: 'NEW_EXCEPTION' | 'HIGH_PRIORITY' | 'UNASSIGNED_CASE' | 'OVERDUE_CASE' | 'IMPORT_ERROR' | 'CHECK_COMPLETED';
  severity: 'INFO' | 'WARNING' | 'ALERT';
  targetView: string;
  targetId?: string;
  createdAt: string;
  read: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  resource: string;
  changeSummary: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING';
  referenceId: string;
}

export interface SystemConfiguration {
  monthlyDueDay: number; // Default 10th
  gracePeriodDays: number; // Default 5 days
  shortfallToleranceZMW: number; // Default K500
  shortfallTolerancePercent: number; // Default 2%
  zScoreSensitivity: number; // Default 2.0
  modelStatus: 'SIMULATED_BASELINE' | 'TRAINED_STANDBY';
  modelVersion: string;
}

export interface ModelEvaluationStats {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  specificity: number;
  datasetSize: number;
  evaluationDate: string;
  modelVersion: string;
  processingTimeMs: number;
  recordsProcessed: number;
  avgTimePerRecordMs: number;
}
