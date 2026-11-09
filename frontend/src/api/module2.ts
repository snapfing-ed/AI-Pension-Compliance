export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Employer {
  employerId: number;
  employerRef: string;
  employerName: string;
  status: string;
  createdAt?: string;
}

export interface Member {
  memberId: number;
  memberRef: string;
  status: string;
  createdAt?: string;
}

export interface ContributionPeriod {
  periodId: number;
  periodYear: number;
  periodMonth: number;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
}

export interface DataSource {
  sourceId: number;
  sourceName: string;
  sourceType: string;
  ownerName?: string;
  authorityReference?: string;
  permittedPurpose: string;
  receivedAt: string;
  coverageNotes?: string;
  status: string;
}

export interface PayrollBatch {
  payrollBatchId: number;
  employerId: number;
  employerRef?: string;
  periodId: number;
  periodLabel?: string;
  sourceId: number;
  sourceName?: string;
  batchRef: string;
  versionNo: number;
  status: string;
  supersedesBatchId?: number | null;
  recordedAt: string;
  validCount?: number;
  quarantinedCount?: number;
  processingTimeMs?: number;
}

export interface PayrollRecord {
  payrollRecordId: number;
  payrollBatchId: number;
  memberId: number;
  memberRef?: string;
  sourceRowRef?: string;
  eligibleGrossPay: number | null;
  payrollStatus: string;
  dataQualityStatus: string;
  quarantineReason?: string | null;
}

export interface ContributionRule {
  ruleVersionId: number | null;
  ruleCode: string;
  versionNo: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  employeeRate: number;
  employerRate: number;
  ceilingAmount: number | null;
  dueDayRule: string | null;
  roundingRule: string | null;
  sourceReference: string | null;
  verificationStatus: string;
}

export interface CalculationPreviewResponse {
  ruleCode: string;
  ruleVersionNo: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  employeeRate: number;
  employerRate: number;
  ceilingAmount: number | null;
  grossPay: number | null;
  calculationStatus: 'CALCULATED' | 'EXCLUDED';
  pensionableEarnings: number | null;
  employeeAmount: number | null;
  employerAmount: number | null;
  totalAmount: number | null;
  explanationCode: string;
}

async function getCsrfHeader(): Promise<Record<string, string>> {
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!res.ok) return {};
  const data = await res.json();
  return { [data.headerName]: data.token };
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (method !== 'GET' && method !== 'HEAD') {
    Object.assign(headers, await getCsrfHeader());
    if (!headers['Content-Type'] && options.body) {
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

export const module2Api = {
  listEmployers: (params: { q?: string; status?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status) qs.set('status', params.status);
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 20));
    return apiFetch<PageResponse<Employer>>(`/api/employers?${qs}`);
  },
  createEmployer: (body: { employerRef: string; employerName: string; status?: string }) =>
    apiFetch<Employer>('/api/employers', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployer: (id: number, body: { employerName?: string; status?: string }) =>
    apiFetch<Employer>(`/api/employers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  listMembers: (params: { q?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 20));
    return apiFetch<PageResponse<Member>>(`/api/members?${qs}`);
  },
  createMember: (body: { memberRef: string }) =>
    apiFetch<Member>('/api/members', { method: 'POST', body: JSON.stringify(body) }),

  listPeriods: () => apiFetch<ContributionPeriod[]>('/api/periods'),
  createPeriod: (body: { periodYear: number; periodMonth: number }) =>
    apiFetch<ContributionPeriod>('/api/periods', { method: 'POST', body: JSON.stringify(body) }),
  updatePeriodStatus: (id: number, status: string) =>
    apiFetch<ContributionPeriod>(`/api/periods/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listDataSources: () => apiFetch<DataSource[]>('/api/data-sources'),
  createDataSource: (body: {
    sourceName: string;
    sourceType: string;
    ownerName?: string;
    permittedPurpose: string;
    coverageNotes?: string;
  }) => apiFetch<DataSource>('/api/data-sources', { method: 'POST', body: JSON.stringify(body) }),

  listBatches: (params: { employerId?: number; periodId?: number; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params.employerId) qs.set('employerId', String(params.employerId));
    if (params.periodId) qs.set('periodId', String(params.periodId));
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 20));
    return apiFetch<PageResponse<PayrollBatch>>(`/api/payroll/batches?${qs}`);
  },
  getBatchRecords: (batchId: number, page = 0, size = 50) =>
    apiFetch<PageResponse<PayrollRecord>>(
      `/api/payroll/batches/${batchId}/records?page=${page}&size=${size}`
    ),
  importBatch: (body: {
    employerId: number;
    periodId: number;
    sourceId: number;
    batchRef: string;
    supersedesBatchId?: number | null;
    rows: Array<{ sourceRowRef?: string; memberRef: string; eligibleGrossPay: number | null }>;
  }) => apiFetch<PayrollBatch>('/api/payroll/batches/import', { method: 'POST', body: JSON.stringify(body) }),

  listRules: () => apiFetch<ContributionRule[]>('/api/contribution-rules'),
  getApplicableRule: (params: { periodId?: number; date?: string; ruleCode?: string }) => {
    const qs = new URLSearchParams();
    if (params.periodId) qs.set('periodId', String(params.periodId));
    if (params.date) qs.set('date', params.date);
    if (params.ruleCode) qs.set('ruleCode', params.ruleCode);
    return apiFetch<ContributionRule>(`/api/contribution-rules/applicable?${qs}`);
  },
  previewCalculation: (body: {
    grossPay: number | null;
    periodId?: number | null;
    date?: string | null;
    ruleCode?: string | null;
  }) =>
    apiFetch<CalculationPreviewResponse>('/api/contribution-calculations/preview', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};