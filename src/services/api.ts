import apiClient, { getApiErrorMessage } from './apiClient';
import {
  Listing,
  Application,
  PaymentRecord,
  RentalAgreement,
  PropertyReview,
  CustomerProfile,
  OwnerProfile,
  SafeUser,
  RejectionReport,
  ConsentLog,
  AuditLog,
} from '../types';

/**
 * Standard API Response envelope
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// 1. Authentication API
// ============================================================================
export const authApi = {
  async login(email: string, password: string, expectedRole?: string) {
    const res = await apiClient.post<{ success: boolean; token: string; user: any }>('/auth/login', {
      email,
      password,
      expectedRole: expectedRole ? expectedRole.toUpperCase() : undefined,
    });
    return res.data;
  },

  async signup(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: 'CUSTOMER' | 'OWNER';
  }) {
    const res = await apiClient.post<{ success: boolean; token: string; user: any }>('/auth/signup', data);
    return res.data;
  },

  async googleLogin(credential: string, role?: string) {
    const res = await apiClient.post<{ success: boolean; token: string; user: any }>('/auth/google', {
      credential,
      role: role ? role.toUpperCase() : undefined,
    });
    return res.data;
  },

  async refresh() {
    const res = await apiClient.post<{ success: boolean; token: string; user: any }>('/auth/refresh');
    return res.data;
  },

  async logout() {
    const res = await apiClient.post<{ success: boolean }>('/auth/logout');
    return res.data;
  },

  async getMe() {
    const res = await apiClient.get<any>('/auth/me');
    return res.data;
  },
};

// ============================================================================
// 2. Profile API
// ============================================================================
export const profileApi = {
  async getProfile(): Promise<{ customerProfile?: CustomerProfile; ownerProfile?: OwnerProfile }> {
    const res = await apiClient.get('/profile');
    return res.data;
  },

  async updateProfile(updates: Partial<CustomerProfile | OwnerProfile>) {
    const res = await apiClient.put('/profile', updates);
    return res.data;
  },
};

// ============================================================================
// 3. Properties API
// ============================================================================
export const propertiesApi = {
  async getProperties(params?: {
    ownerOnly?: boolean;
    category?: string;
    locality?: string;
    city?: string;
    minRent?: number;
    maxRent?: number;
    bhk?: string;
    accommodationType?: string;
  }): Promise<{ success: boolean; properties: Listing[]; count?: number }> {
    const res = await apiClient.get('/properties', { params });
    return res.data;
  },

  async getPropertyById(id: string): Promise<{ success: boolean; property: Listing }> {
    const res = await apiClient.get(`/properties/${id}`);
    return res.data;
  },

  async createProperty(propertyData: any): Promise<{ success: boolean; property: Listing }> {
    const res = await apiClient.post('/properties', propertyData);
    return res.data;
  },

  async updateProperty(id: string, updates: any): Promise<{ success: boolean; property: Listing }> {
    const res = await apiClient.put(`/properties/${id}`, updates);
    return res.data;
  },

  async deleteProperty(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/properties/${id}`);
    return res.data;
  },

  async saveProperty(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.post(`/properties/${id}/save`);
    return res.data;
  },

  async unsaveProperty(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/properties/${id}/save`);
    return res.data;
  },

  async getSavedProperties(): Promise<{ success: boolean; properties: Listing[] }> {
    const res = await apiClient.get('/properties/saved');
    return res.data;
  },

  async addUnit(propertyId: string, unitData: any) {
    const res = await apiClient.post(`/properties/${propertyId}/units`, unitData);
    return res.data;
  },

  async addRoom(propertyId: string, roomData: any) {
    const res = await apiClient.post(`/properties/${propertyId}/rooms`, roomData);
    return res.data;
  },

  async addBed(propertyId: string, roomId: string, bedData: any) {
    const res = await apiClient.post(`/properties/${propertyId}/rooms/${roomId}/beds`, bedData);
    return res.data;
  },

  async upsertPgMetadata(propertyId: string, metadata: any) {
    const res = await apiClient.post(`/properties/${propertyId}/pg-metadata`, metadata);
    return res.data;
  },

  async updateBedStatus(
    propertyId: string,
    bedId: string,
    payload: { status: string; tenantId?: string; expectedVersion?: number }
  ) {
    const res = await apiClient.patch(`/properties/${propertyId}/beds/${bedId}/status`, payload);
    return res.data;
  },
};

// ============================================================================
// 4. Tenancy Applications API
// ============================================================================
export const applicationsApi = {
  async getApplications(): Promise<{ success: boolean; applications: Application[] }> {
    const res = await apiClient.get('/applications');
    return res.data;
  },

  async getApplicationById(id: string): Promise<{ success: boolean; application: Application }> {
    const res = await apiClient.get(`/applications/${id}`);
    return res.data;
  },

  async createApplication(data: {
    listingId: string;
    applicantName: string;
    applicantEmail: string;
    monthlyIncome: number;
  }): Promise<{ success: boolean; application: Application; payment: any }> {
    const res = await apiClient.post('/applications', data);
    return res.data;
  },

  async updateStatus(
    id: string,
    status: 'pending' | 'under_review' | 'accepted' | 'rejected' | 'active_tenancy' | 'cancelled',
    details?: { reasonCode?: string; rejectionExplanation?: string }
  ): Promise<{ success: boolean; application: Application }> {
    const res = await apiClient.patch(`/applications/${id}/status`, {
      status,
      reasonCode: details?.reasonCode,
      rejectionExplanation: details?.rejectionExplanation,
    });
    return res.data;
  },
};

// ============================================================================
// 5. Rental Agreements API
// ============================================================================
export const agreementsApi = {
  async getAgreements(): Promise<{ success: boolean; agreements: RentalAgreement[] }> {
    const res = await apiClient.get('/agreements');
    return res.data;
  },

  async getAgreementById(id: string): Promise<{ success: boolean; agreement: RentalAgreement }> {
    const res = await apiClient.get(`/agreements/${id}`);
    return res.data;
  },

  async createAgreement(data: {
    applicationId: string;
    listingId: string;
    propertyTitle: string;
    propertyAddress: string;
    tenantId: string;
    tenantName: string;
    monthlyRent: number;
    securityDeposit: number;
    commencementDate: string;
    tenancyPeriodMonths?: number;
  }): Promise<{ success: boolean; agreement: RentalAgreement }> {
    const res = await apiClient.post('/agreements', data);
    return res.data;
  },

  async signAgreement(id: string): Promise<{ success: boolean; agreement: RentalAgreement }> {
    const res = await apiClient.post(`/agreements/${id}/sign`);
    return res.data;
  },

  async concludeAgreement(id: string): Promise<{ success: boolean; agreement: RentalAgreement }> {
    const res = await apiClient.post(`/agreements/${id}/conclude`);
    return res.data;
  },
};

// ============================================================================
// 6. Payments API
// ============================================================================
export const paymentsApi = {
  async getPayments(): Promise<{ success: boolean; payments: PaymentRecord[] }> {
    const res = await apiClient.get('/payments');
    return res.data;
  },

  async verifyPayment(data: {
    paymentId: string;
    orderId?: string;
    signature?: string;
    paymentType?: string;
    amount?: number;
    applicationId?: string;
    propertyId?: string;
  }): Promise<{ success: boolean; payment: any }> {
    const res = await apiClient.post('/payments/verify', data);
    return res.data;
  },
};

// ============================================================================
// 7. Reviews & Ratings API
// ============================================================================
export const reviewsApi = {
  async getReviews(filter?: { listingId?: string; ownerId?: string }): Promise<{ success: boolean; reviews: PropertyReview[] }> {
    const res = await apiClient.get('/reviews', { params: filter });
    return res.data;
  },

  async getReviewById(id: string): Promise<{ success: boolean; review: PropertyReview }> {
    const res = await apiClient.get(`/reviews/${id}`);
    return res.data;
  },

  async createReview(reviewData: any): Promise<{ success: boolean; review: PropertyReview }> {
    const res = await apiClient.post('/reviews', reviewData);
    return res.data;
  },

  async respondToReview(id: string, responseText: string): Promise<{ success: boolean; review: PropertyReview }> {
    const res = await apiClient.post(`/reviews/${id}/respond`, { response: responseText });
    return res.data;
  },

  async flagReview(id: string, reason: string): Promise<{ success: boolean; review: PropertyReview }> {
    const res = await apiClient.post(`/reviews/${id}/flag`, { reason });
    return res.data;
  },

  async moderateReview(
    id: string,
    status: 'approved' | 'rejected' | 'flagged',
    notes?: string
  ): Promise<{ success: boolean; review: PropertyReview }> {
    const res = await apiClient.patch(`/reviews/${id}/moderate`, { status, notes });
    return res.data;
  },
};

// ============================================================================
// 8. Reports & Grievances API
// ============================================================================
export const reportsApi = {
  async getReports(): Promise<{ success: boolean; reports: RejectionReport[] }> {
    const res = await apiClient.get('/reports');
    return res.data;
  },

  async createReport(data: {
    applicationId?: string;
    reportedOwnerId?: string;
    allegedGround: string;
    explanation: string;
    evidenceText?: string;
  }): Promise<{ success: boolean; report: RejectionReport }> {
    const res = await apiClient.post('/reports', data);
    return res.data;
  },

  async updateReportStatus(
    id: string,
    status: 'pending_review' | 'investigating' | 'upheld' | 'dismissed',
    adminNotes?: string
  ): Promise<{ success: boolean; report: RejectionReport }> {
    const res = await apiClient.patch(`/reports/${id}`, { status, adminNotes });
    return res.data;
  },
};

// ============================================================================
// 9. DPDP Consent API
// ============================================================================
export const consentApi = {
  async getConsents(): Promise<{ success: boolean; consents: ConsentLog[] }> {
    const res = await apiClient.get('/consent');
    return res.data;
  },

  async logConsent(data: {
    purpose: string;
    noticeVersion: string;
    action: 'GIVEN' | 'WITHDRAWN';
    scope?: string;
  }): Promise<{ success: boolean; consent: ConsentLog }> {
    const res = await apiClient.post('/consent', data);
    return res.data;
  },
};

// ============================================================================
// 10. Operational Metrics & Admin API
// ============================================================================
export const metricsApi = {
  async getAdminMetrics(): Promise<{ success: boolean; metrics: any }> {
    const res = await apiClient.get('/admin/metrics');
    return res.data;
  },

  async getAuditLogs(): Promise<{ success: boolean; logs: AuditLog[] }> {
    const res = await apiClient.get('/admin/audit-logs');
    return res.data;
  },

  async getOwnerMetrics(): Promise<{ success: boolean; metrics: any }> {
    const res = await apiClient.get('/owner/metrics');
    return res.data;
  },
};

// ============================================================================
// 11. Broker & Delegated Staff API
// ============================================================================
export const brokerApi = {
  async getAgency() {
    const res = await apiClient.get('/broker/agency');
    return res.data;
  },
  async getListings() {
    const res = await apiClient.get('/broker/listings');
    return res.data;
  },
  async getLeads() {
    const res = await apiClient.get('/broker/leads');
    return res.data;
  },
};

export const staffApi = {
  async getRmAssignments() {
    const res = await apiClient.get('/staff/rm/assignments');
    return res.data;
  },
  async getOperationsCases() {
    const res = await apiClient.get('/staff/operations/cases');
    return res.data;
  },
};

// ============================================================================
// 12. Health & Diagnostics API
// ============================================================================
export const systemApi = {
  async getHealth() {
    const res = await apiClient.get('/health');
    return res.data;
  },
};

export default {
  auth: authApi,
  profile: profileApi,
  properties: propertiesApi,
  applications: applicationsApi,
  agreements: agreementsApi,
  payments: paymentsApi,
  reviews: reviewsApi,
  reports: reportsApi,
  consent: consentApi,
  metrics: metricsApi,
  broker: brokerApi,
  staff: staffApi,
  system: systemApi,
  getErrorMessage: getApiErrorMessage,
};
