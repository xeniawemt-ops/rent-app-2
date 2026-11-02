import React, { useState } from 'react';
import {
  X,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ChevronDown,
  Building,
  CreditCard,
  Lock,
  RotateCcw
} from 'lucide-react';
import { APP_CONFIG } from '../../constants/appConfig';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy?: () => void;
  onOpenRefunds?: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose,
  onOpenPrivacy,
  onOpenRefunds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  if (!isOpen) return null;

  const sections = [
    {
      num: 1,
      id: 'sec-1',
      title: 'Introduction',
      content: (
        <div className="space-y-3">
          <p>
            Welcome to <strong>{APP_CONFIG.name}</strong>, a proprietary technology marketplace operated by <strong>{APP_CONFIG.legalName}</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          </p>
          <p>
            {APP_CONFIG.name} provides a digital communications and payment aggregation platform connecting residential property owners, landlords, authorized property managers, prospective tenants, applicants, and, where legally permitted, licensed real estate agents or brokers (collectively, &quot;Users&quot;).
          </p>
          <p>
            By creating an account, accessing our website, mobile web application, or utilizing any of our APIs or payment infrastructure, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy.
          </p>
        </div>
      )
    },
    {
      num: 2,
      id: 'sec-2',
      title: 'Eligibility and Account',
      content: (
        <div className="space-y-3">
          <p>
            To register an account or use {APP_CONFIG.name}, you must be an individual at least eighteen (18) years of age and capable of entering into legally binding contracts under the Indian Contract Act, 1872. Accounts registered by minors are strictly void.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>You agree to provide true, accurate, current, and complete registration information during account creation.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials, login OTPs, and access tokens.</li>
            <li>You must promptly notify {APP_CONFIG.name} at {APP_CONFIG.supportEmail} if you suspect any unauthorized access to or compromise of your account.</li>
            <li>Each individual is limited to one personal user account unless expressly authorized in writing by {APP_CONFIG.name}.</li>
          </ul>
        </div>
      )
    },
    {
      num: 3,
      id: 'sec-3',
      title: 'Property Listings',
      content: (
        <div className="space-y-3">
          <p>
            Property owners, landlords, and authorized listing providers may publish property listings on {APP_CONFIG.name}.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li><strong>Authority to List:</strong> Listing providers represent and warrant that they are the lawful owner of the property or possess verifiable legal authorization from the lawful titleholder to advertise, offer for lease, and collect rental payments for the subject premises.</li>
            <li><strong>Marketplace Distinction:</strong> The publication or browsing of a property listing on {APP_CONFIG.name} does NOT automatically create a landlord-tenant relationship between any parties.</li>
            <li><strong>Accuracy of Specifications:</strong> All listing descriptions, room dimensions, monthly rent amounts, security deposit requirements, included furnishings, utility arrangements, and house rules must be truthful and accurate.</li>
            <li><strong>Prohibition of Phantom Listings:</strong> Fabricated listings, duplicative spam postings, ghost properties, and bait-and-switch pricing tactics are strictly prohibited and will trigger immediate account suspension.</li>
          </ul>
        </div>
      )
    },
    {
      num: 4,
      id: 'sec-4',
      title: 'Property Verification and Accuracy',
      content: (
        <div className="space-y-3">
          <p>
            {APP_CONFIG.name} employs digital verification checks, such as government identity checks (PAN verification, Aadhaar verification via DigiLocker), phone number verification, and owner self-attestation.
          </p>
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-amber-900 text-xs leading-relaxed">
            <strong>Important Notice Regarding Verification:</strong> Verification badges or status indicators (e.g., &quot;Verified Owner&quot; or &quot;Verified Listing&quot;) denote solely that the user completed our platform verification workflow. Verification does NOT constitute an absolute legal guarantee, warranty, or certification by {APP_CONFIG.name} of lawful property ownership, title deeds, absence of encumbrances, structural safety, environmental habitability, or adherence to local municipal bylaws.
          </div>
          <p>
            Tenants are strongly encouraged to inspect the physical premises, verify utility connections, and review documentation prior to executing a long-term tenancy agreement.
          </p>
        </div>
      )
    },
    {
      num: 5,
      id: 'sec-5',
      title: 'Property Search and Availability',
      content: (
        <div className="space-y-3">
          <p>
            {APP_CONFIG.name} provides search, discovery, and filtering tools based on objective parameters including locality, rental budget, bedroom configuration (BHK), property type, and furnishing.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Search results and availability are subject to real-time updates and owner actions.</li>
            <li>When a property has been rented, reserved, or placed under an executed tenancy agreement, the platform will update its state to &quot;Rented&quot; or &quot;Reserved&quot; and remove it from public search results.</li>
            <li>We do not guarantee that any listed property will remain available at the time of your application or inquiry.</li>
          </ul>
        </div>
      )
    },
    {
      num: 6,
      id: 'sec-6',
      title: 'Property Visits and Viewing',
      content: (
        <div className="space-y-3">
          <p>
            Prospective tenants may schedule in-person or virtual property viewings through the application.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Property viewings are conducted at the mutual convenience of the owner and prospective tenant.</li>
            <li>Users must observe standard personal safety precautions during property viewings. {APP_CONFIG.name} does not accompany users to property visits and bears no liability for conduct, injuries, or property damage occurring during in-person visits.</li>
            <li>Neither party may charge unauthorized inspection fees or entry charges for viewing a property.</li>
          </ul>
        </div>
      )
    },
    {
      num: 7,
      id: 'sec-7',
      title: 'Rent, Security Deposit and Other Charges',
      content: (
        <div className="space-y-3">
          <p>
            All financial terms governing the tenancy must be clearly displayed prior to transaction confirmation:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li><strong>Monthly Rent:</strong> The recurring consideration payable by the tenant for peaceful residential occupancy.</li>
            <li><strong>Security Deposit:</strong> A refundable deposit remitted by the tenant to protect against physical damages or unpaid utility obligations, subject to the terms of the applicable rental agreement.</li>
            <li><strong>Application Fee:</strong> A fee of ₹20.00 charged upon application submission to cover preliminary applicant eligibility checks and technical processing. This fee is strictly non-refundable under all circumstances, including if the application is declined by the landlord or withdrawn by the applicant. It is not credited toward deposit, rent, or brokerage.</li>
            <li><strong>Brokerage:</strong> If the customer&apos;s application is accepted by the landlord, brokerage equal to 10% of one month&apos;s rent is payable. There is no additional customer platform fee after acceptance. Property owners do not pay brokerage.</li>
            <li><strong>Platform &amp; Service Fees:</strong> Platform technology and transaction servicing fees as indicated on checkout screens.</li>
            <li><strong>Taxes:</strong> Residential leasing and security deposits are exempt from GST. No separate GST or TDS calculations are levied on transactions.</li>
          </ul>
        </div>
      )
    },
    {
      num: 8,
      id: 'sec-8',
      title: 'Payments',
      content: (
        <div className="space-y-3">
          <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-2xl text-stone-900 font-medium">
            Mandatory In-App Payment Architecture: To protect both tenants and landlords from fraud, all rental-related payments (brokering fees, security deposits, monthly rent, and maintenance) must be processed through the {APP_CONFIG.name} application.
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li><strong>Authorized Providers:</strong> Payments are processed via RBI-authorized Payment Aggregators (including Razorpay and NPCI UPI direct integrations).</li>
            <li><strong>Payment Verification:</strong> Every payment undergoes server-side cryptographic signature verification and webhook reconciliation. A transaction is recorded as Successful only upon verified provider confirmation.</li>
            <li><strong>Unique Transaction Identifiers:</strong> Every transaction generates a unique alphanumeric reference ID, immutable ledger entry, and downloadable digital payment receipt.</li>
            <li><strong>Payment Credentials Safety:</strong> {APP_CONFIG.name} never stores raw credit/debit card numbers, CVV codes, or net banking passwords on its servers.</li>
            <li><strong>Prohibition of Off-Platform Payments:</strong> Circumventing platform payments via cash or external channels voids platform protections, dispute resolution mechanisms, and automated refund workflows.</li>
          </ul>
        </div>
      )
    },
    {
      num: 9,
      id: 'sec-9',
      title: 'Rental Agreement and Tenancy',
      content: (
        <div className="space-y-3">
          <p>
            The legal relationship of landlord and tenant is formally created ONLY through the execution of a valid, mutually accepted rental or lease agreement entered into between the owner and tenant.
          </p>
          <p>
            {APP_CONFIG.name} provides digital rental agreement templates and e-signature facilities as an administrative convenience. Users are advised to review the terms of their tenancy agreement, including notice periods, lock-in clauses, and maintenance covenants, or consult independent legal counsel if necessary.
          </p>
        </div>
      )
    },
    {
      num: 10,
      id: 'sec-10',
      title: 'Responsibilities of Property Owners and Landlords',
      content: (
        <div className="space-y-3">
          <p>Property owners and landlords using {APP_CONFIG.name} agree to:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Ensure the property is structurally sound, clean, and fit for human habitation upon the agreed move-in date.</li>
            <li>Possess valid title, leasehold rights, or power of attorney authorizing them to lease the premises.</li>
            <li>Refrain from unlawful discrimination based on religion, caste, gender, marital status, or ethnic origin, in accordance with applicable Indian constitutional and legal principles.</li>
            <li>Provide timely receipts for rent received and refund eligible security deposit amounts without unreasonable delay upon lawful vacation of the premises.</li>
            <li>Respect tenant privacy and provide reasonable advance notice prior to entering the premises for inspections or repairs.</li>
          </ul>
        </div>
      )
    },
    {
      num: 11,
      id: 'sec-11',
      title: 'Responsibilities of Tenants and Applicants',
      content: (
        <div className="space-y-3">
          <p>Tenants and applicants using {APP_CONFIG.name} agree to:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Provide authentic identity, contact, and employment information during the application and KYC verification process.</li>
            <li>Pay rent and agreed utility dues promptly on or before the due date through the application.</li>
            <li>Use the residential property solely for lawful residential purposes and adhere to reasonable society rules and noise regulations.</li>
            <li>Maintain the property in good order and promptly report material structural or plumbing defects to the landlord.</li>
            <li>Not sublet, assign, or part with possession of the premises to third parties without prior written consent from the owner.</li>
          </ul>
        </div>
      )
    },
    {
      num: 12,
      id: 'sec-12',
      title: 'Agents and Brokers',
      content: (
        <div className="space-y-3">
          <p>
            Where real estate agents, brokers, or channel partners are permitted to list properties on {APP_CONFIG.name}:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Agents must hold valid Real Estate Regulatory Authority (RERA) registrations where mandated by law and display their RERA registration number on listings.</li>
            <li>Agents must possess verifiable written authority from the property owner to represent the property.</li>
            <li>Brokerage or service fees charged by agents must be explicitly disclosed up front and must not be surreptitiously added to tenant checkout totals.</li>
          </ul>
        </div>
      )
    },
    {
      num: 13,
      id: 'sec-13',
      title: 'Prohibited Activities',
      content: (
        <div className="space-y-3">
          <p>You agree not to engage in any of the following prohibited conduct:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Publishing fake, misleading, or deceptive property listings or photos.</li>
            <li>Impersonating any person or entity, or falsely claiming ownership or agency.</li>
            <li>Uploading forged identity documents, falsified salary certificates, or counterfeit lease deeds.</li>
            <li>Using {APP_CONFIG.name} to facilitate money laundering, tax evasion, or illegal transactions.</li>
            <li>Scraping, harvesting, spidering, or copying platform data, contact details, or listing photos without our prior written permission.</li>
            <li>Attempting to bypass platform security, access unauthorized user accounts (IDOR probes), or inject malicious code.</li>
            <li>Harassing, threatening, or defrauding any user or representative of {APP_CONFIG.name}.</li>
          </ul>
        </div>
      )
    },
    {
      num: 14,
      id: 'sec-14',
      title: 'User Content',
      content: (
        <div className="space-y-3">
          <p>
            Users may post content including listing photos, property descriptions, reviews, and ratings (&quot;User Content&quot;).
          </p>
          <p>
            You retain ownership of your User Content. By posting on {APP_CONFIG.name}, you grant {APP_CONFIG.name} a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute such content solely for operating, promoting, and improving the marketplace.
          </p>
          <p>
            We reserve the right, without obligation, to monitor, review, or remove User Content that violates these Terms or applicable law.
          </p>
        </div>
      )
    },
    {
      num: 15,
      id: 'sec-15',
      title: 'Privacy and Personal Information',
      content: (
        <div className="space-y-3">
          <p>
            Your privacy is of vital importance. Our processing of personal information is governed by our dedicated Privacy Policy and our <strong>Privacy Protected</strong> standards.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>We utilize field-level encryption (AES-256) for sensitive contact numbers and identity proofs.</li>
            <li>Exact street addresses and landlord phone numbers remain masked until an applicant&apos;s security deposit has been confirmed.</li>
            <li>Users may exercise rights to access, rectify, or request erasure of their personal information in accordance with our Privacy Policy.</li>
          </ul>
        </div>
      )
    },
    {
      num: 16,
      id: 'sec-16',
      title: 'Intellectual Property',
      content: (
        <div className="space-y-3">
          <p>
            All trademarks, logos, brand names, software code, user interface designs, graphics, and proprietary database schemas belonging to {APP_CONFIG.name} or {APP_CONFIG.legalName} are protected by copyright, trademark, and intellectual property laws of India.
          </p>
          <p>
            You may not reproduce, reverse engineer, decompile, modify, or create derivative works based upon the {APP_CONFIG.name} application without express written authorization.
          </p>
        </div>
      )
    },
    {
      num: 17,
      id: 'sec-17',
      title: 'Account Suspension or Termination',
      content: (
        <div className="space-y-3">
          <p>
            {APP_CONFIG.name} may immediately suspend, restrict, or terminate your account and access to the platform upon the occurrence of any of the following:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
            <li>Material breach of these Terms of Service or related policies.</li>
            <li>Detection of fraudulent transactions, chargebacks, or forged KYC documentation.</li>
            <li>Repeated customer grievances or proven discriminatory tenancy rejection practices (Three Strikes rule).</li>
            <li>Creating safety, security, or legal liability risks for other users or the platform.</li>
            <li>Directives received from law enforcement or judicial authorities in India.</li>
          </ul>
        </div>
      )
    },
    {
      num: 18,
      id: 'sec-18',
      title: 'Disclaimers',
      content: (
        <div className="space-y-3">
          <p className="uppercase text-[11px] font-semibold text-stone-500 tracking-wider">
            Provided &quot;As Is&quot; and &quot;As Available&quot;
          </p>
          <p>
            To the maximum extent permitted by applicable law, {APP_CONFIG.name} provides its marketplace and technology services on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind, whether express, implied, statutory, or otherwise.
          </p>
          <p>
            We specifically disclaim any implied warranties of merchantability, fitness for a particular residential purpose, title, quiet enjoyment, and non-infringement. We do not warrant that the application will be uninterrupted, error-free, or free of harmful components.
          </p>
        </div>
      )
    },
    {
      num: 19,
      id: 'sec-19',
      title: 'Limitation of Liability',
      content: (
        <div className="space-y-3">
          <p>
            To the fullest extent permitted by Indian law, neither {APP_CONFIG.legalName} nor its directors, officers, employees, or agents shall be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, loss of data, loss of goodwill, or property damage, arising out of or related to your use of the platform.
          </p>
          <p>
            In no event shall our total aggregate liability for all claims related to the service exceed the total amount of platform fees actually paid by you to {APP_CONFIG.name} in the three (3) months preceding the event giving rise to liability.
          </p>
          <p className="text-[11px] text-stone-500 italic">
            Nothing in these Terms limits or excludes liability that cannot legally be excluded under applicable consumer protection or contract laws of India.
          </p>
        </div>
      )
    },
    {
      num: 20,
      id: 'sec-20',
      title: 'Disputes Between Users',
      content: (
        <div className="space-y-3">
          <p>
            As a technology marketplace, {APP_CONFIG.name} is not a party to the rental agreement between landlords and tenants. Any disputes regarding property condition, repairs, lease termination, deposit deductions, or physical possession must be resolved directly between the landlord and tenant in accordance with their executed rental agreement and applicable state tenancy legislation.
          </p>
          <p>
            Users may utilize our platform grievance resolution mechanism to report non-responsive parties or alleged discriminatory conduct for compliance review.
          </p>
        </div>
      )
    },
    {
      num: 21,
      id: 'sec-21',
      title: 'Changes to These Terms',
      content: (
        <div className="space-y-3">
          <p>
            We reserve the right to revise, modify, or update these Terms of Service at any time to reflect changes in our services, technological architecture, or statutory requirements.
          </p>
          <p>
            When changes are made, we will update the &quot;Last Updated&quot; date at the top of these Terms and, where material, provide notice via email or in-app notification. Your continued use of {APP_CONFIG.name} after the revised Terms become effective constitutes your acceptance of the updated Terms.
          </p>
        </div>
      )
    },
    {
      num: 22,
      id: 'sec-22',
      title: 'Governing Law',
      content: (
        <div className="space-y-3">
          <p>
            These Terms of Service and any contractual or non-contractual disputes arising hereunder shall be governed by, construed, and enforced in accordance with the laws of <strong>India</strong>.
          </p>
          <p>
            Subject to statutory dispute resolution mechanisms, the courts of competent jurisdiction located in India shall have exclusive jurisdiction over any legal proceedings arising from or relating to these Terms or use of {APP_CONFIG.name}.
          </p>
        </div>
      )
    },
    {
      num: 23,
      id: 'sec-23',
      title: 'Contact Us',
      content: (
        <div className="space-y-3">
          <p>If you have any questions, feedback, or legal inquiries regarding these Terms of Service, please contact us at:</p>
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-1.5 font-mono text-stone-800">
            <div><strong>Company:</strong> {APP_CONFIG.legalName}</div>
            <div><strong>General Support:</strong> {APP_CONFIG.supportEmail}</div>
            <div><strong>Grievance Officer:</strong> {APP_CONFIG.grievanceEmail}</div>
            <div><strong>Refund Queries:</strong> {APP_CONFIG.refundsEmail}</div>
            <div><strong>Support Helpline:</strong> {APP_CONFIG.phone} ({APP_CONFIG.supportHours})</div>
            <div><strong>Jurisdiction:</strong> {APP_CONFIG.governingLaw}</div>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = searchQuery.trim()
    ? sections.filter(
        s =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.num.toString() === searchQuery.trim()
      )
    : sections;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 bg-stone-50/90 sticky top-0 z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-editorial text-xl sm:text-2xl font-bold text-stone-900">
                  Terms of Service
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 font-light mt-0.5">
                  <span className="font-medium text-stone-800">{APP_CONFIG.name}</span>
                  <span>&bull;</span>
                  <span className="font-mono text-[11px] bg-stone-200 px-2 py-0.5 rounded-full text-stone-700">
                    Version {APP_CONFIG.version}
                  </span>
                  <span>&bull;</span>
                  <span>Last Updated: {APP_CONFIG.lastUpdated}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-700 font-medium">India</span>
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

          {/* Search inside terms */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search in 23 Terms sections (e.g. Payments, Verification, Rent, Refunds)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
            />
          </div>
        </div>

        {/* Scrollable Content with all 23 Sections */}
        <div className="p-6 sm:p-8 overflow-y-auto text-stone-700 text-xs sm:text-sm space-y-6 leading-relaxed font-light">
          {filteredSections.map(sec => (
            <section
              key={sec.id}
              id={sec.id}
              className="border-b border-stone-100 pb-5 last:border-b-0 space-y-2.5"
            >
              <h3 className="font-editorial text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] flex items-center justify-center font-mono font-bold shrink-0">
                  {sec.num}
                </span>
                <span>{sec.title}</span>
              </h3>
              <div className="text-stone-700 pl-8 leading-relaxed font-light">
                {sec.content}
              </div>
            </section>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-10 text-stone-400">
              No sections matching &quot;{searchQuery}&quot;. Clear search to view all 23 sections.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacy();
                }}
                className="hover:text-stone-900 underline underline-offset-2 cursor-pointer"
              >
                Privacy Policy
              </button>
            )}
            <span>&bull;</span>
            {onOpenRefunds && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRefunds();
                }}
                className="hover:text-stone-900 underline underline-offset-2 cursor-pointer text-emerald-800 font-medium"
              >
                Refund Policy
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            I Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
