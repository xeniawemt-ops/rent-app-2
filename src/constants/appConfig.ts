/**
 * Central Application Configuration & Statutory Constants
 * NivasPay Technologies India
 */

export const APP_CONFIG = {
  name: 'NivasPay',
  legalName: 'NivasPay Technologies India Pvt. Ltd.',
  tagline: 'Home & Property Rental Marketplace',
  version: '2.4.1',
  lastUpdated: 'October 2026',
  governingLaw: 'India',
  jurisdiction: 'Courts of competent jurisdiction in India',
  
  // Contacts
  supportEmail: 'support@nivaspay.in',
  grievanceEmail: 'grievance@nivaspay.in',
  refundsEmail: 'refunds@nivaspay.in',
  complianceEmail: 'compliance@nivaspay.in',
  phone: '+91 80 4567 8900',
  supportHours: 'Monday to Saturday, 9:00 AM – 7:00 PM IST',
  
  // Privacy & Compliance Badges
  privacyStatusBadge: 'Privacy Protected',
  securityStatusBadge: 'Privacy & Security Verified',
  
  // Payment Types supported by the application
  paymentTypes: [
    { id: 'application_fee', label: 'Application Fee', description: 'Tenancy application processing fee (₹20, Non-refundable)' },
    { id: 'brokerage', label: 'Brokerage Fee', description: 'Applicable upon acceptance (10% of one month\'s rent)' },
    { id: 'security_deposit', label: 'Security Deposit', description: 'Refundable security deposit balance' },
    { id: 'rent_payment', label: 'Monthly Rent', description: 'Scheduled rental payment' },
    { id: 'platform_fee', label: 'Platform Service Fee', description: 'Marketplace technology service fee' },
    { id: 'maintenance_charge', label: 'Society / Maintenance Charge', description: 'Residential maintenance dues' },
  ],

  // Permitted Property States
  propertyStates: [
    'draft',
    'pending_verification',
    'published',
    'available',
    'application_received',
    'reserved',
    'rented',
    'unavailable',
    'suspended'
  ] as const,

  // Application Pipeline Stages
  applicationStages: [
    { key: 'enquiry', label: 'Property Enquiry' },
    { key: 'viewing_scheduled', label: 'Property Viewing' },
    { key: 'pending', label: 'Application Submitted' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'approved', label: 'Application Approved' },
    { key: 'payment_required', label: 'Deposit Payment Required' },
    { key: 'payment_completed', label: 'Payment Completed' },
    { key: 'agreement_pending', label: 'Rental Agreement Pending' },
    { key: 'agreement_completed', label: 'Agreement Signed' },
    { key: 'active_tenancy', label: 'Active Tenancy' },
    { key: 'rejected', label: 'Application Declined' },
  ]
};
