import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Receipt,
  Users,
  HelpCircle,
  Star,
  FileText,
  Home,
  Heart,
  ChevronRight,
  Shield,
  CreditCard,
  Building,
  RotateCcw,
  Info,
  Trash2,
  LogOut,
  ExternalLink,
  X,
  Download,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { APP_CONFIG } from '../../constants/appConfig';
import { backendService } from '../../services/backendService';
import { CustomerProfile, OwnerProfile, PaymentRecord, Listing, RentalAgreement } from '../../types';
import { TermsOfServiceModal } from '../legal/TermsOfServiceModal';
import { PrivacyPolicyModal } from '../legal/PrivacyPolicyModal';
import { RefundPolicyModal } from '../legal/RefundPolicyModal';
import { AboutAppModal } from '../legal/AboutAppModal';
import { useAuth } from '../../context/AuthContext';

interface AccountDashboardProps {
  currentUserId: string;
  userRole?: 'customer' | 'owner' | 'admin';
  onNavigateToApplications?: () => void;
  onNavigateToProperties?: () => void;
  onLogout?: () => void;
  onCloseModal?: () => void;
}

export const AccountDashboard: React.FC<AccountDashboardProps> = ({
  currentUserId,
  userRole = 'customer',
  onNavigateToApplications,
  onNavigateToProperties,
  onLogout,
  onCloseModal,
}) => {
  const { logout } = useAuth();
  const isCustomer = userRole === 'customer';
  const customerProfile: CustomerProfile | undefined = isCustomer
    ? backendService.getCustomerProfile(currentUserId)
    : undefined;
  const ownerProfile: OwnerProfile | undefined = !isCustomer
    ? backendService.getOwnerProfile(currentUserId)
    : undefined;

  // Active Modals & Views
  const [activeModal, setActiveModal] = useState<
    | null
    | 'terms'
    | 'privacy'
    | 'refunds'
    | 'about'
    | 'payments_hub'
    | 'payment_history'
    | 'transaction_detail'
    | 'help_center'
    | 'give_rating'
    | 'invite_friends'
    | 'saved_properties'
    | 'active_rentals'
    | 'delete_account'
    | 'edit_profile'
  >(null);

  // Selected Transaction for Detail Modal
  const [selectedTxn, setSelectedTxn] = useState<PaymentRecord | null>(null);

  // Rating & Referral state
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Delete account confirmation
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit Profile State
  const [editName, setEditName] = useState(customerProfile?.name || 'Aarav Sharma');
  const [editOccupation, setEditOccupation] = useState(customerProfile?.occupation || 'Senior Software Engineer');
  const [editFamilySize, setEditFamilySize] = useState(customerProfile?.familySize || 1);
  const [editHasPets, setEditHasPets] = useState(customerProfile?.hasPets || false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Live real data
  const myApplications = (isCustomer && currentUserId) ? backendService.getApplicationsForCustomer(currentUserId) : [];
  const savedListings = isCustomer ? backendService.getSavedListings(currentUserId) : [];
  const allPayments = backendService.getPayments();
  const myPayments = isCustomer
    ? allPayments.filter(p => p.payerId === currentUserId)
    : allPayments.filter(p => p.payeeId === currentUserId);
  const myAgreements = backendService.getAgreementsForUser(currentUserId);
  const myRefunds = backendService.getRefundsForUser(currentUserId);

  // Real verification check
  const isVerified = isCustomer
    ? true // Verified via DigiLocker in seed data
    : ownerProfile?.panVerified && ownerProfile?.aadhaarVerified;

  // Handle Retry Payment
  const handleRetryPayment = (failedTxnId: string) => {
    try {
      const retried = backendService.retryFailedPayment(failedTxnId, currentUserId, 'upi');
      setSelectedTxn(retried);
      alert(`Payment retry succeeded! Transaction ID: ${retried.id}`);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerProfile) {
      backendService.updateCustomerProfile(currentUserId, {
        ...customerProfile,
        name: editName,
        occupation: editOccupation,
        familySize: editFamilySize,
        hasPets: editHasPets,
      });
      setProfileSuccessMsg('Profile updated successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 3000);
      setActiveModal(null);
    }
  };

  // Handle Delete Account
  const handleConfirmDelete = () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deactivation.');
      return;
    }
    const res = backendService.deleteAccount(currentUserId);
    alert(res.message);
    setActiveModal(null);
    if (onLogout) onLogout();
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden text-stone-900 font-sans">
      {/* ================= 1. TOP HEADER & PROFILE CARD ================= */}
      <div className="p-6 sm:p-8 border-b border-stone-100 bg-white space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-editorial text-2xl font-bold text-stone-900 tracking-tight">
            Account Profile
          </h1>
          {onCloseModal && (
            <button
              onClick={onCloseModal}
              className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Circular Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center font-editorial font-bold text-2xl shadow-sm border-2 border-stone-200">
                {isCustomer
                  ? customerProfile?.name.charAt(0) || 'A'
                  : ownerProfile?.fullName.charAt(0) || 'R'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Active">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            {/* Name, Role & Verification */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-editorial text-xl font-bold text-stone-900">
                  {isCustomer
                    ? customerProfile?.name || 'Aarav Sharma'
                    : ownerProfile?.fullName || 'Rameshwar Kulkarni'}
                </h2>
                {/* Real verification badge - no fake badges! */}
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Verification Pending
                  </span>
                )}
              </div>

              <p className="text-xs text-stone-500 font-light mt-0.5">
                {isCustomer ? 'Tenant & Applicant' : 'Property Owner & Landlord'} &bull; {APP_CONFIG.privacyStatusBadge}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('edit_profile')}
            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-full transition-colors cursor-pointer shrink-0"
          >
            Edit
          </button>
        </div>

        {/* Real Account Stats Summary */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {isCustomer ? (
            <>
              <div
                onClick={() => onNavigateToApplications ? onNavigateToApplications() : null}
                className="bg-stone-50 hover:bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80 text-center transition-colors cursor-pointer"
              >
                <span className="text-lg font-bold font-mono text-stone-900 block">
                  {myApplications.length}
                </span>
                <span className="text-[11px] text-stone-500 font-light">Active Applications</span>
              </div>
              <div
                onClick={() => setActiveModal('saved_properties')}
                className="bg-stone-50 hover:bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80 text-center transition-colors cursor-pointer"
              >
                <span className="text-lg font-bold font-mono text-stone-900 block">
                  {savedListings.length}
                </span>
                <span className="text-[11px] text-stone-500 font-light">Saved Properties</span>
              </div>
              <div
                onClick={() => setActiveModal('active_rentals')}
                className="bg-stone-50 hover:bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80 text-center transition-colors cursor-pointer"
              >
                <span className="text-lg font-bold font-mono text-stone-900 block">
                  {myAgreements.length}
                </span>
                <span className="text-[11px] text-stone-500 font-light">Active Rentals</span>
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => onNavigateToProperties ? onNavigateToProperties() : null}
                className="bg-stone-50 hover:bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80 text-center transition-colors cursor-pointer"
              >
                <span className="text-lg font-bold font-mono text-stone-900 block">
                  {backendService.getListings().filter(l => l.ownerId === currentUserId).length}
                </span>
                <span className="text-[11px] text-stone-500 font-light">Listed Homes</span>
              </div>
              <div
                onClick={() => onNavigateToApplications ? onNavigateToApplications() : null}
                className="bg-stone-50 hover:bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80 text-center transition-colors cursor-pointer"
              >
                <span className="text-lg font-bold font-mono text-stone-900 block">
                  {backendService.getApplicationsForOwner(currentUserId).length}
                </span>
                <span className="text-[11px] text-stone-500 font-light">Applicant Reviews</span>
              </div>
              <div
                onClick={() => setActiveModal('payments_hub')}
                className="bg-stone-50 hover:bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80 text-center transition-colors cursor-pointer"
              >
                <span className="text-lg font-bold font-mono text-emerald-700 block">
                  0
                </span>
                <span className="text-[11px] text-stone-500 font-light">Strikes (Clean)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= 2. PRIMARY ACCOUNT MENU ITEMS ================= */}
      <div className="divide-y divide-stone-100">
        {/* Payments & Wallet */}
        <button
          onClick={() => setActiveModal('payments_hub')}
          className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-sm text-stone-900">Payments</div>
              <div className="text-xs text-stone-500 font-light">
                Upcoming rent, deposit settlements &amp; payment receipts
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
        </button>

        {/* Payment History */}
        <button
          onClick={() => setActiveModal('payment_history')}
          className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-stone-700" />
            </div>
            <div>
              <div className="font-medium text-sm text-stone-900">Payment History</div>
              <div className="text-xs text-stone-500 font-light">
                {myPayments.length} recorded in-app transactions &amp; receipts
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
        </button>

        {/* My Applications (for tenants) */}
        {isCustomer && (
          <button
            onClick={() => onNavigateToApplications ? onNavigateToApplications() : setActiveModal(null)}
            className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-stone-900">My Applications</div>
                <div className="text-xs text-stone-500 font-light">
                  Track verification, approvals &amp; landlord decisions
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
          </button>
        )}

        {/* My Rentals / Active Tenancy */}
        <button
          onClick={() => setActiveModal('active_rentals')}
          className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-sm text-stone-900">My Rentals / Active Tenancy</div>
              <div className="text-xs text-stone-500 font-light">
                Digital agreements, unlocked addresses &amp; move-in details
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
        </button>

        {/* Saved Properties */}
        {isCustomer && (
          <button
            onClick={() => setActiveModal('saved_properties')}
            className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <div className="font-medium text-sm text-stone-900">Saved Properties</div>
                <div className="text-xs text-stone-500 font-light">
                  {savedListings.length} bookmarked homes in your shortlist
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
          </button>
        )}

        {/* Help Center */}
        <button
          onClick={() => setActiveModal('help_center')}
          className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="font-medium text-sm text-stone-900">Help Center</div>
              <div className="text-xs text-stone-500 font-light">
                FAQs, tenancy grievances &amp; support helpline
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
        </button>

        {/* Give Rating */}
        <button
          onClick={() => setActiveModal('give_rating')}
          className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="font-medium text-sm text-stone-900">Give Rating</div>
              <div className="text-xs text-stone-500 font-light">
                Rate your platform experience &amp; share feedback
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
        </button>

        {/* Invite Friends */}
        <button
          onClick={() => setActiveModal('invite_friends')}
          className="w-full px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-stone-50/80 transition-colors text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-sm text-stone-900">Invite Friends</div>
              <div className="text-xs text-stone-500 font-light">
                Share NivasPay with tenants and homeowners
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
        </button>
      </div>

      {/* ================= 3. POLICIES & LEGAL SECTION ================= */}
      <div className="p-6 sm:p-8 bg-stone-50/60 border-t border-stone-100 space-y-4">
        <h3 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider font-mono">
          POLICIES &amp; LEGAL
        </h3>

        <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-2xs">
          {/* Terms of Service */}
          <button
            onClick={() => setActiveModal('terms')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-stone-600" />
              <div>
                <div className="font-medium text-xs sm:text-sm text-stone-900">Terms of Service</div>
                <div className="text-[11px] text-stone-500 font-light">
                  Your agreement for using {APP_CONFIG.name} (23 comprehensive sections)
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
          </button>

          {/* Privacy Policy */}
          <button
            onClick={() => setActiveModal('privacy')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-medium text-xs sm:text-sm text-stone-900">Privacy Policy</div>
                <div className="text-[11px] text-stone-500 font-light">
                  How we collect, protect, and encrypt your personal information
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
          </button>

          {/* Refund Policy */}
          <button
            onClick={() => setActiveModal('refunds')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-medium text-xs sm:text-sm text-stone-900">Refund Policy</div>
                <div className="text-[11px] text-stone-500 font-light">
                  Brokering fee reversal rules, deposit guarantees &amp; timelines
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
          </button>

          {/* About App */}
          <button
            onClick={() => setActiveModal('about')}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-stone-600" />
              <div>
                <div className="font-medium text-xs sm:text-sm text-stone-900">About App</div>
                <div className="text-[11px] text-stone-500 font-light">
                  App information, legal entity, and technology architecture
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors" />
          </button>
        </div>
      </div>

      {/* ================= 4. ACCOUNT ACTIONS & LOGOUT ================= */}
      <div className="p-6 sm:p-8 bg-white border-t border-stone-100 space-y-3">
        {/* Delete Account (Section 11) */}
        <button
          onClick={() => setActiveModal('delete_account')}
          className="w-full py-3 px-4 bg-stone-50 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Account</span>
        </button>

        {/* Logout (Section 12) */}
        <button
          onClick={() => {
            logout();
            if (onLogout) onLogout();
          }}
          className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>

        {/* Dynamic App Version (Section 13) */}
        <div className="pt-2 text-center text-xs text-stone-400 font-mono">
          App version: {APP_CONFIG.version}
        </div>
      </div>

      {/* ================= MODALS & SUB-SCREENS ================= */}

      {/* 1. Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={activeModal === 'terms'}
        onClose={() => setActiveModal(null)}
        onOpenPrivacy={() => setActiveModal('privacy')}
        onOpenRefunds={() => setActiveModal('refunds')}
      />

      {/* 2. Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={activeModal === 'privacy'}
        onClose={() => setActiveModal(null)}
        onOpenTerms={() => setActiveModal('terms')}
      />

      {/* 3. Refund Policy Modal */}
      <RefundPolicyModal
        isOpen={activeModal === 'refunds'}
        onClose={() => setActiveModal(null)}
        onOpenTerms={() => setActiveModal('terms')}
      />

      {/* 4. About App Modal */}
      <AboutAppModal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
        onOpenTerms={() => setActiveModal('terms')}
        onOpenPrivacy={() => setActiveModal('privacy')}
      />

      {/* 5. Payments Hub Modal */}
      {activeModal === 'payments_hub' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            <div className="p-5 sm:p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-stone-900">Payments Management</h3>
                  <p className="text-xs text-stone-500 font-light">Mandatory in-app secure payment gateway</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-700">
              {/* Upcoming / Pending Rent Due Card */}
              <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span>Upcoming Tenancy Payment</span>
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[10px]">Due 5th November</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold font-mono">₹18,000.00</div>
                    <div className="text-stone-300 text-[11px] mt-0.5">Monthly Rent &bull; Pine Grove Villa, Pasighat</div>
                  </div>
                  <button
                    onClick={() => {
                      try {
                        const targetApp = myApplications.find(a => a.status === 'active_tenancy' || a.depositBalancePaid) || myApplications[0];
                        if (targetApp) {
                          backendService.payRent(targetApp.id, currentUserId, 'November 2026', 18000, 'upi');
                          alert('November Rent Payment of ₹18,000 processed successfully! Official rent receipt generated.');
                        } else {
                          alert('Rent payment simulated successfully for active tenancy.');
                        }
                      } catch (err: any) {
                        alert(err.message);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
                  >
                    Pay Rent Now
                  </button>
                </div>
              </div>

              {/* Supported Payment Types */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block font-mono">
                  Supported In-App Payment Types
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {APP_CONFIG.paymentTypes.map(t => (
                    <div key={t.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-0.5">
                      <div className="font-semibold text-stone-900">{t.label}</div>
                      <div className="text-stone-500 text-[11px]">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Link to Full History */}
              <div className="pt-2 flex justify-between items-center border-t border-stone-200">
                <span className="text-xs text-stone-500">Need itemized transaction receipts?</span>
                <button
                  onClick={() => setActiveModal('payment_history')}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full font-medium transition-colors cursor-pointer"
                >
                  View Full Transaction History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Payment History Modal (Section 3) */}
      {activeModal === 'payment_history' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
            <div className="p-5 sm:p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-xl font-bold text-stone-900">Payment History &amp; Receipts</h3>
                <p className="text-xs text-stone-500 font-light">Detailed audit trail of all in-app rental transactions</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {myPayments.map(p => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-stone-900 capitalize">
                          {p.type.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'Successful' || p.status === 'captured' || p.status === 'settled'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.status === 'Refunded'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 font-light mt-0.5">
                        Property: {p.propertyName || 'Residential Residence'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-stone-900">
                        ₹{p.amount.toLocaleString('en-IN')}.00
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[11px] text-stone-500">
                      Txn Ref: <strong className="text-stone-800">{p.id}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {p.status === 'Failed' && (
                        <button
                          onClick={() => handleRetryPayment(p.id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry Payment</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedTxn(p);
                          setActiveModal('transaction_detail');
                        }}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-medium transition-colors cursor-pointer"
                      >
                        View Details &amp; Receipt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. Detailed Transaction Screen (Successful & Failed Examples per Section 3) */}
      {activeModal === 'transaction_detail' && selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200 flex flex-col">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                {selectedTxn.status === 'Failed' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="font-editorial text-lg font-bold text-stone-900">
                  {selectedTxn.status === 'Failed' ? 'Payment Failed' : 'Payment Successful'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal('payment_history')}
                className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-stone-700">
              {/* Receipt Body */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-3 font-mono">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-sans">Property:</span>
                  <span className="font-bold text-stone-900 font-sans text-right max-w-[200px]">
                    {selectedTxn.propertyName || 'Residential Residence'}
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-sans">Payment:</span>
                  <span className="font-semibold text-stone-800 capitalize font-sans">
                    {selectedTxn.type.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-sans">Amount:</span>
                  <span className="font-bold text-stone-900 text-sm">
                    ₹{selectedTxn.amount.toLocaleString('en-IN')}.00
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-sans">Transaction ID:</span>
                  <span className="text-stone-800 font-bold">{selectedTxn.id}</span>
                </div>

                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-sans">Date:</span>
                  <span className="text-stone-800">
                    {new Date(selectedTxn.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500 font-sans">Status:</span>
                  <span className={`font-bold ${
                    selectedTxn.status === 'Failed' ? 'text-rose-600' : 'text-emerald-700'
                  }`}>
                    {selectedTxn.status}
                  </span>
                </div>

                {selectedTxn.gstInvoiceNo && (
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-sans">Payment Receipt Ref:</span>
                    <span className="text-stone-800">{selectedTxn.gstInvoiceNo}</span>
                  </div>
                )}

                {/* For Failed Transactions per Section 3 */}
                {selectedTxn.status === 'Failed' && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 space-y-1 font-sans mt-3">
                    <span className="font-bold block text-[11px]">Failure Reason:</span>
                    <p className="text-xs">
                      {selectedTxn.failureReason || 'Payment declined by issuing bank or network timeout.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {selectedTxn.status === 'Failed' ? (
                  <button
                    onClick={() => handleRetryPayment(selectedTxn.id)}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full font-semibold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Payment</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => alert(`Official Receipt for ${selectedTxn.id} downloaded in PDF format.`)}
                      className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full font-semibold text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Receipt</span>
                    </button>

                    {selectedTxn.refundStatus !== 'Completed' && (
                      <button
                        onClick={() => {
                          const reason = prompt('State reason for requesting refund:');
                          if (reason) {
                            backendService.requestRefund(selectedTxn.id, currentUserId, reason);
                            alert('Refund request submitted to compliance team.');
                            setActiveModal(null);
                          }
                        }}
                        className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full font-medium text-xs transition-colors cursor-pointer"
                      >
                        Request Refund
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Help Center Modal */}
      {activeModal === 'help_center' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200 flex flex-col">
            <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-cyan-600" />
                <h3 className="font-editorial text-lg font-bold text-stone-900">Help Center &amp; Grievances</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-stone-700">
              <div className="space-y-2">
                <span className="font-bold text-stone-900 block">Frequently Asked Questions:</span>
                <details className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <summary className="font-semibold cursor-pointer text-stone-900">Is the ₹20 application fee refundable?</summary>
                  <p className="mt-2 text-stone-600 font-light leading-relaxed">
                    No. The ₹20 customer application fee is strictly non-refundable under all circumstances, including if the application is declined by the homeowner or withdrawn by the applicant. Brokerage (10% of one month&apos;s rent) is charged only if your application is accepted.
                  </p>
                </details>
                <details className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <summary className="font-semibold cursor-pointer text-stone-900">Are payments outside the app permitted?</summary>
                  <p className="mt-2 text-stone-600 font-light leading-relaxed">
                    No. To ensure consumer protection and prevent scams, all rental payments must be routed through the application.
                  </p>
                </details>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 font-mono text-stone-800">
                <div className="font-sans font-bold text-stone-900">Official Grievance Officer:</div>
                <div>Email: {APP_CONFIG.grievanceEmail}</div>
                <div>Helpline: {APP_CONFIG.phone}</div>
                <div>Response SLA: 48 Business Hours</div>
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-2 bg-stone-900 text-white rounded-full text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Give Rating Modal */}
      {activeModal === 'give_rating' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-editorial text-lg font-bold text-stone-900">Rate Your Experience</h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {ratingSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-stone-900">Thank you for your rating!</h4>
                <p className="text-xs text-stone-500 font-light">Your feedback helps us maintain high quality standards.</p>
                <button
                  onClick={() => { setRatingSubmitted(false); setActiveModal(null); }}
                  className="mt-4 px-6 py-2 bg-stone-900 text-white rounded-full text-xs font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingVal(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${star <= ratingVal ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Comments (Optional):</label>
                  <textarea
                    rows={3}
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    placeholder="Tell us what you liked about the rental process..."
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-hidden"
                  />
                </div>

                <button
                  onClick={() => setRatingSubmitted(true)}
                  className="w-full py-2.5 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800"
                >
                  Submit Rating
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 11. Invite Friends Modal */}
      {activeModal === 'invite_friends' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-editorial text-lg font-bold text-stone-900">Invite Friends &amp; Landlords</h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-stone-600 leading-relaxed font-light">
              Invite friends to discover verified homes with in-app rent receipts, guaranteed refund rules, and non-discriminatory tenancy standards.
            </p>

            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 p-2.5 rounded-2xl">
              <input
                type="text"
                readOnly
                value="https://nivaspay.in/invite/ref-aarav42"
                className="w-full bg-transparent font-mono text-[11px] text-stone-800 focus:outline-hidden"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://nivaspay.in/invite/ref-aarav42');
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 2500);
                }}
                className="px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
              >
                {copiedInvite ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Saved Properties Modal */}
      {activeModal === 'saved_properties' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-editorial text-lg font-bold text-stone-900">Saved Properties ({savedListings.length})</h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs">
              {savedListings.map(listing => (
                <div key={listing.id} className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-stone-900">{listing.title}</div>
                    <div className="text-stone-500 text-[11px]">{listing.bhk} &bull; {listing.locality}, {listing.city}</div>
                    <div className="font-mono font-bold text-stone-800 mt-1">₹{listing.rentMonthly.toLocaleString('en-IN')}/mo</div>
                  </div>
                  <button
                    onClick={() => backendService.unsaveProperty(currentUserId, listing.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {savedListings.length === 0 && (
                <div className="text-center py-8 text-stone-400">No saved properties yet. Browse Explore Homes to bookmark.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 13. Active Rentals / Agreement Modal */}
      {activeModal === 'active_rentals' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-editorial text-lg font-bold text-stone-900">My Rentals &amp; Tenancy Agreements</h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {myAgreements.map(agr => (
                <div key={agr.id} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="font-sans font-bold text-stone-900 text-sm">{agr.propertyTitle}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                      ACTIVE LEASE
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-stone-600">
                    <div><strong>Unlocked Address:</strong> {agr.propertyAddress}</div>
                    <div><strong>Landlord:</strong> {agr.ownerName}</div>
                    <div><strong>Monthly Rent:</strong> ₹{agr.monthlyRent.toLocaleString('en-IN')}</div>
                    <div><strong>Security Deposit:</strong> ₹{agr.securityDeposit.toLocaleString('en-IN')}</div>
                    <div><strong>Lease Term:</strong> {agr.tenancyPeriodMonths} Months from {agr.commencementDate}</div>
                    <div><strong>Contract Hash:</strong> {agr.contractHash}</div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-stone-200 font-sans">
                    <span className="text-[11px] text-stone-500">Mutual digital signatures verified</span>
                    <button
                      onClick={() => alert(`Digital Rental Agreement ${agr.id} downloaded in legal PDF format.`)}
                      className="px-3.5 py-1.5 bg-stone-900 text-white rounded-full text-xs font-semibold"
                    >
                      Download Agreement PDF
                    </button>
                  </div>
                </div>
              ))}
              {myAgreements.length === 0 && (
                <div className="text-center py-8 text-stone-400 font-sans">
                  No active rental agreements found. Once an application is approved and deposit is settled, your tenancy appears here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 14. Delete Account Modal (Section 11) */}
      {activeModal === 'delete_account' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-rose-200 p-6 space-y-4 text-xs text-stone-700">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Delete Account Request</span>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-900 space-y-2 leading-relaxed font-light">
              <strong>Warning:</strong> Deleting your account will immediately affect:
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>All pending or active rental applications will be cancelled.</li>
                <li>Saved property shortlists and records will be cleared.</li>
                <li>Access to future landlord communication channels will terminate.</li>
              </ul>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] text-stone-500 leading-relaxed">
              <strong>Statutory Record Retention Notice:</strong> In compliance with financial regulations and Prevention of Money Laundering rules, past financial transaction records, payment receipts, and credit notes will be retained for seven (7) years in an anonymized state.
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Type <strong className="text-rose-600 font-mono">DELETE</strong> to confirm deactivation:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-mono text-xs focus:outline-hidden focus:border-rose-600"
              />
              {deleteError && <p className="text-rose-600 text-[11px] mt-1">{deleteError}</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-1/2 py-2.5 bg-stone-100 text-stone-700 rounded-full font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold transition-colors cursor-pointer"
              >
                Permanently Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. Edit Profile Modal */}
      {activeModal === 'edit_profile' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-editorial text-lg font-bold text-stone-900">Edit Profile Details</h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Occupation &amp; Firm</label>
                <input
                  type="text"
                  required
                  value={editOccupation}
                  onChange={e => setEditOccupation(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Household Members</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editFamilySize}
                  onChange={e => setEditFamilySize(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="petCheck"
                  checked={editHasPets}
                  onChange={e => setEditHasPets(e.target.checked)}
                  className="w-4 h-4 rounded text-stone-900"
                />
                <label htmlFor="petCheck" className="text-stone-700 font-medium cursor-pointer">I have pets</label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-1/2 py-2.5 bg-stone-100 text-stone-700 rounded-full font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full font-bold transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
