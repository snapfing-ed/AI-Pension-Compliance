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
  legalName: string;
  tradingName?: string | null;
  status: string;
}

export interface Member {
  memberId: number;
  memberRef: string;
  status: string;
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
  sourceCode: string;
  sourceName: string;
  sourceType: string;
  ownerName: string | null;
  authorityReference: string | null;
  permittedPurpose: string;
  receivedAt: string;
  coverageNotes: string | null;
  status: string;
}

export interface PayrollBatch {
  payrollBatchId: number;
  employerId: number;
  employerRef?: string;
  employerLegalName: string;
  periodId: number;
  periodLabel: string;
  sourceId: number;
  sourceName: string;
  sourceType: string;
  batchRef: string;
  versionNo: number;
  receivedAt: string;
  recordedAt: string;
  status: 'RECEIVED' | 'VALIDATED' | 'REJECTED' | 'SUPERSEDED';
  current: boolean;
  supersedesBatchId?: number | null;
  supersededByBatchId?: number | null;
  validRecordCount: number;
  missingPayRecordCount: number;
  totalRecordsStored: number;
  quarantinedRecordCount: number;
}

export interface PayrollRecord {
  payrollRecordId: number;
  payrollBatchId: number;
  employerId: number;
  periodId: number;
  memberId: number;
  memberRef: string;
  sourceMemberRef: string | null;
  sourceRowRef?: string;
  eligibleGrossPay: number | null;
  payrollStatus: string;
  dataQualityStatus: 'PENDING' | 'VALID' | 'ISSUE';
}

export interface PayrollQuarantineRecord {
  quarantineRecordId: number;
  payrollBatchId: number;
  rowNumber: number;
  sourceRowRef: string | null;
  rawMemberRef: string | null;
  rawSourceMemberRef: string | null;
  rawEligibleGrossPay: string | null;
  rawPayrollStatus: string | null;
  reasonCode: string;
  reasonDetail: string;
  quarantinedAt: string;
}

export interface PayrollImportResponse {
  batch: PayrollBatch;
  totalRowsEvaluated: number;
  validRecordCount: number;
  missingPayRecordCount: number;
  quarantinedRecordCount: number;
  duplicateRowCount: number;
  autoCreatedMemberCount: number;
  processingTimeMs: number;
  quarantinedRowsTruncated: boolean;
  quarantinedRows: PayrollQuarantineRecord[];
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
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
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
  createEmployer: (body: { employerRef: string; legalName: string; tradingName?: string }) =>
    apiFetch<Employer>('/api/employers', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployer: (id: number, body: { legalName?: string; tradingName?: string; status?: string }) =>
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

  listPeriods: async () => {
    const result = await apiFetch<ContributionPeriod[] | PageResponse<ContributionPeriod>>(
      '/api/contribution-periods?page=0&size=100',
    );
    return Array.isArray(result) ? result : result.content;
  },
  createPeriod: (body: { periodYear: number; periodMonth: number }) =>
    apiFetch<ContributionPeriod>('/api/contribution-periods', { method: 'POST', body: JSON.stringify(body) }),
  updatePeriodStatus: (id: number, status: string) =>
    apiFetch<ContributionPeriod>(`/api/contribution-periods/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  listDataSources: async () => {
    const result = await apiFetch<DataSource[] | PageResponse<DataSource>>(
      '/api/data-sources?page=0&size=100',
    );
    return Array.isArray(result) ? result : result.content;
  },
  createDataSource: (body: { sourceCode: string; sourceName: string; sourceType: string; permittedPurpose: string }) =>
    apiFetch<DataSource>('/api/data-sources', { method: 'POST', body: JSON.stringify(body) }),

  listBatches: (params: { page?: number; size?: number; employerId?: number; periodId?: number }) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 20));
    if (params.employerId) qs.set('employerId', String(params.employerId));
    if (params.periodId) qs.set('periodId', String(params.periodId));
    return apiFetch<PageResponse<PayrollBatch>>(`/api/payroll/batches?${qs}`);
  },
  listBatchRecords: (batchId: number, params: { page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 50));
    return apiFetch<PageResponse<PayrollRecord>>(`/api/payroll/batches/${batchId}/records?${qs}`);
  },
  listBatchQuarantine: (batchId: number, params: { page?: number; size?: number } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 50));
    return apiFetch<PageResponse<PayrollQuarantineRecord>>(`/api/payroll/batches/${batchId}/quarantine?${qs}`);
  },
  importPayrollCsv: async (input: {
    employerId: number;
    periodId: number;
    sourceId: number;
    batchRef: string;
    file: File;
    supersedesBatchId?: number;
  }) => {
    const body = new FormData();
    body.append('employerId', String(input.employerId));
    body.append('periodId', String(input.periodId));
    body.append('sourceId', String(input.sourceId));
    body.append('batchRef', input.batchRef);
    if (input.supersedesBatchId) body.append('supersedesBatchId', String(input.supersedesBatchId));
    body.append('file', input.file);
    const headers = await getCsrfHeader();
    const res = await fetch('/api/payroll/batches/import-csv', {
      method: 'POST',
      body,
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const error = await res.json();
        message = error.message || error.error || message;
      } catch { /* ignore non-JSON error bodies */ }
      throw new Error(message);
    }
    return res.json() as Promise<PayrollImportResponse>;
  },

  listRules: () => apiFetch<ContributionRule[]>('/api/contribution-rules'),
  previewCalculation: (body: { grossPay: number; periodId: number }) =>
    apiFetch<CalculationPreviewResponse>('/api/contribution-calculations/preview', { method: 'POST', body: JSON.stringify(body) }),
};
