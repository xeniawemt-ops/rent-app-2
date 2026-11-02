import React from 'react';
import { Home, Building2, ArrowLeftRight } from 'lucide-react';
import { MainAppSection } from '../../App';

interface ModeSwitcherProps {
  currentSection: 'customer_app' | 'owner_app';
  onSwitchMode: (target: 'customer_app' | 'owner_app') => void;
  variant?: 'light' | 'dark';
}

/**
 * Mode Switcher Component
 * Enables dual-role users (holding both customer and owner capabilities)
 * to instantly toggle their perspective between renting and property management
 * without terminating their session or re-authenticating.
 */
export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  currentSection,
  onSwitchMode,
  variant = 'light',
}) => {
  const isOwner = currentSection === 'owner_app';
  const isDarkVariant = variant === 'dark';

  return (
    <div
      role="group"
      aria-label="Account Perspective Mode Switcher"
      className={`inline-flex items-center p-1 rounded-full border transition-all duration-200 select-none shadow-xs ${
        isDarkVariant
          ? 'bg-stone-800/90 border-stone-700/80 text-stone-300'
          : 'bg-stone-100/90 border-stone-200/90 text-stone-700'
      }`}
    >
      {/* Visual Role Switch Indicator */}
      <span className="hidden xl:flex items-center gap-1 pl-2.5 pr-1.5 text-[10px] font-mono uppercase tracking-wider text-stone-400">
        <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
        <span>Mode:</span>
      </span>

      {/* Tenant / Renting Perspective */}
      <button
        type="button"
        onClick={() => {
          if (currentSection !== 'customer_app') {
            onSwitchMode('customer_app');
          }
        }}
        aria-pressed={!isOwner}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
          !isOwner
            ? isDarkVariant
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-950 text-white shadow-xs'
            : isDarkVariant
            ? 'text-stone-400 hover:text-white hover:bg-stone-700/60'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
        }`}
        title="Switch to Tenant Perspective (Browse Homes, Applications, Leases)"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Rent</span>
      </button>

      {/* Owner / Management Perspective */}
      <button
        type="button"
        onClick={() => {
          if (currentSection !== 'owner_app') {
            onSwitchMode('owner_app');
          }
        }}
        aria-pressed={isOwner}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
          isOwner
            ? isDarkVariant
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-950 text-white shadow-xs'
            : isDarkVariant
            ? 'text-stone-400 hover:text-white hover:bg-stone-700/60'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
        }`}
        title="Switch to Property Owner Portal (Dashboard, Units, Tenant Screening)"
      >
        <Building2 className="w-3.5 h-3.5" />
        <span>Manage</span>
      </button>
    </div>
  );
};
