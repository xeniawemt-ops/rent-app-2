import React from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  Lock,
  KeyRound,
  EyeOff,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { APP_CONFIG } from '../../constants/appConfig';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerms?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
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
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-editorial text-xl sm:text-2xl font-bold text-stone-900">
                Privacy Policy
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-500 font-light mt-0.5">
                <span>{APP_CONFIG.name}</span>
                <span>&bull;</span>
                <span className="font-mono text-[11px] bg-stone-200 px-2 py-0.5 rounded-full text-stone-700">
                  Version {APP_CONFIG.version}
                </span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-medium">{APP_CONFIG.privacyStatusBadge}</span>
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
          {/* Security Banner */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-2">
            <div className="font-semibold text-stone-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Privacy &amp; Data Security Architecture</span>
            </div>
            <p className="text-stone-600 leading-relaxed font-light">
              {APP_CONFIG.name} is engineered to protect user privacy through least-privilege data access, field-level encryption, and strict role-based isolation. We only collect personal information that is strictly necessary for legitimate rental applications, identity verification, and payment processing.
            </p>
          </div>

          {/* Section 1: Information We Collect */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">1</span>
              Information We Collect
            </h3>
            <p>We collect information you directly provide when using the platform:</p>
            <ul className="list-disc pl-5 space-y-1 text-stone-600">
              <li><strong>Contact &amp; Account Information:</strong> Full name, phone number, email address, and profile photo.</li>
              <li><strong>Verification Credentials:</strong> Government identity numbers (PAN, DigiLocker Aadhaar tokens) processed via authorized verification partners.</li>
              <li><strong>Tenancy Application Data:</strong> Occupation, employer/firm name, family size, pet status, and preferred move-in dates.</li>
              <li><strong>Financial &amp; Transaction Data:</strong> Transaction IDs, payment amounts, GST invoice numbers, bank account numbers (masked), and UPI virtual payment addresses (VPAs).</li>
            </ul>
          </section>

          {/* Section 2: Address & Identity Masking Safeguards */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">2</span>
              Address &amp; Contact Masking Safeguards
            </h3>
            <p>
              To protect property owners and prevent unsolicited door-to-door visits, exact door numbers, building names, and owner personal phone numbers remain <strong>strictly masked and encrypted</strong> in public listings.
            </p>
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-2 font-mono">
              <div className="text-stone-500">Public Exploration View:</div>
              <div className="text-stone-900 font-semibold bg-white p-2.5 rounded-lg border border-stone-200">
                &quot;Near Ganga Lake viewpoint corridor, Chandranagar, Itanagar (Full address unlocked post-deposit confirmation)&quot;
              </div>
              <div className="text-[11px] text-stone-500">
                The exact street address is decrypted and unlocked only after the tenant&apos;s rental application is approved and the security deposit is confirmed.
              </div>
            </div>
          </section>

          {/* Section 3: Field-Level Encryption & Storage */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">3</span>
              Field-Level Encryption &amp; Security
            </h3>
            <p>
              Sensitive data attributes (such as full property addresses and identity tokens) are encrypted at the field level using authenticated <strong>AES-256-GCM</strong> encryption. We never store raw credit card numbers or CVV codes.
            </p>
          </section>

          {/* Section 4: Data Retention & Account Deletion */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">4</span>
              Data Retention &amp; Right to Delete
            </h3>
            <p>
              Users may request account deletion at any time via the Profile screen. Upon deletion:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-600">
              <li>Active rental applications, saved properties, and communication records are permanently erased or deactivated.</li>
              <li>Financial transactions, payment reference IDs, GST tax invoices, and credit notes are retained for seven (7) years solely for statutory tax and accounting audits as required by Indian financial law.</li>
              <li>All personal profile identifiers are irreversibly anonymized.</li>
            </ul>
          </section>

          {/* Section 5: Grievance Officer */}
          <section className="space-y-2">
            <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold">5</span>
              Grievance Officer &amp; Inquiries
            </h3>
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-1 font-mono text-stone-800">
              <div><strong>Designation:</strong> Data Protection &amp; Grievance Officer</div>
              <div><strong>Email:</strong> {APP_CONFIG.grievanceEmail}</div>
              <div><strong>Response SLA:</strong> Within 48 business hours</div>
              <div><strong>Company:</strong> {APP_CONFIG.legalName}</div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/90 flex items-center justify-between">
          {onOpenTerms && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTerms();
              }}
              className="text-xs text-stone-600 hover:text-stone-900 underline underline-offset-2 cursor-pointer"
            >
              View Terms of Service
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-medium transition-colors cursor-pointer shadow-xs ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
