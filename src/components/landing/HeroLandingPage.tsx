import React from 'react';
import { motion, type Variants } from 'motion/react';
import {
  ArrowRight,
  ShieldCheck,
  Building,
  Building2,
  Home,
  Compass,
  KeyRound,
  CheckCircle2,
  Lock,
  Search,
  Sparkles,
  MapPin,
  FileCheck2,
  Receipt,
  BadgePercent,
  TrendingUp,
} from 'lucide-react';

const toRentCardVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
  },
  hover: {
    scale: 1.018,
    y: -8,
    boxShadow: '0 25px 35px -5px rgba(6, 78, 59, 0.12), 0 12px 16px -6px rgba(6, 78, 59, 0.08)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
  },
  tap: {
    scale: 0.995,
    y: -3,
    transition: { duration: 0.1 },
  },
};

const listPropertyCardVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
  },
  hover: {
    scale: 1.018,
    y: -8,
    boxShadow: '0 25px 35px -5px rgba(28, 25, 23, 0.15), 0 12px 16px -6px rgba(28, 25, 23, 0.09)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
  },
  tap: {
    scale: 0.995,
    y: -3,
    transition: { duration: 0.1 },
  },
};

interface HeroLandingPageProps {
  onSelectToRent: () => void;
  onSelectListProperty: () => void;
  onOpenSignIn: () => void;
  onOpenPolicies: (tab?: 'regulations_eula' | 'refund_policy') => void;
  onOpenTerms: () => void;
  onOpenBrokerPortal?: () => void;
  onOpenStaffGateway?: () => void;
  isAuthenticated?: boolean;
}

export const HeroLandingPage: React.FC<HeroLandingPageProps> = ({
  onSelectToRent,
  onSelectListProperty,
  onOpenSignIn,
  onOpenPolicies,
  onOpenTerms,
  onOpenBrokerPortal,
  onOpenStaffGateway,
  isAuthenticated = false,
}) => {
  return (
    <div className="w-full flex flex-col justify-between py-2 sm:py-6 lg:py-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Brand Hero Introduction */}
      <section className="text-center space-y-4 max-w-2xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/5 border border-emerald-900/15 text-emerald-900 text-xs font-semibold tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>NivasPay Residential Rental Marketplace</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-5xl font-editorial font-bold text-stone-900 tracking-tight leading-[1.15]">
          Find your place.{' '}
          <span className="text-emerald-900 italic font-normal">Rent with confidence.</span>
        </h1>

        <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-light max-w-xl mx-auto">
          A simpler way to find a home or list your property. Verified residential listings, transparent rental terms, and guaranteed in-app payments.
        </p>

        <div className="pt-2">
          <h2 className="text-xs uppercase tracking-widest text-stone-400 font-semibold font-mono">
            What are you looking for?
          </h2>
        </div>
      </section>

      {/* Two Large Interactive Decision Cards */}
      <section
        aria-label="Rental Platform Options"
        className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-4xl mx-auto w-full mb-12"
      >
        {/* OPTION 1: TO RENT */}
        <motion.div
          role="button"
          tabIndex={0}
          onClick={onSelectToRent}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectToRent();
            }
          }}
          variants={toRentCardVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="group relative bg-white/95 hover:bg-white rounded-3xl p-7 sm:p-9 border border-stone-200/90 hover:border-emerald-600/70 shadow-sm hover:shadow-2xl hover:shadow-emerald-950/10 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.018] will-change-transform flex flex-col justify-between cursor-pointer focus:outline-hidden focus:ring-3 focus:ring-emerald-700/40 text-left overflow-hidden"
        >
          {/* Subtle Top Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 opacity-90 group-hover:h-2 transition-all duration-300" />

          <div className="space-y-6">
            {/* Header & High-Quality Lucide SVG Icon */}
            <div className="flex items-start justify-between">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-100/50 text-emerald-800 flex items-center justify-center border border-emerald-200/80 group-hover:bg-emerald-950 group-hover:text-emerald-300 group-hover:border-emerald-900 group-hover:scale-105 transition-all duration-300 shadow-2xs">
                  <Home className="w-7 h-7 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] shadow-xs ring-2 ring-white group-hover:bg-emerald-500 group-hover:ring-stone-900 transition-all duration-300">
                    <Compass className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60 group-hover:bg-emerald-50 group-hover:text-emerald-800 group-hover:border-emerald-200/80 transition-all duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 group-hover:scale-125 transition-transform" />
                <span>Public Discovery</span>
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-900 group-hover:text-emerald-950 transition-colors duration-200">
                To Rent
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Find a home that fits your needs. Browse verified residential properties across prime localities with zero browsing fee.
              </p>
            </div>

            {/* Feature List */}
            <ul className="space-y-2.5 pt-3 border-t border-stone-100 text-xs text-stone-600 font-light">
              <li className="flex items-center gap-2.5 group-hover:text-stone-800 transition-colors">
                <div className="w-4 h-4 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>Browse homes freely without mandatory sign-up</span>
              </li>
              <li className="flex items-center gap-2.5 group-hover:text-stone-800 transition-colors">
                <div className="w-4 h-4 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>High-resolution photos, floor plans &amp; clear rents</span>
              </li>
              <li className="flex items-center gap-2.5 group-hover:text-stone-800 transition-colors">
                <div className="w-4 h-4 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>Fair tenancy &amp; transparent refundable deposit escrows</span>
              </li>
            </ul>
          </div>

          {/* Primary Action Button */}
          <div className="pt-8">
            <button
              type="button"
              className="w-full py-3.5 px-5 bg-emerald-950 text-white rounded-2xl font-semibold text-sm group-hover:bg-emerald-900 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Explore Properties</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>
        </motion.div>

        {/* OPTION 2: LIST YOUR PROPERTY */}
        <motion.div
          role="button"
          tabIndex={0}
          onClick={onSelectListProperty}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectListProperty();
            }
          }}
          variants={listPropertyCardVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="group relative bg-white/95 hover:bg-white rounded-3xl p-7 sm:p-9 border border-stone-200/90 hover:border-amber-700/60 shadow-sm hover:shadow-2xl hover:shadow-stone-950/12 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.018] will-change-transform flex flex-col justify-between cursor-pointer focus:outline-hidden focus:ring-3 focus:ring-stone-900/30 text-left overflow-hidden"
        >
          {/* Subtle Top Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-stone-800 via-amber-600 to-stone-900 opacity-90 group-hover:h-2 transition-all duration-300" />

          <div className="space-y-6">
            {/* Header & High-Quality Lucide SVG Icon */}
            <div className="flex items-start justify-between">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100/50 text-amber-900 flex items-center justify-center border border-amber-200/80 group-hover:bg-stone-950 group-hover:text-amber-300 group-hover:border-stone-800 group-hover:scale-105 transition-all duration-300 shadow-2xs">
                  <Building2 className="w-7 h-7 stroke-[1.8] group-hover:scale-110 transition-transform duration-300" />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-stone-950 flex items-center justify-center text-[10px] shadow-xs ring-2 ring-white group-hover:bg-amber-400 group-hover:ring-stone-900 transition-all duration-300 font-bold">
                    <KeyRound className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-amber-50/90 text-amber-900 border border-amber-200/70 group-hover:bg-stone-900 group-hover:text-amber-300 group-hover:border-stone-800 transition-all duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:bg-amber-300 group-hover:scale-125 transition-all" />
                <span>Owner Portal</span>
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-900 group-hover:text-stone-950 transition-colors duration-200">
                List Your Property
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                List your property and find the right tenant. Screen applicant dossiers, track occupancy, and automate monthly remittances.
              </p>
            </div>

            {/* Feature List */}
            <ul className="space-y-2.5 pt-3 border-t border-stone-100 text-xs text-stone-600 font-light">
              <li className="flex items-center gap-2.5 group-hover:text-stone-800 transition-colors">
                <div className="w-4 h-4 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>0% owner brokerage charter on rental remittances</span>
              </li>
              <li className="flex items-center gap-2.5 group-hover:text-stone-800 transition-colors">
                <div className="w-4 h-4 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>Manage multiple units, occupancy trends &amp; leases</span>
              </li>
              <li className="flex items-center gap-2.5 group-hover:text-stone-800 transition-colors">
                <div className="w-4 h-4 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>Verified tenant dossiers with DPDP Act 2023 safeguards</span>
              </li>
            </ul>
          </div>

          {/* Primary Action Button */}
          <div className="pt-8">
            <button
              type="button"
              className="w-full py-3.5 px-5 bg-stone-900 text-white rounded-2xl font-semibold text-sm group-hover:bg-stone-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Start Listing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Trust & Guarantee Strip */}
      <section className="bg-white/70 border border-stone-200/80 rounded-3xl p-6 sm:p-7 max-w-4xl mx-auto w-full mb-10 text-stone-700">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-stone-900 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Fair Tenancy Standard</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              Statutory non-discriminatory screening. Objective rejection transparency guaranteed.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-stone-900 font-semibold text-xs">
              <Receipt className="w-4 h-4 text-teal-700" />
              <span>In-App Escrow Returns</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              Direct security deposit protection. Automated refund SLA for unaccepted applicants.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-stone-900 font-semibold text-xs">
              <FileCheck2 className="w-4 h-4 text-sky-700" />
              <span>DPDP Act 2023 Compliant</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              Section 6 consent tracking with field-level encryption for sensitive personal IDs.
            </p>
          </div>
        </div>
      </section>

      {/* Returning User Bar */}
      <div className="text-center text-xs text-stone-500 space-y-2 mb-6">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onOpenSignIn}
            className="text-emerald-900 font-semibold hover:underline underline-offset-2 cursor-pointer ml-1"
          >
            {isAuthenticated ? 'View your account profile' : 'Sign in to your account'}
          </button>
        </p>
      </div>

      {/* Discreet Landing Page Footer */}
      <footer className="border-t border-stone-200/70 pt-6 pb-2 text-stone-500 text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-[11px] text-stone-600">
            <button
              onClick={onSelectToRent}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Browse Homes
            </button>
            <span>&bull;</span>
            <button
              onClick={onSelectListProperty}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              For Property Owners
            </button>
            <span>&bull;</span>
            <button
              onClick={() => onOpenPolicies('regulations_eula')}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Privacy &amp; DPDP Policy
            </button>
            <span>&bull;</span>
            <button
              onClick={() => onOpenPolicies('refund_policy')}
              className="hover:text-stone-900 transition-colors cursor-pointer text-emerald-800 font-medium"
            >
              Refund Policy
            </button>
            <span>&bull;</span>
            <button
              onClick={onOpenTerms}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>&bull;</span>
            <button
              onClick={onOpenBrokerPortal}
              className="hover:text-amber-800 transition-colors cursor-pointer text-stone-500 hover:underline"
              title="Registered Real Estate Agencies and Broker Staff"
            >
              Broker &amp; Agency Portal
            </button>
            <span>&bull;</span>
            <button
              onClick={onOpenStaffGateway}
              className="hover:text-teal-800 transition-colors cursor-pointer text-stone-500 hover:underline"
              title="NivasPay Operations &amp; Relationship Managers"
            >
              Staff Workspace
            </button>
          </div>

          <div className="text-stone-400 text-[10px] font-mono text-center sm:text-right">
            NivasPay Technologies India &bull; Residential Rental Marketplace
          </div>
        </div>
      </footer>
    </div>
  );
};
