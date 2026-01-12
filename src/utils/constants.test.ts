import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  ROUTES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  US_STATES,
  NISAB_THRESHOLD_USD,
} from './constants';

describe('Constants', () => {
  describe('APP_NAME', () => {
    it('should have the correct app name', () => {
      expect(APP_NAME).toBe('Zakat Management Platform');
    });
  });

  describe('ROUTES', () => {
    it('should have main routes defined', () => {
      expect(ROUTES.HOME).toBe('/');
      expect(ROUTES.LOGIN).toBe('/login');
      expect(ROUTES.REGISTER).toBe('/register');
      expect(ROUTES.FORGOT_PASSWORD).toBe('/forgot-password');
      expect(ROUTES.VERIFY_EMAIL).toBe('/verify-email');
    });

    it('should have applicant routes defined', () => {
      expect(ROUTES.APPLICANT.DASHBOARD).toBe('/applicant');
      expect(ROUTES.APPLICANT.APPLICATIONS).toBe('/applicant/applications');
      expect(ROUTES.APPLICANT.APPLY).toBe('/applicant/apply');
      expect(ROUTES.APPLICANT.PROFILE).toBe('/applicant/profile');
    });

    it('should have admin routes defined', () => {
      expect(ROUTES.ADMIN.DASHBOARD).toBe('/admin');
      expect(ROUTES.ADMIN.POOL).toBe('/admin/pool');
      expect(ROUTES.ADMIN.MY_APPLICATIONS).toBe('/admin/my-applications');
    });

    it('should have super admin routes defined', () => {
      expect(ROUTES.SUPER_ADMIN.DASHBOARD).toBe('/super-admin');
      expect(ROUTES.SUPER_ADMIN.MASAJID).toBe('/super-admin/masajid');
      expect(ROUTES.SUPER_ADMIN.USERS).toBe('/super-admin/users');
    });
  });

  describe('APPLICATION_STATUS_LABELS', () => {
    it('should have all status labels defined', () => {
      expect(APPLICATION_STATUS_LABELS.draft).toBe('Draft');
      expect(APPLICATION_STATUS_LABELS.submitted).toBe('Submitted');
      expect(APPLICATION_STATUS_LABELS.under_review).toBe('Under Review');
      expect(APPLICATION_STATUS_LABELS.approved).toBe('Approved');
      expect(APPLICATION_STATUS_LABELS.rejected).toBe('Rejected');
      expect(APPLICATION_STATUS_LABELS.disbursed).toBe('Disbursed');
    });
  });

  describe('APPLICATION_STATUS_COLORS', () => {
    it('should have all status colors defined', () => {
      expect(APPLICATION_STATUS_COLORS.draft).toContain('bg-gray');
      expect(APPLICATION_STATUS_COLORS.approved).toContain('bg-green');
      expect(APPLICATION_STATUS_COLORS.rejected).toContain('bg-red');
    });
  });

  describe('US_STATES', () => {
    it('should contain all 50 states plus DC', () => {
      expect(US_STATES.length).toBe(51);
    });

    it('should have correct format for each state', () => {
      US_STATES.forEach((state) => {
        expect(state).toHaveProperty('value');
        expect(state).toHaveProperty('label');
        expect(state.value.length).toBe(2);
        expect(state.label.length).toBeGreaterThan(0);
      });
    });

    it('should include specific states', () => {
      const stateValues = US_STATES.map((s) => s.value);
      expect(stateValues).toContain('CA');
      expect(stateValues).toContain('NY');
      expect(stateValues).toContain('TX');
      expect(stateValues).toContain('DC');
    });
  });

  describe('NISAB_THRESHOLD_USD', () => {
    it('should be a positive number', () => {
      expect(NISAB_THRESHOLD_USD).toBeGreaterThan(0);
      expect(typeof NISAB_THRESHOLD_USD).toBe('number');
    });
  });
});
