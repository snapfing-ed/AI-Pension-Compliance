import { User, SessionUser, UserRole, AccountStatus, AuditEvent } from '../types';
import {
  getUserByEmailFromDB,
  getUserByIdFromDB,
  getAllUsersFromDB,
  saveUserToDB,
  saveSessionToDB,
  getSessionFromDB,
  clearSessionFromDB,
  seedInitialAccountsIfEmpty,
} from './db/indexedDB';
import { generateSalt, hashPassword, validatePasswordPolicy, validateEmailFormat } from './security/cryptoUtils';

const SESSION_STORAGE_KEY = 'pcis_auth_session_token';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes inactivity expiry
const BOOTSTRAP_KEY_MASTER = 'MULUNGUSHI-CS-2026-ADMIN-SETUP';

export interface AuthResult {
  success: boolean;
  user?: SessionUser;
  error?: string;
  auditLog?: AuditEvent;
}

export class AuthService {
  /**
   * Initializes store and seeds default accounts if fresh
   */
  static async init(): Promise<void> {
    await seedInitialAccountsIfEmpty();
  }

  /**
   * Authenticates user with email and password
   */
  static async login(email: string, password: string, rememberMe = false): Promise<AuthResult> {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return {
        success: false,
        error: 'Please provide both email address and password.',
      };
    }

    const user = await getUserByEmailFromDB(trimmedEmail);

    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
      };
    }

    // Account status guard
    if (user.status === 'SUSPENDED') {
      return {
        success: false,
        error: 'This account has been suspended by a System Administrator. Please contact compliance administration.',
      };
    }

    if (user.status === 'PENDING_APPROVAL') {
      return {
        success: false,
        error: 'Your registration is currently pending administrator review and approval.',
      };
    }

    // Verify cryptographic password hash
    const computedHash = await hashPassword(password, user.passwordSalt || '');
    if (computedHash !== user.passwordHash) {
      return {
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
      };
    }

    // Create session
    const sessionId = `SES-${Date.now().toString(36)}-${generateSalt(8)}`;
    const expiresAt = Date.now() + (rememberMe ? 7 * 24 * 3600 * 1000 : SESSION_TTL_MS);

    await saveSessionToDB({ sessionId, userId: user.id, expiresAt });

    // Store token in sessionStorage (or localStorage if rememberMe)
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      }
    }

    // Update lastLogin
    const updatedUser: User = {
      ...user,
      lastLogin: new Date().toISOString(),
    };
    await saveUserToDB(updatedUser);

    const sessionUser: SessionUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin,
    };

    return {
      success: true,
      user: sessionUser,
    };
  }

  /**
   * Public Registration: STRICTLY defaults to COMPLIANCE_MONITOR role.
   * Public registration NEVER allows assigning the SYSTEM_ADMINISTRATOR role.
   */
  static async register(name: string, email: string, password: string, confirmPassword: string): Promise<AuthResult> {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      return {
        success: false,
        error: 'All fields are mandatory.',
      };
    }

    if (!validateEmailFormat(trimmedEmail)) {
      return {
        success: false,
        error: 'Please enter a valid institutional email address.',
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Password and confirmation password do not match.',
      };
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return {
        success: false,
        error: policy.errors[0],
      };
    }

    // Check duplicate
    const existing = await getUserByEmailFromDB(trimmedEmail);
    if (existing) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in.',
      };
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    // SECURITY ENFORCEMENT: Public registration can ONLY create COMPLIANCE_MONITOR
    const newUser: User = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      name: trimmedName,
      email: trimmedEmail,
      role: 'COMPLIANCE_MONITOR', // Strictly enforced!
      department: 'Employer Contribution Inspection Roster',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      passwordHash: hash,
      passwordSalt: salt,
    };

    await saveUserToDB(newUser);

    const sessionUser: SessionUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      status: newUser.status,
      createdAt: newUser.createdAt,
      lastLogin: newUser.lastLogin,
    };

    return {
      success: true,
      user: sessionUser,
    };
  }

  /**
   * One-time Administrator Bootstrap Procedure
   * Allows provisioning the initial administrator with a secure setup key
   */
  static async bootstrapAdministrator(
    name: string,
    email: string,
    password: string,
    bootstrapKey: string
  ): Promise<AuthResult> {
    if (bootstrapKey.trim() !== BOOTSTRAP_KEY_MASTER) {
      return {
        success: false,
        error: 'Invalid master administrator bootstrap key. Access denied.',
      };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = await getUserByEmailFromDB(trimmedEmail);
    if (existing && existing.role === 'SYSTEM_ADMINISTRATOR') {
      return {
        success: false,
        error: 'An administrator account with this email already exists.',
      };
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return {
        success: false,
        error: policy.errors[0],
      };
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const adminUser: User = {
      id: `USR-ADMIN-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      email: trimmedEmail,
      role: 'SYSTEM_ADMINISTRATOR',
      department: 'Information Systems Administration',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      passwordHash: hash,
      passwordSalt: salt,
    };

    await saveUserToDB(adminUser);

    return {
      success: true,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        department: adminUser.department,
        status: adminUser.status,
        createdAt: adminUser.createdAt,
        lastLogin: adminUser.lastLogin,
      },
    };
  }

  /**
   * Validates active session and enforces timeout
   */
  static async getActiveSessionUser(): Promise<SessionUser | null> {
    if (typeof window === 'undefined') return null;

    const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) return null;

    const session = await getSessionFromDB(sessionId);
    if (!session) return null;

    // Check expiration
    if (Date.now() > session.expiresAt) {
      await this.logout();
      return null;
    }

    const user = await getUserByIdFromDB(session.userId);
    if (!user || user.status !== 'ACTIVE') {
      await this.logout();
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Terminates user session
   */
  static async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      const sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionId) {
        await clearSessionFromDB(sessionId);
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  /**
   * Administrator Account Management
   */
  static async updateUserAccountStatus(
    userId: string,
    newStatus: AccountStatus,
    actingUserRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    if (actingUserRole !== 'SYSTEM_ADMINISTRATOR') {
      return { success: false, error: 'Unauthorized: Only System Administrators can modify account status.' };
    }

    const user = await getUserByIdFromDB(userId);
    if (!user) return { success: false, error: 'User not found.' };

    // Prevent deactivating the only active administrator
    if (user.role === 'SYSTEM_ADMINISTRATOR' && newStatus !== 'ACTIVE') {
      const allUsers = await getAllUsersFromDB();
      const activeAdmins = allUsers.filter((u) => u.role === 'SYSTEM_ADMINISTRATOR' && u.status === 'ACTIVE');
      if (activeAdmins.length <= 1) {
        return {
          success: false,
          error: 'Action prohibited: Cannot deactivate the only active System Administrator account.',
        };
      }
    }

    await saveUserToDB({ ...user, status: newStatus });
    return { success: true };
  }

  static async updateUserRole(
    userId: string,
    newRole: UserRole,
    actingUserRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    if (actingUserRole !== 'SYSTEM_ADMINISTRATOR') {
      return { success: false, error: 'Unauthorized: Only System Administrators can adjust roles.' };
    }

    const user = await getUserByIdFromDB(userId);
    if (!user) return { success: false, error: 'User not found.' };

    // Prevent demoting the only active administrator
    if (user.role === 'SYSTEM_ADMINISTRATOR' && newRole !== 'SYSTEM_ADMINISTRATOR') {
      const allUsers = await getAllUsersFromDB();
      const activeAdmins = allUsers.filter((u) => u.role === 'SYSTEM_ADMINISTRATOR' && u.status === 'ACTIVE');
      if (activeAdmins.length <= 1) {
        return {
          success: false,
          error: 'Action prohibited: Cannot reassign the only active System Administrator account.',
        };
      }
    }

    await saveUserToDB({ ...user, role: newRole });
    return { success: true };
  }
}
