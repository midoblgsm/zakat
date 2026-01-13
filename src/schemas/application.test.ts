import { describe, it, expect } from 'vitest';
import {
  demographicsSchema,
  contactInfoSchema,
  householdSchema,
  assetsSchema,
  incomeDebtsSchema,
  circumstancesSchema,
  zakatRequestSchema,
  referencesSchema,
  reviewSchema,
} from './application';

describe('Application Schemas', () => {
  describe('demographicsSchema', () => {
    it('should validate correct demographics data', () => {
      const validData = {
        fullName: 'John Doe',
        age: 35,
        gender: 'male',
        ssn: '123-45-6789',
        hasDriverLicense: false,
        maritalStatus: 'married',
        primaryLanguage: 'English',
        speaksEnglish: true,
      };

      const result = demographicsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid SSN format', () => {
      const invalidData = {
        fullName: 'John Doe',
        age: 35,
        gender: 'male',
        ssn: '12345678', // Invalid format
        hasDriverLicense: false,
        maritalStatus: 'married',
        primaryLanguage: 'English',
        speaksEnglish: true,
      };

      const result = demographicsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('ssn');
      }
    });

    it('should require driver license number when hasDriverLicense is true', () => {
      const invalidData = {
        fullName: 'John Doe',
        age: 35,
        gender: 'male',
        ssn: '123-45-6789',
        hasDriverLicense: true,
        // Missing driverLicenseNumber
        maritalStatus: 'married',
        primaryLanguage: 'English',
        speaksEnglish: true,
      };

      const result = demographicsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject age under 18', () => {
      const invalidData = {
        fullName: 'John Doe',
        age: 17,
        gender: 'male',
        ssn: '123-45-6789',
        hasDriverLicense: false,
        maritalStatus: 'single',
        primaryLanguage: 'English',
        speaksEnglish: true,
      };

      const result = demographicsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('contactInfoSchema', () => {
    it('should validate correct contact info', () => {
      const validData = {
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
        phone: '555-555-5555',
        email: 'test@example.com',
      };

      const result = contactInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
        phone: '555-555-5555',
        email: 'invalid-email',
      };

      const result = contactInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid zip code', () => {
      const invalidData = {
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '1234', // Too short
        },
        phone: '555-555-5555',
        email: 'test@example.com',
      };

      const result = contactInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('householdSchema', () => {
    it('should validate empty household members', () => {
      const validData = {
        members: [],
      };

      const result = householdSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate household with members', () => {
      const validData = {
        members: [
          {
            name: 'Jane Doe',
            age: 30,
            relationship: 'Spouse',
            isDependent: false,
          },
          {
            name: 'Baby Doe',
            age: 5,
            relationship: 'Child',
            isDependent: true,
          },
        ],
      };

      const result = householdSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('assetsSchema', () => {
    it('should validate assets with no property', () => {
      const validData = {
        hasHouse: false,
        hasBusiness: false,
        hasCars: false,
        cashOnHand: 500,
        cashInBank: 1000,
        otherAssets: [],
      };

      const result = assetsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require house value when hasHouse is true', () => {
      const invalidData = {
        hasHouse: true,
        // Missing house object
        hasBusiness: false,
        hasCars: false,
        cashOnHand: 500,
        cashInBank: 1000,
        otherAssets: [],
      };

      const result = assetsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('incomeDebtsSchema', () => {
    it('should validate income with no debts', () => {
      const validData = {
        monthlyIncome: 3000,
        incomeSource: 'Employment',
        receivesGovernmentAid: false,
        debts: [],
        expenses: [],
      };

      const result = incomeDebtsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require government aid details when receiving aid', () => {
      const invalidData = {
        monthlyIncome: 3000,
        receivesGovernmentAid: true,
        // Missing governmentAidDetails
        debts: [],
        expenses: [],
      };

      const result = incomeDebtsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('circumstancesSchema', () => {
    it('should validate complete circumstances', () => {
      const validData = {
        residenceType: 'rent',
        rentAmount: 1200,
        sharesRent: false,
        transportationType: 'public',
        employmentStatus: 'employed',
        employerName: 'ABC Company',
        hasHealthInsurance: true,
        healthInsuranceType: 'Employer-provided',
        educationLevel: 'bachelor',
      };

      const result = circumstancesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require rent amount when residence type is rent', () => {
      const invalidData = {
        residenceType: 'rent',
        // Missing rentAmount
        sharesRent: false,
        transportationType: 'public',
        employmentStatus: 'unemployed',
        hasHealthInsurance: false,
        educationLevel: 'high_school',
      };

      const result = circumstancesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('zakatRequestSchema', () => {
    it('should validate one-time assistance request', () => {
      const validData = {
        isEligible: true,
        reasonForApplication: 'I need help paying for medical bills after an unexpected surgery.',
        assistanceType: 'one_time',
        amountRequested: 2000,
      };

      const result = zakatRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate monthly assistance request', () => {
      const validData = {
        isEligible: true,
        reasonForApplication: 'I need help paying rent while looking for a new job.',
        assistanceType: 'monthly',
        monthlyDuration: 3,
        amountRequested: 500,
      };

      const result = zakatRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require monthlyDuration for monthly assistance', () => {
      const invalidData = {
        isEligible: true,
        reasonForApplication: 'I need help paying rent while looking for a new job.',
        assistanceType: 'monthly',
        // Missing monthlyDuration
        amountRequested: 500,
      };

      const result = zakatRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject reason that is too short', () => {
      const invalidData = {
        isEligible: true,
        reasonForApplication: 'Need money', // Too short
        assistanceType: 'one_time',
        amountRequested: 500,
      };

      const result = zakatRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('referencesSchema', () => {
    it('should require at least 2 references', () => {
      const invalidData = {
        references: [
          {
            name: 'Imam Ahmed',
            phone: '555-555-5555',
            relationship: 'Imam',
            address: '123 Mosque St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
          },
        ],
      };

      const result = referencesSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate with 2 references', () => {
      const validData = {
        references: [
          {
            name: 'Imam Ahmed',
            phone: '555-555-5555',
            relationship: 'Imam',
            address: '123 Mosque St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
          },
          {
            name: 'Brother Ali',
            phone: '555-555-5556',
            relationship: 'Community Leader',
            address: '456 Community Ave',
            city: 'New York',
            state: 'NY',
            zipCode: '10002',
          },
        ],
      };

      const result = referencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('reviewSchema', () => {
    it('should require all certifications', () => {
      const invalidData = {
        certifyAccurate: true,
        agreeToTerms: true,
        consentToVerification: false, // Must be true
      };

      const result = reviewSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate when all certifications are true', () => {
      const validData = {
        certifyAccurate: true,
        agreeToTerms: true,
        consentToVerification: true,
      };

      const result = reviewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
