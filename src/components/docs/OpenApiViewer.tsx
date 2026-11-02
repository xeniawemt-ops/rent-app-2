import React, { useState } from 'react';
import { FileCode, Play, CheckCircle, ShieldAlert, Copy, Check, Terminal } from 'lucide-react';
import { backendService } from '../../services/backendService';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  scope: 'customer' | 'owner' | 'admin' | 'public' | 'webhook';
  summary: string;
  description: string;
  headers: Record<string, string>;
  requestBodySample?: any;
  responseSample: any;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/listings',
    scope: 'public',
    summary: 'Public Listing Search (Masked Address & Approx Pin)',
    description: 'Retrieves active rental listings. Returns approximate lat/lng coordinates and locality. Door number, building, and owner contact are omitted per Section 6 DPDP Act.',
    headers: {
      'Accept': 'application/json',
      'X-App-Platform': 'customer-v1',
    },
    responseSample: {
      status: 'success',
      data: [
        {
          id: 'lst_1',
          title: 'Pine View Villa near Ganga Lake',
          bhk: '3 BHK',
          locality: 'Ganga Lake Road, Chandranagar',
          city: 'Itanagar',
          approximateLat: 27.0844,
          approximateLng: 93.6053,
          maskedAddressPreview: 'Near Ganga Lake viewpoint corridor, Chandranagar, Itanagar',
          fullAddressEncrypted: '[ENCRYPTED_AES256GCM_LOCKED]',
          rentMonthly: 12500,
          securityDeposit: 30000,
          suitableFor: 'Working professionals',
          requirements: { petsAllowed: true, maxOccupants: 4 }
        }
      ]
    }
  },
  {
    method: 'POST',
    path: '/api/v1/applications/apply',
    scope: 'customer',
    summary: 'Submit Application & Pay ₹20 Application Fee',
    description: 'Pre-flight check evaluates tenant demographic compatibility against "Suitable for" criteria. If passed, initiates ₹20 non-refundable application fee payment.',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN_AUD_CUSTOMER>',
      'Content-Type': 'application/json',
      'X-Idempotency-Key': 'idemp_fee_app_1001_v1'
    },
    requestBodySample: {
      listingId: 'lst_1',
      paymentMethod: 'upi',
      upiVpa: 'aarav@okaxis'
    },
    responseSample: {
      status: 'captured',
      applicationId: 'app_1001',
      amountPaid: 20,
      currency: 'INR',
      razorpayPaymentId: 'pay_OQ8w7a2e88a1b',
      isNonRefundable: true,
      gstInvoiceNo: 'INV-2026-FEE-1001'
    }
  },
  {
    method: 'GET',
    path: '/api/v1/owner/applications/{id}',
    scope: 'owner',
    summary: 'Owner Application Review (DPDP Field-Level Masking)',
    description: 'Enforces Row-Level Authorization (403 if listing is not owned by authenticated user). Strips religion/tribe if applicant did not provide unbundled consent. Logs view event.',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN_AUD_OWNER>',
      'Accept': 'application/json'
    },
    responseSample: {
      status: 'success',
      application: {
        id: 'app_1001',
        listingId: 'lst_1',
        status: 'pending',
        feePaid: true
      },
      customerProfile: {
        name: 'Aarav Sharma',
        age: 27,
        gender: 'Male',
        occupation: 'Senior Software Engineer (FinTech)',
        hasPets: true,
        petType: 'Golden Retriever',
        religion: '[REDACTED_WITHOUT_CONSENT]',
        tribe: '[REDACTED_WITHOUT_CONSENT]',
        consentShareReligionTribe: false,
        religionConsentNotice: 'Protected under DPDP Act 2023. Not disclosed by applicant.'
      }
    }
  },
  {
    method: 'POST',
    path: '/api/v1/owner/applications/{id}/reject',
    scope: 'owner',
    summary: 'Reject Application (Strict Permissible Reason Check & Auto-Refund)',
    description: 'Prohibits discriminatory rejection grounds. Rejection triggers immediate 80% (₹800) auto-refund to tenant via Razorpay Route; platform keeps ₹200.',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN_AUD_OWNER>',
      'Content-Type': 'application/json'
    },
    requestBodySample: {
      reasonCode: 'pets',
      explanation: 'Society association rules restrict large dog breeds in Block B.'
    },
    responseSample: {
      status: 'rejected',
      applicationId: 'app_1003',
      reasonCode: 'pets',
      refundStatus: 'initiated',
      refundAmount: 800,
      platformRetainedFee: 200,
      creditNoteNo: 'CN-2026-NVSP-0044',
      tenantNotificationSent: true
    }
  },
  {
    method: 'POST',
    path: '/api/v1/customer/applications/{id}/pay-deposit',
    scope: 'customer',
    summary: 'Pay Deposit Balance & Decrypt Physical Address',
    description: 'Settles refundable security deposit into owner escrow and customer brokerage (flat 10% of monthly rent) to platform. Releases full decrypted door number and owner contact. No brokerage is charged to property owners.',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN_AUD_CUSTOMER>',
      'Content-Type': 'application/json'
    },
    requestBodySample: {
      paymentMethod: 'netbanking'
    },
    responseSample: {
      status: 'settled',
      depositPaid: 29200,
      creditApplied: 800,
      totalDepositCredited: 30000,
      unlockedFullAddress: 'Villa 14, Pine Valley Enclave, Near Ganga Lake, Chandranagar, Itanagar, Arunachal Pradesh - 791113',
      unlockedOwnerPhone: '+91 98111 22334',
      gstInvoiceNo: 'INV-2026-NVSP-0891'
    }
  },
  {
    method: 'POST',
    path: '/api/v1/customer/dpdp/erasure',
    scope: 'customer',
    summary: 'DPDP Section 12 Right to Erasure (RTBF)',
    description: 'Immediately anonymizes and wipes customer demographic data and voluntary fields. Emits revocation consent log.',
    headers: {
      'Authorization': 'Bearer <JWT_TOKEN_AUD_CUSTOMER>',
      'Content-Type': 'application/json'
    },
    requestBodySample: {
      confirmErasure: true
    },
    responseSample: {
      status: 'erased',
      message: 'Personal data permanently anonymized per DPDP Act Section 12.',
      statutoryFinancialRecordsRetainedYears: 7
    }
  }
];

export const OpenApiViewer: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [testResult, setTestResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleRunEndpoint = () => {
    setIsRunning(true);
    setTestResult(null);

    setTimeout(() => {
      if (selectedEndpoint.path === '/api/v1/listings') {
        const listings = backendService.getListings();
        setTestResult({
          statusCode: 200,
          response: {
            status: 'success',
            count: listings.length,
            data: listings.map(l => ({
              id: l.id,
              title: l.title,
              bhk: l.bhk,
              locality: l.locality,
              city: l.city,
              approximateLat: l.approximateLat,
              approximateLng: l.approximateLng,
              maskedAddressPreview: l.maskedAddressPreview,
              fullAddressEncrypted: '[ENCRYPTED_AES256GCM_LOCKED]',
              rentMonthly: l.rentMonthly,
              suitableFor: l.suitableFor,
            })),
          },
        });
      } else if (selectedEndpoint.path.includes('/owner/applications/{id}')) {
        try {
          const res = backendService.getOwnerViewOfApplication('app_1001', 'user_owner_201');
          setTestResult({ statusCode: 200, response: res });
        } catch (err: any) {
          setTestResult({ statusCode: 403, error: err.message });
        }
      } else {
        setTestResult({
          statusCode: 200,
          response: selectedEndpoint.responseSample,
        });
      }
      setIsRunning(false);
    }, 400);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'POST': return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'PUT': return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'DELETE': return 'bg-rose-950 text-rose-300 border-rose-800';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            OpenAPI 3.1 Specification &amp; Interactive API Playground
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            RBAC scopes, DPDP compliance headers, and Razorpay Route escrow contracts.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          OAS 3.1.0 • /api/v1
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint List */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">
            Endpoints ({API_ENDPOINTS.length})
          </div>
          <div className="space-y-1.5">
            {API_ENDPOINTS.map(ep => (
              <button
                key={`${ep.method}-${ep.path}`}
                onClick={() => {
                  setSelectedEndpoint(ep);
                  setTestResult(null);
                }}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-1 border ${
                  selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method
                    ? 'bg-blue-900/40 border-blue-600/70 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${getMethodBadge(ep.method)}`}>
                    {ep.method}
                  </span>
                  <span className="font-mono truncate">{ep.path}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pl-1">
                  <span className="truncate">{ep.summary}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded font-mono">
                    {ep.scope}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Endpoint Explorer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded font-mono text-xs font-bold border ${getMethodBadge(selectedEndpoint.method)}`}>
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-white text-sm font-semibold">{selectedEndpoint.path}</span>
              </div>

              <button
                onClick={handleRunEndpoint}
                disabled={isRunning}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isRunning ? 'Executing...' : 'Send Live Request'}
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{selectedEndpoint.description}</p>

            {/* Request Headers */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400">Required Request Headers</div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
                {Object.entries(selectedEndpoint.headers).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-blue-400">{k}:</span>
                    <span className="text-slate-400 truncate max-w-xs">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body (if any) */}
            {selectedEndpoint.requestBodySample && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400">Request Payload Schema</div>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedEndpoint.requestBodySample, null, 2)}
                </pre>
              </div>
            )}

            {/* Live Test Response or Schema Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  {testResult ? 'Live Execution Response' : '200 OK Response Schema Preview'}
                </div>
                {testResult && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    testResult.statusCode === 200 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    HTTP {testResult.statusCode}
                  </span>
                )}
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-purple-300 max-h-64 overflow-y-auto">
                {JSON.stringify(testResult ? testResult.response || testResult : selectedEndpoint.responseSample, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
