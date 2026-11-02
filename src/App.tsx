/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  LogIn,
  LogOut,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import { CustomerLayout } from './components/customer/CustomerLayout';
import { OwnerLayout } from './components/owner/OwnerLayout';
import { BrokerPortal } from './components/broker/BrokerPortal';
import { RmWorkspace } from './components/staff/RmWorkspace';
import { OperationsWorkspace } from './components/staff/OperationsWorkspace';
import { StaffAuthGate } from './components/staff/StaffAuthGate';
import { AdminConsole } from './components/admin/AdminConsole';
import { backendService } from './services/backendService';
import { TermsAndConditionsModal } from './components/legal/TermsAndConditionsModal';
import { PoliciesModal } from './components/legal/PoliciesModal';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { ProtectedGate } from './components/auth/ProtectedGate';
import { HeroLandingPage } from './components/landing/HeroLandingPage';
import { PropertyCategorySelection } from './components/landing/PropertyCategorySelection';

export type MainAppSection =
  | 'landing'
  | 'rent_category_selection'
  | 'customer_app'
  | 'owner_app'
  | 'broker_app'
  | 'staff_rm'
  | 'staff_ops'
  | 'staff_gate'
  | 'admin_console';
export type NavigationIntent = 'tenant' | 'owner' | null;

const STORAGE_KEY_SECTION = 'nivaspay_preferred_section';
const STORAGE_KEY_INTENT = 'nivaspay_navigation_intent';

function AppLayout() {
  const {
    user,
    role,
    isAuthenticated,
    logout,
    openAuthModal,
    authModalState,
    closeAuthModal,
  } = useAuth();

  // Discovery category state ('housing' | 'commercial')
  const [discoveryCategory, setDiscoveryCategory] = useState<'housing' | 'commercial'>(() => {
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        if (window.location.hash.toLowerCase().includes('commercial')) {
          return 'commercial';
        }
      }
    } catch {}
    return 'housing';
  });

  // Navigation between sections with session storage preference
  const [activeSection, setActiveSection] = useState<MainAppSection>(() => {
    try {
      // Check URL hash first for deep linking
      if (typeof window !== 'undefined' && window.location.hash) {
        const h = window.location.hash.toLowerCase();
        if (h.includes('rent') || h.includes('to-rent') || h.includes('category')) return 'rent_category_selection';
        if (h.includes('customer')) return 'customer_app';
        if (h.includes('owner') || h.includes('list-property')) return 'owner_app';
        if (h.includes('broker')) return 'broker_app';
        if (h.includes('staff/rm')) return 'staff_rm';
        if (h.includes('staff/operations')) return 'staff_ops';
        if (h.includes('staff')) return 'staff_gate';
        if (h.includes('admin')) return 'admin_console';
      }
      const saved = sessionStorage.getItem(STORAGE_KEY_SECTION);
      if (
        saved &&
        [
          'rent_category_selection',
          'customer_app',
          'owner_app',
          'broker_app',
          'staff_rm',
          'staff_ops',
          'staff_gate',
          'admin_console',
          'landing',
        ].includes(saved)
      ) {
        return saved as MainAppSection;
      }
    } catch {
      // Fallback
    }
    return 'landing';
  });

  // Navigation Intent preservation for post-auth routing
  const [navigationIntent, setNavigationIntent] = useState<NavigationIntent>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_INTENT);
      if (saved === 'tenant' || saved === 'owner') return saved;
    } catch {
      // Fallback
    }
    return null;
  });

  // Sync section to session storage and URL hash
  const handleNavigateSection = (section: MainAppSection, category?: 'housing' | 'commercial') => {
    setActiveSection(section);
    if (category) {
      setDiscoveryCategory(category);
    }
    try {
      sessionStorage.setItem(STORAGE_KEY_SECTION, section);
      if (typeof window !== 'undefined') {
        if (section === 'rent_category_selection') {
          window.location.hash = '#/rent';
        } else if (section === 'customer_app') {
          const targetCat = category || discoveryCategory;
          window.location.hash = targetCat === 'commercial' ? '#/customer/commercial' : '#/customer/housing';
        } else if (section === 'owner_app') {
          window.location.hash = '#/owner';
        } else if (section === 'broker_app') {
          window.location.hash = '#/broker';
        } else if (section === 'staff_rm') {
          window.location.hash = '#/staff/rm';
        } else if (section === 'staff_ops') {
          window.location.hash = '#/staff/operations';
        } else if (section === 'staff_gate') {
          window.location.hash = '#/staff';
        } else if (section === 'admin_console') {
          window.location.hash = '#/admin';
        } else {
          window.location.hash = '#/';
        }
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Set navigation intent with clean sessionStorage sync
  const setIntent = (intent: NavigationIntent) => {
    setNavigationIntent(intent);
    try {
      if (intent) {
        sessionStorage.setItem(STORAGE_KEY_INTENT, intent);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_INTENT);
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Hash change listener for seamless browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('customer/commercial')) {
        setDiscoveryCategory('commercial');
        setActiveSection('customer_app');
      } else if (hash.includes('customer/housing')) {
        setDiscoveryCategory('housing');
        setActiveSection('customer_app');
      } else if (hash.includes('rent') || hash.includes('to-rent') || hash.includes('category')) {
        setActiveSection('rent_category_selection');
      } else if (hash.includes('customer')) {
        setDiscoveryCategory('housing');
        setActiveSection('customer_app');
      } else if (hash.includes('owner/login')) {
        setIntent('owner');
        if (!isAuthenticated) {
          openAuthModal('login', 'owner');
        } else {
          setActiveSection('owner_app');
        }
      } else if (hash.includes('owner') || hash.includes('list-property')) {
        setActiveSection('owner_app');
      } else if (hash.includes('broker')) {
        setActiveSection('broker_app');
      } else if (hash.includes('staff/rm')) {
        setActiveSection('staff_rm');
      } else if (hash.includes('staff/operations')) {
        setActiveSection('staff_ops');
      } else if (hash.includes('staff')) {
        setActiveSection('staff_gate');
      } else if (hash.includes('admin')) {
        setActiveSection('admin_console');
      } else if (hash.includes('landing') || hash === '' || hash === '#/' || hash === '#') {
        setActiveSection('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, openAuthModal]);

  // Deep-link check on initial mount for #/owner/login
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('owner/login')) {
      if (!isAuthenticated) {
        setIntent('owner');
        openAuthModal('login', 'owner');
      }
    }
  }, [isAuthenticated, openAuthModal]);

  // Post-authentication Intent Routing
  // When user successfully authenticates, cleanly resolve and CLEAR the intent immediately
  useEffect(() => {
    if (isAuthenticated && user && navigationIntent) {
      const targetIntent = navigationIntent;
      // Cleanly clear intent from state and storage immediately
      setIntent(null);
      try {
        sessionStorage.removeItem(STORAGE_KEY_INTENT);
      } catch {}

      if (targetIntent === 'owner') {
        handleNavigateSection('owner_app');
      } else if (targetIntent === 'tenant') {
        handleNavigateSection('customer_app', discoveryCategory);
      }
    }
  }, [isAuthenticated, user, navigationIntent, discoveryCategory]);

  // Clean Logout Handler: ensures all session and intent storage is purged
  const handleUserLogout = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_INTENT);
      sessionStorage.removeItem(STORAGE_KEY_SECTION);
    } catch {}
    setIntent(null);
    logout();
    handleNavigateSection('landing');
  };

  // Landing Page Action 1: TO RENT -> Navigates to dedicated property category selection (#/rent)
  const handleSelectToRent = () => {
    setIntent('tenant');
    handleNavigateSection('rent_category_selection');
  };

  // Landing Page Action 2: LIST YOUR PROPERTY -> Navigates to owner onboarding / login (#/owner/login)
  const handleSelectListProperty = () => {
    setIntent('owner');
    if (isAuthenticated) {
      handleNavigateSection('owner_app');
    } else {
      if (typeof window !== 'undefined') {
        window.location.hash = '#/owner/login';
      }
      openAuthModal('login', 'owner');
    }
  };

  // Perspective Mode Switcher Handler (preserves unified auth state)
  const handleSwitchMode = (target: 'customer_app' | 'owner_app') => {
    handleNavigateSection(target);
  };

  // Modals for Legal, Policies & User Profile
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState<boolean>(false);
  const [policiesDefaultTab, setPoliciesDefaultTab] = useState<'regulations_eula' | 'refund_policy'>('regulations_eula');

  const handleOpenPolicies = (defaultTab: 'regulations_eula' | 'refund_policy' = 'regulations_eula') => {
    setPoliciesDefaultTab(defaultTab);
    setIsPoliciesModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f3f1eb] text-stone-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950">
      {/* ========================================================================= */}
      {/* 0. HERO LANDING PAGE SPECIFIC TOP HEADER                                  */}
      {/* (Rendered ONLY on landing page to eliminate header bloat in apps)         */}
      {/* ========================================================================= */}
      {(activeSection === 'landing' || activeSection === 'rent_category_selection') && (
        <header className="sticky top-0 z-40 bg-[#f8f7f3]/95 backdrop-blur-xl border-b border-stone-200/80 px-4 sm:px-8 py-3.5">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            {/* Primary NivasPay Wordmark */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-editorial font-bold text-lg shadow-sm ring-1 ring-emerald-950/10 shrink-0">
                N
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-editorial font-bold text-lg tracking-tight text-stone-900">
                    NivasPay
                  </span>
                  <span className="text-[10px] bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded-full font-medium border border-stone-300">
                    RENTAL MARKETPLACE
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 hidden sm:block font-light">
                  Fair Tenancy &bull; 0% Owner Brokerage &bull; DPDP 2023 Protected
                </p>
              </div>
            </div>

            {/* Quick Policy & Authentication Access */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenPolicies('regulations_eula')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-full text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                title="Policies: Regulations, EULA & Fair Tenancy"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Policies</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTermsModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-full text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                title="Terms and Conditions of Service"
              >
                <FileText className="w-3.5 h-3.5 text-stone-600" />
                <span>Terms</span>
              </button>

              {isAuthenticated && user ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-2 bg-white hover:bg-stone-50 border border-stone-200 pl-1.5 pr-3 py-1 rounded-full text-xs font-medium text-stone-800 transition-colors shadow-2xs cursor-pointer"
                    title="View Account Profile"
                  >
                    <div className="w-6 h-6 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                    <span className="max-w-[110px] truncate text-stone-900 text-xs font-medium">
                      {user.name}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUserLogout}
                    className="p-2 bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-full transition-colors cursor-pointer shadow-2xs"
                    title="Log Out of Session"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'customer')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-white rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Production Application Body */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-start">
        {/* ================= 0. HERO LANDING PAGE ================= */}
        {activeSection === 'landing' && (
          <HeroLandingPage
            onSelectToRent={handleSelectToRent}
            onSelectListProperty={handleSelectListProperty}
            onOpenSignIn={() => openAuthModal('login', 'customer')}
            onOpenPolicies={handleOpenPolicies}
            onOpenTerms={() => setIsTermsModalOpen(true)}
            onOpenBrokerPortal={() => handleNavigateSection('broker_app')}
            onOpenStaffGateway={() => handleNavigateSection('staff_gate')}
            isAuthenticated={isAuthenticated}
          />
        )}

        {/* ================= 0B. PROPERTY CATEGORY SELECTION ================= */}
        {activeSection === 'rent_category_selection' && (
          <PropertyCategorySelection
            onSelectHousing={() => {
              setDiscoveryCategory('housing');
              handleNavigateSection('customer_app', 'housing');
            }}
            onSelectCommercial={() => {
              setDiscoveryCategory('commercial');
              handleNavigateSection('customer_app', 'commercial');
            }}
            onBackToHome={() => handleNavigateSection('landing')}
          />
        )}

        {/* ================= 1. DEDICATED CUSTOMER LAYOUT CONTAINER ================= */}
        {activeSection === 'customer_app' && (
          <CustomerLayout
            onReturnHome={() => handleNavigateSection('landing')}
            onNavigateRentCategories={() => handleNavigateSection('rent_category_selection')}
            onOpenTerms={() => setIsTermsModalOpen(true)}
            onOpenPolicies={handleOpenPolicies}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            activeCategory={discoveryCategory}
            onCategoryChange={(cat) => {
              setDiscoveryCategory(cat);
              handleNavigateSection('customer_app', cat);
            }}
          />
        )}

        {/* ================= 2. DEDICATED OWNER LAYOUT CONTAINER ================= */}
        {activeSection === 'owner_app' && (
          <OwnerLayout
            onReturnHome={() => handleNavigateSection('landing')}
            onOpenTerms={() => setIsTermsModalOpen(true)}
            onOpenPolicies={handleOpenPolicies}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        )}

        {/* ================= 3. BROKER & AGENCY PORTAL ================= */}
        {activeSection === 'broker_app' && (
          <BrokerPortal onReturnHome={() => handleNavigateSection('landing')} />
        )}

        {/* ================= 4. RELATIONSHIP MANAGER WORKSPACE ================= */}
        {activeSection === 'staff_rm' && (
          <RmWorkspace onReturnHome={() => handleNavigateSection('landing')} />
        )}

        {/* ================= 5. OPERATIONS MANAGEMENT CENTRE ================= */}
        {activeSection === 'staff_ops' && (
          <OperationsWorkspace onReturnHome={() => handleNavigateSection('landing')} />
        )}

        {/* ================= 6. STAFF GATEWAY ================= */}
        {activeSection === 'staff_gate' && (
          <StaffAuthGate
            onReturnHome={() => handleNavigateSection('landing')}
            onNavigateToRm={() => handleNavigateSection('staff_rm')}
            onNavigateToOps={() => handleNavigateSection('staff_ops')}
          />
        )}

        {/* ================= 7. ADMIN CONSOLE (ISOLATED PROTECTED EXPERIENCE) ================= */}
        {activeSection === 'admin_console' && (
          <ProtectedGate requiredRole="admin">
            <div className="bg-slate-950 text-slate-100 rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-xl shadow-slate-950/10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold text-sm text-slate-200">
                    Administrative Compliance Console
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigateSection('landing')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-xs font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Home</span>
                </button>
              </div>
              <AdminConsole />
            </div>
          </ProtectedGate>
        )}
      </main>

      {/* Production Footer with Direct Policy & Terms Links */}
      <footer className="border-t border-stone-200/90 bg-[#F5F2EB]/90 px-4 sm:px-8 py-6 text-stone-500 text-xs font-light">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-stone-600">
            <button
              type="button"
              onClick={() => handleOpenPolicies('regulations_eula')}
              className="hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Terms &amp; Policies
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => handleOpenPolicies('refund_policy')}
              className="hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer text-emerald-800 font-medium"
            >
              Refund Policies (In-App Guarantees)
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(true)}
              className="hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => handleNavigateSection('broker_app')}
              className="hover:text-amber-900 underline underline-offset-2 transition-colors cursor-pointer text-stone-600"
            >
              Broker &amp; Agency Portal
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => handleNavigateSection('staff_gate')}
              className="hover:text-teal-900 underline underline-offset-2 transition-colors cursor-pointer text-stone-600"
            >
              Staff Workspace
            </button>
            <span>&bull;</span>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer font-medium text-stone-800"
              >
                Account Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login', 'customer')}
                className="hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Tenant Sign In
              </button>
            )}
          </div>
          <div className="text-stone-400 text-[11px] text-center md:text-right">
            NivasPay Technologies India &bull; Cryptographic RBAC &bull; In-App Rental Payments &bull; Fair Tenancy Housing
          </div>
        </div>
      </footer>

      {/* Modals for Legal, Policies, User Profile & Authentication */}
      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onOpenPolicies={() => handleOpenPolicies('regulations_eula')}
      />

      <PoliciesModal
        isOpen={isPoliciesModalOpen}
        onClose={() => setIsPoliciesModalOpen(false)}
        defaultTab={policiesDefaultTab}
        onOpenTerms={() => setIsTermsModalOpen(true)}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        activeSection={activeSection}
        currentCustomerId={user?.id || ''}
        currentOwnerId={user?.id || ''}
        onSwitchCustomerId={() => {}}
        onSwitchOwnerId={() => {}}
        onOpenTerms={() => setIsTermsModalOpen(true)}
        onOpenPolicies={handleOpenPolicies}
      />

      <AuthModal
        isOpen={authModalState.isOpen}
        onClose={() => {
          closeAuthModal();
          if (typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('owner/login')) {
            window.location.hash = '#/';
          }
        }}
        initialMode={authModalState.mode}
        initialRole={authModalState.targetRole}
        onOpenTerms={() => setIsTermsModalOpen(true)}
        onOpenPolicies={handleOpenPolicies}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
