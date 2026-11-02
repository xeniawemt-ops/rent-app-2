import React from 'react';
import { X, Info, ShieldCheck, Smartphone, Landmark, Heart } from 'lucide-react';
import { APP_CONFIG } from '../../constants/appConfig';

interface AboutAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const AboutAppModal: React.FC<AboutAppModalProps> = ({
  isOpen,
  onClose,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center font-editorial font-bold text-xl shadow-xs">
              N
            </div>
            <div>
              <h2 className="font-editorial text-xl font-bold text-stone-900">
                About {APP_CONFIG.name}
              </h2>
              <p className="text-xs text-stone-500 font-light mt-0.5">
                {APP_CONFIG.tagline}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-stone-700 text-xs sm:text-sm space-y-5 leading-relaxed font-light">
          <div className="space-y-2">
            <h3 className="font-editorial text-base font-bold text-stone-900">Platform Mission</h3>
            <p>
              {APP_CONFIG.name} is a modern residential tenancy marketplace connecting property owners and tenants across India with transparent verified listings, in-app digital payments, automated refund processing, and strict anti-discrimination safeguards.
            </p>
          </div>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 font-mono text-xs">
            <div className="flex justify-between border-b border-stone-200/80 pb-1.5">
              <span className="text-stone-500">Application Version:</span>
              <span className="font-bold text-stone-900">{APP_CONFIG.version}</span>
            </div>
            <div className="flex justify-between border-b border-stone-200/80 pb-1.5">
              <span className="text-stone-500">Legal Entity:</span>
              <span className="font-medium text-stone-900">{APP_CONFIG.legalName}</span>
            </div>
            <div className="flex justify-between border-b border-stone-200/80 pb-1.5">
              <span className="text-stone-500">Jurisdiction:</span>
              <span className="text-stone-900">{APP_CONFIG.governingLaw}</span>
            </div>
            <div className="flex justify-between border-b border-stone-200/80 pb-1.5">
              <span className="text-stone-500">Payment Gateway:</span>
              <span className="text-stone-900">Razorpay / NPCI UPI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Privacy Standard:</span>
              <span className="text-emerald-700 font-semibold">{APP_CONFIG.privacyStatusBadge}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs pt-2">
            {onOpenTerms && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTerms();
                }}
                className="text-stone-700 hover:text-stone-900 underline underline-offset-2 cursor-pointer"
              >
                Terms of Service
              </button>
            )}
            <span>&bull;</span>
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacy();
                }}
                className="text-stone-700 hover:text-stone-900 underline underline-offset-2 cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/90 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
