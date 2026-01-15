/**
 * Application-related types for Cloud Functions
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * Application status values
 */
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "pending_documents"
  | "pending_verification"
  | "approved"
  | "rejected"
  | "disbursed"
  | "closed";

/**
 * Valid status transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "rejected"],
  under_review: ["pending_documents", "pending_verification", "approved", "rejected"],
  pending_documents: ["under_review", "rejected", "closed"],
  pending_verification: ["approved", "rejected", "under_review"],
  approved: ["disbursed", "closed"],
  rejected: ["closed"],
  disbursed: ["closed"],
  closed: [],
};

/**
 * Applicant snapshot (denormalized for quick access)
 */
export interface ApplicantSnapshot {
  name: string;
  email: string;
  phone: string;
  isFlagged: boolean;
}

/**
 * History action types
 */
export type HistoryAction =
  | "created"
  | "submitted"
  | "assigned"
  | "released"
  | "status_changed"
  | "note_added"
  | "document_requested"
  | "document_uploaded"
  | "document_verified"
  | "approved"
  | "rejected"
  | "disbursed"
  | "flagged"
  | "edited";

/**
 * Application history entry
 */
export interface ApplicationHistoryEntry {
  id: string;
  action: HistoryAction;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  performedByMasjid?: string;
  previousStatus?: ApplicationStatus;
  newStatus?: ApplicationStatus;
  previousAssignee?: string;
  newAssignee?: string;
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

/**
 * Admin note
 */
export interface AdminNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdByMasjid: string;
  createdAt: Timestamp;
  isInternal: boolean;
}

/**
 * Application resolution
 */
export interface ApplicationResolution {
  decision: "approved" | "rejected" | "partial";
  decidedBy: string;
  decidedByName: string;
  decidedByMasjid: string;
  decidedAt: Timestamp;
  amountApproved?: number;
  disbursementMethod?: string;
  rejectionReason?: string;
}

/**
 * Document request
 */
export interface DocumentRequest {
  id: string;
  documentType: string;
  description: string;
  required: boolean;
  requestedBy: string;
  requestedByName: string;
  requestedAt: Timestamp;
  fulfilledAt?: Timestamp;
  fulfilledBy?: string;
  storagePath?: string;
}

/**
 * Zakat application document (simplified for functions)
 */
export interface ZakatApplication {
  id: string;
  applicationNumber: string;
  applicantId: string;
  applicantSnapshot: ApplicantSnapshot;
  status: ApplicationStatus;
  assignedTo?: string;
  assignedToMasjid?: string;
  assignedToMasjidName?: string;
  assignedToMasjidZipCode?: string;
  assignedAt?: Timestamp;
  adminNotes: AdminNote[];
  resolution?: ApplicationResolution;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt?: Timestamp;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request to submit an application
 */
export interface SubmitApplicationRequest {
  applicationId: string;
}

/**
 * Request to assign an application
 */
export interface AssignApplicationRequest {
  applicationId: string;
  assignToUserId?: string; // If not provided, assigns to calling admin
}

/**
 * Request to release an application back to pool
 */
export interface ReleaseApplicationRequest {
  applicationId: string;
  reason?: string;
}

/**
 * Request to change application status
 */
export interface ChangeStatusRequest {
  applicationId: string;
  newStatus: ApplicationStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
  disbursedAmount?: number;
}

/**
 * Request to add admin note
 */
export interface AddNoteRequest {
  applicationId: string;
  content: string;
  isInternal: boolean;
}

/**
 * Request to request documents
 */
export interface RequestDocumentsRequest {
  applicationId: string;
  documents: Array<{
    documentType: string;
    description: string;
    required: boolean;
  }>;
  message?: string;
}

/**
 * Request to resolve application
 */
export interface ResolveApplicationRequest {
  applicationId: string;
  decision: "approved" | "rejected" | "partial";
  amountApproved?: number;
  disbursementMethod?: string;
  rejectionReason?: string;
  notes?: string;
}

/**
 * Application list query parameters
 */
export interface ListApplicationsRequest {
  status?: ApplicationStatus;
  masjidId?: string;
  assignedTo?: string;
  applicantId?: string;
  limit?: number;
  startAfter?: string;
  poolOnly?: boolean;
}
