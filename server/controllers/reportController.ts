import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { db, DBRejectionReport } from '../db/database';

const createReportSchema = z.object({
  applicationId: z.string().min(1),
  reportedOwnerId: z.string().min(1),
  allegationDescription: z.string().min(10, 'Allegation description must be at least 10 characters'),
  rejectionReasonGiven: z.string().optional(),
});

export class ReportController {
  public static async createReport(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ error: 'Only tenants can file grievance reports.' });
      }

      const data = createReportSchema.parse(req.body);
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const report: DBRejectionReport = {
        id: reportId,
        applicationId: data.applicationId,
        customerId: user.id,
        reportedOwnerId: data.reportedOwnerId,
        allegationDescription: data.allegationDescription,
        rejectionReasonGiven: data.rejectionReasonGiven,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      };

      const saved = await db.createReport(report);

      await db.logAudit({
        userId: user.id,
        action: 'GRIEVANCE_REPORT_SUBMITTED',
        category: 'COMPLIANCE',
        details: `Tenant filed grievance against owner ${data.reportedOwnerId} on application ${data.applicationId}`,
      });

      return res.status(201).json({ success: true, report: saved });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to submit report' });
    }
  }

  public static async getReports(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const reports = await db.getReports(user.id, user.role);
      return res.json({ success: true, reports });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve reports' });
    }
  }

  public static async updateReportStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only administrators can adjudicate grievances.' });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;
      const updated = await db.updateReportStatus(id, status, adminNotes);
      if (!updated) return res.status(404).json({ error: 'Report not found' });

      await db.logAudit({
        userId: user.id,
        action: 'GRIEVANCE_REPORT_ADJUDICATED',
        category: 'COMPLIANCE',
        details: `Admin changed report ${id} status to ${status}: ${adminNotes || 'No notes'}`,
      });

      return res.json({ success: true, report: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update report' });
    }
  }
}
