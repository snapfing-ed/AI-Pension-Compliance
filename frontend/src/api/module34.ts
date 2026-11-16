async function getCsrfHeader(): Promise<Record<string, string>> {
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!res.ok) return {};
  const data = await res.json();
  return { [data.headerName]: data.token };
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (method !== 'GET' && method !== 'HEAD') {
    Object.assign(headers, await getCsrfHeader());
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }
  const res = await fetch(url, { ...options, credentials: 'include', headers });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface SubmittedReturnItem {
  returnId: number;
  employerId: number;
  periodId: number;
  sourceId: number;
  returnType: string;
  returnRef: string;
  returnStatus: string;
  receivedAt: string;
}

export interface PaymentTransactionItem {
  paymentId: number;
  sourceId: number;
  externalTransactionRef: string;
  employerRefAsReceived: string;
  transactionAmount: number;
  currencyCode: string;
  transactionStatus: string;
  recordedAt: string;
}

export interface CompletenessItem {
  assessmentId: number;
  sourceId: number;
  scopeType: string;
  employerId: number | null;
  periodId: number | null;
  assessmentStatus: string;
  evidenceNotes: string | null;
  assessedAt: string;
}

export interface SnapshotResponse {
  snapshotId: number;
  analysisId: number;
  runNumber: number;
  startedAt: string;
  completedAt: string | null;
  ruleVersionId: number;
  logicVersion: string;
  inputFingerprint: string;
  overallResult: 'NO_ISSUE_DETECTED' | 'REQUIRES_REVIEW' | 'DATA_INCOMPLETE';
  totalExpected: number | null;
  totalReported: number | null;
  totalAllocatedPayments: number | null;
  calculations: Array<{
    calculationId: number;
    payrollRecordId: number;
    eligiblePayUsed: number;
    employeeExpected: number;
    employerExpected: number;
    totalExpected: number;
    calculationStatus: string;
    explanationCode: string;
  }>;
}

export interface ComplianceFindingItem {
  findingId: number;
  snapshotId: number;
  findingCode: string;
  category: string;
  description: string;
  priorityScore: number | null;
  confidenceScore: number | null;
  detectionMethod: string;
  explanation: string;
  status: string;
  detectedAt: string;
}

export interface DataQualityFindingItem {
  dqFindingId: number;
  snapshotId: number;
  findingCode: string;
  description: string;
  severity: string;
  affectedRecordType: string;
  affectedPayrollRecordId: number | null;
  resolutionStatus: string;
  detectedAt: string;
}

export interface InvestigationCaseItem {
  caseId: number;
  caseRef: string;
  title: string;
  description: string | null;
  caseStatus: string;
  priority: string;
  openedAt: string;
  closedAt: string | null;
  createdByUserId: number | null;
  currentAssignedUserId: number | null;
  linkedFindings: Array<{
    caseFindingId: number;
    findingId: number;
    caseSpecificDisposition: string | null;
    notes: string | null;
  }>;
  assignmentHistory: Array<{
    assignmentId: number;
    assignedUserId: number;
    assignedByUserId: number;
    assignedAt: string;
    unassignedAt: string | null;
    assignmentNote: string | null;
  }>;
}

export const module34Api = {
  listReturns: async (): Promise<SubmittedReturnItem[]> => { const res = await apiRequest<any>('/api/returns?size=100'); return Array.isArray(res) ? res : (res?.content ?? []); },
  submitReturn: (body: {
    employerId: number;
    periodId: number;
    sourceId: number;
    returnType: string;
    returnRef: string;
    reportedEmployeeAmount: number;
    reportedEmployerAmount: number;
    reportedTotalAmount: number;
    completenessStatus: string;
    lines: Array<{
      lineRef: string;
      reportedPay: number;
      reportedEmployeeAmount: number;
      reportedEmployerAmount: number;
      reportedTotalAmount: number;
      lineStatus: string;
    }>;
  }) => apiRequest('/api/returns', { method: 'POST', body: JSON.stringify(body) }),

  listPayments: async (): Promise<PaymentTransactionItem[]> => { const res = await apiRequest<any>('/api/payments?size=100'); return Array.isArray(res) ? res : (res?.content ?? []); },
  recordPayment: (body: {
    sourceId: number;
    externalTransactionRef: string;
    employerRefAsReceived: string;
    transactionAmount: number;
    currencyCode: string;
    transactionStatus: string;
  }) => apiRequest<PaymentTransactionItem>('/api/payments', { method: 'POST', body: JSON.stringify(body) }),

  allocatePayment: (body: {
    paymentId: number;
    employerId: number;
    periodId: number;
    allocatedAmount: number;
  }) => apiRequest('/api/payments/allocations', { method: 'POST', body: JSON.stringify(body) }),

  listCompleteness: async (): Promise<CompletenessItem[]> => { const res = await apiRequest<any>('/api/completeness?size=100'); return Array.isArray(res) ? res : (res?.content ?? []); },
  recordCompleteness: (body: {
    sourceId: number;
    scopeType: string;
    scopeStart: string;
    scopeEnd: string;
    employerId: number;
    periodId: number;
    assessmentStatus: string;
    evidenceNotes: string;
  }) => apiRequest('/api/completeness', { method: 'POST', body: JSON.stringify(body) }),

  executeAnalysis: (body: { employerId: number; periodId: number; ruleCode?: string }) =>
    apiRequest<SnapshotResponse>('/api/analyses/execute', { method: 'POST', body: JSON.stringify(body) }),

  listComplianceFindings: (status?: string) =>
    apiRequest<ComplianceFindingItem[]>(
      status ? `/api/findings/compliance?status=${encodeURIComponent(status)}` : '/api/findings/compliance'
    ),
  updateComplianceFindingStatus: (id: number, status: string) =>
    apiRequest<ComplianceFindingItem>(`/api/findings/compliance/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listDataQualityFindings: () => apiRequest<DataQualityFindingItem[]>('/api/findings/data-quality'),

  listCases: (status?: string) =>
    apiRequest<InvestigationCaseItem[]>(
      status ? `/api/cases?status=${encodeURIComponent(status)}` : '/api/cases'
    ),
  createCase: (body: {
    title: string;
    description?: string;
    priority?: string;
    assignedUserId?: number;
    findingIds?: number[];
  }) => apiRequest<InvestigationCaseItem>('/api/cases', { method: 'POST', body: JSON.stringify(body) }),
  updateCaseStatus: (id: number, status: string, note?: string) =>
    apiRequest<InvestigationCaseItem>(`/api/cases/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  assignCase: (id: number, assignedUserId: number, note?: string) =>
    apiRequest<InvestigationCaseItem>(`/api/cases/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedUserId, note }),
    }),
  updateCasePriority: (id: number, priority: string, justification?: string) =>
    apiRequest<InvestigationCaseItem>(`/api/cases/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority, justification }),
    }),
};