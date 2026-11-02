import React from 'react';
import {
  ArrowLeft,
  Building2,
  Home,
  ShieldCheck,
  FileText,
  User as UserIcon,
  LogIn,
  LogOut,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CustomerApp } from './CustomerApp';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backendService';

interface CustomerLayoutProps {
  onReturnHome: () => void;
  onNavigateRentCategories?: () => void;
  onOpenTerms: () => void;
  onOpenPolicies: (defaultTab?: 'regulations_eula' | 'refund_policy') => void;
  onOpenProfile: () => void;
  activeCategory?: 'housing' | 'commercial';
  onCategoryChange?: (category: 'housing' | 'commercial') => void;
}

/**
 * Dedicated Customer Experience Layout
 * Wraps CustomerApp with its own purpose-built header and navigation,
 * completely decoupled from owner views while sharing unified authentication state.
 */
export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  onReturnHome,
  onNavigateRentCategories,
  onOpenTerms,
  onOpenPolicies,
  onOpenProfile,
  activeCategory = 'housing',
  onCategoryChange,
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-in fade-in duration-200">
      {/* Dedicated Customer Experience Header */}
      <header className="bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-2xl px-4 sm:px-6 py-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Brand Identity & Home Exit Path */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Central Gateway Return Link */}
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Return to NivasPay Gateway"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {onNavigateRentCategories && (
            <button
              type="button"
              onClick={onNavigateRentCategories}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 rounded-full text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Change Property Category"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>
          )}

          <div className="h-4 w-px bg-stone-200 hidden sm:block" />

          {/* Customer Brand Lockup */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-editorial font-bold text-base shadow-xs ${
              activeCategory === 'commercial' ? 'bg-stone-900 text-white' : 'bg-emerald-950 text-white'
            }`}>
              N
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial font-bold text-base tracking-tight text-stone-900 leading-tight">
                  {activeCategory === 'commercial' ? 'NivasPay Commercial' : 'NivasPay Homes'}
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-wider border px-2 py-0.5 rounded-full font-medium ${
                  activeCategory === 'commercial'
                    ? 'bg-stone-100 text-stone-800 border-stone-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                }`}>
                  {activeCategory === 'commercial' ? 'Commercial Discovery' : 'Housing Discovery'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-light hidden sm:block">
                {activeCategory === 'commercial'
                  ? 'Commercial properties, workspaces & premises across Arunachal Pradesh'
                  : 'Verified residential rentals across Arunachal Pradesh'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Category Discovery Switcher */}
        {onCategoryChange && (
          <div className="flex items-center p-1 bg-stone-100/90 rounded-full border border-stone-200 self-start lg:self-center">
            <button
              type="button"
              onClick={() => onCategoryChange('housing')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeCategory === 'housing'
                  ? 'bg-white text-emerald-950 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Housing</span>
            </button>
            <button
              type="button"
              onClick={() => onCategoryChange('commercial')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeCategory === 'commercial'
                  ? 'bg-stone-900 text-white shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Commercial</span>
            </button>
          </div>
        )}

        {/* Right: Policies and Auth Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5">

          {/* Quick Legal / Policies Button */}
          <button
            type="button"
            onClick={() => onOpenPolicies('regulations_eula')}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-full text-xs font-medium transition-colors cursor-pointer"
            title="View Platform Tenancy Regulations & Policies"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Policies</span>
          </button>

          {/* Customer Auth Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-full text-xs font-medium text-stone-800 transition-colors shadow-2xs cursor-pointer"
                title="View Profile and Rental Record"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-950 text-white flex items-center justify-center font-bold text-[10px]">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <span className="max-w-[100px] truncate text-xs text-stone-800 font-medium">
                  {user.name?.split(' ')[0] || 'User'}
                </span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-full transition-colors cursor-pointer shadow-2xs"
                title="Log Out of Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login', 'customer')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-white rounded-full text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Customer Experience Component */}
      <main className="w-full flex-1">
        <CustomerApp
          currentUserId={user?.id || ''}
          onOpenTerms={onOpenTerms}
          onOpenPolicies={onOpenPolicies}
          onOpenProfile={onOpenProfile}
          discoveryCategory={activeCategory}
          onCategoryChange={onCategoryChange}
        />
      </main>
    </div>
  );
};
