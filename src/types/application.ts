import type { Timestamp } from 'firebase/firestore';
import type { Address } from './user';

/**
 * Application status values
 */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'closed';

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
 * Demographics section
 */
export interface Demographics {
  fullName: string;
  age: number;
  gender: 'male' | 'female';
  ssn: string; // Should be encrypted
  hasDriverLicense: boolean;
  driverLicenseNumber?: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  primaryLanguage: string;
  speaksEnglish: boolean;
  associatedMasjid?: string;
}

/**
 * Contact information
 */
export interface ContactInfo {
  address: Address;
  phone: string;
  phoneSecondary?: string;
  email: string;
}

/**
 * Household member
 */
export interface HouseholdMember {
  name: string;
  age: number;
  relationship: string;
  isDependent: boolean;
  incomeSource?: string;
}

/**
 * Asset item
 */
export interface AssetItem {
  value: number;
  dateOwned?: Timestamp;
  description?: string;
}

/**
 * Assets section
 */
export interface Assets {
  house?: AssetItem;
  business?: AssetItem;
  cars?: AssetItem;
  cash?: AssetItem;
  other: AssetItem[];
  totalValue: number;
}

/**
 * Debt item
 */
export interface DebtItem {
  amount: number;
  lender: string;
  paymentFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  dueDate?: Timestamp;
  purpose: string;
}

/**
 * Expense item
 */
export interface ExpenseItem {
  category: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semester';
}

/**
 * Financial information section
 */
export interface FinancialInfo {
  assets: Assets;
  monthlyIncome: number;
  incomeSource?: string;
  receivesGovernmentAid: boolean;
  governmentAidDetails?: string;
  debts: DebtItem[];
  totalDebt: number;
  expenses: ExpenseItem[];
  totalMonthlyExpenses: number;
}

/**
 * Residence type
 */
export type ResidenceType = 'own' | 'rent' | 'shelter' | 'subsidized' | 'other';

/**
 * Transportation type
 */
export type TransportationType = 'own_car' | 'public' | 'rideshare' | 'other';

/**
 * Employment status
 */
export type EmploymentStatus =
  | 'employed'
  | 'unemployed'
  | 'self_employed'
  | 'retired'
  | 'disabled';

/**
 * Circumstances section
 */
export interface Circumstances {
  residenceType: ResidenceType;
  residenceDetails?: string;
  rentAmount?: number;
  sharesRent: boolean;
  rentShareDetails?: string;

  transportationType: TransportationType;
  transportationDetails?: string;

  employmentStatus: EmploymentStatus;
  employerName?: string;
  employerAddress?: string;

  hasHealthInsurance: boolean;
  healthInsuranceType?: string;

  educationLevel: string;
}

/**
 * Zakat request section
 */
export interface ZakatRequest {
  isEligible: boolean;
  reasonForApplication: string;
  assistanceType: 'monthly' | 'one_time';
  monthlyDuration?: number;
  amountRequested: number;
}

/**
 * Reference
 */
export interface Reference {
  name: string;
  phone: string;
  relationship: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * Document file
 */
export interface DocumentFile {
  fileName: string;
  storagePath: string;
  uploadedAt: Timestamp;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
}

/**
 * Documents section
 */
export interface ApplicationDocuments {
  photoId?: DocumentFile;
  ssnCard?: DocumentFile;
  leaseAgreement?: DocumentFile;
  otherDocuments: DocumentFile[];
}

/**
 * Previous application to another organization
 */
export interface PreviousOrgApplication {
  name: string;
  date: Timestamp;
  approved: boolean;
}

/**
 * Previous applications section
 */
export interface PreviousApplications {
  appliedToMHMA: boolean;
  mhmaDate?: Timestamp;
  mhmaOutcome?: string;
  otherOrganizations: PreviousOrgApplication[];
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
  decision: 'approved' | 'rejected' | 'partial';
  decidedBy: string;
  decidedByMasjid: string;
  decidedAt: Timestamp;
  amountApproved?: number;
  disbursementMethod?: string;
  rejectionReason?: string;
}

/**
 * Zakat application document stored in Firestore /applications/{applicationId}
 */
export interface ZakatApplication {
  // Identity
  id: string;
  applicationNumber: string;

  // Applicant Reference
  applicantId: string;
  applicantSnapshot: ApplicantSnapshot;

  // Status & Assignment
  status: ApplicationStatus;
  assignedTo?: string | null;
  assignedToMasjid?: string | null;
  assignedToMasjidName?: string | null;
  assignedToMasjidZipCode?: string | null;
  assignedAt?: Timestamp;

  // Form Sections
  demographics: Demographics;
  contact: ContactInfo;
  household: HouseholdMember[];
  financial: FinancialInfo;
  circumstances: Circumstances;
  zakatRequest: ZakatRequest;
  references: Reference[];
  documents: ApplicationDocuments;
  previousApplications: PreviousApplications;

  // Admin Data
  adminNotes: AdminNote[];
  resolution?: ApplicationResolution;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt?: Timestamp;
}

/**
 * History action types
 */
export type HistoryAction =
  | 'created'
  | 'submitted'
  | 'assigned'
  | 'released'
  | 'status_changed'
  | 'note_added'
  | 'document_uploaded'
  | 'document_verified'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'flagged'
  | 'edited';

/**
 * Application history entry stored in /applications/{appId}/history/{historyId}
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
  previousAssignee?: string | null;
  newAssignee?: string | null;
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

/**
 * Application list item (for pool view)
 */
export interface ApplicationListItem {
  id: string;
  applicationNumber: string;
  applicantSnapshot: ApplicantSnapshot;
  status: ApplicationStatus;
  assignedTo?: string | null;
  assignedToMasjid?: string | null;
  assignedToMasjidName?: string | null;
  assignedToMasjidZipCode?: string | null;
  zakatRequest: {
    assistanceType: 'monthly' | 'one_time';
    amountRequested: number;
  };
  createdAt: Timestamp;
  submittedAt?: Timestamp;
}
