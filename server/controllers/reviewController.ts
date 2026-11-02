import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { db, DBReview } from '../db/database';
import { checkReviewContent } from '../../src/utils/moderationUtils';

const createReviewSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  propertyRating: z.number().int().min(1).max(5),
  ownerRating: z.number().int().min(1).max(5),
  title: z.string().min(3, 'Review title must be at least 3 characters').max(150),
  reviewText: z.string().min(10, 'Review comment must be at least 10 characters').max(2000),
  maintenanceRating: z.number().int().min(1).max(5).optional(),
  cleanlinessRating: z.number().int().min(1).max(5).optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  depositReturnRating: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
});

const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'flagged', 'pending_moderation']),
  moderationNotes: z.string().optional(),
});

const ownerResponseSchema = z.object({
  response: z.string().min(2, 'Response must be at least 2 characters').max(1500),
});

const flagReviewSchema = z.object({
  reason: z.string().min(3, 'Flagging reason is required').max(500),
});

export class ReviewController {
  /**
   * Retrieves reviews with optional filters (listingId, ownerId, tenantId, moderationStatus)
   */
  public static async getReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { listingId, ownerId, tenantId, status } = req.query;

      const filter: {
        listingId?: string;
        ownerId?: string;
        tenantId?: string;
        moderationStatus?: string;
      } = {};

      if (listingId) filter.listingId = String(listingId);
      if (ownerId) filter.ownerId = String(ownerId);
      if (tenantId) filter.tenantId = String(tenantId);

      // Visibility rules:
      // Admins can see all statuses.
      // Owners can see approved reviews for their properties, and their own property reviews even if flagged.
      // Tenants can see their own reviews in any state.
      // General public / unauthenticated can only see 'approved'.
      if (status && user?.role === 'ADMIN') {
        filter.moderationStatus = String(status);
      } else if (!user || (user.role !== 'ADMIN' && !ownerId && !tenantId)) {
        filter.moderationStatus = 'approved';
      }

      const reviews = await db.getReviews(filter);

      // Compute summary stats if requested for owner
      let summary = null;
      if (ownerId) {
        const approvedReviews = reviews.filter((r) => r.moderationStatus === 'approved');
        const count = approvedReviews.length;
        if (count > 0) {
          const totalOwnerRating = approvedReviews.reduce((sum, r) => sum + r.ownerRating, 0);
          const totalPropertyRating = approvedReviews.reduce((sum, r) => sum + r.propertyRating, 0);
          const totalOverallRating = approvedReviews.reduce((sum, r) => sum + r.overallRating, 0);

          const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          approvedReviews.forEach((r) => {
            const rounded = Math.round(r.overallRating) as 1 | 2 | 3 | 4 | 5;
            if (distribution[rounded] !== undefined) {
              distribution[rounded] += 1;
            }
          });

          summary = {
            ownerId: String(ownerId),
            totalReviews: count,
            averageOwnerRating: Number((totalOwnerRating / count).toFixed(1)),
            averagePropertyRating: Number((totalPropertyRating / count).toFixed(1)),
            overallRating: Number((totalOverallRating / count).toFixed(1)),
            distribution,
          };
        }
      }

      return res.json({ success: true, reviews, summary });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve reviews' });
    }
  }

  /**
   * Retrieves a single review by ID
   */
  public static async getReviewById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const review = await db.findReviewById(id);
      if (!review) return res.status(404).json({ error: 'Review not found' });

      return res.json({ success: true, review });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve review' });
    }
  }

  /**
   * Creates a review for a concluded agreement
   */
  public static async createReview(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized: User authentication required' });
      if (user.role !== 'CUSTOMER') {
        return res.status(403).json({ error: '403_FORBIDDEN: Only tenants can submit property reviews.' });
      }

      const data = createReviewSchema.parse(req.body);

      // Verify the rental agreement exists and belongs to this tenant
      const agreement = await db.findAgreementById(data.agreementId);
      if (!agreement) {
        return res.status(404).json({ error: 'Rental agreement not found.' });
      }

      if (agreement.tenantId !== user.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You are not the tenant on this rental agreement.' });
      }

      // STRICT VALIDATION: Agreement MUST be concluded or terminated
      if (agreement.status !== 'concluded' && agreement.status !== 'terminated') {
        return res.status(400).json({
          error:
            '400_BAD_REQUEST: Reviews can only be submitted after your rental agreement concludes. Current status is: ' +
            agreement.status,
        });
      }

      // Check for duplicate review on this agreement
      const existing = await db.findReviewByAgreementId(data.agreementId);
      if (existing) {
        return res.status(409).json({
          error: '409_CONFLICT: You have already submitted a review for this concluded rental agreement.',
        });
      }

      // Automated Content Moderation Check
      const moderationResult = checkReviewContent(data.title, data.reviewText);

      const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const overallRating = Number(((data.propertyRating + data.ownerRating) / 2).toFixed(2));

      const newReview: DBReview = {
        id: reviewId,
        agreementId: agreement.id,
        listingId: agreement.listingId,
        propertyTitle: agreement.propertyTitle,
        tenantId: user.id,
        tenantName: user.fullName || agreement.tenantName,
        ownerId: agreement.ownerId,
        ownerName: agreement.ownerName,
        propertyRating: data.propertyRating,
        ownerRating: data.ownerRating,
        overallRating,
        maintenanceRating: data.maintenanceRating,
        cleanlinessRating: data.cleanlinessRating,
        communicationRating: data.communicationRating,
        depositReturnRating: data.depositReturnRating,
        title: data.title.trim(),
        reviewText: data.reviewText.trim(),
        tags: data.tags || [],
        moderationStatus: moderationResult.recommendedStatus,
        flaggedReason: moderationResult.flaggedReason,
        autoModerated: true,
        createdAt: new Date().toISOString(),
      };

      const saved = await db.createReview(newReview);

      // Log to audit trail
      await db.logAudit({
        userId: user.id,
        action: 'REVIEW_SUBMITTED',
        category: 'CUSTOMER_REVIEW',
        details: `Tenant ${user.fullName} reviewed agreement ${agreement.id} for property ${agreement.propertyTitle}. Moderation status: ${saved.moderationStatus}.`,
      });

      return res.status(201).json({
        success: true,
        review: saved,
        moderation: {
          status: saved.moderationStatus,
          isClean: moderationResult.isClean,
          notice: moderationResult.isClean
            ? 'Your review has been verified and published.'
            : 'Your review was received and is pending editorial moderation.',
        },
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to submit review' });
    }
  }

  /**
   * Admin Moderation Endpoint: Approve, Reject, or Flag review
   */
  public static async moderateReview(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: '403_FORBIDDEN: Admin permissions required for moderation.' });
      }

      const { id } = req.params;
      const data = moderateReviewSchema.parse(req.body);

      const updated = await db.updateReviewModeration(id, data.status, {
        moderatedBy: user.id,
        moderationNotes: data.moderationNotes,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      await db.logAudit({
        userId: user.id,
        action: 'REVIEW_MODERATED',
        category: 'ADMIN_MODERATION',
        details: `Admin ${user.fullName} set review ${id} moderation status to ${data.status}. Notes: ${data.moderationNotes || 'none'}.`,
      });

      return res.json({ success: true, review: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to moderate review' });
    }
  }

  /**
   * Owner Response Endpoint: Allows owner to post a public response to a review
   */
  public static async respondToReview(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
        return res.status(403).json({ error: '403_FORBIDDEN: Only property owners can respond to reviews.' });
      }

      const { id } = req.params;
      const data = ownerResponseSchema.parse(req.body);

      const review = await db.findReviewById(id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      if (user.role !== 'ADMIN' && review.ownerId !== user.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You are not the owner for this reviewed property.' });
      }

      const updated = await db.addOwnerResponse(id, user.id, data.response.trim());

      await db.logAudit({
        userId: user.id,
        action: 'OWNER_REVIEW_RESPONSE',
        category: 'OWNER_ENGAGEMENT',
        details: `Owner ${user.fullName} responded to review ${id}.`,
      });

      return res.json({ success: true, review: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add owner response' });
    }
  }

  /**
   * User or Owner Flagging Endpoint: Flag inappropriate review for admin inspection
   */
  public static async flagReview(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const data = flagReviewSchema.parse(req.body);

      const updated = await db.flagReview(id, `Reported by ${user.fullName} (${user.role}): ${data.reason}`);
      if (!updated) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      await db.logAudit({
        userId: user.id,
        action: 'REVIEW_REPORTED',
        category: 'COMMUNITY_SAFETY',
        details: `User ${user.fullName} flagged review ${id}: ${data.reason}`,
      });

      return res.json({
        success: true,
        message: 'Review has been reported to administrators for community guidelines inspection.',
        review: updated,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to flag review' });
    }
  }
}
