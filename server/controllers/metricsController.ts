import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db/database';

export class MetricsController {
  public static async getAdminMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const metrics = await db.getAdminMetrics();
      return res.json({ success: true, metrics });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve admin metrics' });
    }
  }

  public static async getOwnerMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const metrics = await db.getOwnerMetrics(user.id);
      return res.json({ success: true, metrics });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve owner metrics' });
    }
  }

  public static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const auditLogs = await db.getAuditLogs();
      return res.json({ success: true, auditLogs });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve audit logs' });
    }
  }
}
