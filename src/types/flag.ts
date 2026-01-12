import type { Timestamp } from 'firebase/firestore';

/**
 * Flag severity levels
 */
export type FlagSeverity = 'warning' | 'blocked';

/**
 * Applicant flag document stored in Firestore /flags/{flagId}
 */
export interface ApplicantFlag {
  id: string;

  // Who is flagged
  applicantId: string;
  applicantName: string;
  applicantEmail: string;

  // Flag details
  reason: string;
  severity: FlagSeverity;

  // Related application
  applicationId: string;
  applicationNumber: string;

  // Who flagged
  flaggedBy: string;
  flaggedByName: string;
  flaggedByMasjid: string;
  flaggedByMasjidName: string;

  // Status
  isActive: boolean;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolutionNotes?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Create flag input
 */
export interface CreateFlagInput {
  applicantId: string;
  applicationId: string;
  reason: string;
  severity: FlagSeverity;
}

/**
 * Resolve flag input
 */
export interface ResolveFlagInput {
  flagId: string;
  resolutionNotes: string;
}
