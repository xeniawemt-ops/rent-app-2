import React from 'react';
import {
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  FileText,
  User as UserIcon,
  LogIn,
  LogOut,
  Building2,
} from 'lucide-react';
import { OwnerApp } from './OwnerApp';
import { ProtectedGate } from '../auth/ProtectedGate';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backendService';
interface OwnerLayoutProps {
  onReturnHome: () => void;
  onOpenTerms: () => void;
  onOpenPolicies: (defaultTab?: 'regulations_eula' | 'refund_policy') => void;
  onOpenProfile: () => void;
}

/**
 * Dedicated Owner Experience Layout
 * Wraps OwnerApp with its own purpose-built operational layout and header,
 * completely decoupled from the customer discovery view while sharing unified authentication state.
 */
export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  onReturnHome,
  onOpenTerms,
  onOpenPolicies,
  onOpenProfile,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-in fade-in duration-200">
      {/* Dedicated Owner Experience Top Header */}
      <header className="bg-stone-900 border border-stone-800 rounded-2xl px-4 sm:px-6 py-3 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-100">
        {/* Left: Brand Identity & Home Exit Path */}
        <div className="flex items-center gap-3">
          {/* Central Gateway Return Link */}
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 border border-stone-700/80 shadow-2xs"
            title="Return to NivasPay Gateway"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <div className="h-4 w-px bg-stone-800 hidden sm:block" />

          {/* Owner Brand Lockup */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-editorial font-bold text-base shadow-xs">
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial font-bold text-base tracking-tight text-white leading-tight">
                  NivasPay Owner
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider bg-stone-800 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                  Operations Center
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-light hidden sm:block">
                Property management, tenant screening &amp; 0% owner brokerage remittances
              </p>
            </div>
          </div>
        </div>

        {/* Right: Policies and Auth Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5">

          {/* Quick Legal / Policies Button */}
          <button
            type="button"
            onClick={() => onOpenPolicies('regulations_eula')}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 rounded-full text-xs font-medium transition-colors cursor-pointer"
            title="View Platform Regulations & Fair Tenancy Rules"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Policies</span>
          </button>

          {/* Owner Auth Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1.5 rounded-full text-xs font-medium text-stone-200 transition-colors shadow-2xs cursor-pointer"
                title="View Account Profile and Settlements"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px]">
                  {user.name?.charAt(0) || 'O'}
                </div>
                <span className="max-w-[100px] truncate text-xs text-stone-200 font-medium">
                  {user.name?.split(' ')[0] || 'Owner'}
                </span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-300 border border-stone-700 hover:border-rose-700 rounded-full transition-colors cursor-pointer shadow-2xs"
                title="Log Out of Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login', 'owner')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Owner Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Owner Operations Center inside ProtectedGate */}
      <main className="w-full flex-1">
        <ProtectedGate
          requiredRole="owner"
          title="Property Owner Portal"
          description="Sign in to your owner account to publish property listings, review applicant credentials, and receive digital escrow settlements."
          onNavigateExplore={() => onReturnHome()}
        >
          <OwnerApp
            key={user?.id || 'owner_view'}
            currentOwnerId={user?.id || ''}
          />
        </ProtectedGate>
      </main>
    </div>
  );
};
