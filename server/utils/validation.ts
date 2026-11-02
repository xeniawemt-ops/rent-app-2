import { z } from 'zod';

/**
 * Common security & sanitization regexes and helpers
 */
// Prevent script tags, event handlers, and dangerous HTML entities
const DANGEROUS_PATTERNS = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|onerror=|onload=/i;

const sanitizedString = (minLength = 1, maxLength = 255) =>
  z.string()
    .trim()
    .min(minLength, `Field must be at least ${minLength} characters`)
    .max(maxLength, `Field cannot exceed ${maxLength} characters`)
    .refine((val) => !DANGEROUS_PATTERNS.test(val), {
      message: 'Potentially malicious input detected',
    });

// Indian 10-digit phone number format (optional leading +91 or 0)
const phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;

// Indian PAN card format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Password policy: At least 8 chars, at least 1 uppercase, 1 lowercase, 1 digit
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password cannot exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Lenient password for backwards compatibility if needed during migration, but minimum 6 chars
export const loginPasswordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password cannot exceed 100 characters');

/**
 * 1. User Registration Schema
 */
export const userRegistrationSchema = z.object({
  email: z.string()
    .trim()
    .toLowerCase()
    .email('Invalid email address format')
    .max(255, 'Email cannot exceed 255 characters'),
  password: passwordSchema,
  fullName: sanitizedString(2, 100),
  role: z.enum([
    'CUSTOMER',
    'OWNER',
  ]),
  phone: z.string()
    .trim()
    .regex(phoneRegex, 'Invalid phone number format. Must be a valid 10-digit Indian phone number.')
    .optional()
    .or(z.literal('')),
});

export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;

/**
 * User Login Schema
 */
export const userLoginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email or username is required')
    .max(255, 'Identifier cannot exceed 255 characters'),
  password: loginPasswordSchema,
  expectedRole: z.enum([
    'CUSTOMER',
    'OWNER',
    'BROKER_ADMIN',
    'BROKER_STAFF',
    'NIVASPAY_RM',
    'OPERATIONS_MANAGER',
    'ADMIN',
  ]).optional(),
});

export type UserLoginInput = z.infer<typeof userLoginSchema>;

/**
 * 2. Property Creation Schema
 */
export const residentialCategorySchema = z.enum([
  'APARTMENT',
  'INDEPENDENT_HOUSE',
  'VILLA',
  'PG',
  'HOSTEL',
  'SHARED_ROOM',
]);

export const propertyCreationSchema = z.object({
  title: sanitizedString(3, 150),
  bhk: z.enum([
    '1 RK',
    '1 BHK',
    '1.5 BHK',
    '2 BHK',
    '2.5 BHK',
    '3 BHK',
    '3.5 BHK',
    '4 BHK',
    '4+ BHK',
    'Penthouse',
    'Villa',
    'Studio',
  ]).or(sanitizedString(2, 30)),
  rentMonthly: z.number()
    .int('Monthly rent must be an integer')
    .min(1000, 'Monthly rent must be at least ₹1,000')
    .max(50000000, 'Monthly rent exceeds maximum allowed limit (₹5,00,00,000)'),
  securityDeposit: z.number()
    .int('Security deposit must be an integer')
    .min(0, 'Security deposit cannot be negative')
    .max(100000000, 'Security deposit exceeds maximum allowed limit'),
  locality: sanitizedString(2, 100),
  city: sanitizedString(2, 60),
  propertyType: z.enum([
    'Apartment',
    'Gated Community',
    'Independent House',
    'Villa',
    'Studio',
    'Commercial',
    'Penthouse',
  ]).or(sanitizedString(2, 50)),
  category: residentialCategorySchema,
  totalUnits: z.number()
    .int('Total units must be an integer')
    .min(1, 'Property must have at least 1 unit')
    .max(10000, 'Total units cannot exceed 10,000'),
  occupiedUnits: z.number()
    .int('Occupied units must be an integer')
    .min(0, 'Occupied units cannot be negative')
    .default(0),
  status: z.enum(['available', 'rented', 'maintenance', 'draft']).default('available'),
  description: sanitizedString(0, 2000).optional(),
  amenities: z.array(sanitizedString(1, 50)).max(50).or(z.string().transform(s => s.split(',').map(item => item.trim()).filter(Boolean))).optional(),
  photos: z.array(z.string()).or(z.string().transform(s => s.split(',').map(item => item.trim()).filter(Boolean))).optional(),
  requirements: z.record(z.string(), z.any()).optional(),
  approximateLat: z.number().optional(),
  approximateLng: z.number().optional(),
  fullAddressEncrypted: z.string().optional(),
  maskedAddressPreview: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqft: z.number().optional(),
  parking: z.number().optional(),
  suitableFor: z.string().optional(),
}).refine(
  (data) => data.occupiedUnits <= data.totalUnits,
  {
    message: 'Occupied units cannot exceed total units',
    path: ['occupiedUnits'],
  }
);

export const propertyUnitCreationSchema = z.object({
  unitNumber: sanitizedString(1, 64),
  unitType: sanitizedString(1, 64).default('Standard').optional(),
  floorNumber: z.number().int().optional(),
  bedrooms: z.number().int().min(0).default(1).optional(),
  bathrooms: z.number().int().min(0).default(1).optional(),
  bhk: z.string().optional(),
  rentMonthly: z.number().int().min(100, 'Unit rent must be at least ₹100'),
  securityDeposit: z.number().int().min(0, 'Security deposit cannot be negative').default(0),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
  availabilityStatus: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE').optional(),
  furnishingStatus: z.string().default('SEMI_FURNISHED').optional(),
  carpetAreaSqft: z.number().positive().optional(),
});

export const propertyRoomCreationSchema = z.object({
  roomNumber: sanitizedString(1, 64),
  roomType: z.enum(['PRIVATE_ROOM', 'SINGLE', 'DOUBLE_SHARING', 'TRIPLE_SHARING', 'FOUR_SHARING', 'DORMITORY']),
  totalBeds: z.number().int().min(1, 'Room must have at least 1 bed').default(1),
  occupiedBeds: z.number().int().min(0, 'Occupied beds cannot be negative').default(0),
  rentPerBed: z.number().int().min(100, 'Bed rent must be at least ₹100'),
  securityDeposit: z.number().int().min(0, 'Security deposit cannot be negative').default(0),
  attachedBathroom: z.boolean().default(false),
  hasBalcony: z.boolean().default(false),
  airConditioning: z.boolean().default(false),
  status: z.enum(['AVAILABLE', 'FULL', 'MAINTENANCE']).default('AVAILABLE'),
}).refine((data) => data.occupiedBeds <= data.totalBeds, {
  message: 'Occupied beds cannot exceed total beds',
  path: ['occupiedBeds'],
});

export const bedInventoryCreationSchema = z.object({
  bedNumber: sanitizedString(1, 64),
  bedType: z.enum(['SINGLE', 'BUNK_LOWER', 'BUNK_UPPER']).default('SINGLE'),
  rentMonthly: z.number().int().min(100, 'Bed rent must be at least ₹100'),
  securityDeposit: z.number().int().min(0, 'Security deposit cannot be negative').default(0),
  status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE']).default('AVAILABLE'),
  tenantId: z.string().optional().nullable(),
});

export const pgHostelMetadataSchema = z.object({
  foodIncluded: z.boolean().default(false),
  mealOfferings: z.array(z.string()).default([]),
  dietaryPolicy: z.enum(['VEG_ONLY', 'NON_VEG_ALLOWED', 'JAIN_AVAILABLE', 'ANY']).default('ANY'),
  genderPreference: z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'CO_ED', 'ALL']).default('ALL'),
  curfewTime: z.string().optional(),
  noticePeriodDays: z.number().int().min(0).default(30),
  gateClosingTime: z.string().optional(),
  wardenContactName: z.string().optional(),
  wardenContactPhone: z.string().optional(),
  visitorPolicy: z.string().optional(),
  guestRestrictions: z.string().optional(),
  smokingPolicy: z.string().optional(),
  minStayMonths: z.number().int().min(1).optional(),
  commonFacilities: z.array(z.string()).default([]),
  rulesAndRegulations: z.array(z.string()).default([]),
});

export const propertyQuerySchema = z.object({
  category: residentialCategorySchema.optional(),
  locality: z.string().optional(),
  city: z.string().optional(),
  minRent: z.coerce.number().optional(),
  maxRent: z.coerce.number().optional(),
  bhk: z.string().optional(),
  propertyType: z.string().optional(),
  accommodationType: z.string().optional(),
  furnishing: z.string().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  availability: z.string().optional(),
  genderPreference: z.string().optional(),
  meals: z.coerce.boolean().optional(),
  foodIncluded: z.coerce.boolean().optional(),
  dietaryPolicy: z.string().optional(),
  roomType: z.string().optional(),
  bedType: z.string().optional(),
  sharingArrangement: z.string().optional(),
  availableBeds: z.coerce.boolean().optional(),
  facilities: z.string().optional(),
  search: z.string().optional(),
  ownerOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10).optional(),
  cursor: z.string().optional(),
});

export type PropertyCreationInput = z.infer<typeof propertyCreationSchema>;

/**
 * 3. Application Submission Schema
 */
export const applicationSubmissionSchema = z.object({
  listingId: z.string()
    .trim()
    .min(1, 'Listing ID is required')
    .max(64, 'Listing ID is invalid')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Listing ID must contain only alphanumeric characters, underscores, or hyphens'),
  applicantName: sanitizedString(2, 100),
  applicantEmail: z.string()
    .trim()
    .toLowerCase()
    .email('Invalid applicant email address')
    .max(255),
  applicantPhone: z.string()
    .trim()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  monthlyIncome: z.number()
    .positive('Monthly income must be greater than zero')
    .min(5000, 'Monthly income must be at least ₹5,000')
    .max(100000000, 'Monthly income exceeds valid range'),
  employmentType: z.enum([
    'Salaried',
    'Self-Employed',
    'Business Owner',
    'Freelancer',
    'Student',
    'Other',
  ]).optional(),
  panNumber: z.string()
    .trim()
    .toUpperCase()
    .regex(panRegex, 'Invalid PAN format. Must match standard Indian PAN (e.g. ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  moveInDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Move-in date must be in YYYY-MM-DD format')
    .optional(),
  notes: sanitizedString(0, 1000).optional(),
});

export type ApplicationSubmissionInput = z.infer<typeof applicationSubmissionSchema>;

/**
 * Format Zod validation errors into a clean, human-readable string and key-value mapping
 */
export function formatZodErrors(error: z.ZodError): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'general';
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }

  const primaryMessage = error.issues[0]?.message || 'Validation failed';
  return {
    message: primaryMessage,
    fieldErrors,
  };
}
