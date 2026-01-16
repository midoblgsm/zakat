import type { Timestamp } from 'firebase/firestore';

/**
 * Payment method for disbursement
 */
export type DisbursementMethod =
  | 'check'
  | 'cash'
  | 'bank_transfer'
  | 'money_order'
  | 'gift_card'
  | 'direct_payment'
  | 'other';

/**
 * Individual disbursement record
 * Stored in /applications/{appId}/disbursements/{disbursementId}
 */
export interface Disbursement {
  id: string;
  applicationId: string;
  applicantId: string;

  // Amount
  amount: number;

  // Payment details
  method: DisbursementMethod;
  referenceNumber?: string;
  notes?: string;

  // Who disbursed
  disbursedBy: string;
  disbursedByName: string;
  masjidId: string;
  masjidName: string;

  // When
  disbursedAt: Timestamp;

  // For monthly disbursements - which month this is for
  periodMonth?: number; // 1-12
  periodYear?: number;

  createdAt: Timestamp;
}

/**
 * Input for creating a new disbursement
 */
export interface CreateDisbursementInput {
  applicationId: string;
  amount: number;
  method: DisbursementMethod;
  referenceNumber?: string;
  notes?: string;
  periodMonth?: number;
  periodYear?: number;
}

/**
 * Disbursement summary for an application
 */
export interface ApplicationDisbursementSummary {
  applicationId: string;
  totalDisbursed: number;
  disbursementCount: number;
  lastDisbursedAt?: Timestamp;
  disbursements: Disbursement[];
}

/**
 * Disbursement summary for a person (applicant)
 * Aggregates across all their applications
 */
export interface ApplicantDisbursementSummary {
  applicantId: string;
  applicantName: string;
  totalDisbursed: number;
  disbursementCount: number;
  applicationCount: number;
  lastDisbursedAt?: Timestamp;

  // Breakdown by masjid
  byMasjid: MasjidDisbursementBreakdown[];

  // Individual disbursements
  disbursements: DisbursementWithApplication[];
}

/**
 * Disbursement breakdown by masjid
 */
export interface MasjidDisbursementBreakdown {
  masjidId: string;
  masjidName: string;
  totalDisbursed: number;
  disbursementCount: number;
}

/**
 * Disbursement record with application info attached
 */
export interface DisbursementWithApplication extends Disbursement {
  applicationNumber: string;
}

/**
 * Super admin view: all applicants with disbursement summaries
 */
export interface AllApplicantsDisbursementSummary {
  applicants: ApplicantDisbursementSummary[];
  totalDisbursed: number;
  totalApplicants: number;
}

/**
 * Disbursement method labels for display
 */
export const DISBURSEMENT_METHOD_LABELS: Record<DisbursementMethod, string> = {
  check: 'Check',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  money_order: 'Money Order',
  gift_card: 'Gift Card',
  direct_payment: 'Direct Payment (Bills, Rent, etc.)',
  other: 'Other',
};
