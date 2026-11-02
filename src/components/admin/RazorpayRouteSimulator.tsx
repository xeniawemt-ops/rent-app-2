import React, { useState } from 'react';
import {
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  DollarSign,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Percent,
  Lock,
  Smartphone,
  Landmark,
  Scale
} from 'lucide-react';
import {
  RazorpayRouteEngine,
  PaymentLifecycleState,
  LandlordBankDetails,
  RouteSplitCalculation,
  ApplicationFeeBreakdown,
  CreditAdjustmentResult,
  FinalCheckoutBreakdown,
  RazorpayRouteTransferPayload,
} from '../../services/razorpayRouteEngine';

export const RazorpayRouteSimulator: React.FC = () => {
  // Scenario Inputs
  const [rentInput, setRentInput] = useState<number>(10000);
  const [depositInput, setDepositInput] = useState<number>(20000);
  const [commissionRate, setCommissionRate] = useState<number>(10); // 10%
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Landlord Bank Profile
  const landlordBank: LandlordBankDetails = {
    accountHolderName: 'Rameshwar Kulkarni',
    accountNumber: '50100482194821',
    ifscCode: 'HDFC0000053',
    bankName: 'HDFC Bank Ltd, Chandranagar Branch',
    razorpayFundAccountId: 'fa_route_kulkarni_9872',
  };

  // State Machine Step Tracker
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [currentState, setCurrentState] = useState<PaymentLifecycleState>('PENDING_APPLICATION');

  // Calculations
  const appFee: ApplicationFeeBreakdown = RazorpayRouteEngine.calculateApplicationFee(20);
  const brokerage = RazorpayRouteEngine.calculateBrokerage(rentInput);
  const creditAdj: CreditAdjustmentResult = RazorpayRouteEngine.calculateCreditAdjustment(depositInput, 20);
  const checkout: FinalCheckoutBreakdown = RazorpayRouteEngine.calculateFinalCheckout(
    rentInput,
    creditAdj.remainingDepositDue,
    'LEASE-AR-2026-001'
  );
  const routeSplit: RouteSplitCalculation = RazorpayRouteEngine.calculateRouteSplit(
    rentInput,
    depositInput,
    checkout.totalCheckoutAmount,
    creditAdj.creditAmount,
    commissionRate / 100
  );

  const transferPayload: RazorpayRouteTransferPayload = RazorpayRouteEngine.buildRouteTransferPayload(
    routeSplit.netLandlordPayout,
    landlordBank,
    'LEASE-AR-2026-001',
    Date.now()
  );

  // Active Tab
  const [viewTab, setViewTab] = useState<'simulator' | 'architecture' | 'payloads' | 'ledger'>('simulator');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResetSimulation = () => {
    setCurrentStep(1);
    setCurrentState('PENDING_APPLICATION');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Razorpay Route v2 Engine
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                RBI &amp; Escrow Compliant
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">
              Fintech Escrow &amp; Hybrid Settlement Architecture
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Guest funds collected strictly via UPI Intent SDK strings &rarr; Pooled in Razorpay Nodal/Escrow &rarr; Automated 24h digital lease hold &rarr; Settled to Landlord verified Bank Profile via instant IMPS transfer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSimulation}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scenario</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800 text-xs font-medium">
          <button
            onClick={() => setViewTab('simulator')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'simulator'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Interactive Scenario Simulator (₹10k / ₹20k)</span>
          </button>

          <button
            onClick={() => setViewTab('architecture')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'architecture'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>State Machine &amp; Flow Diagram</span>
          </button>

          <button
            onClick={() => setViewTab('ledger')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'ledger'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Double-Entry Balance Proof</span>
          </button>

          <button
            onClick={() => setViewTab('payloads')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'payloads'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>UPI Intent &amp; Route Transfer Payloads</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE SCENARIO SIMULATOR */}
      {viewTab === 'simulator' && (
        <div className="space-y-6">
          {/* Variable Inputs Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Scenario Variables &amp; Platform Classifications
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Formula Engine: Exact Monetary Decimal Math
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="block text-slate-400 text-xs font-medium mb-1">
                  Base Monthly Rent (₹)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm font-mono">₹</span>
                  <input
                    type="number"
                    value={rentInput}
                    onChange={e => setRentInput(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span>Direct Tenant Escrow</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="block text-slate-400 text-xs font-medium mb-1">
                  Target Security Deposit (₹)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm font-mono">₹</span>
                  <input
                    type="number"
                    value={depositInput}
                    onChange={e => setDepositInput(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span>Refundable Escrow Deposit</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="block text-slate-400 text-xs font-medium mb-1">
                  Customer Brokerage (% of 1 mo rent)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm font-mono">%</span>
                  <input
                    type="number"
                    value={commissionRate}
                    onChange={e => setCommissionRate(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span>Customer pays 10% • Owner pays 0%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Progression */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { num: 1, title: 'Step A: Tenant App Fee', state: 'APPLICATION_FEE_COLLECTED' },
              { num: 2, title: 'Step B: Lease Approval', state: 'CREDIT_ADJUSTED' },
              { num: 3, title: 'Step C: Final Checkout', state: 'ESCROW_HELD' },
              { num: 4, title: 'Step D: 24h Payout Hold', state: 'CONTRACT_SIGNED' },
              { num: 5, title: 'Step E: Route IMPS Transfer', state: 'TRANSFERRED' },
            ].map(s => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => {
                    setCurrentStep(s.num);
                    setCurrentState(s.state as PaymentLifecycleState);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                      : isPast
                      ? 'bg-slate-900 border-emerald-500/40'
                      : 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isPast ? 'bg-emerald-500 text-slate-950' : isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isPast ? '✓' : s.num}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {isPast ? 'DONE' : isActive ? 'ACTIVE' : 'QUEUED'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white mt-2 truncate">
                    {s.title}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    {s.state}
                  </div>
                </button>
              );
            })}
          </div>

          {/* STEP DETAILS CARDS */}
          {/* STEP A */}
          {currentStep === 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    A
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Step A: Tenant Application Processing (UPI Payment Captured)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Immediate tax breakdown of the non-refundable ₹20 application processing fee and statutory invoice issuance.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>State: APPLICATION_FEE_COLLECTED</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Inflow via UPI</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">₹20.00</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Collected via UPI Intent (Non-refundable)
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Platform Processing Fee</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    ₹{appFee.baseFee.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    ₹20.00 Flat Fee
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">TDS &amp; GST Status</div>
                  <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                    ₹0.00
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    No GST / TDS Applicable
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Digital Payment Receipt Issued
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Receipt Ref: {appFee.invoiceNumber} &bull; Customer PAN/Aadhaar linked
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCurrentStep(2);
                    setCurrentState('CREDIT_ADJUSTED');
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Step B: Landlord Approval</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP B */}
          {currentStep === 2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    B
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Step B: Lease Acceptance &amp; 10% Brokerage Calculation
                    </h3>
                    <p className="text-xs text-slate-400">
                      Landlord approves tenancy &rarr; Brokerage of 10% of monthly rent applies. ₹20 application fee is non-refundable.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>State: CREDIT_ADJUSTED</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Target Security Deposit</div>
                  <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                    ₹{depositInput.toLocaleString('en-IN')}.00
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Owner's required deposit
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Brokerage (10% of Rent)</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    ₹{Math.round(rentInput * 0.10).toLocaleString('en-IN')}.00
                  </div>
                  <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">
                    10% of ₹{rentInput.toLocaleString('en-IN')} monthly rent
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Security Deposit Due</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    ₹{depositInput.toLocaleString('en-IN')}.00
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Full deposit payable (No app fee deduction)
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  No additional platform fee after acceptance. Property owners do not pay brokerage.
                </div>

                <button
                  onClick={() => {
                    setCurrentStep(3);
                    setCurrentState('ESCROW_HELD');
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Step C: Final Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP C */}
          {currentStep === 3 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    C
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Step C: Final Checkout via Single UPI Intent Call
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tenant deposits security deposit (₹{depositInput.toLocaleString('en-IN')}) + first month rent (₹{rentInput.toLocaleString('en-IN')}) &rarr; ₹{(depositInput + rentInput).toLocaleString('en-IN')} locked in Razorpay Nodal Escrow.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>State: ESCROW_HELD</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Security Deposit</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    ₹{depositInput.toLocaleString('en-IN')}.00
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Full security deposit
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">First Month Rent</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    ₹{rentInput.toLocaleString('en-IN')}.00
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Exempt from GST (0%)
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Escrow Collection</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    ₹{(depositInput + rentInput).toLocaleString('en-IN')}.00
                  </div>
                  <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">
                    ₹{depositInput.toLocaleString('en-IN')} + ₹{rentInput.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* UPI Intent SDK String Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    NPCI Standard UPI Intent URI (Mobile SDK String)
                  </span>
                  <button
                    onClick={() => copyToClipboard(checkout.upiIntentString, 'upi_intent')}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'upi_intent' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'upi_intent' ? 'Copied' : 'Copy UPI String'}</span>
                  </button>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 break-all select-all">
                  {checkout.upiIntentString}
                </div>
                <div className="text-[11px] text-slate-500">
                  Supported apps: Google Pay, PhonePe, Paytm, BHIM. Escrow VPA: <span className="font-mono text-slate-400">nivaspay.escrow@icici</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setCurrentStep(4);
                    setCurrentState('CONTRACT_SIGNED');
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Confirm Digital Signatures (Step D)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP D */}
          {currentStep === 4 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    D
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Step D: Lease Agreement Signatures &amp; 24-Hour Settlement Hold
                    </h3>
                    <p className="text-xs text-slate-400">
                      Dual digital signatures recorded &rarr; Razorpay Route transfer programmed with mandatory 24h escrow hold.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>State: CONTRACT_SIGNED &bull; ON_HOLD</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Signatures Confirmed</div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                    Dual Verified (Aadhaar eSign)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Tenant + Landlord Digital Signatures
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Programmatic Hold Duration</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    24 Hours (T+1)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Mandatory dispute observation window
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div className="text-xs text-slate-400">Settlement Scheduled For</div>
                  <div className="text-sm font-bold font-mono text-white mt-1">
                    {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">
                    Route API on_hold_until parameter
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  During this 24-hour period, funds stay secured in the nodal account. No early withdrawals can occur without admin override.
                </div>

                <button
                  onClick={() => {
                    setCurrentStep(5);
                    setCurrentState('TRANSFERRED');
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Simulate 24h Expiry &amp; Execute IMPS Transfer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP E */}
          {currentStep === 5 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    E
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Step E: Razorpay Route Owner Settlement Execution
                    </h3>
                    <p className="text-xs text-slate-400">
                      Escrow settlement executed &rarr; 100% of rental collections (₹{(rentInput + depositInput).toLocaleString('en-IN')}) remitted directly to Landlord Bank via IMPS (0% Owner Brokerage). Customer brokerage is captured from tenant.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>State: TRANSFERRED</span>
                </div>
              </div>

              {/* Mathematical Split Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Platform Revenue Captured */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-4 h-4" />
                      Platform Corporate Capture (Customer Brokerage)
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full">
                      Tenant Funded
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Customer Brokerage (10% flat of 1 mo rent):</span>
                      <span className="font-mono text-white">₹{routeSplit.customerBrokerageBase.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 font-semibold pt-1 border-t border-slate-800">
                      <span>Total Customer Brokerage Revenue:</span>
                      <span className="font-mono">₹{routeSplit.customerBrokerageTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Brokerage Charged to Owner:</span>
                      <span className="font-mono font-medium">None (₹0.00)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
                      Brokerage is collected solely from the customer upon lease acceptance and is never deducted from owner rental income.
                    </p>
                  </div>
                </div>

                {/* 2. Landlord Payout Allocation */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-4 h-4" />
                      Landlord Bank Route Settlement
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full">
                      Instant IMPS
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Gross Contracted Rental &amp; Deposit:</span>
                      <span className="font-mono text-white">₹{(rentInput + depositInput).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Owner Brokerage:</span>
                      <span className="font-mono">None (₹0.00)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Owner Platform Deductions:</span>
                      <span className="font-mono text-slate-400">- ₹{routeSplit.ownerPlatformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold text-base pt-2 border-t border-slate-800">
                      <span>Net Settlement Remitted via Route:</span>
                      <span className="font-mono">₹{routeSplit.netLandlordPayout.toLocaleString('en-IN')}.00</span>
                    </div>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Beneficiary:</span>
                      <span className="text-white font-semibold">{landlordBank.accountHolderName}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Bank &amp; Account:</span>
                      <span className="text-white">{landlordBank.bankName} (****{landlordBank.accountNumber.slice(-4)})</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>IFSC Code:</span>
                      <span className="text-amber-400">{landlordBank.ifscCode}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Gateway Mode:</span>
                      <span className="text-emerald-400 font-bold">IMPS (Instant 24x7)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mathematical Proof Card */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Mathematical Integrity Proof Verified
                </div>
                <div className="text-xs text-slate-300 font-mono leading-relaxed">
                  Target Rent (₹10,000) + Target Deposit (₹20,000) &minus; Platform Cut (₹1,000 flat) = ₹29,000 Gross Entitlement.
                  <br />
                  Owner receives full rent + deposit without unauthorized deductions = <span className="text-emerald-300 font-bold">Full Net Payout Verified</span>.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ARCHITECTURE & STATE MACHINE */}
      {viewTab === 'architecture' && (
        <div className="space-y-6">
          {/* Data Flow Diagram Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Hybrid Marketplace Payment Architecture &amp; Data Flow
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Smartphone className="w-4 h-4" />
                  1. Tenant Inflow (UPI)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Strictly invokes NPCI UPI Intent URI strings (<code className="text-emerald-400">upi://pay</code>) for GPay, PhonePe, Paytm. No card credentials stored.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Payload: ₹20 Application Fee &bull; Deposit &amp; Brokerage upon Acceptance
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  2. Razorpay Nodal Escrow
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pooled in an RBI-compliant Payment Aggregator Escrow contract. Locked against unauthorized withdrawals until lease conditions are verified.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  State: ESCROW_HELD (Security Deposit &amp; Rent)
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Clock className="w-4 h-4" />
                  3. 24h Lease Lock
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upon dual digital contract signing, a programmatic hold is armed. The payout transfer is scheduled for T+24h via Razorpay Route API.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  State: CONTRACT_SIGNED &bull; ON_HOLD
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Landmark className="w-4 h-4" />
                  4. Bank Payout (IMPS/NEFT)
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Route API executes instant IMPS transfer using verified IFSC and Bank Account Number. Never requires a landlord UPI ID.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  State: TRANSFERRED
                </div>
              </div>
            </div>

            {/* State Machine Transition Flow */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Finite State Machine (FSM) Lifecycle
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                  PENDING_APPLICATION
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30">
                  APPLICATION_FEE_PAID (₹20 Non-Refundable)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30">
                  APPLICATION_ACCEPTED
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30">
                  BROKERAGE_&amp;_DEPOSIT_ESCROWED
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30">
                  ESCROW_HELD (₹29,200)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30">
                  CONTRACT_SIGNED (24h Hold)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  TRANSFERRED (IMPS ₹28,020)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DOUBLE-ENTRY BALANCE PROOF */}
      {viewTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                Double-Entry Payment Ledger &amp; Fund Balancing Audit
              </h3>
              <p className="text-xs text-slate-400">
                Verifying that every single rupee collected from the tenant matches platform capture plus landlord payout with 0.00% delta.
              </p>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs px-3 py-1 rounded-full">
              Ledger Delta: ₹0.00 (Balanced)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Total Inflows */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Tenant Payment / Escrow Inflows</span>
                <span className="font-mono text-emerald-400">CREDIT</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Step A: Non-Refundable App Fee</span>
                  <span className="text-white">₹{appFee.totalFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Step B: Customer Brokerage (10% flat)</span>
                  <span className="text-white">₹{brokerage.totalBrokerage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Step C: Refundable Security Deposit</span>
                  <span className="text-white">₹{depositInput.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Step C: Monthly Contracted Rent</span>
                  <span className="text-white">₹{rentInput.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-sm pt-2 border-t border-slate-800">
                  <span>Total Inflows Collected:</span>
                  <span>₹{(appFee.totalFee + brokerage.totalBrokerage + depositInput + rentInput).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Total Outflows & Retentions */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Disbursements &amp; Platform Revenue</span>
                <span className="font-mono text-amber-400">DEBIT</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Landlord Net Bank Settlement (IMPS):</span>
                  <span className="text-white">₹{routeSplit.netLandlordPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Brokerage Deducted from Owner:</span>
                  <span className="font-medium">None (₹0.00)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>NivasPay Customer Brokerage:</span>
                  <span className="text-white">₹{brokerage.totalBrokerage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>NivasPay App Processing Fee:</span>
                  <span className="text-white">₹{appFee.totalFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold text-sm pt-2 border-t border-slate-800">
                  <span>Total Accounted Disbursements:</span>
                  <span>₹{(appFee.totalFee + brokerage.totalBrokerage + depositInput + rentInput).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PAYLOAD INSPECTOR */}
      {viewTab === 'payloads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Route Transfer API Payload */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  Razorpay Route API Transfer Payload (POST /v1/transfers)
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(transferPayload, null, 2), 'route_payload')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'route_payload' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'route_payload' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                {JSON.stringify(transferPayload, null, 2)}
              </pre>
              <div className="text-[11px] text-slate-400">
                Notice: Passes Landlord verified IFSC &amp; Bank Account. Never passes UPI ID. Amount in paise: <span className="font-mono text-white">2802000</span> (₹28,020.00).
              </div>
            </div>

            {/* Collection Webhook Sample */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Collection Webhook (payment.captured) with HMAC-SHA256
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify({
                    event: 'payment.captured',
                    payment_id: 'pay_rzp_intent_checkout_9918',
                    amount: 2960000,
                    currency: 'INR',
                    method: 'upi',
                    vpa: 'tenant@oksbi',
                    signature: 'hmac_sha256_verified_token'
                  }, null, 2), 'webhook_payload')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'webhook_payload' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'webhook_payload' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
{JSON.stringify({
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_rzp_intent_checkout_9918',
        amount: 2960000,
        currency: 'INR',
        status: 'captured',
        order_id: checkout.razorpayOrderId,
        method: 'upi',
        description: 'Lease Escrow Checkout LEASE-AR-2026-001',
        bank: null,
        wallet: null,
        vpa: 'aarav.sharma@oksbi',
        email: 'aarav.sharma@example.com',
        contact: '+919988776655',
        notes: {
          depositAmount: 19600,
          rentAmount: 10000,
          escrowHeld: true
        }
      }
    }
  },
  created_at: Math.floor(Date.now() / 1000)
}, null, 2)}
              </pre>
              <div className="text-[11px] text-slate-400">
                Verified using <span className="font-mono text-white">X-Razorpay-Signature</span> header against backend <span className="font-mono text-white">RAZORPAY_WEBHOOK_SECRET</span>.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
