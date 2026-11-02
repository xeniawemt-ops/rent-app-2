import React from 'react';
import {
  ShieldAlert,
  Building2,
  Smartphone,
  Lock,
  ArrowRight,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedGateProps {
  requiredRole: UserRole;
  title?: string;
  description?: string;
  onNavigateExplore?: () => void;
  children: React.ReactNode;
}

export const ProtectedGate: React.FC<ProtectedGateProps> = ({
  requiredRole,
  title,
  description,
  onNavigateExplore,
  children,
}) => {
  const { user, role, isAuthenticated, openAuthModal, logout } = useAuth();

  // If authenticated and role matches (or user is admin), render children
  if (isAuthenticated && (role === requiredRole || role === 'admin')) {
    return <>{children}</>;
  }

  // Not authenticated or role mismatch: Render dedicated authentication gate
  const isWrongRole = isAuthenticated && role !== requiredRole;

  if (requiredRole === 'admin') {
    return (
      <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl max-w-xl mx-auto my-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-white">
            Administrative Console Restricted
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {isWrongRole
              ? `You are currently authenticated as a "${role}". The Administrative Console requires platform compliance credentials.`
              : 'Access to this console requires cryptographically verified administrative privileges. Public access and self-registration are strictly prohibited.'}
          </p>
        </div>

        {isWrongRole ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => logout()}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-xs font-medium transition-colors cursor-pointer"
            >
              Log Out of Current Session
            </button>
            <button
              onClick={() => openAuthModal('login', 'admin')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Authenticate as Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="pt-2">
            <button
              onClick={() => openAuthModal('login', 'admin')}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <KeyRound className="w-4 h-4" />
              <span>Admin Credential Login</span>
            </button>
          </div>
        )}

        <div className="text-[11px] text-slate-600 font-mono pt-4 border-t border-slate-900">
          Server-Enforced RBAC &bull; Salted PBKDF2 Hashing &bull; Audit Trail Logged
        </div>
      </div>
    );
  }

  if (requiredRole === 'owner') {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-12 border border-stone-200 shadow-xl max-w-lg mx-auto my-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 mx-auto flex items-center justify-center">
          <Building2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-stone-900">
            {title || 'Property Owner Portal'}
          </h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            {isWrongRole
              ? `You are currently logged in with a "${role}" account. To manage rental properties, please log into your Owner account.`
              : (description || 'Sign in to list properties, review tenant applications, and manage leases with instant bank payouts.')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => openAuthModal('login', 'owner')}
            className="px-6 py-3 bg-emerald-950 hover:bg-emerald-900 text-white rounded-full text-xs font-medium transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Owner Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openAuthModal('signup', 'owner')}
            className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-medium transition-colors cursor-pointer"
          >
            Create Owner Account
          </button>
        </div>

        {onNavigateExplore && (
          <div className="pt-2">
            <button
              onClick={onNavigateExplore}
              className="text-xs text-stone-400 hover:text-stone-700 underline underline-offset-4 cursor-pointer"
            >
              &larr; Return to Browse Homes
            </button>
          </div>
        )}
      </div>
    );
  }

  // Customer Protected Gate
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-12 border border-stone-200 shadow-xl max-w-md mx-auto my-8 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-stone-100 border border-stone-200 text-stone-900 mx-auto flex items-center justify-center">
        <Smartphone className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="font-editorial text-2xl font-normal text-stone-900">
          {title || 'Tenant Account Required'}
        </h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
          {description || 'Please sign in or create an account to submit tenancy applications and view rental records.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          onClick={() => openAuthModal('login', 'customer')}
          className="px-6 py-3 bg-emerald-950 hover:bg-emerald-900 text-white rounded-full text-xs font-medium transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Customer Sign In</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => openAuthModal('signup', 'customer')}
          className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-medium transition-colors cursor-pointer"
        >
          Create Account
        </button>
      </div>
    </div>
  );
};
