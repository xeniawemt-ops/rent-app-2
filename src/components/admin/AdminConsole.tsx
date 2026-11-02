import React, { useState } from 'react';
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  Receipt,
  Settings as SettingsIcon,
  ShieldAlert,
  History,
  FileCheck2,
  CreditCard,
  RotateCcw,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  DollarSign,
  Lock,
  Filter,
  RefreshCw,
  UserCheck,
  Check,
  X,
  AlertCircle,
  Star,
  MessageSquareQuote,
  Flag,
  CheckCheck,
  ShieldCheck
} from 'lucide-react';
import { backendService } from '../../services/backendService';
import { useAuth } from '../../context/AuthContext';
import {
  RejectionReport,
  PaymentRecord,
  AuditLog,
  ConsentLog,
  OwnerProfile,
  RefundRecord,
  SafeUser,
  Listing,
  Application,
  PlatformSettings,
  AccountStatus,
  PropertyReview,
  ReviewModerationStatus
} from '../../types';
import { RazorpayRouteSimulator } from './RazorpayRouteSimulator';
import { AdminAnalyticsGraphs } from './AdminAnalyticsGraphs';
import { StarRating } from '../common/StarRating';

type AdminTab =
  | 'analytics'
  | 'users'
  | 'listings'
  | 'applications'
  | 'reviews_moderation'
  | 'reports'
  | 'refunds'
  | 'ledger'
  | 'settings'
  | 'audit_logs'
  | 'consents'
  | 'route_simulator';

export const AdminConsole: React.FC = () => {
  const { token, user: activeAdminUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Synchronized Token with auto-healing for active admin session
  let effectiveToken = token || backendService.getAuthToken() || undefined;

  // Auto-heal session for authenticated admin user if effectiveToken is missing, expired, or invalid
  if (activeAdminUser && activeAdminUser.role === 'admin') {
    const sessionCheck = effectiveToken ? backendService.validateSession(effectiveToken, 'admin') : { valid: false };
    if (!sessionCheck.valid) {
      const refreshedSession = backendService.createSessionForUser(activeAdminUser.id);
      if (refreshedSession) {
        effectiveToken = refreshedSession.token;
      }
    }
  }

  // Selected Report Resolution State
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Search & Filter States
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'customer' | 'owner' | 'admin'>('all');
  const [listingSearch, setListingSearch] = useState<string>('');
  const [listingStatusFilter, setListingStatusFilter] = useState<string>('all');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | ReviewModerationStatus>('all');
  const [reviewSearchQuery, setReviewSearchQuery] = useState<string>('');
  const [selectedReviewForNotes, setSelectedReviewForNotes] = useState<string | null>(null);
  const [reviewAdminNoteInput, setReviewAdminNoteInput] = useState<string>('');

  // Site-Wide Settings Local State with safe fallback
  const [siteSettings, setSiteSettings] = useState<PlatformSettings>(() => {
    try {
      return backendService.getPlatformSettings(effectiveToken);
    } catch {
      return {
        commissionRatePct: 0.0,
        responseTimeLimitHours: 48,
        applicationFeeAmount: 20,
        customerBrokeragePct: 10,
        ownerBrokeragePct: 0,
        autoRefundWindowHours: 24,
        maxOwnerStrikes: 3,
        maintenanceMode: false,
        updatedAt: new Date().toISOString(),
        updatedBy: 'System Default',
      };
    }
  });
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [, setAdminRefreshTrigger] = useState<number>(0);

  React.useEffect(() => {
    backendService.syncWithDatabase().then(() => {
      setAdminRefreshTrigger(prev => prev + 1);
    });
  }, []);

  // Load Admin Data Safe Fallbacks
  let reports: RejectionReport[] = [];
  let payments: PaymentRecord[] = [];
  let auditLogs: AuditLog[] = [];
  let consentLogs: ConsentLog[] = [];
  let owners: OwnerProfile[] = [];
  let refunds: RefundRecord[] = [];
  let allUsers: SafeUser[] = [];
  let userStats = { total: 0, customers: 0, owners: 0, admins: 0, active: 0, suspended: 0 };
  let allListings: Listing[] = [];
  let allApplications: Application[] = [];

  try {
    reports = backendService.getReports(effectiveToken);
  } catch (_) {
    reports = [];
  }

  try {
    payments = backendService.getPayments();
  } catch (_) {
    payments = [];
  }

  try {
    auditLogs = backendService.getAuditLogs(effectiveToken);
  } catch (_) {
    auditLogs = [];
  }

  try {
    consentLogs = backendService.getConsentLogs(effectiveToken);
  } catch (_) {
    consentLogs = [];
  }

  try {
    owners = backendService.getOwnerProfiles();
  } catch (_) {
    owners = [];
  }

  try {
    refunds = backendService.getAllRefunds();
  } catch (_) {
    refunds = [];
  }

  try {
    const usersRes = backendService.getAllUsersAdmin(effectiveToken);
    allUsers = usersRes.users;
    userStats = usersRes.stats;
  } catch (_) {
    allUsers = [];
  }

  try {
    allListings = backendService.getAllListingsAdmin(effectiveToken);
  } catch (_) {
    allListings = [];
  }

  try {
    allApplications = backendService.getAllApplicationsAdmin(effectiveToken);
  } catch (_) {
    allApplications = [];
  }

  let allReviews: PropertyReview[] = [];
  try {
    allReviews = backendService.getReviews();
  } catch (_) {
    allReviews = [];
  }

  // --- Handlers ---
  const handleToggleUserStatus = (userId: string, currentStatus: AccountStatus) => {
    const nextStatus: AccountStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const reason = nextStatus === 'suspended' ? 'Suspended by compliance officer via admin portal' : 'Reactivated by administrator';
    try {
      backendService.updateUserStatus(userId, nextStatus, reason, effectiveToken);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to update user status.');
    }
  };

  const handleModerateListing = (listingId: string, newStatus: 'available' | 'rented' | 'suspended' | 'unavailable') => {
    try {
      backendService.moderateListing(listingId, newStatus, `Admin moderation updated status to ${newStatus}`, effectiveToken);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to moderate listing.');
    }
  };

  const handleModerateApplication = (appId: string, action: 'accept' | 'reject' | 'cancel') => {
    try {
      backendService.moderateApplication(appId, action, `Admin overridden action: ${action}`, effectiveToken);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to moderate application.');
    }
  };

  const handleModerateReview = (reviewId: string, status: ReviewModerationStatus, notes?: string) => {
    try {
      backendService.moderateReview(reviewId, status, notes, effectiveToken);
      setSelectedReviewForNotes(null);
      setReviewAdminNoteInput('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to moderate review.');
    }
  };

  const handleToggleReportStatus = (reportId: string, newStatus: 'Reviewed' | 'Action Taken') => {
    try {
      backendService.updateReportStatus(reportId, newStatus);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to update report status.');
    }
  };

  const handleResolveReport = (reportId: string, action: 'strike_issued' | 'owner_suspended' | 'dismissed') => {
    try {
      backendService.resolveReport(reportId, action, adminNotes || 'Resolved by Compliance Administrator', effectiveToken);
      setResolvingReportId(null);
      setAdminNotes('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to resolve report.');
    }
  };

  const handleUpdateRefund = (refundId: string, status: any) => {
    try {
      backendService.updateRefundStatus(refundId, status);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to update refund.');
    }
  };

  const handleSavePlatformSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      backendService.updatePlatformSettings(siteSettings, effectiveToken);
      setSettingsSuccessMsg('Platform configuration updated and broadcast across services.');
      setTimeout(() => setSettingsSuccessMsg(null), 3500);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to update platform settings.');
    }
  };

  // Filtered User list
  const filteredUsers = allUsers.filter(u => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch =
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Filtered Listings list
  const filteredListings = allListings.filter(l => {
    const matchesStatus = listingStatusFilter === 'all' || l.status === listingStatusFilter;
    const matchesSearch =
      l.title.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.locality.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.city.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.id.toLowerCase().includes(listingSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtered Applications list
  const filteredApplications = allApplications.filter(a => {
    return appStatusFilter === 'all' || a.status === appStatusFilter;
  });

  // Filtered Audit logs
  const filteredAuditLogs = auditLogs.filter(l => {
    return auditActionFilter === 'all' || l.action.toLowerCase().includes(auditActionFilter.toLowerCase());
  });

  // Filtered Reviews list
  const filteredReviews = allReviews.filter(r => {
    const matchesStatus = reviewStatusFilter === 'all' || r.moderationStatus === reviewStatusFilter;
    const q = reviewSearchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      r.tenantName.toLowerCase().includes(q) ||
      r.propertyTitle.toLowerCase().includes(q) ||
      r.reviewText.toLowerCase().includes(q) ||
      (r.title && r.title.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Platform Master Admin Dashboard
            </h2>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              RBAC: MASTER_ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervise user accounts, moderate listings &amp; tenant applications, enforce anti-discrimination compliance, manage escrow settlements, and configure platform parameters.
          </p>
        </div>

        {/* Global Admin Status Indicator */}
        <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="space-y-0.5 font-mono text-[11px]">
            <div className="text-slate-300">
              Session: <strong className="text-white">{activeAdminUser?.name || 'Administrator'}</strong>
            </div>
            <div className="text-slate-500 text-[10px]">
              Active Users: {userStats.active} · Open Reports: {reports.filter(r => r.status === 'pending_review').length}
            </div>
          </div>
        </div>
      </div>

      {/* Action Error Notification Banner */}
      {actionErrorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
          <button
            onClick={() => setActionErrorMsg(null)}
            className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <nav aria-label="Admin workspace" className="flex flex-wrap bg-slate-900 border border-slate-800 p-1.5 rounded-2xl text-xs font-medium gap-1">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
          <span>Analytics &amp; Graphs</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'users' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'listings' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Listings ({allListings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'applications' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Applications ({allApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews_moderation')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'reviews_moderation' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Reviews Moderation ({allReviews.length})</span>
          {allReviews.filter(r => r.moderationStatus === 'flagged' || r.moderationStatus === 'pending_moderation').length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-0.5">
              {allReviews.filter(r => r.moderationStatus === 'flagged' || r.moderationStatus === 'pending_moderation').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'reports' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Reported Rejections ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'refunds' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Refunds Queue ({refunds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'ledger' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Payment Ledger ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'settings' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5 text-sky-400" />
          <span>Site Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'audit_logs' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('route_simulator')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'route_simulator' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-amber-300" />
          <span>Route Simulator</span>
        </button>
      </nav>

      {/* ================= TAB 0: ANALYTICS & VISUAL GRAPHS ================= */}
      {activeTab === 'analytics' && (
        <AdminAnalyticsGraphs
          reports={reports}
          payments={payments}
          refunds={refunds}
          owners={owners}
          commissionPct={siteSettings.commissionRatePct}
        />
      )}

      {/* ================= TAB 1: USER MANAGEMENT (CUSTOMERS & OWNERS) ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* User Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-slate-400 font-mono text-[11px] block">TOTAL USERS</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">{userStats.total}</span>
              <span className="text-[10px] text-slate-500">Registered platform accounts</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-slate-400 font-mono text-[11px] block">TENANTS / CUSTOMERS</span>
              <span className="text-2xl font-bold font-mono text-sky-400 mt-1 block">{userStats.customers}</span>
              <span className="text-[10px] text-slate-500">Rental home searchers</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-slate-400 font-mono text-[11px] block">PROPERTY OWNERS</span>
              <span className="text-2xl font-bold font-mono text-indigo-400 mt-1 block">{userStats.owners}</span>
              <span className="text-[10px] text-slate-500">Landlords &amp; listing managers</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-slate-400 font-mono text-[11px] block">SUSPENDED</span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${userStats.suspended > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                {userStats.suspended}
              </span>
              <span className="text-[10px] text-slate-500">Restricted for compliance</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, or user ID..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-400 text-xs">Role Filter:</span>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                {(['all', 'customer', 'owner', 'admin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                      userRoleFilter === role ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">User Details</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Contact / Verification</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Created</th>
                    <th className="p-3.5 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => {
                      const isSuspended = u.status === 'suspended';
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {u.id}</div>
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : u.role === 'owner'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : 'bg-sky-950 text-sky-300 border border-sky-800'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                            <div>{u.phoneMasked || '+91 ******'}</div>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" /> DPDP Verified
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                              isSuspended
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                              {u.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-right">
                            {u.role === 'admin' ? (
                              <span className="text-slate-600 font-mono text-[10px]">Protected Admin</span>
                            ) : (
                              <button
                                onClick={() => handleToggleUserStatus(u.id, u.status)}
                                className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] transition-all cursor-pointer ${
                                  isSuspended
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                    : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {isSuspended ? 'Reactivate User' : 'Suspend Account'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LISTING MODERATION ================= */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search listings by title, locality, city..."
                value={listingSearch}
                onChange={e => setListingSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Status:</span>
              <select
                value={listingStatusFilter}
                onChange={e => setListingStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-xl focus:outline-hidden"
              >
                <option value="all">All Statuses ({allListings.length})</option>
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="suspended">Suspended / Hidden</option>
              </select>
            </div>
          </div>

          {/* Listings Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Property Listing</th>
                    <th className="p-3.5">Owner ID</th>
                    <th className="p-3.5">Rent / Deposit</th>
                    <th className="p-3.5">Capacity</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredListings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No property listings match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredListings.map(l => {
                      const isSuspended = l.status === 'suspended';
                      return (
                        <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{l.title}</div>
                            <div className="text-[11px] text-slate-400">
                              {l.locality}, {l.city} · {l.bhk} ({l.propertyType})
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {l.id}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 text-[11px]">
                            {l.ownerId}
                          </td>
                          <td className="p-3.5 font-mono text-white text-[11px]">
                            <div>₹{l.rentMonthly.toLocaleString('en-IN')}/mo</div>
                            <div className="text-[10px] text-slate-500">Dep: ₹{l.securityDeposit.toLocaleString('en-IN')}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 text-[11px]">
                            {l.occupiedUnits || 0} / {l.totalUnits || 1} units
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              isSuspended
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : l.status === 'rented'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                              {l.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isSuspended ? (
                                <button
                                  onClick={() => handleModerateListing(l.id, 'available')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                                >
                                  Reinstate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleModerateListing(l.id, 'suspended')}
                                  className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-[11px] font-semibold cursor-pointer"
                                >
                                  Suspend Listing
                                </button>
                              )}
                              <button
                                onClick={() => handleModerateListing(l.id, l.status === 'rented' ? 'available' : 'rented')}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] cursor-pointer"
                              >
                                Mark {l.status === 'rented' ? 'Available' : 'Rented'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: APPLICATION & REJECTIONS MODERATION ================= */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-white text-sm">Tenant Screening &amp; Applications Repository</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Audit every applicant submission, objective rejection reasons, and application fee statuses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Status:</span>
              <select
                value={appStatusFilter}
                onChange={e => setAppStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-xl focus:outline-hidden"
              >
                <option value="all">All Applications ({allApplications.length})</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Application ID</th>
                    <th className="p-3.5">Tenant / Property</th>
                    <th className="p-3.5">Fee &amp; Brokerage</th>
                    <th className="p-3.5">Status &amp; Rejection Reason</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Admin Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No applications found.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map(app => {
                      const isRejected = app.status === 'rejected';
                      const isAccepted = app.status === 'accepted';
                      return (
                        <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-mono text-white font-semibold text-[11px]">
                            {app.id}
                          </td>
                          <td className="p-3.5 text-xs">
                            <div className="text-slate-300 font-mono">Tenant: {app.customerId}</div>
                            <div className="text-slate-500 font-mono">Listing: {app.listingId}</div>
                          </td>
                          <td className="p-3.5 font-mono text-[11px]">
                            <div className="text-emerald-400 font-bold">
                              ₹{app.applicationFeeAmount || 20} (Paid)
                            </div>
                            {app.brokerageAmount && (
                              <div className="text-slate-400 text-[10px]">
                                Brokerage: ₹{app.brokerageAmount}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              isAccepted
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : isRejected
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {app.status.toUpperCase()}
                            </span>
                            {isRejected && app.rejectedReasonCode && (
                              <div className="text-[10px] text-rose-400 mt-1 max-w-xs">
                                Code: {app.rejectedReasonCode} &bull; {app.rejectedReasonExplanation || 'Objective criteria'}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {app.status !== 'accepted' && (
                                <button
                                  onClick={() => handleModerateApplication(app.id, 'accept')}
                                  className="px-2 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-[10px] font-semibold cursor-pointer hover:bg-emerald-900"
                                >
                                  Override Accept
                                </button>
                              )}
                              {app.status !== 'rejected' && (
                                <button
                                  onClick={() => handleModerateApplication(app.id, 'reject')}
                                  className="px-2 py-1 bg-rose-950 text-rose-300 border border-rose-800 rounded-lg text-[10px] font-semibold cursor-pointer hover:bg-rose-900"
                                >
                                  Decline
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: REVIEWS & RATINGS MODERATION ================= */}
      {activeTab === 'reviews_moderation' && (
        <div className="space-y-5">
          {/* Section Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h3 className="font-bold text-white text-sm">Tenant Reviews &amp; Ratings Moderation</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Automated + Human In Loop
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Audit candid tenant reviews, resolve owner disputes, and moderate inappropriate language, personal data leaks, or defamatory content.
              </p>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              Total In System: <strong className="text-white">{allReviews.length}</strong>
            </div>
          </div>

          {/* Moderation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="text-slate-400 text-[11px] font-medium">Total Reviews</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">{allReviews.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">Concluded tenancies</div>
            </div>

            <div className={`border p-4 rounded-2xl ${
              allReviews.filter(r => r.moderationStatus === 'flagged').length > 0
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <div className="text-[11px] font-medium flex items-center justify-between">
                <span>Flagged for Review</span>
                {allReviews.filter(r => r.moderationStatus === 'flagged').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {allReviews.filter(r => r.moderationStatus === 'flagged').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Requires admin review</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="text-slate-400 text-[11px] font-medium">Pending Moderation</div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {allReviews.filter(r => r.moderationStatus === 'pending_moderation').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Awaiting verification</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="text-slate-400 text-[11px] font-medium">Approved &amp; Live</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {allReviews.filter(r => r.moderationStatus === 'approved').length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Publicly displayed</div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search tenant, property, review text..."
                value={reviewSearchQuery}
                onChange={e => setReviewSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
              {(['all', 'flagged', 'pending_moderation', 'approved', 'rejected'] as const).map(st => {
                const count = st === 'all'
                  ? allReviews.length
                  : allReviews.filter(r => r.moderationStatus === st).length;
                const label = st === 'all' ? 'All' : st === 'pending_moderation' ? 'Pending' : st.charAt(0).toUpperCase() + st.slice(1);

                return (
                  <button
                    key={st}
                    onClick={() => setReviewStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      reviewStatusFilter === st
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <MessageSquareQuote className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="font-semibold text-slate-400">No reviews found</div>
                <p className="text-xs text-slate-600">
                  {reviewSearchQuery || reviewStatusFilter !== 'all'
                    ? 'No reviews match your current search or status filter.'
                    : 'No customer reviews have been submitted yet.'}
                </p>
              </div>
            ) : (
              filteredReviews.map(review => {
                const isFlagged = review.moderationStatus === 'flagged';
                const isApproved = review.moderationStatus === 'approved';
                const isPending = review.moderationStatus === 'pending_moderation';
                const isRejected = review.moderationStatus === 'rejected';

                return (
                  <div
                    key={review.id}
                    className={`rounded-2xl p-5 border space-y-4 transition-colors ${
                      isFlagged
                        ? 'bg-rose-950/20 border-rose-800/80 hover:border-rose-700'
                        : isPending
                        ? 'bg-amber-950/20 border-amber-800/80 hover:border-amber-700'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{review.tenantName}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                            Tenant ID: {review.tenantId}
                          </span>
                          <span className="text-slate-400">on</span>
                          {review.unitNumber && (
                            <span className="text-slate-500 font-mono text-[11px]">(Unit {review.unitNumber})</span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-1">
                          <span>Landlord ID: <strong className="text-slate-300 font-mono">{review.ownerId}</strong></span>
                          <span>•</span>
                          <span>Agreement: <strong className="text-slate-300 font-mono">{review.agreementId}</strong></span>
                          <span>•</span>
                          <span>
                            Tenancy: {review.tenancyStartDate ? new Date(review.tenancyStartDate).toLocaleDateString() : (review.commencementDate ? new Date(review.commencementDate).toLocaleDateString() : 'N/A')} – {review.tenancyEndDate ? new Date(review.tenancyEndDate).toLocaleDateString() : (review.concludedDate ? new Date(review.concludedDate).toLocaleDateString() : 'N/A')}
                          </span>
                          <span>•</span>
                          <span className="text-slate-500 font-mono">
                            Submitted: {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Status & Star Score */}
                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                        <div className="text-right">
                          <div className="font-bold text-white font-mono text-sm">
                            {review.overallRating.toFixed(1)} / 5.0
                          </div>
                          <div className="text-[10px] text-slate-400">Score</div>
                        </div>
                        <StarRating rating={review.overallRating} size="sm" readOnly />

                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase ml-2 ${
                          isApproved
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isFlagged
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : isPending
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {review.moderationStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Sub-ratings */}
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
                        Property: <strong className="text-amber-400">{review.propertyRating}★</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
                        Owner: <strong className="text-amber-400">{review.ownerRating}★</strong>
                      </span>
                      {review.categoryRatings?.cleanliness && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                          Cleanliness: {review.categoryRatings.cleanliness}★
                        </span>
                      )}
                      {review.categoryRatings?.maintenance && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                          Maintenance: {review.categoryRatings.maintenance}★
                        </span>
                      )}
                      {review.categoryRatings?.communication && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                          Communication: {review.categoryRatings.communication}★
                        </span>
                      )}
                      {review.categoryRatings?.depositReturn && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                          Deposit: {review.categoryRatings.depositReturn}★
                        </span>
                      )}
                    </div>

                    {/* Review Text */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                      {review.title && (
                        <div className="font-semibold text-xs text-white">
                          &ldquo;{review.title}&rdquo;
                        </div>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {review.reviewText}
                      </p>
                    </div>

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {review.tags.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[10px] font-mono"
                          >
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Moderation Warning / Violation Details */}
                    {review.moderationNotes && (
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <strong className="font-semibold text-rose-200">Moderation Log / Violation Notice:</strong>
                          <p className="text-rose-300/90 leading-relaxed text-[11px]">
                            {review.moderationNotes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Owner Response Preview */}
                    {review.ownerResponse && (
                      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/60 text-xs space-y-1">
                        <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                          Landlord Response
                        </div>
                        <p className="text-slate-300 text-xs italic">
                          &ldquo;{review.ownerResponse}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Moderation Actions Bar */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!isApproved && (
                          <button
                            onClick={() => handleModerateReview(review.id, 'approved', 'Approved by administrator')}
                            className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve &amp; Publish</span>
                          </button>
                        )}

                        {!isRejected && (
                          <button
                            onClick={() => handleModerateReview(review.id, 'rejected', 'Violates community guidelines / suppressed by admin')}
                            className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject &amp; Hide</span>
                          </button>
                        )}

                        {!isFlagged && (
                          <button
                            onClick={() => handleModerateReview(review.id, 'flagged', 'Flagged by admin for compliance audit')}
                            className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Flag for Investigation</span>
                          </button>
                        )}
                      </div>

                      {/* Add Admin Note Button */}
                      <button
                        onClick={() => {
                          if (selectedReviewForNotes === review.id) {
                            setSelectedReviewForNotes(null);
                            setReviewAdminNoteInput('');
                          } else {
                            setSelectedReviewForNotes(review.id);
                            setReviewAdminNoteInput(review.moderationNotes || '');
                          }
                        }}
                        className="px-2.5 py-1 text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
                      >
                        {selectedReviewForNotes === review.id ? 'Close Notes' : 'Edit Moderation Note'}
                      </button>
                    </div>

                    {/* Inline Admin Note Editor */}
                    {selectedReviewForNotes === review.id && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mt-2">
                        <div className="text-xs font-semibold text-slate-300">
                          Internal Compliance &amp; Moderation Notes
                        </div>
                        <textarea
                          rows={2}
                          value={reviewAdminNoteInput}
                          onChange={e => setReviewAdminNoteInput(e.target.value)}
                          placeholder="Record investigation findings, reasons for approval/rejection, or owner communication log..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedReviewForNotes(null);
                              setReviewAdminNoteInput('');
                            }}
                            className="px-3 py-1 text-slate-400 hover:text-white text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleModerateReview(review.id, review.moderationStatus, reviewAdminNoteInput.trim())}
                            className="px-3.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: REPORTED REJECTIONS ================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
            <div>
              <strong className="text-amber-400">Reports Table Queue: </strong>
              Pulls directly from the <code>reports</code> database table. Displays reported rejections with their corresponding application IDs, tenant statement, and live status toggle.
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              Total Reports: {reports.length}
            </div>
          </div>

          <div className="space-y-3">
            {reports.map(rep => {
              const owner = owners.find(o => o.userId === rep.reportedOwnerId);
              const isReviewed = rep.status === 'Reviewed';
              const isActionTaken = rep.status === 'Action Taken';

              return (
                <div key={rep.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400 font-bold">Report #{rep.id}</span>
                      <span className="text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded-full">
                        Application ID: {rep.applicationId}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                        isReviewed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isActionTaken
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      Filed on {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-500">Applicant Tenant:</span>
                      <div className="font-mono text-white font-semibold mt-0.5">{rep.customerId}</div>
                      <div className="text-[11px] text-amber-400">Application: {rep.applicationId}</div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-500">Reported Homeowner:</span>
                      <div className="font-semibold text-white mt-0.5">{owner?.fullName || rep.reportedOwnerId}</div>
                      <div className="text-[11px] text-amber-400 font-mono">Strikes: {owner?.strikesCount || 0} / 3</div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-500">Report Status:</span>
                      <div className="font-mono text-white mt-0.5">{rep.status}</div>
                      <div className="text-[11px] text-slate-400">
                        {isReviewed ? 'Cleared by Admin' : isActionTaken ? 'Strike / Sanction Enforced' : 'Under Investigation'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs">
                    <span className="text-slate-400 font-semibold block mb-1">Applicant Grievance Statement:</span>
                    <p className="text-slate-300 italic">{rep.allegationDescription}</p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Toggle Status:</span>
                      <button
                        onClick={() => handleToggleReportStatus(rep.id, isReviewed ? 'Action Taken' : 'Reviewed')}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
                      >
                        Set to {isReviewed ? 'Action Taken' : 'Reviewed'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setResolvingReportId(resolvingReportId === rep.id ? null : rep.id)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {resolvingReportId === rep.id ? 'Cancel Resolution' : 'Take Formal Action'}
                      </button>
                    </div>
                  </div>

                  {/* Resolution Drawer */}
                  {resolvingReportId === rep.id && (
                    <div className="mt-3 p-4 bg-slate-950 rounded-xl border border-amber-900/40 space-y-3">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                        Issue Formal Compliance Sanction
                      </h4>
                      <textarea
                        rows={2}
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        placeholder="Enter compliance officer investigation findings..."
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-hidden focus:border-amber-500"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'dismissed')}
                          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer hover:bg-slate-700"
                        >
                          Dismiss (No Infraction)
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'strike_issued')}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-amber-500"
                        >
                          Issue Formal Strike (+1)
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'owner_suspended')}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-rose-500"
                        >
                          Suspend Owner Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 5: REFUNDS QUEUE ================= */}
      {activeTab === 'refunds' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-emerald-400" />
                  Refunds &amp; Escrow Return Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated security deposit returns and dispute refund records.
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-950 text-slate-400 border border-slate-800 px-3 py-1 rounded-lg">
                {refunds.length} Active Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Refund ID</th>
                    <th className="p-3">Payment Ref</th>
                    <th className="p-3">Customer ID</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {refunds.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-white font-semibold">{r.id}</td>
                      <td className="p-3 font-mono text-slate-400">{r.transactionId}</td>
                      <td className="p-3 font-mono text-slate-300">{r.userName || r.userId}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">
                        ₹{r.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-slate-300">{r.reason}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                          r.status === 'Refund Completed'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {r.status !== 'Refund Completed' && (
                          <button
                            onClick={() => handleUpdateRefund(r.id, 'Refund Completed')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: PAYMENT TRANSACTIONS LEDGER ================= */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                Comprehensive Payment Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete transactional audit across booking deposits, application fees, and remittances.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-950 text-slate-400 border border-slate-800 px-3 py-1 rounded-lg">
              {payments.length} Transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Tx ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Payer / Receiver</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Gateway Ref</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-white font-semibold">{p.id}</td>
                    <td className="p-3 font-mono text-slate-300 capitalize">{p.type.replace(/_/g, ' ')}</td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">
                      <div>From: {p.payerId}</div>
                      <div>To: {p.payeeId || 'Platform Escrow'}</div>
                    </td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                        p.status === 'Successful'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">
                      {p.razorpayPaymentId || 'rzp_test_escrow'}
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 7: SITE-WIDE SETTINGS ================= */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-4xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-sky-400" />
              Site-Wide Parameters &amp; Regulatory Limits
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure global platform parameters including commission rates, response SLAs, screening fee caps, and fair-tenancy limits.
            </p>
          </div>

          {settingsSuccessMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{settingsSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSavePlatformSettings} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Setting 1: Commission Rate */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Owner Brokerage Commission Rate (%)
                </label>
                <p className="text-[11px] text-slate-400">
                  NivasPay enforces 0% owner brokerage by charter. Set to non-zero only during approved policy changes.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={siteSettings.commissionRatePct}
                    onChange={e => setSiteSettings({ ...siteSettings, commissionRatePct: parseFloat(e.target.value) || 0 })}
                    className="w-32 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                  <span className="text-slate-400 font-mono">%</span>
                </div>
              </div>

              {/* Setting 2: Response Time Limit */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Owner Application Response SLA (Hours)
                </label>
                <p className="text-[11px] text-slate-400">
                  Maximum hours an owner has to accept or decline before application enters automatic escalation.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="12"
                    max="168"
                    value={siteSettings.responseTimeLimitHours}
                    onChange={e => setSiteSettings({ ...siteSettings, responseTimeLimitHours: parseInt(e.target.value) || 48 })}
                    className="w-32 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                  <span className="text-slate-400 font-mono">hours</span>
                </div>
              </div>

              {/* Setting 3: Application Fee Cap */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Application Screening Fee (INR)
                </label>
                <p className="text-[11px] text-slate-400">
                  Statutory nominal applicant verification fee (Fixed at ₹20 non-refundable).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={siteSettings.applicationFeeAmount}
                    onChange={e => setSiteSettings({ ...siteSettings, applicationFeeAmount: parseInt(e.target.value) || 20 })}
                    className="w-32 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                  <span className="text-slate-400 font-mono">INR</span>
                </div>
              </div>

              {/* Setting 4: Customer Brokerage Percentage */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Customer Brokerage Upon Successful Lease (%)
                </label>
                <p className="text-[11px] text-slate-400">
                  Brokerage fee charged to tenant upon confirmed acceptance (Standard 10% of 1 month&apos;s rent).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={siteSettings.customerBrokeragePct}
                    onChange={e => setSiteSettings({ ...siteSettings, customerBrokeragePct: parseFloat(e.target.value) || 10 })}
                    className="w-32 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                  <span className="text-slate-400 font-mono">%</span>
                </div>
              </div>

              {/* Setting 5: Auto-Refund SLA Window */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Unaccepted Deposit Auto-Refund SLA (Hours)
                </label>
                <p className="text-[11px] text-slate-400">
                  Target window to automatically release unaccepted deposit escrows back to tenant method.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={siteSettings.autoRefundWindowHours}
                    onChange={e => setSiteSettings({ ...siteSettings, autoRefundWindowHours: parseInt(e.target.value) || 24 })}
                    className="w-32 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                  <span className="text-slate-400 font-mono">hours</span>
                </div>
              </div>

              {/* Setting 6: Max Strikes Before Suspension */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Maximum Landlord Strikes Before Auto-Suspension
                </label>
                <p className="text-[11px] text-slate-400">
                  Fair housing threshold: number of validated discriminatory rejections before landlord account suspension.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={siteSettings.maxOwnerStrikes}
                    onChange={e => setSiteSettings({ ...siteSettings, maxOwnerStrikes: parseInt(e.target.value) || 3 })}
                    className="w-32 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                  <span className="text-slate-400 font-mono">strikes</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Last modified: {new Date(siteSettings.updatedAt).toLocaleString()} by {siteSettings.updatedBy}
              </span>
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer transition-all shadow-md"
              >
                Save &amp; Broadcast Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 8: AUDIT LOGS ================= */}
      {activeTab === 'audit_logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Immutable Regulatory Audit Trail
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographic action logs recording logins, status updates, fee payouts, and administrative interventions.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Action:</span>
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-xl focus:outline-hidden"
              >
                <option value="all">All Actions ({auditLogs.length})</option>
                <option value="USER">User Actions</option>
                <option value="LISTING">Listing Actions</option>
                <option value="APPLICATION">Application Actions</option>
                <option value="AUTH">Authentication Actions</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Actor / Role</th>
                  <th className="p-3">Action Event</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Details / Metadata</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredAuditLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-white font-semibold">{l.id}</td>
                    <td className="p-3 font-mono text-slate-300">
                      <div>{l.actorId}</div>
                      <span className="text-[10px] text-amber-400 uppercase">({l.actorRole})</span>
                    </td>
                    <td className="p-3 font-mono text-emerald-400 font-bold">{l.action}</td>
                    <td className="p-3 font-mono text-slate-300">
                      {l.targetEntity} #{l.targetId}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px] font-mono max-w-xs truncate">
                      {JSON.stringify(l.metadata || {})}
                    </td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{l.ipAddress}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 9: RAZORPAY ROUTE SIMULATOR ================= */}
      {activeTab === 'route_simulator' && (
        <RazorpayRouteSimulator />
      )}
    </div>
  );
};
