export type RoleCode = 'SYSTEM_ADMINISTRATOR' | 'COMPLIANCE_SUPERVISOR' | 'COMPLIANCE_MONITOR';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'LOCKED' | 'DISABLED';

export interface AdminUser {
  userId: number;
  username: string;
  displayName: string;
  institutionalEmail: string;
  roleCode: RoleCode;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
}

export interface CreateUserResponse {
  user: AdminUser;
  temporaryPassword: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
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

export const adminUsersApi = {
  listUsers: async (params: { page?: number; size?: number; status?: string; role?: string }): Promise<PageResponse<AdminUser>> => {
    const data = await apiFetch<AdminUser[] | PageResponse<AdminUser>>('/api/admin/users');
    if (Array.isArray(data)) {
      let filtered = data;
      if (params.status) filtered = filtered.filter((u) => u.accountStatus === params.status);
      if (params.role) filtered = filtered.filter((u) => u.roleCode === params.role);
      const size = params.size ?? 20;
      const page = params.page ?? 0;
      const start = page * size;
      return {
        content: filtered.slice(start, start + size),
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / size)),
      };
    }
    return data;
  },
  createUser: (body: {
    username: string;
    displayName: string;
    institutionalEmail: string;
    roleCode: RoleCode;
  }) => apiFetch<CreateUserResponse>('/api/admin/users', { method: 'POST', body: JSON.stringify(body) }),

  updateStatus: (userId: number, accountStatus: 'ACTIVE' | 'LOCKED' | 'DISABLED') =>
    apiFetch<AdminUser>(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ accountStatus }),
    }),

  updateRole: (userId: number, roleCode: RoleCode) =>
    apiFetch<AdminUser>(`/api/admin/users/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roleCode }),
    }),
};