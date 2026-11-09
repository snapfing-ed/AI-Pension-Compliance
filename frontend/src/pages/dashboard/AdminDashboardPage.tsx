import React, { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  Calculator,
  ArrowRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { adminUsersApi } from '../../api/adminUsersApi';
import { module2Api } from '../../api/module2Api';

interface DashboardStats {
  totalUsers: number;
  totalEmployers: number;
  totalMembers: number;
  totalPeriods: number;
  totalBatches: number;
  totalRules: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { setActiveTab } = useApp();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalEmployers: 0,
    totalMembers: 0,
    totalPeriods: 0,
    totalBatches: 0,
    totalRules: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      try {
        const [usersRes, employersRes, membersRes, periodsRes, batchesRes, rulesRes] =
          await Promise.allSettled([
            adminUsersApi.listUsers({ page: 0, size: 1 }),
            module2Api.listEmployers({ page: 0, size: 1 }),
            module2Api.listMembers({ page: 0, size: 1 }),
            module2Api.listPeriods(),
            module2Api.listBatches({}),
            module2Api.listRules(),
          ]);

        if (!mounted) return;
        setStats({
          totalUsers: usersRes.status === 'fulfilled' ? (usersRes.value?.totalElements ?? 0) : 0,
          totalEmployers: employersRes.status === 'fulfilled' ? (employersRes.value?.totalElements ?? 0) : 0,
          totalMembers: membersRes.status === 'fulfilled' ? (membersRes.value?.totalElements ?? 0) : 0,
          totalPeriods: periodsRes.status === 'fulfilled' ? (periodsRes.value?.length ?? 0) : 0,
          totalBatches: batchesRes.status === 'fulfilled' ? (batchesRes.value?.totalElements ?? 0) : 0,
          totalRules: rulesRes.status === 'fulfilled' ? (rulesRes.value?.length ?? 0) : 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const kpiCards = [
    {
      label: 'System Users',
      value: stats.totalUsers,
      sub: 'Authenticated accounts',
      icon: Users,
      tab: 'users',
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Registered Employers',
      value: stats.totalEmployers,
      sub: 'Active & monitored entities',
      icon: Building2,
      tab: 'employers',
      accent: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'Pseudonymous Members',
      value: stats.totalMembers,
      sub: 'Privacy-preserving IDs',
      icon: UserCheck,
      tab: 'members',
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Payroll Batches',
      value: stats.totalBatches,
      sub: 'Versioned import runs',
      icon: FileSpreadsheet,
      tab: 'payroll',
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  const quickActions = [
    {
      title: 'User & Role Management',
      desc: 'Create accounts, assign hierarchical roles, and manage account status.',
      tab: 'users',
      icon: Users,
    },
    {
      title: 'Employer Directory',
      desc: 'Register employers, update legal names, and review entity status.',
      tab: 'employers',
      icon: Building2,
    },
    {
      title: 'Member Directory',
      desc: 'Browse and manage pseudonymous member references.',
      tab: 'members',
      icon: UserCheck,
    },
    {
      title: 'Periods & Data Sources',
      desc: 'Open or close contribution periods and register data sources.',
      tab: 'periods',
      icon: Calendar,
    },
    {
      title: 'Payroll Batches & Records',
      desc: 'Inspect imported payroll batches, versions, and quarantined rows.',
      tab: 'payroll',
      icon: FileSpreadsheet,
    },
    {
      title: 'Contribution Rules & Calculator',
      desc: 'Review verified statutory rule versions and preview calculations.',
      tab: 'rules',
      icon: Calculator,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            System Administration
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {currentUser?.displayName || currentUser?.username || 'Administrator'}
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            SmartCompliance Decision-Support Platform — Overview &amp; Operational Controls
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-2.5 text-sm">
          <Activity className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-xs text-slate-400">Active Role</div>
            <div className="font-semibold text-white">{currentUser?.role ?? 'SYSTEM_ADMINISTRATOR'}</div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => setActiveTab(card.tab)}
              className="bg-white rounded-xl border border-slate-200 p-5 text-left shadow-sm hover:border-blue-300 hover:shadow transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {loading ? '—' : card.value.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{card.sub}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Navigation & System Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Operational Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-colors"
                >
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Configuration Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Contribution Periods</span>
                <span className="font-semibold text-slate-900">{loading ? '—' : stats.totalPeriods}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Seeded Rule Versions</span>
                <span className="font-semibold text-slate-900">{loading ? '—' : stats.totalRules}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Session Security</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">
                  CSRF + HttpOnly
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            All monetary calculations use exact decimal arithmetic. AI anomaly detection and case prioritization are
            decision-support tools.
          </div>
        </div>
      </div>
    </div>
  );
};