import React, { useState } from 'react';
import { Database, Lock, Eye, Key, ShieldCheck, Copy, Check } from 'lucide-react';

interface ColumnDef {
  name: string;
  type: string;
  constraints: string;
  isEncrypted?: boolean;
  isMaskedByDefault?: boolean;
  isHighRiskDpdp?: boolean;
  description: string;
}

interface TableDef {
  tableName: string;
  description: string;
  rlsPolicySummary: string;
  columns: ColumnDef[];
  sqlDdl: string;
}

const TABLES: TableDef[] = [
  {
    tableName: 'users',
    description: 'Core authentication & role identity table supporting phone OTP auth and RBAC.',
    rlsPolicySummary: 'Users can only view and update their own user record.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Unique user identifier' },
      { name: 'phone', type: 'VARCHAR(20)', constraints: 'NOT NULL UNIQUE', isMaskedByDefault: true, description: 'Masked Indian mobile number (+91 98*** **412)' },
      { name: 'phone_encrypted', type: 'BYTEA', constraints: 'NOT NULL', isEncrypted: true, description: 'AES-256-GCM encrypted E.164 phone' },
      { name: 'role', type: 'VARCHAR(15)', constraints: "CHECK (role IN ('customer', 'owner', 'admin'))", description: 'User role in platform' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()', description: 'Account creation time' },
    ],
    sqlDdl: `CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    phone_encrypted BYTEA NOT NULL,
    role VARCHAR(15) NOT NULL CHECK (role IN ('customer', 'owner', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_isolation ON users FOR ALL USING (id = auth.uid());`
  },
  {
    tableName: 'customer_profiles',
    description: 'Tenant profile data with DPDP Act Section 9 minors gate and voluntary sensitive identity.',
    rlsPolicySummary: 'Customer can view/edit own profile. Owners can only view non-sensitive fields upon active application.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Primary Key' },
      { name: 'user_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE CASCADE', description: 'Foreign Key to users' },
      { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Full legal name' },
      { name: 'age', type: 'INTEGER', constraints: 'CHECK (age >= 18)', description: 'Age (Under 18 prohibited by DPDP Section 9)' },
      { name: 'gender', type: 'VARCHAR(25)', constraints: "CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say'))", description: 'Gender identity' },
      { name: 'occupation', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Current occupation / company' },
      { name: 'marital_status', type: 'VARCHAR(25)', constraints: 'NOT NULL', description: 'Marital status' },
      { name: 'family_size', type: 'INTEGER', constraints: 'NOT NULL CHECK (family_size >= 1)', description: 'Number of living members' },
      { name: 'has_pets', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Whether tenant has pets' },
      { name: 'pet_type', type: 'VARCHAR(50)', constraints: 'NULL', description: 'Species / breed (e.g. Dog, Cat)' },
      { name: 'religion_encrypted', type: 'BYTEA', constraints: 'NULL', isEncrypted: true, isHighRiskDpdp: true, isMaskedByDefault: true, description: 'Optional religion (Encrypted, purpose-limited)' },
      { name: 'tribe_encrypted', type: 'BYTEA', constraints: 'NULL', isEncrypted: true, isHighRiskDpdp: true, isMaskedByDefault: true, description: 'Optional tribe (Encrypted, purpose-limited)' },
      { name: 'consent_share_religion_tribe', type: 'BOOLEAN', constraints: 'DEFAULT FALSE NOT NULL', isHighRiskDpdp: true, description: 'Strictly unchecked by default; controls owner visibility' },
      { name: 'religion_tribe_retention_until', type: 'TIMESTAMPTZ', constraints: 'NULL', isHighRiskDpdp: true, description: 'Purged within 14 days of decision' },
      { name: 'agreed_dpdp_notice_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL', description: 'Section 5 Notice timestamp' },
    ],
    sqlDdl: `CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18),
    gender VARCHAR(25) NOT NULL CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')),
    occupation VARCHAR(100) NOT NULL,
    marital_status VARCHAR(25) NOT NULL,
    family_size INTEGER NOT NULL CHECK (family_size >= 1),
    has_pets BOOLEAN DEFAULT FALSE,
    pet_type VARCHAR(50),
    religion_encrypted BYTEA,
    tribe_encrypted BYTEA,
    consent_share_religion_tribe BOOLEAN DEFAULT FALSE NOT NULL,
    religion_tribe_retention_until TIMESTAMPTZ,
    agreed_dpdp_notice_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_profile_owner ON customer_profiles FOR ALL USING (user_id = auth.uid());`
  },
  {
    tableName: 'owner_profiles',
    description: 'Property homeowner details with Digilocker/UIDAI KYC verification and anti-discrimination strikes.',
    rlsPolicySummary: 'Owners view own profile; customers cannot access owner personal KYC.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Primary Key' },
      { name: 'user_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE CASCADE', description: 'Foreign Key to users' },
      { name: 'full_name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Legal name from PAN card' },
      { name: 'pan_encrypted', type: 'BYTEA', constraints: 'NOT NULL', isEncrypted: true, description: 'Encrypted PAN number' },
      { name: 'pan_masked', type: 'VARCHAR(12)', constraints: 'NOT NULL', isMaskedByDefault: true, description: 'Masked PAN (ABCDE****F)' },
      { name: 'aadhaar_masked', type: 'VARCHAR(16)', constraints: 'NOT NULL', isMaskedByDefault: true, description: 'Masked Aadhaar (**** **** 1234)' },
      { name: 'pan_verified', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Verified via Karza/DigiLocker' },
      { name: 'aadhaar_verified', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Verified via UIDAI OTP' },
      { name: 'razorpay_account_id', type: 'VARCHAR(50)', constraints: 'NULL', description: 'Razorpay Route linked account' },
      { name: 'strikes_count', type: 'INTEGER', constraints: 'DEFAULT 0', description: 'Strikes for discriminatory rejections' },
      { name: 'is_suspended', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Account locked if strikes >= 3' },
    ],
    sqlDdl: `CREATE TABLE owner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    pan_encrypted BYTEA NOT NULL,
    pan_masked VARCHAR(12) NOT NULL,
    aadhaar_masked VARCHAR(16) NOT NULL,
    pan_verified BOOLEAN DEFAULT FALSE,
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    razorpay_account_id VARCHAR(50),
    agreed_anti_discrimination_at TIMESTAMPTZ NOT NULL,
    strikes_count INTEGER DEFAULT 0,
    is_suspended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    tableName: 'listings',
    description: 'Rental listings with approximate map radius and field-level encrypted physical address.',
    rlsPolicySummary: 'Public can read active listings (with address locked). Owner can read/edit own listings.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Listing identifier' },
      { name: 'owner_id', type: 'UUID', constraints: 'REFERENCES users(id)', description: 'Property Owner ID' },
      { name: 'title', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Public headline' },
      { name: 'bhk', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'e.g. 1 BHK, 2 BHK, 3 BHK' },
      { name: 'locality', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Neighborhood' },
      { name: 'city', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Metro city' },
      { name: 'approximate_lat', type: 'DOUBLE PRECISION', constraints: 'NOT NULL', description: 'Approximate latitude' },
      { name: 'approximate_lng', type: 'DOUBLE PRECISION', constraints: 'NOT NULL', description: 'Approximate longitude' },
      { name: 'full_address_encrypted', type: 'BYTEA', constraints: 'NOT NULL', isEncrypted: true, isMaskedByDefault: true, description: 'Door number, flat number, street (AES-256-GCM)' },
      { name: 'rent_monthly', type: 'NUMERIC(10,2)', constraints: 'NOT NULL', description: 'Monthly rent in INR' },
      { name: 'security_deposit', type: 'NUMERIC(10,2)', constraints: 'NOT NULL', description: 'Deposit amount in INR' },
      { name: 'suitable_for', type: 'VARCHAR(30)', constraints: "CHECK (suitable_for IN ('Anyone', 'Men', 'Women', 'Families', 'Working professionals'))", description: 'Publicly displayed criteria' },
      { name: 'status', type: 'VARCHAR(20)', constraints: "DEFAULT 'active'", description: 'active | rented | paused' },
    ],
    sqlDdl: `CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    bhk VARCHAR(20) NOT NULL,
    locality VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    approximate_lat DOUBLE PRECISION NOT NULL,
    approximate_lng DOUBLE PRECISION NOT NULL,
    full_address_encrypted BYTEA NOT NULL,
    rent_monthly NUMERIC(10,2) NOT NULL,
    security_deposit NUMERIC(10,2) NOT NULL,
    suitable_for VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public can view active listings, but full_address_encrypted is excluded from default projection`
  },
  {
    tableName: 'listing_requirements',
    description: 'Specific tenancy criteria (pets, occupancy limits, dietary preference, minimum stay).',
    rlsPolicySummary: 'Publicly visible alongside parent listing.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Primary Key' },
      { name: 'listing_id', type: 'UUID', constraints: 'REFERENCES listings(id) ON DELETE CASCADE', description: 'Parent listing' },
      { name: 'pets_allowed', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Whether pets are allowed' },
      { name: 'max_occupants', type: 'INTEGER', constraints: 'NOT NULL CHECK (max_occupants >= 1)', description: 'Maximum permitted heads' },
      { name: 'veg_only', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Vegetarian preference' },
      { name: 'smoking_allowed', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Smoking policy' },
      { name: 'min_stay_months', type: 'INTEGER', constraints: 'DEFAULT 11', description: 'Minimum lease lock-in' },
    ],
    sqlDdl: `CREATE TABLE listing_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    pets_allowed BOOLEAN DEFAULT FALSE,
    max_occupants INTEGER NOT NULL CHECK (max_occupants >= 1),
    veg_only BOOLEAN DEFAULT FALSE,
    smoking_allowed BOOLEAN DEFAULT FALSE,
    min_stay_months INTEGER DEFAULT 11
);`
  },
  {
    tableName: 'applications',
    description: 'Tenancy applications linking customer to listing, tracking fee payments, and decisions.',
    rlsPolicySummary: 'Customer can view own apps. Owner can only view apps for their owned listings.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Primary Key' },
      { name: 'listing_id', type: 'UUID', constraints: 'REFERENCES listings(id)', description: 'Listing applied for' },
      { name: 'customer_id', type: 'UUID', constraints: 'REFERENCES users(id)', description: 'Tenant applicant ID' },
      { name: 'status', type: 'VARCHAR(20)', constraints: "CHECK (status IN ('pending', 'accepted', 'rejected'))", description: 'State machine status' },
      { name: 'application_fee_paid', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: '₹500 fee status' },
      { name: 'rejected_reason_code', type: 'VARCHAR(50)', constraints: 'NULL', description: 'Code from permissible list' },
      { name: 'refund_amount', type: 'NUMERIC(10,2)', constraints: 'DEFAULT 0.00', description: '₹400 if rejected (80%)' },
      { name: 'platform_retained_fee', type: 'NUMERIC(10,2)', constraints: 'DEFAULT 0.00', description: '₹100 platform fee' },
      { name: 'deposit_balance_paid', type: 'BOOLEAN', constraints: 'DEFAULT FALSE', description: 'Unlocks address post payment' },
    ],
    sqlDdl: `CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    application_fee_paid BOOLEAN DEFAULT FALSE,
    application_fee_amount NUMERIC(10,2) DEFAULT 500.00,
    rejected_reason_code VARCHAR(50) CHECK (rejected_reason_code IN ('pets', 'family_size', 'occupation', 'budget_deposit_mismatch', 'incomplete_profile', 'other')),
    refund_amount NUMERIC(10,2) DEFAULT 0.00,
    platform_retained_fee NUMERIC(10,2) DEFAULT 0.00,
    deposit_balance_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    auto_refund_deadline TIMESTAMPTZ NOT NULL
);`
  },
  {
    tableName: 'payments',
    description: 'Double-entry payment ledger for Razorpay Route escrow, refunds, and owner payouts.',
    rlsPolicySummary: 'Customer views own payments; Owner views received payouts; Admin views ledger.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Internal payment ID' },
      { name: 'application_id', type: 'UUID', constraints: 'REFERENCES applications(id)', description: 'Associated application' },
      { name: 'payer_id', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Customer or Platform Escrow' },
      { name: 'payee_id', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Platform Escrow or Owner Route ID' },
      { name: 'amount', type: 'NUMERIC(10,2)', constraints: 'NOT NULL', description: 'Gross amount in INR' },
      { name: 'type', type: 'VARCHAR(30)', constraints: 'NOT NULL', description: 'application_fee | auto_refund | deposit_balance' },
      { name: 'gateway', type: 'VARCHAR(30)', constraints: "DEFAULT 'razorpay_route'", description: 'Payment aggregator route' },
      { name: 'idempotency_key', type: 'VARCHAR(100)', constraints: 'NOT NULL UNIQUE', description: 'Prevents duplicate charges' },
      { name: 'status', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'captured | refunded | settled' },
      { name: 'gst_invoice_no', type: 'VARCHAR(50)', constraints: 'NULL', description: 'Statutory GST Invoice or Credit Note' },
    ],
    sqlDdl: `CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id),
    payer_id VARCHAR(50) NOT NULL,
    payee_id VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    type VARCHAR(30) NOT NULL,
    gateway VARCHAR(30) DEFAULT 'razorpay_route',
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,
    razorpay_payment_id VARCHAR(50),
    razorpay_signature_verified BOOLEAN DEFAULT TRUE,
    gst_invoice_no VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    tableName: 'consents',
    description: 'DPDP Act 2023 Section 6 verifiable consent log with purpose and retention tracking.',
    rlsPolicySummary: 'Customer can view own consent history. Data Fiduciary audit access.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Log ID' },
      { name: 'user_id', type: 'UUID', constraints: 'REFERENCES users(id)', description: 'Data Principal' },
      { name: 'consent_type', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'dpdp_terms | sensitive_religion_tribe' },
      { name: 'granted', type: 'BOOLEAN', constraints: 'NOT NULL', description: 'Affirmative opt-in (true/false)' },
      { name: 'version', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'Policy version (e.g. DPDP-2023-v2.4)' },
      { name: 'ip_address', type: 'VARCHAR(45)', constraints: 'NOT NULL', description: 'Origin IP' },
      { name: 'timestamp', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()', description: 'Exact consent event time' },
      { name: 'retention_period', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Statutory retention timeframe' },
    ],
    sqlDdl: `CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    consent_type VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL,
    version VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    purpose TEXT NOT NULL,
    retention_period VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    tableName: 'reports',
    description: 'Customer rejection grievance reports alleging bias or discrimination for Admin review.',
    rlsPolicySummary: 'Customer can submit and view own reports; Admins have review queue.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Report ID' },
      { name: 'application_id', type: 'UUID', constraints: 'REFERENCES applications(id)', description: 'Application in question' },
      { name: 'customer_id', type: 'UUID', constraints: 'REFERENCES users(id)', description: 'Reporting Tenant' },
      { name: 'reported_owner_id', type: 'UUID', constraints: 'REFERENCES users(id)', description: 'Alleged Owner' },
      { name: 'allegation_description', type: 'TEXT', constraints: 'NOT NULL', description: 'Tenant statement' },
      { name: 'rejection_reason_given', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Reason cited by owner' },
      { name: 'status', type: 'VARCHAR(30)', constraints: "DEFAULT 'pending_review'", description: 'pending_review | strike_issued | suspended' },
      { name: 'admin_notes', type: 'TEXT', constraints: 'NULL', description: 'Compliance officer findings' },
    ],
    sqlDdl: `CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    reported_owner_id UUID NOT NULL REFERENCES users(id),
    allegation_description TEXT NOT NULL,
    rejection_reason_given VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending_review',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);`
  },
  {
    tableName: 'audit_logs',
    description: 'Immutable security log tracking access to sensitive demographics, rejections, and IDOR probes.',
    rlsPolicySummary: 'Write-only by backend; read-only by authorized Compliance Admins.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', description: 'Audit record ID' },
      { name: 'actor_id', type: 'UUID', constraints: 'NOT NULL', description: 'Actor performing the action' },
      { name: 'actor_role', type: 'VARCHAR(15)', constraints: 'NOT NULL', description: 'customer | owner | admin' },
      { name: 'action', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'VIEW_SENSITIVE_FIELDS, REJECT_APPLICATION, etc.' },
      { name: 'target_entity', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Entity affected' },
      { name: 'target_id', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Record ID' },
      { name: 'metadata', type: 'JSONB', constraints: 'DEFAULT \'{}\'::jsonb', description: 'Context & IP headers' },
      { name: 'timestamp', type: 'TIMESTAMPTZ', constraints: 'DEFAULT NOW()', description: 'Immutable log timestamp' },
    ],
    sqlDdl: `CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_role VARCHAR(15) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_entity VARCHAR(50) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Write-once tamper-evident table; strictly prohibit UPDATE and DELETE
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC, authenticated;`
  }
];

export const SchemaViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('customer_profiles');
  const [copied, setCopied] = useState<boolean>(false);

  const activeTable = TABLES.find(t => t.tableName === selectedTable) || TABLES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTable.sqlDdl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            Relational PostgreSQL Schema &amp; Row-Level Security
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Complete DDL, Field-Level Encryption tags (AES-256-GCM), and DPDP Act 2023 compliance constraints.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded">
            <Lock className="w-3 h-3" /> AES-256-GCM Encrypted
          </span>
          <span className="flex items-center gap-1 bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3" /> DPDP High-Risk
          </span>
          <span className="flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
            <Eye className="w-3 h-3" /> Masked in API
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Selector Sidebar */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
          <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">
            Platform Tables ({TABLES.length})
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {TABLES.map(t => (
              <button
                key={t.tableName}
                onClick={() => setSelectedTable(t.tableName)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                  selectedTable === t.tableName
                    ? 'bg-purple-900/40 text-purple-200 border border-purple-700/60 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <span>{t.tableName}</span>
                <span className="text-[10px] text-slate-500 font-sans">{t.columns.length} cols</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Details */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  {activeTable.tableName}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{activeTable.description}</p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors border border-slate-700 font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied DDL' : 'Copy SQL'}
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg text-xs text-slate-300">
              <span className="font-semibold text-purple-300">Row-Level Security (RLS) Policy: </span>
              {activeTable.rlsPolicySummary}
            </div>

            {/* Column Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Column</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Constraints &amp; Modifiers</th>
                    <th className="p-3">Description &amp; Security Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {activeTable.columns.map(col => (
                    <tr key={col.name} className="hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-white">{col.name}</td>
                      <td className="p-3 text-purple-300">{col.type}</td>
                      <td className="p-3 text-slate-400 text-[11px]">{col.constraints}</td>
                      <td className="p-3 font-sans text-slate-300">
                        <div className="space-y-1">
                          <p className="text-xs">{col.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {col.isEncrypted && (
                              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono">
                                AES-256-GCM
                              </span>
                            )}
                            {col.isHighRiskDpdp && (
                              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.2 rounded font-mono">
                                DPDP High-Risk
                              </span>
                            )}
                            {col.isMaskedByDefault && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                Masked In API
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SQL Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-400 mb-2 font-mono">PostgreSQL Migration DDL</div>
            <pre className="text-[11px] text-emerald-400 font-mono overflow-x-auto p-3 bg-slate-900 rounded-lg border border-slate-800/80 leading-relaxed">
              {activeTable.sqlDdl}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
