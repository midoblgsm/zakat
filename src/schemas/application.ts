import { z } from 'zod';

/**
 * Application form validation schemas for all 10 steps
 * Each step has its own schema that validates the specific section data
 */

// ============================================================
// Step 1: Demographics Schema
// ============================================================
export const demographicsSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  age: z
    .number({ required_error: 'Age is required', invalid_type_error: 'Age must be a number' })
    .min(18, 'Applicant must be at least 18 years old')
    .max(120, 'Please enter a valid age'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Please select your gender',
  }),
  ssn: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{4}$/, 'SSN must be in format XXX-XX-XXXX'),
  hasDriverLicense: z.boolean(),
  driverLicenseNumber: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed'], {
    required_error: 'Please select your marital status',
  }),
  primaryLanguage: z
    .string()
    .min(1, 'Primary language is required')
    .max(50, 'Language name too long'),
  speaksEnglish: z.boolean(),
  associatedMasjid: z.string().optional(),
}).refine(
  (data) => {
    if (data.hasDriverLicense) {
      return data.driverLicenseNumber && data.driverLicenseNumber.length > 0;
    }
    return true;
  },
  {
    message: 'Driver license number is required when you have a driver license',
    path: ['driverLicenseNumber'],
  }
);

export type DemographicsFormData = z.infer<typeof demographicsSchema>;

// ============================================================
// Step 2: Contact Information Schema
// ============================================================
export const addressSchema = z.object({
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

export const contactInfoSchema = z.object({
  address: addressSchema,
  phone: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$|^\d{10}$|^\d{3}-\d{3}-\d{4}$/, 'Please enter a valid phone number'),
  phoneSecondary: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$|^\d{10}$|^\d{3}-\d{3}-\d{4}$|^$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Please enter a valid email address'),
});

export type ContactInfoFormData = z.infer<typeof contactInfoSchema>;

// ============================================================
// Step 3: Household Information Schema
// ============================================================
export const householdMemberSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  age: z
    .number({ required_error: 'Age is required', invalid_type_error: 'Age must be a number' })
    .min(0, 'Age cannot be negative')
    .max(120, 'Please enter a valid age'),
  relationship: z
    .string()
    .min(2, 'Relationship is required')
    .max(50, 'Relationship description too long'),
  isDependent: z.boolean(),
  incomeSource: z.string().optional(),
});

export const householdSchema = z.object({
  members: z.array(householdMemberSchema),
  totalDependents: z.number().min(0).optional(),
});

export type HouseholdMemberFormData = z.infer<typeof householdMemberSchema>;
export type HouseholdFormData = z.infer<typeof householdSchema>;

// ============================================================
// Step 4: Financial Assets Schema
// ============================================================

// Helper to preprocess NaN values (from empty number inputs) to 0
const nanToZero = z.preprocess(
  (val) => (typeof val === 'number' && Number.isNaN(val) ? 0 : val),
  z.number({ invalid_type_error: 'Value must be a number' }).min(0, 'Value cannot be negative')
);

// Helper for optional number fields - converts NaN to undefined
const nanToUndefined = (schema: z.ZodNumber) =>
  z.preprocess(
    (val) => (typeof val === 'number' && Number.isNaN(val) ? undefined : val),
    schema.optional()
  );

export const assetItemSchema = z.object({
  value: nanToZero,
  description: z.string().max(500, 'Description too long').optional(),
});

export const assetsSchema = z.object({
  hasHouse: z.boolean(),
  house: assetItemSchema.optional(),
  hasBusiness: z.boolean(),
  business: assetItemSchema.optional(),
  hasCars: z.boolean(),
  cars: assetItemSchema.optional(),
  cashOnHand: nanToZero,
  cashInBank: nanToZero,
  otherAssets: z.array(assetItemSchema),
}).refine(
  (data) => {
    if (data.hasHouse && (!data.house || data.house.value === undefined)) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide house value',
    path: ['house', 'value'],
  }
).refine(
  (data) => {
    if (data.hasBusiness && (!data.business || data.business.value === undefined)) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide business value',
    path: ['business', 'value'],
  }
).refine(
  (data) => {
    if (data.hasCars && (!data.cars || data.cars.value === undefined)) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide cars value',
    path: ['cars', 'value'],
  }
);

export type AssetsFormData = z.infer<typeof assetsSchema>;

// ============================================================
// Step 5: Income & Debts Schema
// ============================================================
export const debtItemSchema = z.object({
  amount: nanToZero,
  lender: z
    .string()
    .min(1, 'Lender name is required')
    .max(100, 'Lender name too long'),
  paymentFrequency: z.enum(['weekly', 'monthly', 'quarterly', 'annually'], {
    required_error: 'Payment frequency is required',
  }),
  purpose: z
    .string()
    .min(1, 'Purpose is required')
    .max(200, 'Purpose description too long'),
});

export const expenseItemSchema = z.object({
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category name too long'),
  amount: nanToZero,
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'semester'], {
    required_error: 'Frequency is required',
  }),
});

export const incomeDebtsSchema = z.object({
  monthlyIncome: nanToZero,
  incomeSource: z.string().max(200, 'Description too long').optional(),
  receivesGovernmentAid: z.boolean(),
  governmentAidDetails: z.string().max(500, 'Details too long').optional(),
  debts: z.array(debtItemSchema),
  expenses: z.array(expenseItemSchema),
}).refine(
  (data) => {
    if (data.receivesGovernmentAid && !data.governmentAidDetails) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide details about government aid received',
    path: ['governmentAidDetails'],
  }
);

export type DebtItemFormData = z.infer<typeof debtItemSchema>;
export type ExpenseItemFormData = z.infer<typeof expenseItemSchema>;
export type IncomeDebtsFormData = z.infer<typeof incomeDebtsSchema>;

// ============================================================
// Step 6: Living Circumstances Schema
// ============================================================
export const circumstancesSchema = z.object({
  residenceType: z.enum(['own', 'rent', 'shelter', 'subsidized', 'other'], {
    required_error: 'Please select residence type',
  }),
  residenceDetails: z.string().max(500, 'Details too long').optional(),
  rentAmount: nanToUndefined(z.number({ invalid_type_error: 'Rent must be a number' }).min(0, 'Rent cannot be negative')),
  sharesRent: z.boolean(),
  rentShareDetails: z.string().max(300, 'Details too long').optional(),

  transportationType: z.enum(['own_car', 'public', 'rideshare', 'other'], {
    required_error: 'Please select transportation type',
  }),
  transportationDetails: z.string().max(300, 'Details too long').optional(),

  employmentStatus: z.enum(['employed', 'unemployed', 'self_employed', 'retired', 'disabled'], {
    required_error: 'Please select employment status',
  }),
  employerName: z.string().max(100, 'Employer name too long').optional(),
  employerAddress: z.string().max(200, 'Address too long').optional(),

  hasHealthInsurance: z.boolean(),
  healthInsuranceType: z.string().max(100, 'Insurance type too long').optional(),

  educationLevel: z
    .string()
    .min(1, 'Education level is required')
    .max(100, 'Education level too long'),
}).refine(
  (data) => {
    if (data.residenceType === 'rent' && (data.rentAmount === undefined || data.rentAmount === null)) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide monthly rent amount',
    path: ['rentAmount'],
  }
).refine(
  (data) => {
    if (data.sharesRent && !data.rentShareDetails) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide details about rent sharing',
    path: ['rentShareDetails'],
  }
).refine(
  (data) => {
    if ((data.employmentStatus === 'employed' || data.employmentStatus === 'self_employed') && !data.employerName) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide employer/business name',
    path: ['employerName'],
  }
);

export type CircumstancesFormData = z.infer<typeof circumstancesSchema>;

// ============================================================
// Step 7: Zakat Request Schema
// ============================================================
export const zakatRequestSchema = z.object({
  isEligible: z.boolean(),
  reasonForApplication: z
    .string()
    .min(20, 'Please provide a detailed reason (at least 20 characters)')
    .max(2000, 'Reason is too long (max 2000 characters)'),
  assistanceType: z.preprocess(
    (val) => (val === null || val === '' ? undefined : val),
    z.enum(['monthly', 'one_time'], {
      required_error: 'Please select assistance type',
      invalid_type_error: 'Please select assistance type',
    })
  ),
  monthlyDuration: nanToUndefined(
    z.number({ invalid_type_error: 'Duration must be a number' })
      .min(1, 'Duration must be at least 1 month')
      .max(12, 'Duration cannot exceed 12 months')
  ),
  amountRequested: z.preprocess(
    (val) => (typeof val === 'number' && Number.isNaN(val) ? 0 : val),
    z.number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
      .min(1, 'Amount must be greater than 0')
      .max(100000, 'Amount seems too high, please verify')
  ),
}).refine(
  (data) => {
    if (data.assistanceType === 'monthly' && !data.monthlyDuration) {
      return false;
    }
    return true;
  },
  {
    message: 'Please specify the duration for monthly assistance',
    path: ['monthlyDuration'],
  }
);

export type ZakatRequestFormData = z.infer<typeof zakatRequestSchema>;

// ============================================================
// Step 8: References Schema
// ============================================================
export const referenceSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long'),
  phone: z
    .string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$|^\d{10}$|^\d{3}-\d{3}-\d{4}$/, 'Please enter a valid phone number'),
  relationship: z
    .string()
    .min(2, 'Relationship is required')
    .max(50, 'Relationship description too long'),
  address: z
    .string()
    .min(5, 'Address is required')
    .max(200, 'Address too long'),
  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City name too long'),
  state: z
    .string()
    .length(2, 'Please select a state'),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'Zip code must be 5 digits'),
});

export const referencesSchema = z.object({
  references: z
    .array(referenceSchema)
    .min(2, 'At least 2 references are required')
    .max(5, 'Maximum 5 references allowed'),
});

export type ReferenceFormData = z.infer<typeof referenceSchema>;
export type ReferencesFormData = z.infer<typeof referencesSchema>;

// ============================================================
// Step 9: Documents Schema
// ============================================================
export const documentFileSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  storagePath: z.string().min(1, 'Storage path is required'),
  uploadedAt: z.date().or(z.string()),
  verified: z.boolean().default(false),
});

export const documentsSchema = z.object({
  photoId: documentFileSchema.optional(),
  ssnCard: documentFileSchema.optional(),
  leaseAgreement: documentFileSchema.optional(),
  otherDocuments: z.array(documentFileSchema),
  acknowledgement: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge that the documents are accurate',
  }),
});

export type DocumentFileFormData = z.infer<typeof documentFileSchema>;
export type DocumentsFormData = z.infer<typeof documentsSchema>;

// ============================================================
// Step 10: Previous Applications & Review Schema
// ============================================================
export const previousOrgApplicationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name is required')
    .max(100, 'Name too long'),
  date: z.string().min(1, 'Date is required'),
  approved: z.boolean(),
});

export const previousApplicationsSchema = z.object({
  appliedToMHMA: z.boolean(),
  mhmaDate: z.string().optional(),
  mhmaOutcome: z.string().max(500, 'Outcome too long').optional(),
  otherOrganizations: z.array(previousOrgApplicationSchema),
}).refine(
  (data) => {
    if (data.appliedToMHMA && !data.mhmaDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Please provide the date of previous MHMA application',
    path: ['mhmaDate'],
  }
);

export type PreviousOrgApplicationFormData = z.infer<typeof previousOrgApplicationSchema>;
export type PreviousApplicationsFormData = z.infer<typeof previousApplicationsSchema>;

// ============================================================
// Final Review Schema (combines acknowledgements)
// ============================================================
export const reviewSchema = z.object({
  certifyAccurate: z.boolean().refine((val) => val === true, {
    message: 'You must certify that all information is accurate',
  }),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  consentToVerification: z.boolean().refine((val) => val === true, {
    message: 'You must consent to verification of information',
  }),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

// ============================================================
// Complete Application Schema
// ============================================================
export const applicationFormSchema = z.object({
  demographics: demographicsSchema,
  contact: contactInfoSchema,
  household: householdSchema,
  assets: assetsSchema,
  incomeDebts: incomeDebtsSchema,
  circumstances: circumstancesSchema,
  zakatRequest: zakatRequestSchema,
  references: referencesSchema,
  documents: documentsSchema,
  previousApplications: previousApplicationsSchema,
  review: reviewSchema,
});

export type ApplicationFormData = z.infer<typeof applicationFormSchema>;

// ============================================================
// Form Step Configuration
// ============================================================
export const FORM_STEPS = [
  { id: 'demographics', title: 'Demographics', schema: demographicsSchema },
  { id: 'contact', title: 'Contact Information', schema: contactInfoSchema },
  { id: 'household', title: 'Household', schema: householdSchema },
  { id: 'assets', title: 'Assets', schema: assetsSchema },
  { id: 'incomeDebts', title: 'Income & Debts', schema: incomeDebtsSchema },
  { id: 'circumstances', title: 'Circumstances', schema: circumstancesSchema },
  { id: 'zakatRequest', title: 'Zakat Request', schema: zakatRequestSchema },
  { id: 'references', title: 'References', schema: referencesSchema },
  { id: 'documents', title: 'Documents', schema: documentsSchema },
  { id: 'review', title: 'Review & Submit', schema: reviewSchema },
] as const;

export type FormStepId = (typeof FORM_STEPS)[number]['id'];
