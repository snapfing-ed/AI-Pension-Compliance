import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Employer,
  Member,
  ContributionRecord,
  ComplianceFinding,
  AnomalyFinding,
  InvestigationCase,
  AlertNotification,
  AuditEvent,
  SystemConfiguration,
  ModelEvaluationStats,
  UserRole,
  CaseStatus,
  CaseOutcome,
  CasePriority,
  SessionUser,
} from '../types';
import {
  SEED_EMPLOYERS,
  SEED_MEMBERS,
  SEED_CONTRIBUTION_RECORDS,
  SEED_COMPLIANCE_FINDINGS,
  SEED_ANOMALY_FINDINGS,
  SEED_INVESTIGATION_CASES,
  SEED_ALERTS,
  SEED_AUDIT_LOGS,
  INITIAL_SYSTEM_CONFIG,
  SEED_MODEL_EVALUATION,
} from '../data/seedData';
import { executeComplianceRules, ComplianceRunResult } from '../services/complianceEngine';
import { runAnomalyAnalysis } from '../services/anomalyService';
import { calculateInvestigationPriority } from '../services/prioritizationEngine';
import { useAuth } from './AuthContext';

export type TabKey =
  | 'admin-overview'
  | 'overview'
  | 'employers'
  | 'members'
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

interface AppContextType {
  currentUser: SessionUser;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  activeDetailId: string | null;
  setActiveDetailId: (id: string | null) => void;
  
  employers: Employer[];
  addEmployer: (employer: Omit<Employer, 'id' | 'registeredDate'>) => void;
  updateEmployer: (id: string, updates: Partial<Employer>) => void;
  
  members: Member[];
  records: ContributionRecord[];
  findings: ComplianceFinding[];
  anomalies: AnomalyFinding[];
  cases: InvestigationCase[];
  alerts: AlertNotification[];
  auditLogs: AuditEvent[];
  systemConfig: SystemConfiguration;
  modelEvaluation: ModelEvaluationStats;
  
  // Actions
  runComplianceChecks: () => ComplianceRunResult;
  runAnomalyScan: () => void;
  createCaseFromFinding: (findingId: string, customTitle?: string) => string;
  createCaseFromAnomaly: (anomalyId: string, customTitle?: string) => string;
  updateCaseStatus: (caseId: string, newStatus: CaseStatus, outcome?: CaseOutcome, outcomeSummary?: string) => boolean;
  addCaseNote: (caseId: string, text: string, noteType?: 'NOTE' | 'STATUS_CHANGE' | 'EVIDENCE' | 'COMMUNICATION') => void;
  assignCaseOfficer: (caseId: string, officerId: string) => boolean;
  overrideCasePriority: (caseId: string, newPriority: CasePriority, justification: string) => boolean;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  updateSystemConfig: (updates: Partial<SystemConfiguration>) => void;
  importValidatedRecords: (newRecords: ContributionRecord[], filename: string) => void;
  logAuditEvent: (action: string, resource: string, summary: string, outcome?: 'SUCCESS' | 'FAILURE' | 'WARNING', refId?: string) => void;
  hasPermission: (tab: TabKey) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser: authUser } = useAuth();

  // Fallback placeholder if not loaded (components won't render unauthenticated)
  const currentUser: SessionUser = authUser || {
    id: 'USR-GUEST',
    name: 'Unauthenticated User',
    email: 'guest@pension.gov.zm',
    role: 'COMPLIANCE_MONITOR',
    department: 'Pending Authentication',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  const defaultTab: TabKey = currentUser.role === 'SYSTEM_ADMINISTRATOR' ? 'admin-overview' : 'overview';
  const [activeTab, setActiveTabInternal] = useState<TabKey>(defaultTab);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);

  // Synchronize landing tab when user changes / logs in
  useEffect(() => {
    if (currentUser.role === 'SYSTEM_ADMINISTRATOR') {
      setActiveTabInternal('admin-overview');
    } else {
      setActiveTabInternal('overview');
    }
  }, [currentUser.id, currentUser.role]);

  const [employers, setEmployers] = useState<Employer[]>(SEED_EMPLOYERS);
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [records, setRecords] = useState<ContributionRecord[]>(SEED_CONTRIBUTION_RECORDS);
  const [findings, setFindings] = useState<ComplianceFinding[]>(SEED_COMPLIANCE_FINDINGS);
  const [anomalies, setAnomalies] = useState<AnomalyFinding[]>(SEED_ANOMALY_FINDINGS);
  const [cases, setCases] = useState<InvestigationCase[]>(SEED_INVESTIGATION_CASES);
  const [alerts, setAlerts] = useState<AlertNotification[]>(SEED_ALERTS);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(SEED_AUDIT_LOGS);
  const [systemConfig, setSystemConfig] = useState<SystemConfiguration>(INITIAL_SYSTEM_CONFIG);
  const [modelEvaluation, setModelEvaluation] = useState<ModelEvaluationStats>(SEED_MODEL_EVALUATION);

  const logAuditEvent = (
    action: string,
    resource: string,
    summary: string,
    outcome: 'SUCCESS' | 'FAILURE' | 'WARNING' = 'SUCCESS',
    refId: string = ''
  ) => {
    const newLog: AuditEvent = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      actor: currentUser.name,
      role: currentUser.role,
      action,
      resource,
      changeSummary: summary,
      outcome,
      referenceId: refId || currentUser.id,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const hasPermission = (tab: TabKey): boolean => {
    if (currentUser.role === 'SYSTEM_ADMINISTRATOR') {
      // Admin has full system administration, audit, settings, users, and monitoring oversight
      return [
        'admin-overview',
        'users',
        'audit',
        'settings',
        'import',
        'reports',
        'evaluation',
        'overview',
        'contributions',
        'employers',
      ].includes(tab);
    } else if (currentUser.role === 'COMPLIANCE_MONITOR') {
      // Compliance Monitor has full compliance monitoring, AI analysis, investigations, but NOT admin/users/settings
      return [
        'overview',
        'employers',
        'members',
        'contributions',
        'compliance',
        'ai-risk',
        'cases',
        'alerts',
        'reports',
        'import',
        'evaluation',
      ].includes(tab);
    }
    return false;
  };

  const setActiveTab = (tab: TabKey) => {
    if (!hasPermission(tab)) {
      logAuditEvent(
        'ACCESS_DENIED',
        'NAVIGATION_GUARD',
        `Access denied to restricted module '${tab}' for role ${currentUser.role}`,
        'WARNING',
        currentUser.id
      );
    }
    setActiveTabInternal(tab);
  };

  const addEmployer = (newEmp: Omit<Employer, 'id' | 'registeredDate'>) => {
    const id = `EMP-ZM-${Math.floor(1000 + Math.random() * 9000)}`;
    const created: Employer = {
      ...newEmp,
      id,
      registeredDate: new Date().toISOString().split('T')[0],
    };
    setEmployers((prev) => [created, ...prev]);
    logAuditEvent(
      'EMPLOYER_REGISTERED',
      'EMPLOYER',
      `Registered new synthetic employer ${created.name} (${created.id})`,
      'SUCCESS',
      created.id
    );
  };

  const updateEmployer = (id: string, updates: Partial<Employer>) => {
    setEmployers((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp))
    );
    logAuditEvent(
      'EMPLOYER_UPDATED',
      'EMPLOYER',
      `Updated details for employer ${id}`,
      'SUCCESS',
      id
    );
  };

  const runComplianceChecks = (): ComplianceRunResult => {
    const result = executeComplianceRules(records, employers, systemConfig, findings);
    
    // Merge without duplicate finding IDs
    setFindings((prev) => {
      const existingIds = new Set(prev.map((f) => f.contributionRecordId + f.ruleId));
      const filteredFresh = result.findings.filter(
        (f) => !existingIds.has((f.contributionRecordId || '') + f.ruleId)
      );
      return [...filteredFresh, ...prev];
    });

    logAuditEvent(
      'COMPLIANCE_RUN_EXECUTED',
      'RULE_ENGINE',
      `Executed deterministic compliance rules across ${records.length} records. Detected ${result.exceptionsDetected} exceptions in ${result.durationMs}ms.`,
      'SUCCESS',
      result.runId
    );

    if (result.exceptionsDetected > 0) {
      const newAlert: AlertNotification = {
        id: `ALT-${Date.now().toString(36)}`,
        title: 'Compliance Checks Complete',
        message: `Detected ${result.exceptionsDetected} new contribution exceptions requiring officer attention.`,
        type: 'CHECK_COMPLETED',
        severity: 'INFO',
        targetView: 'compliance',
        createdAt: new Date().toISOString(),
        read: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);
    }

    return result;
  };

  const runAnomalyScan = () => {
    const { findings: freshAnomalies, durationMs, evaluatedCount } = runAnomalyAnalysis(records, employers);
    setAnomalies(freshAnomalies);
    logAuditEvent(
      'ANOMALY_SCAN_EXECUTED',
      'AI_SERVICE',
      `Executed Isolation Forest + Z-Score statistical anomaly scan on ${evaluatedCount} records in ${durationMs}ms.`,
      'SUCCESS',
      'SCAN-' + Date.now().toString(36)
    );
  };

  const createCaseFromFinding = (findingId: string, customTitle?: string): string => {
    const finding = findings.find((f) => f.id === findingId);
    if (!finding) return '';

    const employer = employers.find((e) => e.id === finding.employerId);
    const caseId = `CASE-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`;
    const caseNumber = `INV-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`;

    const priorityInfo = calculateInvestigationPriority({
      monetaryDiscrepancy: finding.monetaryImpact,
      daysUnresolved: 7,
      isMissingSubmission: finding.ruleId === 'RULE_A_MISSING',
      employerStatus: employer?.monitoringStatus || 'NORMAL',
    });

    const newCase: InvestigationCase = {
      id: caseId,
      caseNumber,
      title: customTitle || `${finding.ruleName} - ${finding.employerName}`,
      employerId: finding.employerId,
      employerName: finding.employerName,
      reportingPeriod: finding.period,
      priority: priorityInfo.priority,
      priorityScore: priorityInfo.score,
      priorityReason: priorityInfo.reasonSummary,
      status: 'NEW',
      assignedOfficerId: currentUser.id,
      assignedOfficerName: currentUser.name,
      openedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      linkedFindingIds: [finding.id],
      monetaryDiscrepancy: finding.monetaryImpact,
      notes: [
        {
          id: `NOTE-${Date.now().toString(36)}`,
          authorId: currentUser.id,
          authorName: currentUser.name,
          timestamp: new Date().toISOString(),
          text: `Case initiated from compliance finding ${finding.id}: ${finding.explanation}`,
          noteType: 'NOTE',
        },
      ],
    };

    setCases((prev) => [newCase, ...prev]);

    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, status: 'LINKED_TO_CASE', linkedCaseId: caseId } : f))
    );

    logAuditEvent(
      'CASE_CREATED',
      'INVESTIGATION_CASE',
      `Opened case ${caseNumber} (${newCase.title}) for employer ${finding.employerName}`,
      'SUCCESS',
      caseId
    );

    return caseId;
  };

  const createCaseFromAnomaly = (anomalyId: string, customTitle?: string): string => {
    const anomaly = anomalies.find((a) => a.id === anomalyId);
    if (!anomaly) return '';

    const employer = employers.find((e) => e.id === anomaly.employerId);
    const caseId = `CASE-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`;
    const caseNumber = `INV-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`;

    const priorityInfo = calculateInvestigationPriority({
      monetaryDiscrepancy: 150000,
      daysUnresolved: 5,
      isMissingSubmission: false,
      employerStatus: employer?.monitoringStatus || 'HIGH_RISK',
      anomalyScore: anomaly.riskScore,
    });

    const newCase: InvestigationCase = {
      id: caseId,
      caseNumber,
      title: customTitle || `AI Anomaly: ${anomaly.anomalyCategory} - ${anomaly.employerName}`,
      employerId: anomaly.employerId,
      employerName: anomaly.employerName,
      reportingPeriod: anomaly.period,
      priority: priorityInfo.priority,
      priorityScore: priorityInfo.score,
      priorityReason: priorityInfo.reasonSummary,
      status: 'NEW',
      assignedOfficerId: currentUser.id,
      assignedOfficerName: currentUser.name,
      openedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
      linkedFindingIds: [],
      monetaryDiscrepancy: 150000,
      notes: [
        {
          id: `NOTE-${Date.now().toString(36)}`,
          authorId: currentUser.id,
          authorName: currentUser.name,
          timestamp: new Date().toISOString(),
          text: `Case initiated from ML anomaly ${anomaly.id}. Model explanation: ${anomaly.reason}`,
          noteType: 'NOTE',
        },
      ],
    };

    setCases((prev) => [newCase, ...prev]);

    setAnomalies((prev) =>
      prev.map((a) => (a.id === anomalyId ? { ...a, reviewStatus: 'INVESTIGATION_OPENED', linkedCaseId: caseId } : a))
    );

    logAuditEvent(
      'CASE_CREATED_FROM_AI',
      'INVESTIGATION_CASE',
      `Opened case ${caseNumber} from AI anomaly ${anomaly.id} for ${anomaly.employerName}`,
      'SUCCESS',
      caseId
    );

    return caseId;
  };

  const updateCaseStatus = (
    caseId: string,
    newStatus: CaseStatus,
    outcome?: CaseOutcome,
    outcomeSummary?: string
  ): boolean => {
    const targetCase = cases.find((c) => c.id === caseId);
    if (!targetCase) return false;

    if ((newStatus === 'CLOSED' || newStatus === 'RESOLVED') && !outcome) {
      return false;
    }

    const nowIso = new Date().toISOString();
    const newNote = {
      id: `NOTE-${Date.now().toString(36)}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      timestamp: nowIso,
      text: outcomeSummary
        ? `Status updated to ${newStatus}. Outcome: ${outcome}. Summary: ${outcomeSummary}`
        : `Status transitioned from ${targetCase.status} to ${newStatus}.`,
      noteType: 'STATUS_CHANGE' as const,
    };

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            status: newStatus,
            finalOutcome: outcome || c.finalOutcome,
            outcomeSummary: outcomeSummary || c.outcomeSummary,
            closedAt: newStatus === 'CLOSED' || newStatus === 'RESOLVED' ? nowIso : c.closedAt,
            closedBy: newStatus === 'CLOSED' || newStatus === 'RESOLVED' ? currentUser.name : c.closedBy,
            notes: [...c.notes, newNote],
          };
        }
        return c;
      })
    );

    logAuditEvent(
      'CASE_STATUS_CHANGED',
      'INVESTIGATION_CASE',
      `Case ${targetCase.caseNumber} status transitioned to ${newStatus}${outcome ? ` with outcome ${outcome}` : ''}`,
      'SUCCESS',
      caseId
    );

    return true;
  };

  const addCaseNote = (
    caseId: string,
    text: string,
    noteType: 'NOTE' | 'STATUS_CHANGE' | 'EVIDENCE' | 'COMMUNICATION' = 'NOTE'
  ) => {
    const newNote = {
      id: `NOTE-${Date.now().toString(36)}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      timestamp: new Date().toISOString(),
      text,
      noteType,
    };

    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, notes: [...c.notes, newNote] } : c))
    );

    logAuditEvent(
      'CASE_NOTE_ADDED',
      'INVESTIGATION_CASE',
      `Added note to case ${caseId} (${noteType})`,
      'SUCCESS',
      caseId
    );
  };

  const assignCaseOfficer = (caseId: string, officerId: string): boolean => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            assignedOfficerId: officerId,
            assignedOfficerName: officerId === 'USR-ADMIN-001' ? 'System Administrator' : 'Compliance Monitor',
            notes: [
              ...c.notes,
              {
                id: `NOTE-${Date.now().toString(36)}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                timestamp: new Date().toISOString(),
                text: `Case assigned to officer ID ${officerId}`,
                noteType: 'STATUS_CHANGE',
              },
            ],
          };
        }
        return c;
      })
    );

    logAuditEvent(
      'CASE_REASSIGNED',
      'INVESTIGATION_CASE',
      `Assigned case ${caseId} to officer ${officerId}`,
      'SUCCESS',
      caseId
    );

    return true;
  };

  const overrideCasePriority = (caseId: string, newPriority: CasePriority, justification: string): boolean => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            priority: newPriority,
            priorityReason: `Manual override: ${justification}`,
            notes: [
              ...c.notes,
              {
                id: `NOTE-${Date.now().toString(36)}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                timestamp: new Date().toISOString(),
                text: `Priority changed to ${newPriority}. Justification: ${justification}`,
                noteType: 'STATUS_CHANGE',
              },
            ],
          };
        }
        return c;
      })
    );

    logAuditEvent(
      'CASE_PRIORITY_OVERRIDE',
      'INVESTIGATION_CASE',
      `Manual priority override to ${newPriority} on case ${caseId}: ${justification}`,
      'WARNING',
      caseId
    );

    return true;
  };

  const markAlertRead = (alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  };

  const markAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const updateSystemConfig = (updates: Partial<SystemConfiguration>) => {
    setSystemConfig((prev) => ({ ...prev, ...updates }));
    logAuditEvent(
      'CONFIG_MODIFIED',
      'SYSTEM_SETTINGS',
      `Updated system settings: ${Object.keys(updates).join(', ')}`,
      'SUCCESS'
    );
  };

  const importValidatedRecords = (newRecords: ContributionRecord[], filename: string) => {
    setRecords((prev) => [...newRecords, ...prev]);
    logAuditEvent(
      'DATA_IMPORT_COMPLETED',
      'CONTRIBUTION_RECORDS',
      `Imported ${newRecords.length} validated contribution records from ${filename}`,
      'SUCCESS'
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeTab,
        setActiveTab,
        activeDetailId,
        setActiveDetailId,
        employers,
        addEmployer,
        updateEmployer,
        members,
        records,
        findings,
        anomalies,
        cases,
        alerts,
        auditLogs,
        systemConfig,
        modelEvaluation,
        runComplianceChecks,
        runAnomalyScan,
        createCaseFromFinding,
        createCaseFromAnomaly,
        updateCaseStatus,
        addCaseNote,
        assignCaseOfficer,
        overrideCasePriority,
        markAlertRead,
        markAllAlertsRead,
        updateSystemConfig,
        importValidatedRecords,
        logAuditEvent,
        hasPermission,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
