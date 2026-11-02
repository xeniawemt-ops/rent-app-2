import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Calendar,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileText,
  Shield,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Send,
  Eye,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backendService';
import { RmAssignment } from '../../types';

interface RmWorkspaceProps {
  onReturnHome: () => void;
}

export const RmWorkspace: React.FC<RmWorkspaceProps> = ({ onReturnHome }) => {
  const { user, isAuthenticated, logout, login } = useAuth();

  const isRm =
    (user?.staffMembership?.status === 'ACTIVE' && user?.staffMembership?.staffRole === 'NIVASPAY_RM') ||
    (user?.role as string) === 'nivaspay_rm' ||
    user?.role === 'admin' ||
    (user?.role as string) === 'operations_manager' ||
    (user?.staffMembership?.status === 'ACTIVE' && user?.staffMembership?.staffRole === 'OPERATIONS_MANAGER');
  const [assignments, setAssignments] = useState<RmAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [visitDateInput, setVisitDateInput] = useState<string>('');
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [isEscalating, setIsEscalating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadAssignments = () => {
    if (user?.id) {
      const list = backendService.getRmAssignments(user.id);
      setAssignments(list);
      if (list.length > 0 && !selectedAssignmentId) {
        setSelectedAssignmentId(list[0].id);
      }
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [user]);

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

  const handleAddNote = () => {
    if (!newNoteText.trim() || !selectedAssignmentId || !user?.id) return;
    const ok = backendService.addRmNote(selectedAssignmentId, user.id, newNoteText);
    if (ok) {
      setNewNoteText('');
      setStatusMessage('Interaction note successfully logged in audit record.');
      loadAssignments();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleCoordinateVisit = () => {
    if (!visitDateInput || !selectedAssignmentId || !user?.id) return;
    const ok = backendService.coordinateRmVisit(selectedAssignmentId, user.id, visitDateInput);
    if (ok) {
      setVisitDateInput('');
      setStatusMessage('Visit coordinated and notification dispatched.');
      loadAssignments();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleEscalate = () => {
    if (!escalateReason.trim() || !selectedAssignmentId || !user?.id) return;
    const ok = backendService.escalateRmCase(selectedAssignmentId, user.id, escalateReason);
    if (ok) {
      setEscalateReason('');
      setIsEscalating(false);
      setStatusMessage('Case escalated to Operations Management Centre.');
      loadAssignments();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  if (!isAuthenticated || !isRm) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-900 text-white flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900">NivasPay Relationship Manager Workspace</h1>
              <p className="text-xs text-stone-500">Internal NivasPay Staff Authentication Required</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This area is restricted to internal NivasPay Relationship Managers.
              Access to customer discovery and tenant profiles is strictly audited and limited to assigned records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => login('tenzing.rm@nivaspay.in', 'Pass@Nivas2026!', 'nivaspay_rm')}
            className="w-full py-3 bg-teal-950 hover:bg-teal-900 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Sign In as Tenzing Norbu (NivasPay RM)
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
      <header className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-900 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-300 mb-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>NivasPay Internal Staff &bull; Relationship Management</span>
          </div>
          <h1 className="text-2xl font-bold font-editorial tracking-tight">RM Care &amp; Tenancy Support</h1>
          <p className="text-xs text-teal-200/80 mt-1">
            Assigned Officer: <span className="text-white font-semibold">{user?.name}</span> &bull;
            Assigned Inquiries: <span className="text-white font-semibold">{assignments.length}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 bg-teal-900 hover:bg-teal-800 text-teal-200 text-xs rounded-full cursor-pointer transition-colors border border-teal-800"
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-semibold rounded-full cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>
      </header>

      {/* RBAC Boundary Notification */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <span className="font-semibold">Scoped Security Boundary (RBAC Enforced)</span>
            <p className="text-amber-800 text-[11px] mt-0.5">
              You can ONLY view customers assigned directly to your portfolio.
              Financial disbursements, landlord approval overrides, and password modifications are restricted. All actions logged in the audit ledger.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-200 text-amber-900 text-[10px] rounded-full font-mono shrink-0">
          AUDITED
        </span>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Grid: Assigned Customers list on left, Details & Interaction logs on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assigned Customers */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-stone-900">Assigned Customers ({assignments.length})</h2>

          {assignments.map(a => (
            <div
              key={a.id}
              onClick={() => setSelectedAssignmentId(a.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                selectedAssignmentId === a.id
                  ? 'bg-white border-teal-600 shadow-md ring-2 ring-teal-600/10'
                  : 'bg-white/70 hover:bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">{a.customerName}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  a.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  a.status === 'VISIT_COORDINATED' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                  'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {a.status}
                </span>
              </div>
              <p className="text-xs text-stone-500">{a.preferredCity} &bull; Budget: ₹{a.budgetMonthly.toLocaleString('en-IN')}/mo</p>
              <p className="text-[11px] text-stone-600 line-clamp-1">{a.customerRequirement}</p>
            </div>
          ))}
        </div>

        {/* Right Column: Active Case Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAssignment ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{selectedAssignment.customerName}</h3>
                  <div className="flex items-center gap-3 text-xs text-stone-500 mt-1">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-stone-400" /> {selectedAssignment.customerPhoneMasked}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-stone-400" /> {selectedAssignment.customerEmail}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEscalating(!isEscalating)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-medium cursor-pointer"
                  >
                    Escalate to Operations
                  </button>
                </div>
              </div>

              {/* Requirement Summary */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">Housing Profile &amp; Preferences</span>
                <p className="text-xs text-stone-800 leading-relaxed">{selectedAssignment.customerRequirement}</p>
              </div>

              {/* Visit Coordination Tool */}
              <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-950">
                  <Calendar className="w-4 h-4 text-teal-700" />
                  <span>Coordinate Guided Property Viewing</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={visitDateInput}
                    onChange={(e) => setVisitDateInput(e.target.value)}
                    className="text-xs border border-teal-300 rounded-xl px-3 py-2 bg-white text-stone-800 flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleCoordinateVisit}
                    disabled={!visitDateInput}
                    className="px-4 py-2 bg-teal-900 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Schedule Slot
                  </button>
                </div>
              </div>

              {/* Escalation Sub-Panel */}
              {isEscalating && (
                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                    <span>Escalate Case to Operations Management</span>
                  </div>
                  <textarea
                    rows={2}
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Describe issue (e.g., landlord responsiveness SLA breach, fair housing complaint)..."
                    className="w-full text-xs border border-rose-300 rounded-xl p-3 bg-white text-stone-800"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEscalating(false)}
                      className="px-3 py-1.5 text-stone-500 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEscalate}
                      disabled={!escalateReason.trim()}
                      className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Confirm Escalation
                    </button>
                  </div>
                </div>
              )}

              {/* Interaction Log History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
                  <span>Interaction &amp; Follow-up History (Audited)</span>
                </h4>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedAssignment.notes.map(note => (
                    <div key={note.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-stone-400">
                        <span className="font-semibold text-stone-700">{note.authorName}</span>
                        <span>{new Date(note.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-stone-800">{note.note}</p>
                    </div>
                  ))}
                </div>

                {/* Add new note */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    placeholder="Log interaction note or customer preference..."
                    className="text-xs border border-stone-300 rounded-xl px-3 py-2 bg-white text-stone-800 flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!newNoteText.trim()}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Log</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-xs text-stone-500">
              Select an assigned customer on the left to review their housing profile and coordinate viewings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
