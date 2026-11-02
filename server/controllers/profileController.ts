import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db/database';

const updateCustomerProfileSchema = z.object({
  name: z.string().min(1),
  age: z.number().min(18).default(21),
  gender: z.string().default('Prefer not to say'),
  occupation: z.string().default(''),
  maritalStatus: z.string().default('Prefer not to say'),
  familySize: z.number().min(1).default(1),
  hasPets: z.boolean().default(false),
  petType: z.string().optional(),
  religion: z.string().optional(),
  tribe: z.string().optional(),
  consentShareReligionTribe: z.boolean().default(false),
  languagePreference: z.enum(['en', 'hi']).default('en'),
});

const updateOwnerProfileSchema = z.object({
  fullName: z.string().min(1),
  phoneMasked: z.string().default(''),
  panMasked: z.string().optional(),
  panVerified: z.boolean().default(false),
  aadhaarMasked: z.string().optional(),
  aadhaarVerified: z.boolean().default(false),
  razorpayAccountId: z.string().optional(),
  bankAccountMasked: z.string().optional(),
});

export class ProfileController {
  public static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (user.role === 'CUSTOMER') {
        const profile = await db.getCustomerProfile(user.id);
        return res.json({
          success: true,
          profile: profile || {
            userId: user.id,
            name: user.email.split('@')[0],
            age: 21,
            gender: 'Prefer not to say',
            occupation: '',
            maritalStatus: 'Prefer not to say',
            familySize: 1,
            hasPets: false,
            consentShareReligionTribe: false,
            agreedDpdpNoticeAt: new Date().toISOString(),
            dpdpNoticeVersion: 'v1.0',
            languagePreference: 'en',
          },
        });
      } else if (user.role === 'OWNER') {
        const profile = await db.getOwnerProfile(user.id);
        return res.json({
          success: true,
          profile: profile || {
            userId: user.id,
            fullName: user.email.split('@')[0],
            phoneMasked: '',
            phoneEncrypted: '',
            panVerified: false,
            aadhaarVerified: false,
            agreedAntiDiscriminationTermsAt: new Date().toISOString(),
            strikesCount: 0,
            isSuspended: false,
          },
        });
      }

      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve profile' });
    }
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (user.role === 'CUSTOMER') {
        const data = updateCustomerProfileSchema.parse(req.body);
        const profile = await db.upsertCustomerProfile({
          id: `cp_${user.id}`,
          userId: user.id,
          name: data.name,
          age: data.age,
          gender: data.gender,
          occupation: data.occupation,
          maritalStatus: data.maritalStatus,
          familySize: data.familySize,
          hasPets: data.hasPets,
          petType: data.petType,
          religion: data.religion,
          tribe: data.tribe,
          consentShareReligionTribe: data.consentShareReligionTribe,
          religionTribeConsentTimestamp: data.consentShareReligionTribe ? new Date().toISOString() : undefined,
          agreedDpdpNoticeAt: new Date().toISOString(),
          dpdpNoticeVersion: 'v1.0',
          languagePreference: data.languagePreference,
        });
        return res.json({ success: true, profile });
      } else if (user.role === 'OWNER') {
        const data = updateOwnerProfileSchema.parse(req.body);
        const profile = await db.upsertOwnerProfile({
          id: `op_${user.id}`,
          userId: user.id,
          fullName: data.fullName,
          phoneMasked: data.phoneMasked || '',
          phoneEncrypted: '',
          panMasked: data.panMasked,
          panVerified: data.panVerified,
          aadhaarMasked: data.aadhaarMasked,
          aadhaarVerified: data.aadhaarVerified,
          razorpayAccountId: data.razorpayAccountId,
          bankAccountMasked: data.bankAccountMasked,
          agreedAntiDiscriminationTermsAt: new Date().toISOString(),
          strikesCount: 0,
          isSuspended: false,
        });
        return res.json({ success: true, profile });
      }

      return res.status(400).json({ error: 'Invalid user role for profile update' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update profile' });
    }
  }
}
