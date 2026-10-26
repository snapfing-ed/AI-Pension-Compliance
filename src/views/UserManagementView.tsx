import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Shield,
  Check,
  X,
  Plus,
  Lock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAllUsersFromDB, saveUserToDB } from '../services/db/indexedDB';
import { AuthService } from '../services/authService';
import { User, UserRole, AccountStatus } from '../types';
import { formatDateTime } from '../utils/formatters';
import { AccessDeniedView } from '../components/auth/AccessDeniedView';

export const UserManagementView: React.FC = () => {
  const { logAuditEvent } = useApp();
  const { currentUser } = useAuth();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Consequential confirmation modal state
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [pendingAction, setPendingAction] = useState<'TOGGLE_STATUS' | 'CHANGE_ROLE' | 'APPROVE' | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('COMPLIANCE_MONITOR');

  const isAdmin = currentUser?.role === 'SYSTEM_ADMINISTRATOR';

  const loadUsers = async () => {
    const list = await getAllUsersFromDB();
    setUsersList(list);
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Route guard: Access Denied if not System Administrator
  if (!isAdmin) {
    return (
      <AccessDeniedView
        requiredRole="SYSTEM_ADMINISTRATOR"
        attemptedResource="User Accounts & Role Administration"
      />
    );
  }

  const handleOpenActionModal = (user: User, action: 'TOGGLE_STATUS' | 'CHANGE_ROLE' | 'APPROVE') => {
    setTargetUser(user);
    setPendingAction(action);
    setNewSelectedRole(user.role);
    setFeedbackMsg(null);
  };

  const handleConfirmAction = async () => {
    if (!targetUser || !pendingAction) return;

    if (pendingAction === 'TOGGLE_STATUS') {
      const nextStatus: AccountStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      const result = await AuthService.updateUserAccountStatus(targetUser.id, nextStatus, currentUser.role);

      if (result.success) {
        logAuditEvent(
          'USER_STATUS_MODIFIED',
          'USER_ACCOUNT',
          `Administrator ${currentUser.name} updated account status of ${targetUser.email} to ${nextStatus}`,
          'SUCCESS',
          targetUser.id
        );
        setFeedbackMsg({ text: `Account status for ${targetUser.name} updated to ${nextStatus}.`, type: 'success' });
        await loadUsers();
      } else {
        setFeedbackMsg({ text: result.error || 'Action failed.', type: 'error' });
      }
    } else if (pendingAction === 'APPROVE') {
      const result = await AuthService.updateUserAccountStatus(targetUser.id, 'ACTIVE', currentUser.role);
      if (result.success) {
        logAuditEvent(
          'USER_REGISTRATION_APPROVED',
          'USER_ACCOUNT',
          `Administrator ${currentUser.name} approved pending registration for ${targetUser.email}`,
          'SUCCESS',
          targetUser.id
        );
        setFeedbackMsg({ text: `Account ${targetUser.name} has been approved and activated.`, type: 'success' });
        await loadUsers();
      } else {
        setFeedbackMsg({ text: result.error || 'Approval failed.', type: 'error' });
      }
    } else if (pendingAction === 'CHANGE_ROLE') {
      const result = await AuthService.updateUserRole(targetUser.id, newSelectedRole, currentUser.role);
      if (result.success) {
        logAuditEvent(
          'USER_ROLE_REASSIGNED',
          'USER_ACCOUNT',
          `Administrator ${currentUser.name} reallocated role of ${targetUser.email} from ${targetUser.role} to ${newSelectedRole}`,
          'SUCCESS',
          targetUser.id
        );
        setFeedbackMsg({ text: `Role for ${targetUser.name} changed to ${newSelectedRole}.`, type: 'success' });
        await loadUsers();
      } else {
        setFeedbackMsg({ text: result.error || 'Role reallocation failed.', type: 'error' });
      }
    }

    setPendingAction(null);
    setTargetUser(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">User Account Administration & Access Control</h2>
            <span className="text-[11px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Privileged Console
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authenticated personnel accounts, assign permitted roles, and regulate access standings
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 animate-fade-in font-medium ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Role-Based Permissions Reference Matrix */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
          Strict Two-Role Separation of Responsibilities
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Enforced institutional boundaries between administrative oversight and active compliance monitoring
        </p>

        <div className="border border-slate-200 rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">System Capability</th>
                <th className="py-2.5 px-3 text-center">System Administrator</th>
                <th className="py-2.5 px-3 text-center">Compliance Monitor / Supervisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2 px-3 font-medium">System Administration Console & Health Metrics</td>
                <td className="py-2 px-3 text-center font-bold text-purple-700">✓ Granted</td>
                <td className="py-2 px-3 text-center text-slate-400">— Prohibited</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">User Directory, Role Reallocation & Activation</td>
                <td className="py-2 px-3 text-center font-bold text-purple-700">✓ Granted</td>
                <td className="py-2 px-3 text-center text-slate-400">— Prohibited</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">System Settings, Filing Deadlines & Thresholds</td>
                <td className="py-2 px-3 text-center font-bold text-purple-700">✓ Granted</td>
                <td className="py-2 px-3 text-center text-slate-400">— Prohibited</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Security & Activity Audit Logs</td>
                <td className="py-2 px-3 text-center font-bold text-purple-700">✓ Full Access</td>
                <td className="py-2 px-3 text-center text-slate-600 font-medium">Read-Only Relevant Events</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Investigation Case Creation, Notes & Outcomes</td>
                <td className="py-2 px-3 text-center text-slate-400">— View Only (Oversight)</td>
                <td className="py-2 px-3 text-center font-bold text-teal-700">✓ Full Management</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Deterministic Rule Checks & AI Anomaly Analysis</td>
                <td className="py-2 px-3 text-center text-slate-600 font-medium">Read-Only Oversight</td>
                <td className="py-2 px-3 text-center font-bold text-teal-700">✓ Full Management</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
          <span>Registered User Accounts ({usersList.length})</span>
          <span className="text-[11px] text-slate-500 font-normal">Passwords stored as SHA-256 salted hashes in IndexedDB</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Institutional Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Registration Date</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-800">{user.id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{user.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.role === 'SYSTEM_ADMINISTRATOR'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {user.role === 'SYSTEM_ADMINISTRATOR' ? 'System Administrator' : 'Compliance Monitor'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.status === 'ACTIVE' ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : user.status === 'PENDING_APPROVAL' ? (
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Pending Approval</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <X className="w-3.5 h-3.5" />
                        <span>Suspended</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{user.createdAt.split('T')[0]}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {user.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => handleOpenActionModal(user, 'APPROVE')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium shadow-2xs"
                      >
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenActionModal(user, 'CHANGE_ROLE')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium shadow-2xs"
                    >
                      Change Role
                    </button>

                    <button
                      onClick={() => handleOpenActionModal(user, 'TOGGLE_STATUS')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border shadow-2xs ${
                        user.status === 'ACTIVE'
                          ? 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Consequential Actions */}
      {targetUser && pendingAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Administrative Action</h3>
                <p className="text-slate-500 mt-0.5">
                  Target Account: <strong className="text-slate-800">{targetUser.name}</strong> ({targetUser.email})
                </p>
              </div>
            </div>

            {pendingAction === 'TOGGLE_STATUS' && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">
                  {targetUser.status === 'ACTIVE'
                    ? 'Are you sure you want to suspend this account?'
                    : 'Activate this account?'}
                </div>
                <p className="text-slate-600 text-[11px]">
                  {targetUser.status === 'ACTIVE'
                    ? 'Suspended users will immediately be blocked from establishing authenticated sessions.'
                    : 'Activated users will immediately be permitted to sign in to their assigned dashboard.'}
                </p>
              </div>
            )}

            {pendingAction === 'APPROVE' && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="font-semibold">Approve Pending Registration?</div>
                <p className="text-[11px]">
                  This will verify and activate {targetUser.name}'s account under the Compliance Monitor role.
                </p>
              </div>
            )}

            {pendingAction === 'CHANGE_ROLE' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <label className="block font-semibold text-slate-800 mb-1">Select Reassigned Role:</label>
                  <select
                    value={newSelectedRole}
                    onChange={(e: any) => setNewSelectedRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="COMPLIANCE_MONITOR">Compliance Monitor</option>
                    <option value="SYSTEM_ADMINISTRATOR">System Administrator</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  Note: Demoting the only active System Administrator account is prohibited by security policy.
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setTargetUser(null);
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold shadow-sm"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
