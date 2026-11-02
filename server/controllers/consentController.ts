import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { db, DBConsentLog } from '../db/database';

const logConsentSchema = z.object({
  consentType: z.string().min(1),
  granted: z.boolean().default(true),
  version: z.string().default('v1.0'),
  purpose: z.string().min(1),
  retentionPeriod: z.string().default('7 years'),
});

export class ConsentController {
  public static async logConsent(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const data = logConsentSchema.parse(req.body);
      const consentId = `cst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const consent: DBConsentLog = {
        id: consentId,
        userId: user.id,
        consentType: data.consentType,
        granted: data.granted,
        version: data.version,
        ipAddress: req.ip || '',
        purpose: data.purpose,
        retentionPeriod: data.retentionPeriod,
        timestamp: new Date().toISOString(),
      };

      const saved = await db.logConsent(consent);

      await db.logAudit({
        userId: user.id,
        action: 'DPDP_CONSENT_LOGGED',
        category: 'DPDP',
        details: `Recorded consent for ${data.consentType} (Granted: ${data.granted})`,
      });

      return res.status(201).json({ success: true, consent: saved });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to record consent' });
    }
  }

  public static async getConsents(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const consents = await db.getConsents(user.id);
      return res.json({ success: true, consents });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve consents' });
    }
  }
}
