import React, { useState } from 'react';
import { Shield, Server, Database, Smartphone, CreditCard, Lock, EyeOff, Activity, CheckCircle, RefreshCw, Cpu, Layers } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'pipeline' | 'threat_model'>('system');

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            System Architecture & Production Deployment Pipeline
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Dual-App Topology, Shared Node.js/NestJS Core, PostgreSQL Row-Level Security, and Razorpay Route Escrow.
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'system' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            System Topology
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'pipeline' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            CI/CD & Security Scanning
          </button>
          <button
            onClick={() => setActiveTab('threat_model')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'threat_model' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Threat Model (STRIDE)
          </button>
        </div>
      </div>

      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Visual Architecture Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frontends Layer */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white text-base">Client Apps (Dual Viewports)</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                React Native / Flutter clients with zero shared client state, dedicated JWT audiences, and localized UI.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-300 mb-1">
                    <span>Customer App</span>
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded">Scope: customer:*</span>
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    <li>• OTP Onboarding + DPDP S5 Notice (EN/HI)</li>
                    <li>• Optional Religion/Tribe Unchecked Consent</li>
                    <li>• Masked Address & Approx Pin Browse</li>
                    <li>• ₹1,000 Razorpay Brokering Fee</li>
                    <li>• Report Rejection & Data Erasure (RTBF)</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-300 mb-1">
                    <span>Owner App</span>
                    <span className="text-[10px] bg-blue-950/80 text-blue-400 border border-blue-800/60 px-1.5 py-0.5 rounded">Scope: owner:*</span>
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    <li>• Phone OTP + Aadhaar/PAN KYC Provider</li>
                    <li>• Anti-Discrimination Article 15 Undertaking</li>
                    <li>• Listing Creation + AES-256 Address Encryption</li>
                    <li>• Application Decisioning (Restricted Permitted Reasons)</li>
                    <li>• Razorpay Route Escrow Settlement</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Backend API Gateway Layer */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white text-base">Node.js / NestJS Shared API</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Centralized gateway enforcing RBAC, token rotation, field-level encryption, and payment webhooks.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1.5">
                  <div className="text-xs font-semibold text-blue-300">Security & RBAC Middleware</div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p>• Short-lived Access Tokens (15m) + Redis Refresh Rotation</p>
                    <p>• Rate Limiting (Token Bucket: 100 req/min per IP)</p>
                    <p>• IDOR Guards on every resource access</p>
                    <p>• Minors Gate (DPDP S9: age &lt; 18 blocked)</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1.5">
                  <div className="text-xs font-semibold text-amber-300">Payment & Ledger Engine</div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p>• Razorpay Route Escrow Orchestrator</p>
                    <p>• Webhook HMAC-SHA256 signature verifier</p>
                    <p>• 80% (₹800) auto-refund on reject + ₹200 platform fee</p>
                    <p>• Automated GST Invoice & Credit Note generator</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1.5">
                  <div className="text-xs font-semibold text-purple-300">DPDP Consent & Anti-Bias Vault</div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p>• Field-Level Encryption (AES-256-GCM / AWS KMS)</p>
                    <p>• Consent Check Middleware (Religion/Tribe Redaction)</p>
                    <p>• Audit Logger for sensitive demographic views</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Persistence & Escrow Layer */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white text-base">Storage & Banking Infrastructure</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                PostgreSQL Row-Level Security, Redis Cluster, and RBI-Compliant Payment Aggregator Route.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="text-xs font-semibold text-purple-300 mb-1">PostgreSQL 16 (With RLS)</div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    <li>• <code className="text-slate-300">ENABLE ROW LEVEL SECURITY</code> on all tables</li>
                    <li>• Customer policy: only read own profile &amp; own apps</li>
                    <li>• Owner policy: only read apps for owned listings</li>
                    <li>• AES-256-GCM encrypted columns for address &amp; KYC</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="text-xs font-semibold text-red-300 mb-1">Redis 7 Cluster</div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    <li>• Distributed Session &amp; OTP store (5m TTL)</li>
                    <li>• Sliding window rate limit counters</li>
                    <li>• Idempotency key locking for payments</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <div className="text-xs font-semibold text-emerald-300 mb-1">Razorpay Route (RBI Nodal)</div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    <li>• Nodal Escrow Account (Zero platform holding)</li>
                    <li>• Linked Owner Accounts for settlement</li>
                    <li>• Auto-split on deposit confirmation (Commission %)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Data Flow Diagram Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Lifecycle Data Flow: Tenancy Application to Deposit Settlement
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-emerald-400">1. Pre-Payment Check</div>
                <p className="text-slate-400">
                  Customer selects listing. Suitability matrix validates gender compatibility, pet rules, and occupancy before ₹20 processing fee.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-blue-400">2. Processing Fee Payment</div>
                <p className="text-slate-400">
                  Customer pays non-refundable ₹20 application fee via direct UPI/Card. Webhook fires with signature; application marked pending.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-purple-400">3. Owner Review &amp; DPDP Audit</div>
                <p className="text-slate-400">
                  Owner views application. Sensitive fields only shown if affirmative consent exists. Every view writes to immutable audit log.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-amber-400">4. Decision Fork</div>
                <p className="text-slate-400">
                  <span className="text-emerald-300">Accepted:</span> Tenant notified to settle security deposit &amp; 10% customer brokerage.<br />
                  <span className="text-rose-300">Rejected:</span> Lawful reason code recorded. ₹20 fee is strictly non-refundable.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-cyan-400">5. Unlock Address &amp; Owner Escrow</div>
                <p className="text-slate-400">
                  Customer pays deposit into escrow &amp; 10% brokerage. Owner receives 100% of deposit (0% owner brokerage). Door no. &amp; contact unlocked.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white text-base">Automated Security Scanning &amp; Production CI/CD</h3>
            </div>
            <p className="text-xs text-slate-400">
              All deployment pipelines mandate automated SAST, DAST, SCA, and secrets scanning prior to staging and production rollout.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">1. Pre-Commit / SAST</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  GitLeaks &amp; Semgrep scan every commit. Prohibits hardcoded API keys, JWT secrets, and detects unmasked PII logging.
                </p>
                <div className="text-[10px] bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-800 font-mono">
                  gitleaks detect --redact
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">2. Dependency SCA</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Snyk and Trivy scan npm/container images for CVEs. Build halts automatically on High or Critical severity findings.
                </p>
                <div className="text-[10px] bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-800 font-mono">
                  trivy fs --severity HIGH,CRITICAL .
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">3. DAST &amp; IDOR Testing</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  OWASP ZAP &amp; synthetic cross-role matrix automatically attack endpoints to verify IDOR, RLS, and field redaction.
                </p>
                <div className="text-[10px] bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-800 font-mono">
                  npm run test:security
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">4. Production Gate</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Immutable container tagged and signed with Cosign. Rolling zero-downtime deployment to Kubernetes with Pod Disruption Budgets.
                </p>
                <div className="text-[10px] bg-slate-900 text-slate-300 px-2 py-1 rounded border border-slate-800 font-mono">
                  cosign verify --key cosign.pub
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'threat_model' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            STRIDE Threat Modeling &amp; DPDP Mitigations
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">STRIDE Threat</th>
                  <th className="p-3">Scenario in Rental Platform</th>
                  <th className="p-3">Technical Safeguard</th>
                  <th className="p-3">DPDP / Legal Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                <tr>
                  <td className="p-3 font-semibold text-amber-300">Spoofing</td>
                  <td className="p-3 font-sans text-slate-400">Tenant impersonation or fake owner identity</td>
                  <td className="p-3 font-sans text-emerald-300">Phone OTP + DigiLocker/UIDAI PAN &amp; Aadhaar OCR verification</td>
                  <td className="p-3 font-sans text-slate-400">Section 6 DPDP (Identity verification)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-amber-300">Tampering</td>
                  <td className="p-3 font-sans text-slate-400">Payment webhook payload altered to falsely report deposit paid</td>
                  <td className="p-3 font-sans text-emerald-300">HMAC-SHA256 signature validation with Razorpay secret key</td>
                  <td className="p-3 font-sans text-slate-400">RBI Master Directions for Aggregators</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-amber-300">Repudiation</td>
                  <td className="p-3 font-sans text-slate-400">Owner denies rejecting applicant due to discrimination</td>
                  <td className="p-3 font-sans text-emerald-300">Immutable audit log with actor ID, IP, timestamp, and reason code</td>
                  <td className="p-3 font-sans text-slate-400">Article 15 &amp; Section 8 DPDP Audit Trail</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-amber-300">Information Disclosure</td>
                  <td className="p-3 font-sans text-slate-400">Owner views tenant religion/tribe without consent, or snoops address</td>
                  <td className="p-3 font-sans text-emerald-300">Field-level masking + AES-256-GCM encryption + deposit gate</td>
                  <td className="p-3 font-sans text-slate-400">Section 5 &amp; 6 DPDP (Purpose limitation)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-amber-300">Elevation of Privilege</td>
                  <td className="p-3 font-sans text-slate-400">Customer calls owner endpoints to view other applications (IDOR)</td>
                  <td className="p-3 font-sans text-emerald-300">PostgreSQL Row-Level Security (RLS) + JWT audience isolation</td>
                  <td className="p-3 font-sans text-slate-400">OWASP API1:2023 (BOLA Prevention)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
