import type { SessionUser, User, UserRole } from '../types';

const API_BASE_URL = '/api/auth';

interface CsrfResponse {
  token: string;
  headerName: string;
}

interface BackendAuthResponse {
  userId: number;
  username: string;
  displayName: string;
  institutionalEmail: string;
  roleCode: UserRole;
  mustChangePassword: boolean;
}

interface AuthResult {
  success: boolean;
  user?: SessionUser;
  error?: string;
}

let csrfToken: string | null = null;
let csrfHeaderName = 'X-CSRF-TOKEN';

function mapBackendUser(data: BackendAuthResponse): SessionUser {
  return {
    id: String(data.userId),
    name: data.displayName,
    email: data.institutionalEmail,
    role: data.roleCode,
    department: '',
    status: 'ACTIVE',
    createdAt: '',
    lastLogin: null,
    username: data.username,
    mustChangePassword: data.mustChangePassword,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.message || body.error || 'Authentication request failed.';
  } catch {
    return response.status === 401
      ? 'Invalid username or password.'
      : 'Unable to complete the authentication request.';
  }
}

export class AuthService {
  private static async requestCsrfToken(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/csrf`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Unable to initialise secure authentication.');
    }

    const data: CsrfResponse = await response.json();

    csrfToken = data.token;
    csrfHeaderName = data.headerName || 'X-CSRF-TOKEN';
  }

  static async getCurrentUser(): Promise<SessionUser | null> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const data: BackendAuthResponse = await response.json();
    return mapBackendUser(data);
  }

  static async login(
    identifier: string,
    password: string
  ): Promise<AuthResult> {
    if (!identifier.trim() || !password) {
      return {
        success: false,
        error: 'Enter your username or institutional email and password.',
      };
    }

    try {
      // Obtain a fresh CSRF token before submitting credentials.
      await this.requestCsrfToken();

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          [csrfHeaderName]: csrfToken ?? '',
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: await readError(response),
        };
      }

      const data: BackendAuthResponse = await response.json();

      // Spring Security may rotate the CSRF token after authentication.
      csrfToken = null;

      return {
        success: true,
        user: mapBackendUser(data),
      };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the authentication server. Please try again.',
      };
    }
  }

  static async logout(): Promise<void> {
    if (!csrfToken) {
      await this.requestCsrfToken();
    }

    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        [csrfHeaderName]: csrfToken ?? '',
      },
    });

    csrfToken = null;

    if (!response.ok && response.status !== 401) {
      throw new Error(await readError(response));
    }
  }

  private static async secureRequest(url: string, method: string, body?: unknown): Promise<Response> {
    if (!csrfToken) await this.requestCsrfToken();
    return fetch(url, { method, credentials: 'include', headers: {
      Accept: 'application/json', 'Content-Type': 'application/json', [csrfHeaderName]: csrfToken ?? '',
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await this.secureRequest('/api/auth/password/change', 'POST', { currentPassword, newPassword });
    if (!response.ok) throw new Error(await readError(response));
  }

  static async listUsers(): Promise<User[]> {
    const response = await fetch('/api/admin/users', { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(await readError(response));
    const rows = await response.json();
    return rows.map((row: any) => ({ id: String(row.userId), username: row.username, name: row.displayName,
      email: row.institutionalEmail, role: row.roleCode, department: '', status: row.accountStatus,
      createdAt: row.createdAt, lastLogin: row.lastLoginAt, mustChangePassword: row.mustChangePassword }));
  }

  static async createUser(input: { username: string; institutionalEmail: string; displayName: string; roleCode: UserRole }): Promise<{ user: User; temporaryPassword: string }> {
    const response = await this.secureRequest('/api/admin/users', 'POST', input);
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json(); const row = result.user;
    return { temporaryPassword: result.temporaryPassword, user: { id: String(row.userId), username: row.username,
      name: row.displayName, email: row.institutionalEmail, role: row.roleCode, department: '',
      status: row.accountStatus, createdAt: row.createdAt, lastLogin: row.lastLoginAt,
      mustChangePassword: row.mustChangePassword } };
  }
}
