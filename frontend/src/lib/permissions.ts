// frontend/src/lib/permissions.ts
import type { UserRole } from '../types';

export const ROLE_RANK: Record<UserRole, number> = {
  COMPLIANCE_MONITOR: 1,
  COMPLIANCE_SUPERVISOR: 2,
  SYSTEM_ADMINISTRATOR: 3,
};

export const ROLE_LABEL: Record<UserRole, string> = {
  COMPLIANCE_MONITOR: 'Compliance Monitor',
  COMPLIANCE_SUPERVISOR: 'Compliance Supervisor',
  SYSTEM_ADMINISTRATOR: 'System Administrator',
};

// Every tab is listed explicitly: an unlisted tab is denied (fail closed).
const ADMIN: UserRole = 'SYSTEM_ADMINISTRATOR';
const MONITOR: UserRole = 'COMPLIANCE_MONITOR';
export const TAB_MIN_ROLE: Record<string, UserRole> = {
  'admin-overview': ADMIN, users: ADMIN, settings: ADMIN, audit: ADMIN,
  overview: MONITOR, employers: MONITOR, members: MONITOR, contributions: MONITOR,
  compliance: MONITOR, 'ai-risk': MONITOR, cases: MONITOR, alerts: MONITOR,
  reports: MONITOR, import: MONITOR, evaluation: MONITOR,
};

export const canAccessTab = (role: UserRole | undefined, tab: string): boolean => {
  const required = TAB_MIN_ROLE[tab];
  return !!role && !!required && ROLE_RANK[role] >= ROLE_RANK[required];
};