export type UserRole = 'SYSTEM_ADMINISTRATOR' | 'COMPLIANCE_SUPERVISOR' | 'COMPLIANCE_MONITOR';
export type AccountStatus = 'ACTIVE' | 'PENDING' | 'LOCKED' | 'DISABLED' | 'PENDING_APPROVAL' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  institutionalEmail?: string;
  role: UserRole;
  department: string;
  status: AccountStatus;
  createdAt: string;
  lastLogin: string | null;
  passwordHash?: string;
  passwordSalt?: string;
  username?: string;
  mustChangePassword?: boolean;
}

export type SessionUser = Omit<User, 'passwordHash' | 'passwordSalt'>;

export type TabKey =
  | 'admin-overview'
  | 'overview'
  | 'employers'
  | 'members'
  | 'periods'
  | 'payroll'
  | 'rules'
  | 'contributions'
  | 'compliance'
  | 'ai-risk'
  | 'cases'
  | 'alerts'
  | 'reports'
  | 'import'
  | 'users'
  | 'audit'
  | 'settings'
  | 'evaluation';

export type CaseStatus = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'AWAITING_INFO' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type CaseOutcome = 'COMPLIANT' | 'SETTLED' | 'PENALIZED' | 'DISMISSED' | 'CONTRIBUTION_RECONCILED' | 'NO_ISSUE_IDENTIFIED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';

export interface Employer {
  id: string;
  employerId?: number;
  name: string;
  legalName?: string;
  employerRef?: string;
  sector: string;
  location: string;
  registrationStatus: string;
  activeMemberCount: number;
  expectedMonthlyContribution: number;
  monitoringStatus: string;
  lastSubmissionDate: string | null;
  registeredDate: string;
  contactEmail: string;
  contactPhone: string;
  status?: string;
}

export interface Member {
  id: string;
  employerId?: string;
  employerName?: string;
  displayName?: string;
  membershipStatus?: string;
  joinedDate?: string;
  baseSalaryTier?: number;
  expectedMonthlyContribution?: number;
  memberId?: number;
  memberRef?: string;
  name?: string;
  status?: string;
}

export interface ContributionRecord {
  id: string;
  employerId: string;
  period: string;
  expectedAmount: number;
  reportedAmount: number;
  employerName?: string;
  remittedAmount: number;
  submissionDate: string | null;
  remittanceDate?: string | null;
  dueDate: string;
  memberCount?: number;
  paymentReference?: string | null;
  sourceChannel?: string;
  discrepancyAmount?: number;
  discrepancyPercent: number;
  status: string;
}

export interface ComplianceFinding {
  id: string;
  ruleCode?: string;
  severity: string;
  message?: string;
  ruleId: string;
  ruleName?: string;
  employerId?: string;
  employerName?: string;
  period?: string;
  contributionRecordId: string;
  detectedAt?: string;
  explanation?: string;
  monetaryImpact: number;
  suggestedAction?: string;
  status?: string;
  linkedCaseId?: string;
  metrics?: Record<string, number>;
}

export interface AnomalyFinding {
  id: string;
  description?: string;
  employerId?: string;
  employerName?: string;
  period?: string;
  anomalyCategory?: string;
  modelMethod?: string;
  riskScore?: number;
  riskBand?: string;
  zScore?: number;
  features?: Array<{ name: string; observedValue: string; baselineValue: string; contributionWeight: number }>;
  reason?: string;
  detectedAt?: string;
  reviewStatus?: string;
  suggestedSteps?: string[];
  linkedCaseId?: string;
}

export interface InvestigationCase {
  id: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  caseNumber?: string;
  employerId?: string;
  employerName?: string;
  reportingPeriod?: string;
  priorityScore?: number;
  priorityReason?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  openedAt?: string;
  dueDate?: string;
  linkedFindingIds?: string[];
  monetaryDiscrepancy?: number;
  finalOutcome?: CaseOutcome;
  outcomeSummary?: string;
  closedAt?: string;
  closedBy?: string;
  notes: Array<{ id: string; authorId: string; authorName: string; timestamp: string; text: string; noteType: 'NOTE' | 'STATUS_CHANGE' | 'EVIDENCE' | 'COMMUNICATION' }>;
}

export interface AlertNotification {
  id: string;
  message: string;
  read: boolean;
  title?: string;
  type?: string;
  severity?: string;
  targetView?: string;
  targetId?: string;
  createdAt?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  timestamp: string;
  actor?: string;
  role?: UserRole;
  resource?: string;
  changeSummary?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'WARNING';
  referenceId?: string;
}

export interface SystemConfiguration {
  maintenanceMode?: boolean;
  [key: string]: any;
}

export interface ModelEvaluationStats {
  accuracy?: number | string;
  truePositives?: number;
  falsePositives?: number;
  trueNegatives?: number;
  falseNegatives?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  [metric: string]: unknown;
}
