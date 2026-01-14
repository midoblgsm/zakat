import { z } from 'zod';

/**
 * Masjid form validation schemas
 */

// Address schema (reusable)
export const masjidAddressSchema = z.object({
  street: z
    .string()
    .min(5, 'Street address must be at least 5 characters')
    .max(200, 'Street address too long'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City name too long'),
  state: z
    .string()
    .length(2, 'Please select a state'),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Zip code must be 5 digits (or 5+4 format)'),
});

// Phone number regex
const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$|^\d{10}$|^\d{3}-\d{3}-\d{4}$/;

// Create masjid schema
export const createMasjidSchema = z.object({
  name: z
    .string()
    .min(3, 'Masjid name must be at least 3 characters')
    .max(100, 'Masjid name cannot exceed 100 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(phoneRegex, 'Please enter a valid phone number'),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  address: masjidAddressSchema,
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
});

export type CreateMasjidFormData = z.infer<typeof createMasjidSchema>;

// Update masjid profile schema
export const updateMasjidProfileSchema = z.object({
  name: z
    .string()
    .min(3, 'Masjid name must be at least 3 characters')
    .max(100, 'Masjid name cannot exceed 100 characters')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Please enter a valid phone number')
    .optional(),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  address: masjidAddressSchema.partial().optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  logo: z
    .string()
    .url('Please enter a valid logo URL')
    .optional()
    .or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color (e.g., #FF5733)')
    .optional()
    .or(z.literal('')),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color (e.g., #FF5733)')
    .optional()
    .or(z.literal('')),
  welcomeMessage: z
    .string()
    .max(500, 'Welcome message cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export type UpdateMasjidProfileFormData = z.infer<typeof updateMasjidProfileSchema>;

// Zakat configuration schema
export const zakatConfigSchema = z.object({
  nisabThreshold: z
    .number({ required_error: 'Nisab threshold is required' })
    .min(1, 'Nisab threshold must be greater than 0')
    .max(1000000, 'Nisab threshold seems too high'),
  assistanceTypes: z
    .array(z.enum(['monthly', 'one_time', 'emergency']))
    .min(1, 'At least one assistance type must be selected'),
  maxMonthlyAmount: z
    .number()
    .min(0, 'Amount cannot be negative')
    .max(100000, 'Amount seems too high')
    .optional(),
  maxOneTimeAmount: z
    .number()
    .min(0, 'Amount cannot be negative')
    .max(500000, 'Amount seems too high')
    .optional(),
  requiresReferences: z.boolean(),
  requiredDocuments: z
    .array(z.string())
    .min(1, 'At least one document type must be required'),
});

export type ZakatConfigFormData = z.infer<typeof zakatConfigSchema>;

// Admin assignment schema
export const assignAdminSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  masjidId: z.string().min(1, 'Masjid ID is required'),
  role: z.enum(['zakat_admin', 'super_admin']),
});

export type AssignAdminFormData = z.infer<typeof assignAdminSchema>;

// Create admin user schema
export const createAdminUserSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
  confirmPassword: z
    .string()
    .min(8, 'Password confirmation is required'),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters'),
  phone: z
    .string()
    .regex(phoneRegex, 'Please enter a valid phone number'),
  role: z.enum(['zakat_admin', 'super_admin']),
  masjidId: z.string().optional(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
).refine(
  (data) => {
    if (data.role === 'zakat_admin' && !data.masjidId) {
      return false;
    }
    return true;
  },
  {
    message: 'Masjid is required for Zakat Admin role',
    path: ['masjidId'],
  }
);

export type CreateAdminUserFormData = z.infer<typeof createAdminUserSchema>;

// Document required types
export const DOCUMENT_TYPES = [
  { value: 'photoId', label: 'Photo ID (Driver\'s License, State ID, or Passport)' },
  { value: 'ssnCard', label: 'Social Security Card' },
  { value: 'leaseAgreement', label: 'Lease Agreement / Rental Document' },
  { value: 'proofOfIncome', label: 'Proof of Income' },
  { value: 'bankStatements', label: 'Bank Statements' },
  { value: 'utilityBills', label: 'Utility Bills' },
  { value: 'medicalBills', label: 'Medical Bills' },
  { value: 'employmentVerification', label: 'Employment Verification' },
] as const;

// US States for dropdowns
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
] as const;
