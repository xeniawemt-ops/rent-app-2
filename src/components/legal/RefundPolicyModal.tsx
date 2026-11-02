import React from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  BadgeAlert,
  Percent,
  CreditCard,
  Building,
  Info,
  ShieldCheck
} from 'lucide-react';
import { APP_CONFIG } from '../../constants/appConfig';

interface RefundPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerms?: () => void;
}

export const RefundPolicyModal: React.FC<RefundPolicyModalProps> = ({
  isOpen,
  onClose,
  onOpenTerms,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 bg-stone-50/90 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-stone-900">
                Refund Policy
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-light mt-0.5">
                <span>{APP_CONFIG.name}</span>
                <span>&bull;</span>
                <span className="font-mono text-[11px] bg-stone-200 px-2 py-0.5 rounded-full text-stone-700">
                  Version {APP_CONFIG.version}
                </span>
                <span>&bull;</span>
                <span>Effective {APP_CONFIG.lastUpdated}</span>
              </div>
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
        <div className="p-6 sm:p-8 overflow-y-auto text-stone-700 text-xs sm:text-sm space-y-6 leading-relaxed font-light">
          {/* Important Highlight */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2">
            <div className="font-semibold text-emerald-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Transparent &amp; Structured Refund Architecture
            </div>
            <p className="text-emerald-900 leading-relaxed font-light">
              At {APP_CONFIG.name}, refund eligibility is strictly defined by transaction type, contractual milestones, and verified business rules. We do not make generic claims that every payment is automatically refundable without contractual justification. All eligible refunds are recorded, audited, and processed via direct UPI or banking reversals.
            </p>
          </div>

          {/* 1. Customer Application Fee (Strictly Non-Refundable) */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">1</span>
              Customer Application Fee Policy (Strictly Non-Refundable)
            </h3>
            <p>
              When a prospective tenant submits a rental application, an Application Processing Fee of ₹20.00 is charged:
            </p>
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-3 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <div className="font-semibold text-rose-700">Non-Refundable under All Circumstances</div>
                  <p className="text-stone-600 text-[11px] mt-1 leading-relaxed">
                    The ₹20 fee is <strong>strictly non-refundable</strong>, including if the property owner declines the application, if the customer withdraws or cancels the application, or if the listing becomes unavailable.
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200">
                  <div className="font-semibold text-stone-900">No Conversion to Deposit, Rent, or Brokerage</div>
                  <p className="text-stone-600 text-[11px] mt-1 leading-relaxed">
                    The ₹20 fee covers tenant suitability evaluation and technical submission processing. It is never credited or converted toward rent, security deposit, or brokerage.
                  </p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-stone-200">
                <div className="font-semibold text-emerald-800">Brokerage (Applicable Only Upon Acceptance)</div>
                <p className="text-stone-600 text-[11px] mt-1 leading-relaxed">
                  If the homeowner accepts your application, brokerage equal to <strong>10% of one month&apos;s rent</strong> is payable. There is no customer platform fee after acceptance. Property owners do not pay brokerage.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Security Deposit Refund Guarantees */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">2</span>
              Security Deposit &amp; Full Rent Refund Guarantees
            </h3>
            <p>
              Final checkout payments (security deposit and advance rent) are subject to rigorous consumer protection covenants:
            </p>
            <ul className="space-y-2 text-xs text-stone-600 pl-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>100% Refund on Landlord Default:</strong> If the property owner fails to provide physical possession, cancels before move-in, or misrepresents key material facts, 100% of both the security deposit and rent are returned to the tenant immediately.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>24-Hour Settlement Inspection Window:</strong> Landlord bank settlement is scheduled with an automated 24-hour verification window following digital agreement signing. During this window, tenants may inspect property keys and report discrepancies before final bank transfer.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Vacation Deductions:</strong> Post move-in security deposit deductions for damages or unpaid utilities are strictly governed by the mutual rental agreement and state tenancy regulations.</span>
              </li>
            </ul>
          </section>

          {/* 3. Refund Lifecycle & System States */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">3</span>
              Recorded Refund States in Your Account
            </h3>
            <p>Every refund undergoes verifiable state progression recorded in your payment history:</p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono text-center">
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 block">State 1</span>
                <span className="font-bold text-amber-700 text-[11px]">Requested</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 block">State 2</span>
                <span className="font-bold text-blue-700 text-[11px]">Approved</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 block">State 3</span>
                <span className="font-bold text-purple-700 text-[11px]">Processing</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 block">State 4</span>
                <span className="font-bold text-emerald-700 text-[11px]">Completed</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 block">State 5</span>
                <span className="font-bold text-rose-700 text-[11px]">Rejected</span>
              </div>
            </div>
            <p className="text-stone-500 text-[11px]">
              For every refund, your account displays: Original Transaction ID, Refund Amount, Reason, Current Status, Timestamp, and Provider Reference Number (RRN).
            </p>
          </section>

          {/* 4. Credit Note & Refund Receipts */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">4</span>
              Digital Credit Notes &amp; Transaction Receipts
            </h3>
            <p>
              All refunded charges generate an official digital Credit Note (e.g. <code>CN-2026-NVSP-0044</code>) itemizing the transaction reversal. Users can download payment receipts and credit notes directly from the Payments dashboard.
            </p>
          </section>

          {/* 5. Processing Timelines */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">5</span>
              Refund Processing Timelines
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-stone-400 block text-[10px]">UPI Intent Reversals:</span>
                <span className="font-bold text-stone-900">Instant to 2 Hours</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-stone-400 block text-[10px]">NetBanking / IMPS:</span>
                <span className="font-bold text-stone-900">1 to 2 Banking Days</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-stone-400 block text-[10px]">Dispute Review SLA:</span>
                <span className="font-bold text-stone-900">Maximum 48 Hours</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-stone-500 font-light">
            Questions regarding refund status? Email <span className="font-mono text-stone-800">{APP_CONFIG.refundsEmail}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenTerms && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTerms();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-full text-xs font-medium transition-colors cursor-pointer"
              >
                View Terms of Service
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
