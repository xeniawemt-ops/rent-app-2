import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { db, DBApplication } from '../db/database';
import { PaymentManager } from '../services/paymentService';
import { applicationSubmissionSchema, formatZodErrors } from '../utils/validation';

import { NotificationService } from '../services/notificationService';

const applicationStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'under_review', 'accepted', 'rejected', 'active_tenancy', 'cancelled']),
  reasonCode: z.enum(['pets', 'family_size', 'occupation', 'budget_deposit_mismatch', 'incomplete_profile', 'other']).optional(),
  rejectionExplanation: z.string().max(500).optional(),
});

export class ApplicationController {
  public static async getApplications(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const applications = await db.getApplications(user.id, user.role, user.role === 'OWNER' ? user.id : undefined);
      return res.json({ success: true, applications });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve applications' });
    }
  }

  public static async getApplicationById(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const application = await db.findApplicationById(id);
      if (!application) {
        return res.status(404).json({ error: `404_NOT_FOUND: Application ${id} not found.` });
      }

      // Check access permission: CUSTOMER can only see their own; OWNER can only see applications for their property; ADMIN can see all
      if (user.role === 'CUSTOMER' && application.customerId !== user.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You cannot view applications submitted by other users.' });
      }

      if (user.role === 'OWNER') {
        const property = await db.findPropertyById(application.listingId);
        if (!property || property.ownerId !== user.id) {
          return res.status(403).json({ error: '403_FORBIDDEN: You do not own the property associated with this application.' });
        }
      }

      return res.json({ success: true, application });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve application' });
    }
  }

  public static async createApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ error: 'Only customers can submit tenancy applications.' });
      }

      const data = applicationSubmissionSchema.parse(req.body);

      // Verify that the listing actually exists in the database
      const property = await db.findPropertyById(data.listingId);
      if (!property) {
        return res.status(404).json({ error: `404_NOT_FOUND: Property ${data.listingId} does not exist.` });
      }

      const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newApp: DBApplication = {
        id: appId,
        listingId: data.listingId,
        customerId: user.id,
        applicantName: data.applicantName,
        applicantEmail: data.applicantEmail,
        monthlyIncome: data.monthlyIncome,
        status: 'pending',
        applicationFeePaid: false,
        createdAt: new Date().toISOString(),
      };

      const savedApp = await db.createApplication(newApp);

      // Automatically initiate the ₹20 non-refundable application fee payment on server
      const feePayment = await PaymentManager.initiatePayment({
        amount: 20, // ₹20 fixed application fee
        type: 'APPLICATION_FEE',
        payerId: user.id,
        payeeId: 'nivaspay_platform',
        applicationId: appId,
        propertyId: data.listingId,
      });

      await db.logAudit({
        userId: user.id,
        action: 'APPLICATION_CREATED',
        category: 'APPLICATIONS',
        details: `Application ${appId} created for listing ${data.listingId} with ₹20 fee order ${feePayment.orderId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        success: true,
        application: savedApp,
        payment: feePayment,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const formatted = formatZodErrors(err);
        return res.status(400).json({ error: formatted.message, fieldErrors: formatted.fieldErrors });
      }
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Updates application status with strict property ownership check.
   * Only the property owner (or admin) can approve/reject an application.
   */
  public static async updateApplicationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const parsed = applicationStatusUpdateSchema.parse(req.body);

      const application = await db.findApplicationById(id);
      if (!application) {
        return res.status(404).json({ error: `404_NOT_FOUND: Application ${id} not found.` });
      }

      // Verify listing exists
      const property = await db.findPropertyById(application.listingId);
      if (!property) {
        return res.status(404).json({ error: 'Listing for application not found.' });
      }

      // Check ownership
      if (user.role !== 'ADMIN' && property.ownerId !== user.id) {
        return res.status(403).json({
          error: '403_FORBIDDEN: You can only update application status for properties you own.',
        });
      }

      const updated = await db.updateApplicationStatus(id, parsed.status, {
        rejectionReasonCode: parsed.reasonCode,
        rejectionReasonExplanation: parsed.rejectionExplanation,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Failed to update application status.' });
      }

      let notificationReceipt = null;

      // Automated multi-channel notification for rejected applicants conforming to NivasPay transparency standards
      if (parsed.status === 'rejected') {
        const applicantUser = await db.findUserById(application.customerId);
        const applicantPhone = applicantUser?.phone || (application as any).applicantPhone;

        try {
          const alertResult = await NotificationService.sendRejectionAlert({
            applicationId: id,
            recipientName: application.applicantName || applicantUser?.fullName || 'Applicant',
            recipientEmail: application.applicantEmail || applicantUser?.email || '',
            recipientPhone: applicantPhone,
            propertyTitle: property.title || 'Residential Property',
            reasonCode: parsed.reasonCode || 'other',
            explanation: parsed.rejectionExplanation,
            ownerName: user.fullName || 'Property Owner',
          });

          notificationReceipt = {
            notificationId: alertResult.notificationId,
            channels: alertResult.channels,
            dispatchedAt: alertResult.record.dispatchedAt,
            status: alertResult.overallStatus,
            inAppStatus: alertResult.inAppStatus,
            emailStatus: alertResult.emailStatus,
            smsStatus: alertResult.smsStatus,
            emailDelivered: alertResult.emailDelivered,
            smsDelivered: alertResult.smsDelivered,
            reasonTitle: alertResult.record.reasonTitle,
          };

          await db.logAudit({
            userId: user.id,
            action: 'APPLICATION_REJECTED_ALERT_PROCESSED',
            category: 'NOTIFICATIONS',
            details: `Rejection notice processed for application ${id} to ${application.applicantEmail} (Status: ${alertResult.overallStatus}, InApp: ${alertResult.inAppStatus}, Email: ${alertResult.emailStatus}, SMS: ${alertResult.smsStatus})`,
            ipAddress: req.ip,
          });
        } catch (notifErr: any) {
          // Rule 6: Do not let a notification-provider failure undo an otherwise valid application rejection.
          console.error('[Notification Dispatch Non-Fatal Error]:', notifErr);
          notificationReceipt = {
            notificationId: `notif_err_${Date.now()}`,
            channels: ['EMAIL', 'SMS'],
            dispatchedAt: new Date().toISOString(),
            status: 'FAILED',
            inAppStatus: 'RECORDED',
            emailStatus: 'FAILED',
            smsStatus: 'FAILED',
            emailDelivered: false,
            smsDelivered: false,
            error: notifErr.message || 'Provider failure',
          };

          await db.logAudit({
            userId: user.id,
            action: 'APPLICATION_REJECTED_ALERT_FAILED',
            category: 'NOTIFICATIONS',
            details: `Notification dispatch failed for rejected application ${id}: ${notifErr.message}. Application rejection remained valid.`,
            ipAddress: req.ip,
          });
        }
      }

      await db.logAudit({
        userId: user.id,
        action: 'APPLICATION_STATUS_UPDATED',
        category: 'APPLICATIONS',
        details: `Application ${id} status updated from ${application.status} to ${parsed.status}${
          parsed.reasonCode ? ` (Reason: ${parsed.reasonCode})` : ''
        }`,
        ipAddress: req.ip,
      });

      return res.json({
        success: true,
        application: updated,
        notification: notificationReceipt,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const formatted = formatZodErrors(err);
        return res.status(400).json({ error: formatted.message, fieldErrors: formatted.fieldErrors });
      }
      return res.status(400).json({ error: err.message });
    }
  }
}
