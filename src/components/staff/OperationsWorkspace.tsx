import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  FileCheck,
  RotateCcw,
  Check,
  X,
  Clock,
  Briefcase,
  Lock,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backendService';
import {
  OperationalCase,
  OwnerProfile,
  PropertyAuthorization,
} from '../../types';

interface OperationsWorkspaceProps {
  onReturnHome: () => void;
}

export const OperationsWorkspace: React.FC<OperationsWorkspaceProps> = ({ onReturnHome }) => {
  const { user, isAuthenticated, logout, login } = useAuth();

  const isOps =
    (user?.staffMembership?.status === 'ACTIVE' && user?.staffMembership?.staffRole === 'OPERATIONS_MANAGER') ||
    (user?.role as string) === 'operations_manager' ||
    user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'cases' | 'kyc' | 'authorizations'>('cases');
  const [cases, setCases] = useState<OperationalCase[]>([]);
  const [kycPending, setKycPending] = useState<OwnerProfile[]>([]);
  const [authPending, setAuthPending] = useState<PropertyAuthorization[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Reassignment Modal state
  const [reassignCaseId, setReassignCaseId] = useState<string | null>(null);
  const [newAssigneeName, setNewAssigneeName] = useState<string>('Tenzing Norbu (RM)');

  const loadOpsData = () => {
    setCases(backendService.getOperationalCases());
    const verifs = backendService.getPendingVerifications();
    setKycPending(verifs.kycPending);
    setAuthPending(verifs.authorizationsPending);
  };

  useEffect(() => {
    loadOpsData();
  }, [user]);

  const handleReassign = (caseId: string) => {
    const ok = backendService.reassignOperationalCase(caseId, 'user_rm_401', newAssigneeName);
    if (ok) {
      setReassignCaseId(null);
      setStatusMsg('Case successfully reassigned.');
      loadOpsData();
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleUpdateCaseStatus = (caseId: string, status: OperationalCase['status']) => {
    const ok = backendService.updateOperationalCaseStatus(caseId, status, 'Resolved by Operations Supervisor');
    if (ok) {
      setStatusMsg(`Case marked as ${status}.`);
      loadOpsData();
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleApproveAuth = (authId: string) => {
    const ok = backendService.approvePropertyAuthorization(authId, user?.id || 'ops_manager');
    if (ok) {
      setStatusMsg('Property Listing Authorization successfully verified.');
      loadOpsData();
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  if (!isAuthenticated || !isOps) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-950 text-white flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900">Operations Management Centre</h1>
              <p className="text-xs text-stone-500">Internal Operations Authentication Required</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This portal is restricted to NivasPay Operations Managers and Supervisors.
              Includes verification workflows, team reassignments, dispute mediation, and SLA oversight.
            </p>
          </div>

          <button
            type="button"
            onClick={() => login('ananya.ops@nivaspay.in', 'Pass@Nivas2026!', 'operations_manager')}
            className="w-full py-3 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Sign In as Ananya Deshmukh (Operations Manager)
          </button>

          <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
            <span>Staff password: Pass@Nivas2026!</span>
            <button type="button" onClick={onReturnHome} className="hover:underline font-semibold text-stone-700">
              Return Home &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <header className="bg-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-indigo-900 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-300 mb-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>NivasPay Operations Management Centre</span>
          </div>
          <h1 className="text-2xl font-bold font-editorial tracking-tight">Supervisory &amp; Verification Centre</h1>
          <p className="text-xs text-indigo-200/80 mt-1">
            Operations Officer: <span className="text-white font-semibold">{user?.name}</span> &bull;
            Active Operational Queue: <span className="text-white font-semibold">{cases.length} cases</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 text-xs rounded-full cursor-pointer transition-colors border border-indigo-800"
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>
      </header>

      {/* Security Restrictions Banner */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">Operations Permission Matrix</span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Authorized for KYC review, agency authorization verification, and dispute resolution. Database schema alteration and super-admin creation restricted.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[10px] rounded-full font-mono shrink-0">
          OPERATIONS ROLE
        </span>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('cases')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer transition-all ${
            activeTab === 'cases' ? 'bg-indigo-950 text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Operational Cases ({cases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('authorizations')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer transition-all ${
            activeTab === 'authorizations' ? 'bg-indigo-950 text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Listing Authorizations ({authPending.length})</span>
        </button>
      </div>

      {/* Cases View */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {cases.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        c.priority === 'CRITICAL' || c.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                        c.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-stone-100 text-stone-700'
                      }`}>
                        {c.priority} PRIORITY
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {c.caseType}
                      </span>
                      <span className="text-xs font-bold text-stone-900">{c.title}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Assigned To: <strong className="text-stone-800">{c.assignedToName}</strong> &bull; Status: <strong className="text-indigo-900">{c.status}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateCaseStatus(c.id, 'RESOLVED')}
                        className="px-3 py-1 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-xs font-semibold cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setReassignCaseId(c.id)}
                      className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-medium cursor-pointer"
                    >
                      Reassign
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-100">
                  {c.details}
                </p>

                {c.resolutionNotes && (
                  <p className="text-xs text-emerald-800 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                    Resolution: {c.resolutionNotes}
                  </p>
                )}

                {/* Reassignment Inline Modal */}
                {reassignCaseId === c.id && (
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2 text-xs animate-in fade-in">
                    <span className="text-stone-500">Reassign to:</span>
                    <select
                      value={newAssigneeName}
                      onChange={(e) => setNewAssigneeName(e.target.value)}
                      className="border border-stone-300 rounded-lg px-2 py-1 bg-white text-stone-800"
                    >
                      <option value="Tenzing Norbu (RM)">Tenzing Norbu (Relationship Manager)</option>
                      <option value="Ananya Deshmukh (Operations)">Ananya Deshmukh (Operations Supervisor)</option>
                      <option value="Compliance Team">Compliance Escalation Desk</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleReassign(c.id)}
                      className="px-2.5 py-1 bg-indigo-950 text-white rounded-lg font-semibold"
                    >
                      Save Reassignment
                    </button>
                    <button
                      type="button"
                      onClick={() => setReassignCaseId(null)}
                      className="px-2 py-1 text-stone-500"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorizations View */}
      {activeTab === 'authorizations' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {authPending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
                All property listing authorizations are verified and up to date.
              </div>
            ) : (
              authPending.map(auth => (
                <div key={auth.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 font-mono">{auth.docReference}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        PENDING VERIFICATION
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">Agency: {auth.agencyName} &bull; Property: {auth.propertyId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApproveAuth(auth.id)}
                    className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-xs font-semibold cursor-pointer"
                  >
                    Approve &amp; Authorize
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
