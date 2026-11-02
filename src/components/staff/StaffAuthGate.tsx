import React from 'react';
import { ShieldCheck, UserCheck, SlidersHorizontal, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StaffAuthGateProps {
  onReturnHome: () => void;
  onNavigateToRm: () => void;
  onNavigateToOps: () => void;
}

export const StaffAuthGate: React.FC<StaffAuthGateProps> = ({
  onReturnHome,
  onNavigateToRm,
  onNavigateToOps,
}) => {
  const { user, isAuthenticated, login, logout, openAuthModal } = useAuth();

  const handleQuickLogin = async (staffRole: 'nivaspay_rm' | 'operations_manager') => {
    if (staffRole === 'nivaspay_rm') {
      await login('tenzing.rm@nivaspay.in', 'Pass@Nivas2026!', 'nivaspay_rm');
      onNavigateToRm();
    } else {
      await login('ananya.ops@nivaspay.in', 'Pass@Nivas2026!', 'operations_manager');
      onNavigateToOps();
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 px-6 sm:px-10 py-8 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-editorial tracking-tight">NivasPay Staff Gateway</h1>
              <p className="text-xs text-stone-300">Internal Operations &amp; Relationship Management Access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-full cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return Home</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-700 space-y-1">
            <p className="font-semibold text-stone-900">Protected Internal Infrastructure</p>
            <p className="text-stone-600 leading-relaxed">
              Staff workspaces are completely isolated from customer rental exploration and owner property management.
              Please select your designated role workspace below to continue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Relationship Manager Card */}
            <div className="p-5 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-teal-950 font-semibold text-sm">
                  <UserCheck className="w-4 h-4 text-teal-700" />
                  <span>Relationship Manager (RM)</span>
                </div>
                <p className="text-xs text-teal-900/80 leading-relaxed">
                  Assist assigned customers, coordinate in-person property viewings, and record interaction history. Scoped customer access.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {isAuthenticated && (user?.staffMembership?.staffRole === 'NIVASPAY_RM' || (user?.role as string) === 'nivaspay_rm') ? (
                  <button
                    type="button"
                    onClick={onNavigateToRm}
                    className="w-full py-2.5 bg-teal-900 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Open RM Workspace &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('nivaspay_rm')}
                    className="w-full py-2.5 bg-teal-900 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Sign In as Tenzing Norbu (RM)
                  </button>
                )}
              </div>
            </div>

            {/* Operations Manager Card */}
            <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 font-semibold text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-700" />
                  <span>Operations Manager (Supervisor)</span>
                </div>
                <p className="text-xs text-indigo-900/80 leading-relaxed">
                  Review owner KYC, approve property listing authorizations, reassign cases between team members, and handle grievances.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {isAuthenticated && (user?.staffMembership?.staffRole === 'OPERATIONS_MANAGER' || (user?.role as string) === 'operations_manager') ? (
                  <button
                    type="button"
                    onClick={onNavigateToOps}
                    className="w-full py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Open Operations Centre &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('operations_manager')}
                    className="w-full py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Sign In as Ananya Deshmukh (Ops)
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
            <span>Staff password: Pass@Nivas2026!</span>
            <button
              type="button"
              onClick={() => openAuthModal('login', 'nivaspay_rm')}
              className="text-stone-700 font-semibold hover:underline"
            >
              Sign In with Custom Staff Email &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
