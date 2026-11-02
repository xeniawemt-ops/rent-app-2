import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Building2,
  FileCheck2,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Lock,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backendService';
import {
  Agency,
  AgencyStaffMember,
  PropertyAuthorization,
  BrokerLead,
  Listing,
} from '../../types';

interface BrokerPortalProps {
  onReturnHome: () => void;
}

export const BrokerPortal: React.FC<BrokerPortalProps> = ({ onReturnHome }) => {
  const { user, role, isAuthenticated, login, logout, openAuthModal } = useAuth();

  const isBrokerAdmin = user?.brokerMembership?.membershipRole === 'BROKER_ADMIN' || (user?.role as string) === 'broker_admin';
  const isBrokerStaff = user?.brokerMembership?.membershipRole === 'BROKER_STAFF' || (user?.role as string) === 'broker_staff';
  const isAuthorizedBroker =
    (user?.brokerMembership?.status === 'ACTIVE') ||
    isBrokerAdmin ||
    isBrokerStaff ||
    user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'listings' | 'leads' | 'staff' | 'authorizations' | 'commission'>('listings');
  const [agency, setAgency] = useState<Agency | undefined>(undefined);
  const [staffMembers, setStaffMembers] = useState<AgencyStaffMember[]>([]);
  const [authorizations, setAuthorizations] = useState<PropertyAuthorization[]>([]);
  const [leads, setLeads] = useState<BrokerLead[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [targetStaffUserId, setTargetStaffUserId] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Refresh portal data
  const loadPortalData = () => {
    if (user?.id) {
      const ag = backendService.getBrokerAgency(user.id);
      setAgency(ag);
      if (ag) {
        setStaffMembers(backendService.getBrokerStaff(ag.id));
        setAuthorizations(backendService.getPropertyAuthorizations(ag.id));
      }
      setListings(backendService.getBrokerListings(user.id));
      setLeads(backendService.getBrokerLeads(user.id));
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [user]);

  // Demo sign-in helpers for testing
  const handleDemoSignIn = async (roleType: 'broker_admin' | 'broker_staff') => {
    if (roleType === 'broker_admin') {
      await login('broker.admin@apexrealty.in', 'Pass@Nivas2026!', 'broker_admin');
    } else {
      await login('sonam.staff@apexrealty.in', 'Pass@Nivas2026!', 'broker_staff');
    }
  };

  // Lead assignment action
  const handleAssignLead = (leadId: string) => {
    if (!targetStaffUserId) return;
    const ok = backendService.assignBrokerLead(leadId, targetStaffUserId, user?.name || 'Broker Admin');
    if (ok) {
      setActionSuccessMsg('Lead successfully assigned to staff member.');
      setSelectedLeadId(null);
      setTargetStaffUserId('');
      loadPortalData();
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  if (!isAuthenticated || !isAuthorizedBroker) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
          <div className="bg-stone-900 px-6 sm:px-10 py-8 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-editorial tracking-tight">NivasPay Broker &amp; Agency Portal</h1>
                <p className="text-xs text-stone-300">Authorized Real Estate Brokerage &amp; Agency Workspace</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReturnHome}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-full cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </button>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Broker Authentication Required</p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  The Broker Portal is strictly restricted to registered real estate agencies and certified broker staff.
                  Broker accounts are distinct from individual property owners and prospective tenants.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Agency Administrator (Broker Admin)</span>
                </div>
                <p className="text-xs text-stone-600">
                  Manage agency profile, verify property-owner authorizations, supervise staff agents, and monitor closing commissions.
                </p>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('broker_admin')}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign In as Vikram Malhotra (Broker Admin)
                </button>
              </div>

              <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
                  <UserCheck className="w-4 h-4 text-blue-700" />
                  <span>Agency Staff Agent (Broker Staff)</span>
                </div>
                <p className="text-xs text-stone-600">
                  Handle assigned listings, communicate with matched applicants, and coordinate guided in-person property viewings.
                </p>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('broker_staff')}
                  className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign In as Sonam Wangchu (Broker Staff)
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
              <span>Standard credentials: Pass@Nivas2026!</span>
              <button
                type="button"
                onClick={() => openAuthModal('login', 'broker_admin')}
                className="text-emerald-900 font-semibold hover:underline"
              >
                Sign In with Custom Agency Credentials &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <header className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            <span>NivasPay Broker &amp; Agency Portal &bull; {isBrokerAdmin ? 'ADMINISTRATOR' : 'STAFF WORKSPACE'}</span>
          </div>
          <h1 className="text-2xl font-bold font-editorial tracking-tight">{agency?.name || 'Apex Realty Advisors'}</h1>
          <p className="text-xs text-stone-400 mt-1">
            RERA: <span className="text-stone-200 font-mono">{agency?.reraNumber || 'AR-RERA-REP-8819'}</span> &bull;
            License: <span className="text-stone-200 font-mono">{agency?.licenseNumber || 'RERA-AR-2024-0089'}</span> &bull;
            City: <span className="text-stone-200">{agency?.city || 'Itanagar'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2 hidden sm:block">
            <p className="text-xs font-semibold text-stone-200">{user?.name}</p>
            <p className="text-[11px] text-stone-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-full cursor-pointer transition-colors border border-stone-700"
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-full cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>
      </header>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Policy Boundary Banner: Mandatory Owner Authorization */}
      <div className="bg-emerald-950 text-emerald-100 p-4 rounded-2xl border border-emerald-900 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">Verified Owner Authorization Mandate</span>
            <p className="text-emerald-300 text-[11px] mt-0.5">
              Per NivasPay Fair Housing regulations, brokers cannot publish listings without a verified Power of Attorney or Owner Mandate.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-emerald-900 text-emerald-200 text-[10px] rounded-full font-mono shrink-0">
          COMPLIANT
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer transition-all ${
            activeTab === 'listings' ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Authorized Listings ({listings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer transition-all ${
            activeTab === 'leads' ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Agency Leads ({leads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('authorizations')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer transition-all ${
            activeTab === 'authorizations' ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Owner Authorizations ({authorizations.length})</span>
        </button>

        {isBrokerAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer transition-all ${
              activeTab === 'staff' ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Staff Directory ({staffMembers.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('commission')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full cursor-pointer transition-all ${
            activeTab === 'commission' ? 'bg-stone-900 text-white shadow-xs' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Commission &amp; Performance</span>
        </button>
      </div>

      {/* Tab 1: Authorized Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">Authorized Agency Properties</h2>
              <p className="text-xs text-stone-500">Only properties with verified owner authorizations can be managed and scheduled for viewings.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(prop => (
              <div key={prop.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Owner Authorized
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 mt-1">{prop.title}</h3>
                    <p className="text-xs text-stone-500">{prop.locality}, {prop.city} &bull; {prop.bhk}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-900">₹{prop.rentMonthly.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-stone-400">/month</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                  <span>Units: {prop.occupiedUnits} / {prop.totalUnits} occupied</span>
                  <span className="text-emerald-700 font-medium">Ready for In-Person Tour</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Agency Leads & Enquiries */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">Customer Leads &amp; Tour Inquiries</h2>
              <p className="text-xs text-stone-500">
                {isBrokerAdmin
                  ? 'Assign prospective tenant enquiries to agency staff agents for visit coordination.'
                  : 'Your assigned prospective tenant inquiries.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900">{lead.customerName}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">Interested in: <span className="font-medium text-stone-800">{lead.propertyTitle}</span></p>
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-4">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-stone-400" /> {lead.customerPhoneMasked}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-stone-400" /> {lead.customerEmail}</span>
                  </div>
                </div>

                <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  &ldquo;{lead.requirement}&rdquo;
                </p>

                <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-stone-600">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>Assigned Agent: <strong className="text-stone-900">{lead.assignedStaffName || 'Unassigned'}</strong></span>
                  </div>

                  {isBrokerAdmin && (
                    <div className="flex items-center gap-2">
                      {selectedLeadId === lead.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={targetStaffUserId}
                            onChange={(e) => setTargetStaffUserId(e.target.value)}
                            className="text-xs border border-stone-300 rounded-lg px-2 py-1 bg-white text-stone-800"
                          >
                            <option value="">Select Staff...</option>
                            {staffMembers.map(s => (
                              <option key={s.userId} value={s.userId}>{s.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssignLead(lead.id)}
                            className="px-2.5 py-1 bg-emerald-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedLeadId(null)}
                            className="px-2 py-1 text-stone-500 hover:text-stone-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setTargetStaffUserId(lead.assignedStaffId || '');
                          }}
                          className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-medium cursor-pointer"
                        >
                          Reassign Agent
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Owner Authorizations */}
      {activeTab === 'authorizations' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Owner Listing Mandates &amp; Authorizations</h2>
            <p className="text-xs text-stone-500">Legal proof of representation authorized by registered property owners.</p>
          </div>

          <div className="space-y-3">
            {authorizations.map(auth => (
              <div key={auth.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900 font-mono">{auth.docReference}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {auth.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {auth.authorizationType} MANDATE
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">
                    Agency: <strong>{auth.agencyName}</strong> &bull; Valid Until: {new Date(auth.validUntil).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Verified by NivasPay Operations</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Staff Directory (Admin Only) */}
      {activeTab === 'staff' && isBrokerAdmin && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Agency Staff &amp; Field Agents</h2>
            <p className="text-xs text-stone-500">Supervise active agents, assigned listings, and customer tour metrics.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {staffMembers.map(staff => (
              <div key={staff.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">{staff.name}</h3>
                      <p className="text-xs text-stone-500">{staff.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-mono rounded-full">ACTIVE</span>
                </div>

                <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs text-stone-600">
                  <div>
                    <p className="text-stone-400 text-[10px]">Assigned Listings</p>
                    <p className="font-bold text-stone-900 text-sm">{staff.assignedListingsCount}</p>
                  </div>
                  <div>
                    <p className="text-stone-400 text-[10px]">Active Inquiries</p>
                    <p className="font-bold text-stone-900 text-sm">{staff.activeLeadsCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Commission & Performance */}
      {activeTab === 'commission' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-stone-900">Agency Commission &amp; Closing Ledger</h2>
              <p className="text-xs text-stone-500">0% owner brokerage policy preserved; agency performance commission details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-[11px] text-stone-500 font-medium">Standard Agency Commission</p>
              <p className="text-xl font-bold text-stone-900 mt-1">{agency?.commissionRatePercent || 8.5}%</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Applied on verified lease execution</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-[11px] text-stone-500 font-medium">Total Closings</p>
              <p className="text-xl font-bold text-stone-900 mt-1">{agency?.totalDealsClosed || 42}</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Across Arunachal Pradesh</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-[11px] text-stone-500 font-medium">Owner Fee Impact</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">₹0</p>
              <p className="text-[10px] text-stone-400 mt-0.5">Strict zero-brokerage for landlords</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
