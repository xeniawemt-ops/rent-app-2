/**
 * Razorpay Route & Fintech Escrow Settlement Engine
 * Specializing in Indian Marketplace Rental Processing, GST Compliance, and Hybrid Settlement
 * 
 * Rules & Compliances:
 * - RBI Master Directions on Payment Aggregators & Gateways (PAs/PGs)
 * - GST Notification No. 12/2017-Central Tax (Rate) - Residential Leasing Exempt
 * - Section 15 CGST Act - Valuation of Service Charges (18% GST on Platform Commission & Fees)
 * - NPCI UPI Procedural Guidelines for Intent Calls
 * - RBI Guidelines on Settlement of Escrow / Nodal Accounts
 */

// Browser-compatible pure TypeScript SHA-256 and HMAC-SHA256 (Zero Node.js crypto module dependency)
function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Bytes(data: Uint8Array): Uint8Array {
  const maxWord = Math.pow(2, 32);
  let i = 0, j = 0;
  const words: number[] = [];
  const bitLength = data.length * 8;
  
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);

  for (i = 0; i < data.length; i++) {
    words[i >> 2] |= data[i] << ((3 - (i % 4)) * 8);
  }
  words[bitLength >> 5] |= 0x80 << ((3 - ((bitLength >> 3) % 4)) * 8);
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const w: number[] = [];
  for (i = 0; i < words.length; i += 16) {
    const oldHash = [...hash];
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = ((w[j - 16] + gamma0) | 0) + ((w[j - 7] + gamma1) | 0);
      }
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sigma0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sigma1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);

      const t1 = ((hash[7] + sigma1) | 0) + ((ch + k[j]) | 0) + (w[j] | 0);
      const t2 = (sigma0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + t1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (t1 + t2) | 0;
    }
    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  const u8 = new Uint8Array(32);
  for (i = 0; i < 8; i++) {
    u8[i * 4] = (hash[i] >>> 24) & 0xff;
    u8[i * 4 + 1] = (hash[i] >>> 16) & 0xff;
    u8[i * 4 + 2] = (hash[i] >>> 8) & 0xff;
    u8[i * 4 + 3] = hash[i] & 0xff;
  }
  return u8;
}

export function hmacSha256(message: string, key: string): string {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(key);
  const keyBytes: Uint8Array = rawKey.length > 64 ? sha256Bytes(rawKey) : rawKey;
  const messageBytes = encoder.encode(message);

  const paddedKey = new Uint8Array(64);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);

  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const inner = new Uint8Array(64 + messageBytes.length);
  inner.set(iKeyPad);
  inner.set(messageBytes, 64);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(64 + innerHash.length);
  outer.set(oKeyPad);
  outer.set(innerHash, 64);
  const outerHash = sha256Bytes(outer);

  return Array.from(outerHash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// 1. STATE MACHINE DEFINITIONS
// ============================================================================

export type PaymentLifecycleState =
  | 'PENDING_APPLICATION'       // Initial application state; ₹1,000 brokering fee pending
  | 'APPLICATION_FEE_COLLECTED' // ₹1,000 brokering fee collected via UPI; Tax invoice issued (₹847.46 + ₹152.54 GST)
  | 'APPLICATION_REJECTED'      // Landlord rejected; ₹800 auto-refunded to UPI, ₹200 retained
  | 'CREDIT_ADJUSTED'           // Landlord approved; ₹800 credited to deposit; remaining deposit = ₹19,200
  | 'ESCROW_HELD'               // Tenant paid remainder via UPI Intent into Escrow
  | 'CONTRACT_SIGNED'           // Dual digital signatures confirmed; 24-hour payout hold initiated
  | 'PAYOUT_SCHEDULED'          // Escrow hold timer active; beneficiary IMPS payload queued
  | 'TRANSFERRED'               // Settled via IMPS/NEFT to Landlord Bank Account; Platform cut captured
  | 'SETTLEMENT_FAILED';        // Gateway or beneficiary bank reject; fallback to manual NEFT review

export interface StateTransitionLog {
  fromState: PaymentLifecycleState;
  toState: PaymentLifecycleState;
  timestamp: string;
  triggeredBy: string;
  referenceId: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// 2. MATHEMATICAL MODELS & LEDGER INTERFACES
// ============================================================================

export interface MonetizationInputs {
  baseMonthlyRent: number;     // R: Exempt from GST (0%)
  securityDeposit: number;     // D: Exempt from GST (0%)
  platformCommissionPct: number; // S%: Default 10%
  applicationFeeTotal: number; // Default ₹1,000 (Brokering Fee)
  applicationFeeCreditPct: number; // Default 80% (₹800)
}

export interface ApplicationFeeBreakdown {
  totalFee: number;            // ₹20.00
  baseFee: number;             // ₹20.00 (Flat Fee, No GST)
  gst18Pct: number;            // 0 (GST calculations removed)
  sacCode: string;             // '998319' - Information Technology / Platform Services
  invoiceNumber: string;       // e.g. 'INV-APP-2026-001'
  issuedAt: string;
}

export interface CreditAdjustmentResult {
  originalDeposit: number;     // ₹20,000.00
  creditAmount: number;        // ₹800.00 (80% of ₹1,000)
  retainedFee: number;         // ₹200.00 (Platform retains for processing)
  remainingDepositDue: number; // ₹19,200.00
  adjustedAt: string;
}

export interface FinalCheckoutBreakdown {
  rentAmount: number;          // ₹10,000.00
  adjustedDepositDue: number;  // ₹19,600.00
  totalCheckoutAmount: number; // ₹29,600.00
  upiIntentString: string;     // NPCI standard UPI link
  razorpayOrderId: string;
}

export interface RouteSplitCalculation {
  // Inputs
  escrowCollectedPool: number; // Combined rental + deposit funds
  baseRent: number;            // Monthly rent
  
  // NivasPay Platform Revenue (Customer Brokerage: flat 10% of 1 month's rent)
  ownerBrokerage: 0;           // Property owners NEVER pay brokerage
  customerBrokerageBase: number; // 10% of 1 month's rent paid customer-side
  customerBrokerageGst: number;  // 0 (GST calculations removed)
  customerBrokerageTotal: number;// Total customer brokerage collected
  
  // Optional Configured Owner Platform Charges (Separate from Brokerage)
  ownerPlatformFee: number;
  ownerPlatformFeeGst: number;

  // Legacy compatibility fields
  commissionBase: number;      
  commissionGst18Pct: number;  
  commissionGross: number;     
  creditRecovery: number;      
  totalPlatformCut: number;    
  
  // Landlord Settlement (100% of Rent + Deposit minus valid owner deductions only)
  netLandlordPayout: number;   
  
  // Verification Mathematical Proof
  mathematicalProof: {
    targetRent: number;         
    targetDeposit: number;      
    grossDealValue: number;     
    ownerBrokerage: 0;
    totalPlatformCut: number;   
    expectedLandlordGross: number; 
    alreadyCreditedByPlatform: number; 
    netBankSettlementDue: number;      
    isExactMatch: boolean;
  };
}

export interface LandlordBankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  razorpayFundAccountId?: string;
}

export interface RazorpayRouteTransferPayload {
  account: string; // Landlord linked account or fund account
  amount: number;  // In paise (₹28,020.00 -> 2802000)
  currency: 'INR';
  settlement_schedule: string;
  on_hold: boolean;
  on_hold_until: number; // Epoch timestamp (24h after digital lease contract signing)
  notes: {
    leaseAgreementId: string;
    landlordName: string;
    payoutMode: 'IMPS' | 'NEFT';
    beneficiaryIfsc: string;
    beneficiaryAccountMasked: string;
    netPayoutInr: number;
    platformCutInr: number;
  };
}

// ============================================================================
// 3. FINTECH CALCULATION & SETTLEMENT ENGINE
// ============================================================================

export class RazorpayRouteEngine {
  private static readonly GST_RATE = 0; // TDS and GST calculations removed
  private static readonly SAC_CODE = '998319'; // Support services / Intermediary

  /**
   * Step A: Tenant Application Fee Breakdown
   * Computes components for ₹20 non-refundable application fee (No GST).
   */
  public static calculateApplicationFee(totalFee: number = 20): ApplicationFeeBreakdown {
    const baseFee = totalFee; // ₹20 flat, no GST calculation
    const gst18Pct = 0;

    return {
      totalFee,
      baseFee,
      gst18Pct,
      sacCode: this.SAC_CODE,
      invoiceNumber: `INV-APP-${Date.now().toString().slice(-6)}`,
      issuedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate Brokerage upon Application Acceptance
   * Brokerage = 10% of ONE MONTH'S RENT (NivasPay Rule 4).
   * Applicable only if customer's application is accepted.
   * Property owners do NOT pay brokerage. No GST added.
   */
  public static calculateBrokerage(monthlyRent: number): {
    brokerageBase: number;
    gst18Pct: number;
    totalBrokerage: number;
  } {
    const brokerageBase = Math.round(monthlyRent * 0.10);
    const gst18Pct = 0;
    const totalBrokerage = brokerageBase;
    return {
      brokerageBase,
      gst18Pct,
      totalBrokerage,
    };
  }

  /**
   * Step B: Application Acceptance & Security Deposit Settlement
   * ₹20 application fee is strictly non-refundable and does NOT convert to deposit or brokerage.
   */
  public static calculateCreditAdjustment(
    targetSecurityDeposit: number,
    applicationFeePaid: number = 20
  ): CreditAdjustmentResult {
    return {
      originalDeposit: targetSecurityDeposit,
      creditAmount: 0,
      retainedFee: applicationFeePaid,
      remainingDepositDue: targetSecurityDeposit,
      adjustedAt: new Date().toISOString(),
    };
  }

  /**
   * Step C: Final Checkout & UPI Intent Generator
   * Calculates the combined remainder to be escrowed via single UPI Intent call.
   */
  public static calculateFinalCheckout(
    baseMonthlyRent: number,
    remainingDepositDue: number,
    leaseId: string
  ): FinalCheckoutBreakdown {
    const totalCheckoutAmount = Number((baseMonthlyRent + remainingDepositDue).toFixed(2));
    const orderId = `order_rzp_${Date.now()}`;

    // NPCI Compliant UPI Intent Link
    // Format: upi://pay?pa=<escrow_vpa>&pn=<payee>&am=<amount>&tr=<txnid>&cu=INR&tn=<note>
    const escrowVpa = 'nivaspay.escrow@icici';
    const payeeName = 'NivasPay Escrow Account';
    const note = encodeURIComponent(`Lease Escrow Checkout ${leaseId}`);
    const upiIntentString = `upi://pay?pa=${escrowVpa}&pn=${encodeURIComponent(payeeName)}&am=${totalCheckoutAmount.toFixed(2)}&tr=${orderId}&cu=INR&tn=${note}`;

    return {
      rentAmount: baseMonthlyRent,
      adjustedDepositDue: remainingDepositDue,
      totalCheckoutAmount,
      upiIntentString,
      razorpayOrderId: orderId,
    };
  }

  /**
   * Razorpay Route Calculation & Transaction Split
   * Executes the exact settlement logic upon lease execution.
   * NivasPay Rule: Property owners do NOT pay brokerage.
   * Customer-side brokerage is flat 10% of ONE MONTH'S RENT (no GST, no TDS).
   */
  public static calculateRouteSplit(
    baseMonthlyRent: number,
    targetSecurityDeposit: number,
    escrowPoolCollected?: number,
    creditGranted: number = 0,
    ownerFeeRate: number = 0 // Optional configured owner platform fee (default 0%)
  ): RouteSplitCalculation {
    const grossDealValue = baseMonthlyRent + targetSecurityDeposit;
    const pool = escrowPoolCollected !== undefined ? escrowPoolCollected : grossDealValue;

    // 1. Customer-Side Brokerage (Platform Revenue, paid by tenant upon acceptance)
    const customerBrokerageBase = Math.round(baseMonthlyRent * 0.10);
    const customerBrokerageGst = 0;
    const customerBrokerageTotal = customerBrokerageBase;

    // 2. Owner-Side Platform Fee (Only if validly configured; owners pay 0 brokerage)
    const ownerPlatformFee = ownerFeeRate > 0 ? Number(((baseMonthlyRent * ownerFeeRate) / 100).toFixed(2)) : 0;
    const ownerPlatformFeeGst = 0;

    // 3. Landlord Payout Allocation (Full rent + deposit minus only valid owner deductions)
    const netLandlordPayout = Number((pool - ownerPlatformFee).toFixed(2));

    // Mathematical Proof: Owner receives full rental funds, platform captures customer brokerage
    const expectedLandlordGross = grossDealValue;
    const isExactMatch = netLandlordPayout === (grossDealValue - ownerPlatformFee);

    return {
      escrowCollectedPool: pool,
      baseRent: baseMonthlyRent,
      ownerBrokerage: 0,
      customerBrokerageBase,
      customerBrokerageGst: 0,
      customerBrokerageTotal,
      ownerPlatformFee,
      ownerPlatformFeeGst: 0,
      commissionBase: customerBrokerageBase,
      commissionGst18Pct: 0,
      commissionGross: customerBrokerageTotal,
      creditRecovery: 0,
      totalPlatformCut: customerBrokerageTotal + ownerPlatformFee,
      netLandlordPayout,
      mathematicalProof: {
        targetRent: baseMonthlyRent,
        targetDeposit: targetSecurityDeposit,
        grossDealValue,
        ownerBrokerage: 0,
        totalPlatformCut: customerBrokerageTotal,
        expectedLandlordGross,
        alreadyCreditedByPlatform: 0,
        netBankSettlementDue: netLandlordPayout,
        isExactMatch,
      },
    };
  }

  /**
   * Razorpay Route Transfer Payload Builder
   * Configures bank account payload (IMPS/NEFT) with a 24-hour hold schedule.
   */
  public static buildRouteTransferPayload(
    netPayoutInr: number,
    landlordBank: LandlordBankDetails,
    leaseAgreementId: string,
    signatureTimestamp: number = Date.now()
  ): RazorpayRouteTransferPayload {
    // Determine transfer mode: IMPS for <= ₹5,00,000; NEFT for larger sums
    const payoutMode: 'IMPS' | 'NEFT' = netPayoutInr <= 500000 ? 'IMPS' : 'NEFT';

    // 24-hour hold period after digital signatures are confirmed
    const holdPeriodMs = 24 * 60 * 60 * 1000;
    const onHoldUntil = Math.floor((signatureTimestamp + holdPeriodMs) / 1000); // Unix timestamp in seconds

    // Amount in paise for Razorpay
    const amountInPaise = Math.round(netPayoutInr * 100);

    const maskedAcc = landlordBank.accountNumber.length > 4
      ? `****${landlordBank.accountNumber.slice(-4)}`
      : '****';

    return {
      account: landlordBank.razorpayFundAccountId || 'acc_landlord_route_linked',
      amount: amountInPaise,
      currency: 'INR',
      settlement_schedule: 'T+1',
      on_hold: true,
      on_hold_until: onHoldUntil,
      notes: {
        leaseAgreementId,
        landlordName: landlordBank.accountHolderName,
        payoutMode,
        beneficiaryIfsc: landlordBank.ifscCode,
        beneficiaryAccountMasked: `${landlordBank.bankName} (${maskedAcc})`,
        netPayoutInr,
        platformCutInr: 1580,
      },
    };
  }

  /**
   * Webhook Signature Verification
   * Idempotent validation of Razorpay signature using HMAC-SHA256
   */
  public static verifyWebhookSignature(
    rawPayload: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    if (!signature || !webhookSecret) return false;
    try {
      const generatedSignature = hmacSha256(rawPayload, webhookSecret);
      return generatedSignature === signature;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// 4. SCENARIO SIMULATOR RUNNER
// ============================================================================

export interface ScenarioSimulationResult {
  stepA: {
    action: string;
    upiCollection: number;
    baseFee: number;
    gst18Pct: number;
    taxInvoice: string;
    state: PaymentLifecycleState;
  };
  stepB: {
    action: string;
    approvalStatus: string;
    creditAmount: number;
    retainedFee: number;
    remainingDepositBalance: number;
    state: PaymentLifecycleState;
  };
  stepC: {
    action: string;
    upiIntentString: string;
    depositComponent: number;
    rentComponent: number;
    totalEscrowPool: number;
    state: PaymentLifecycleState;
  };
  stepD: {
    action: string;
    signatureTimestamp: string;
    payoutHoldUntil: string;
    holdDurationHours: number;
    state: PaymentLifecycleState;
  };
  stepE: {
    action: string;
    platformCommissionBase: number;
    platformGst: number;
    platformCommissionTotal: number;
    tenantCreditRecovered: number;
    totalPlatformCorporateCapture: number;
    landlordNetBankTransfer: number;
    payoutMode: 'IMPS' | 'NEFT';
    beneficiaryIfsc: string;
    beneficiaryAccount: string;
    proofVerification: boolean;
    state: PaymentLifecycleState;
  };
}

export function runFullRazorpayScenarioSimulation(
  rent: number = 10000,
  deposit: number = 20000,
  landlordBank: LandlordBankDetails = {
    accountHolderName: 'Rameshwar Kulkarni',
    accountNumber: '50100482194821',
    ifscCode: 'HDFC0000053',
    bankName: 'HDFC Bank',
  }
): ScenarioSimulationResult {
  // Step A: Tenant Application Phase (₹20 Non-Refundable Fee via UPI)
  const appFee = RazorpayRouteEngine.calculateApplicationFee(20);

  // Step B: Lease Acceptance & 10% Brokerage Calculation
  const brokerage = RazorpayRouteEngine.calculateBrokerage(rent);
  const creditAdj = RazorpayRouteEngine.calculateCreditAdjustment(deposit, 20);

  // Step C: Final Checkout (Full deposit ₹20,000 + ₹10,000 rent = ₹30,000 via UPI Intent)
  const checkout = RazorpayRouteEngine.calculateFinalCheckout(rent, creditAdj.remainingDepositDue, 'LEASE-AR-2026-001');

  // Step D: Contract Digital Signature & 24h Hold
  const now = Date.now();
  const holdUntil = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  // Step E: Razorpay Route Split & Landlord Bank Transfer (IMPS)
  // Property owners do NOT pay customer brokerage. Owner receives rent + deposit.
  const routeSplit = RazorpayRouteEngine.calculateRouteSplit(rent, deposit, checkout.totalCheckoutAmount, 0, 0);

  return {
    stepA: {
      action: 'Tenant Application Phase (₹20 Non-Refundable Fee via UPI)',
      upiCollection: appFee.totalFee,
      baseFee: appFee.baseFee,
      gst18Pct: appFee.gst18Pct,
      taxInvoice: appFee.invoiceNumber,
      state: 'APPLICATION_FEE_COLLECTED',
    },
    stepB: {
      action: `Lease Acceptance & Brokerage (10% of monthly rent = ₹${brokerage.brokerageBase.toLocaleString('en-IN')})`,
      approvalStatus: 'APPROVED_BY_LANDLORD',
      creditAmount: 0,
      retainedFee: 20,
      remainingDepositBalance: creditAdj.remainingDepositDue,
      state: 'CREDIT_ADJUSTED',
    },
    stepC: {
      action: 'Final Checkout via UPI Intent (Rent + Full Security Deposit)',
      upiIntentString: checkout.upiIntentString,
      depositComponent: checkout.adjustedDepositDue,
      rentComponent: checkout.rentAmount,
      totalEscrowPool: checkout.totalCheckoutAmount,
      state: 'ESCROW_HELD',
    },
    stepD: {
      action: 'Digital Signature & 24-Hour Automated Settlement Hold',
      signatureTimestamp: new Date(now).toISOString(),
      payoutHoldUntil: holdUntil,
      holdDurationHours: 24,
      state: 'CONTRACT_SIGNED',
    },
    stepE: {
      action: 'Razorpay Route Transfer Execution (Full Settlement to Landlord Bank)',
      platformCommissionBase: routeSplit.commissionBase,
      platformGst: routeSplit.commissionGst18Pct,
      platformCommissionTotal: routeSplit.commissionGross,
      tenantCreditRecovered: 0,
      totalPlatformCorporateCapture: routeSplit.totalPlatformCut,
      landlordNetBankTransfer: routeSplit.netLandlordPayout,
      payoutMode: 'IMPS',
      beneficiaryIfsc: landlordBank.ifscCode,
      beneficiaryAccount: landlordBank.accountNumber,
      proofVerification: routeSplit.mathematicalProof.isExactMatch,
      state: 'TRANSFERRED',
    },
  };
}
