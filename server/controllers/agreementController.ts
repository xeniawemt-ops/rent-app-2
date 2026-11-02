import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { db, DBRentalAgreement } from '../db/database';

const createAgreementSchema = z.object({
  applicationId: z.string().min(1),
  listingId: z.string().min(1),
  propertyTitle: z.string().min(1),
  propertyAddress: z.string().min(1),
  tenantId: z.string().min(1),
  tenantName: z.string().min(1),
  monthlyRent: z.number().positive(),
  securityDeposit: z.number().nonnegative(),
  commencementDate: z.string().min(1),
  tenancyPeriodMonths: z.number().int().min(1).default(11),
});

export class AgreementController {
  public static async getAgreements(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const agreements = await db.getAgreements(user.id, user.role);
      return res.json({ success: true, agreements });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve agreements' });
    }
  }

  public static async getAgreementById(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      const agreement = await db.findAgreementById(id);
      if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

      if (user?.role !== 'ADMIN' && agreement.tenantId !== user?.id && agreement.ownerId !== user?.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You are not a party to this agreement.' });
      }

      return res.json({ success: true, agreement });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve agreement' });
    }
  }

  public static async createAgreement(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Only owners or admins can generate agreements.' });
      }

      const data = createAgreementSchema.parse(req.body);
      const agreementId = `agr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const agreement: DBRentalAgreement = {
        id: agreementId,
        applicationId: data.applicationId,
        listingId: data.listingId,
        propertyTitle: data.propertyTitle,
        propertyAddress: data.propertyAddress,
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        ownerId: user.id,
        ownerName: user.fullName,
        monthlyRent: data.monthlyRent,
        securityDeposit: data.securityDeposit,
        commencementDate: data.commencementDate,
        tenancyPeriodMonths: data.tenancyPeriodMonths,
        status: 'draft',
        contractHash: `hash_${Date.now()}_sha256`,
        createdAt: new Date().toISOString(),
      };

      const saved = await db.createAgreement(agreement);
      return res.status(201).json({ success: true, agreement: saved });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create agreement' });
    }
  }

  public static async signAgreement(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const agreement = await db.findAgreementById(id);
      if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

      const role = user.id === agreement.tenantId ? 'customer' : user.id === agreement.ownerId ? 'owner' : null;
      if (!role) {
        return res.status(403).json({ error: '403_FORBIDDEN: You cannot sign this agreement.' });
      }

      const updated = await db.signAgreement(id, role);
      return res.json({ success: true, agreement: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to sign agreement' });
    }
  }

  public static async concludeAgreement(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const agreement = await db.findAgreementById(id);
      if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

      if (user.role !== 'ADMIN' && user.id !== agreement.ownerId && user.id !== agreement.tenantId) {
        return res.status(403).json({ error: '403_FORBIDDEN: You are not authorized to conclude this agreement.' });
      }

      const updated = await db.concludeAgreement(id);
      return res.json({ success: true, agreement: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to conclude agreement' });
    }
  }
}

