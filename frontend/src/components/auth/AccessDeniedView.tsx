import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

interface AccessDeniedViewProps {
  requiredRole?: string;
  attemptedResource?: string;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  requiredRole = 'SYSTEM_ADMINISTRATOR',
  attemptedResource = 'this administrative module',
}) => {
  const { currentUser } = useAuth();
  const { setActiveTab } = useApp();

  const handleReturnToDashboard = () => {
    if (currentUser?.role === 'SYSTEM_ADMINISTRATOR') {
      setActiveTab('admin-overview');
    } else {
      setActiveTab('overview');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-rose-200 rounded-xl shadow-xs text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900">Access Denied: Restricted Module</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          Your current account role (
          <span className="font-semibold text-slate-900 font-mono">{currentUser?.role || 'Unauthenticated'}</span>)
          does not possess the required privileges to view or execute actions within {attemptedResource}.
        </p>
      </div>

      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 max-w-md mx-auto text-left space-y-1">
        <div className="font-semibold text-slate-800">Security Invariant Enforced:</div>
        <p className="text-[11px] text-slate-500">
          This operation requires the <span className="font-mono text-purple-700 font-bold">{requiredRole}</span>{' '}
          role. All unauthorized access attempts are recorded in the security audit trail.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={handleReturnToDashboard}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Authorized Dashboard</span>
        </button>
      </div>
    </div>
  );
};
