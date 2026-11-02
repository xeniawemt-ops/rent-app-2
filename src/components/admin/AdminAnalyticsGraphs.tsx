import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  IndianRupee,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  Filter
} from 'lucide-react';
import { RejectionReport, PaymentRecord, OwnerProfile, RefundRecord } from '../../types';

interface AdminAnalyticsGraphsProps {
  reports: RejectionReport[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  owners: OwnerProfile[];
  commissionPct: number;
}

export const AdminAnalyticsGraphs: React.FC<AdminAnalyticsGraphsProps> = ({
  reports,
  payments,
  refunds,
  owners,
  commissionPct,
}) => {
  const [timeRange, setTimeRange] = useState<'6m' | '30d' | '1y'>('6m');

  // Aggregate recorded rental transactions into the selected period.
  const monthlySettlementTrends = useMemo(() => {
    const monthCount = timeRange === '30d' ? 1 : timeRange === '1y' ? 12 : 6;
    const now = new Date();
    const months = Array.from({ length: monthCount }, (_, index) => new Date(now.getFullYear(), now.getMonth() - monthCount + 1 + index, 1));
    const successful = payments.filter(payment => !['failed', 'refunded', 'disputed'].includes(String(payment.status).toLowerCase()));
    return months.map(date => {
      const inMonth = successful.filter(payment => {
        const created = new Date(payment.createdAt);
        return !Number.isNaN(created.getTime()) && created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
      });
      const rentVolume = inMonth.filter(payment => ['rent_payment', 'security_deposit', 'booking_fee'].includes(payment.type)).reduce((sum, payment) => sum + payment.amount, 0);
      const appFees = inMonth.filter(payment => payment.type === 'application_fee').reduce((sum, payment) => sum + payment.amount, 0);
      return { month: date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), shortMonth: date.toLocaleDateString('en-IN', { month: 'short' }), rentVolume, appFees, commissionEarned: Math.round((rentVolume * commissionPct) / 100), totalTransacted: rentVolume + appFees };
    });
  }, [payments, commissionPct, timeRange]);

  // 2. Rejection Reports vs Resolution Speed & Strikes (Bar Chart)
  const reportsBreakdown = useMemo(() => {
    let reviewed = 0;
    let actionTaken = 0;
    let pending = 0;

    reports.forEach(r => {
      if (r.status === 'Reviewed') reviewed++;
      else if (r.status === 'Action Taken' || r.status === 'strike_issued' || r.status === 'owner_suspended') actionTaken++;
      else pending++;
    });

    // Empty data remains empty; chart values reflect recorded reports only.

    return [
      { name: 'Pending Review', count: pending, fill: '#f59e0b', description: 'Grievances awaiting compliance triage' },
      { name: 'Investigated & Reviewed', count: reviewed, fill: '#10b981', description: 'Rejection criteria verified neutral' },
      { name: 'Action Taken / Strike', count: actionTaken, fill: '#ef4444', description: 'Warning issued or landlord suspended' },
    ];
  }, [reports]);

  // Rejection grounds from real reports only.
  const reasonsData = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach(report => {
      const reason = report.rejectionReasonGiven?.trim();
      if (reason) counts.set(reason, (counts.get(reason) || 0) + 1);
    });
    const colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f97316'];
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));
  }, [reports]);

  // Refund requests and completions by request month.
  const refundMetricsData = useMemo(() => {
    const monthCount = timeRange === '30d' ? 1 : timeRange === '1y' ? 12 : 6;
    const now = new Date();
    return Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - monthCount + 1 + index, 1);
      const bucket = refunds.filter(refund => {
        const requested = new Date(refund.requestedAt);
        return !Number.isNaN(requested.getTime()) && requested.getFullYear() === date.getFullYear() && requested.getMonth() === date.getMonth();
      });
      return { month: date.toLocaleDateString('en-IN', { month: 'short' }), requestedRefunds: bucket.length, completedRefunds: bucket.filter(refund => refund.status === 'Refund Completed').length };
    });
  }, [refunds, timeRange]);

  const currentTotalVolume = useMemo(() => monthlySettlementTrends.reduce((sum, month) => sum + month.rentVolume, 0), [monthlySettlementTrends]);
  const resolvedReports = reports.filter(report => Boolean(report.resolvedAt) || ['Reviewed', 'Action Taken', 'strike_issued', 'owner_suspended', 'dismissed'].includes(report.status));
  const resolutionRate = reports.length ? Math.round((resolvedReports.length / reports.length) * 100) : null;
  const resolvedHours = reports.filter(report => report.resolvedAt && report.createdAt).map(report => (new Date(report.resolvedAt!).getTime() - new Date(report.createdAt).getTime()) / 3600000).filter(hours => Number.isFinite(hours) && hours >= 0);
  const avgResolutionHours = resolvedHours.length ? resolvedHours.reduce((sum, hours) => sum + hours, 0) / resolvedHours.length : null;

  return (
    <div className="space-y-6">
      {/* Top Header & Executive Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">Platform Health & Compliance Metrics</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-full font-mono">
              LIVE DATA
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Rental payment activity, application fees, compliance reports, and refund progress from loaded records.
          </p>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs font-mono">
          {(['30d', '6m', '1y'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                timeRange === range
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">{timeRange === '30d' ? '30-Day' : timeRange === '1y' ? '12-Month' : '6-Month'} Rental Volume</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            ₹{currentTotalVolume.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Recorded rent, deposit, and booking payments</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Platform Commission Rate</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {commissionPct}%
          </div>
          <span className="text-[10px] text-emerald-400">0% owner brokerage guaranteed</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Grievances Resolution Rate</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {resolutionRate === null ? '—' : resolutionRate + '%'}
          </div>
          <span className="text-[10px] text-slate-500">{avgResolutionHours === null ? 'No resolved reports yet' : 'Average resolution: ' + avgResolutionHours.toFixed(1) + ' hours'}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Enforced Strikes</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {owners.reduce((sum, o) => sum + (o.strikesCount || 0), 0)} strikes
          </div>
          <span className="text-[10px] text-slate-500">Across {owners.length} registered owners</span>
        </div>
      </div>

      {/* Primary Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 1: Monthly Escrow Settlement Volume & App Fees */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Rental Payment Volume & Application Fees (INR)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Monthly rent, deposits, booking payments, and application fees from recorded transactions.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
              Rental records
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySettlementTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="adminFeesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="shortMonth" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="rentVolume"
                  name="Escrow Deposits"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#adminVolumeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="appFees"
                  name="App Fees (₹20 pool)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#adminFeesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: Grievance & Rejection Reports Resolution Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Tenant Grievances &amp; Strike Enforcement
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Breakdown of active fair-tenancy reports and compliance penalty dispositions
              </p>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-900">
              Fair Housing Audit
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportsBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval={0}
                />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val} incidents`,
                    item.payload.description || name,
                  ]}
                />
                <Bar dataKey="count" name="Case Count" radius={[6, 6, 0, 0]}>
                  {reportsBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 3: Tenancy Application Rejection Categories (Donut) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                Reported Rejection Grounds
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Reported reasons entered by renters, grouped from the current report records.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-64">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {reasonsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full sm:w-1/2 space-y-2 text-xs">
              {reasonsData.length === 0 ? (
                <p className="text-xs text-slate-400">No rejection grounds have been reported yet.</p>
              ) : reasonsData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 truncate max-w-[130px]">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GRAPH 4: Refund SLA & Escrow Protection Fulfillment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-sky-400" />
                Refund Requests &amp; Completions
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Refund requests and completions grouped by request month.
              </p>
            </div>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-900">
              Rental refunds
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={refundMetricsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }} />
                <Bar dataKey="requestedRefunds" name="Claims Requested" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedRefunds" name="Completed refunds" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
