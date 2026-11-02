import React from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Home,
  Building2,
  CheckCircle2,
  Compass,
  Briefcase,
  Store,
  Layers,
  BedDouble,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface PropertyCategorySelectionProps {
  onSelectHousing: () => void;
  onSelectCommercial: () => void;
  onBackToHome: () => void;
}

export const PropertyCategorySelection: React.FC<PropertyCategorySelectionProps> = ({
  onSelectHousing,
  onSelectCommercial,
  onBackToHome,
}) => {
  return (
    <div className="w-full flex flex-col justify-start py-4 sm:py-8 lg:py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* Return to Landing Page navigation */}
      <div className="mb-6 sm:mb-8">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 hover:text-stone-900 text-xs font-semibold transition-colors shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-stone-900"
          title="Back to Landing Page"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Page Header */}
      <header className="text-center space-y-3 max-w-2xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-900 tracking-wide">
          <Compass className="w-3.5 h-3.5 text-emerald-700" />
          <span>PROPERTY CATEGORY SELECTION</span>
          <span aria-hidden="true">&bull;</span>
          <span>ARUNACHAL PRADESH</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-stone-900 tracking-tight leading-tight">
          What are you looking for?
        </h1>

        <p className="text-base sm:text-lg text-stone-600 font-light max-w-xl mx-auto">
          Find the right space for your needs.
        </p>
      </header>

      {/* Two Visually Distinct Category Cards */}
      <div
        role="region"
        aria-label="Rental Category Options"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto w-full"
      >
        {/* ========================================================================= */}
        {/* CARD 1: HOUSING                                                           */}
        {/* ========================================================================= */}
        <div
          role="button"
          tabIndex={0}
          onClick={onSelectHousing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectHousing();
            }
          }}
          className="group relative bg-white/95 hover:bg-white rounded-3xl p-7 sm:p-9 border border-stone-200/90 hover:border-emerald-700/60 shadow-sm hover:shadow-xl hover:shadow-emerald-950/5 transition-all duration-300 flex flex-col justify-between cursor-pointer focus:outline-hidden focus-visible:ring-3 focus-visible:ring-emerald-700/40 text-left overflow-hidden"
        >
          {/* Top Emerald Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 opacity-90 group-hover:h-2 transition-all duration-300" />

          <div className="space-y-6">
            {/* Header Icon & Unboxed Metadata */}
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-900 group-hover:text-white transition-colors duration-300 shadow-2xs">
                <Home className="w-7 h-7" />
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-medium text-emerald-800">
                  Residential Rentals
                </span>
                <div className="text-[11px] text-stone-500">Verified Homes &amp; Rooms</div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-900 group-hover:text-emerald-950 transition-colors">
                Housing
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                Find a home, room or accommodation that fits your lifestyle.
              </p>
            </div>

            {/* Category Examples (Clean Unboxed Typography, Zero Pills) */}
            <div className="pt-2 border-t border-stone-100 space-y-2.5">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider font-mono">
                Included Accommodations
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Apartments &amp; Flats</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Independent Houses</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Villas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>PG Accommodation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Hostels</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Shared Rooms</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-8">
            <button
              type="button"
              className="w-full py-3.5 px-5 bg-emerald-950 text-white rounded-2xl font-semibold text-sm group-hover:bg-emerald-900 transition-all flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md cursor-pointer"
            >
              <span>Explore Housing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: COMMERCIAL                                                        */}
        {/* ========================================================================= */}
        <div
          role="button"
          tabIndex={0}
          onClick={onSelectCommercial}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectCommercial();
            }
          }}
          className="group relative bg-white/95 hover:bg-white rounded-3xl p-7 sm:p-9 border border-stone-200/90 hover:border-stone-800/60 shadow-sm hover:shadow-xl hover:shadow-stone-950/5 transition-all duration-300 flex flex-col justify-between cursor-pointer focus:outline-hidden focus-visible:ring-3 focus-visible:ring-stone-900/30 text-left overflow-hidden"
        >
          {/* Top Slate/Indigo Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-stone-800 via-slate-600 to-indigo-900 opacity-90 group-hover:h-2 transition-all duration-300" />

          <div className="space-y-6">
            {/* Header Icon & Unboxed Metadata */}
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200 group-hover:bg-stone-900 group-hover:text-white transition-colors duration-300 shadow-2xs">
                <Building2 className="w-7 h-7" />
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-medium text-stone-800">
                  Business &amp; Workspaces
                </span>
                <div className="text-[11px] text-stone-500">Commercial Real Estate</div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-900 group-hover:text-stone-950 transition-colors">
                Commercial
              </h2>
              <p className="text-stone-600 text-sm leading-relaxed">
                Find the right space for your business.
              </p>
            </div>

            {/* Category Examples (Clean Unboxed Typography, Zero Pills) */}
            <div className="pt-2 border-t border-stone-100 space-y-2.5">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider font-mono">
                Included Premises
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <span>Offices</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <span>Shops &amp; Showrooms</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <span>Warehouses</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <span>Industrial Spaces</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <span>Co-working Spaces</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  <span>Clinics</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-8">
            <button
              type="button"
              className="w-full py-3.5 px-5 bg-stone-900 text-white rounded-2xl font-semibold text-sm group-hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md cursor-pointer"
            >
              <span>Explore Commercial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Trust & Transparency Note */}
      <div className="mt-12 text-center text-xs text-stone-500 font-light max-w-lg mx-auto">
        <span>Zero owner brokerage</span>
        <span aria-hidden="true" className="mx-2">&bull;</span>
        <span>Standardized legal digital agreements</span>
        <span aria-hidden="true" className="mx-2">&bull;</span>
        <span>DPDP Act 2023 protected</span>
      </div>
    </div>
  );
};
