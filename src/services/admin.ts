import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
  addDoc,
  limit as firestoreLimit,
  startAfter,
  QueryConstraint,
  DocumentSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseDb, firebaseFunctions } from './firebase';
import type {
  ZakatApplication,
  ApplicationStatus,
  ApplicationListItem,
  AdminNote,
  ApplicationHistoryEntry,
} from '../types/application';

const APPLICATIONS_COLLECTION = 'applications';

export interface ApplicationPoolFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  search?: string;
  assignedTo?: string | null;
  assignedToMasjid?: string | null;
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
}

export interface ApplicationPoolResult {
  applications: ApplicationListItem[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Get applications from the shared pool (submitted, not assigned)
 */
export async function getApplicationPool(
  filters: ApplicationPoolFilters = {}
): Promise<ApplicationPoolResult> {
  try {
    const constraints: QueryConstraint[] = [];
    const filterPoolClientSide = filters.assignedTo === null;

    // By default, get submitted applications that are not assigned
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      constraints.push(where('status', 'in', statuses));
    } else {
      // Default to submitted applications
      constraints.push(where('status', '==', 'submitted'));
    }

    // Filter by assignment status - use client-side filtering for null to handle missing fields
    if (filters.assignedTo && filters.assignedTo !== null) {
      // Assigned to specific admin - can use Firestore filter
      constraints.push(where('assignedTo', '==', filters.assignedTo));
    }

    // Filter by masjid (for zakat_admin viewing their masjid's applications)
    if (filters.assignedToMasjid) {
      constraints.push(where('assignedToMasjid', '==', filters.assignedToMasjid));
    }

    // Order by creation date (more reliable than submittedAt which might not exist)
    constraints.push(orderBy('createdAt', 'desc'));

    // Get more results if we need to filter client-side
    const pageLimit = filters.limit || 20;
    const fetchLimit = filterPoolClientSide ? (pageLimit + 1) * 3 : pageLimit + 1;
    constraints.push(firestoreLimit(fetchLimit));

    if (filters.startAfterDoc) {
      constraints.push(startAfter(filters.startAfterDoc));
    }

    const q = query(collection(firebaseDb, APPLICATIONS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let applications = snapshot.docs.map((doc) => {
      const data = doc.data() as ZakatApplication;
      return {
        id: data.id,
        applicationNumber: data.applicationNumber,
        applicantSnapshot: data.applicantSnapshot,
        status: data.status,
        assignedTo: data.assignedTo,
        assignedToMasjid: data.assignedToMasjid,
        assignedToMasjidName: data.assignedToMasjidName,
        assignedToMasjidZipCode: data.assignedToMasjidZipCode,
        zakatRequest: {
          assistanceType: data.zakatRequest?.assistanceType || 'one_time',
          amountRequested: data.zakatRequest?.amountRequested || 0,
        },
        createdAt: data.createdAt,
        submittedAt: data.submittedAt,
      } as ApplicationListItem;
    });

    // Client-side filter for pool (unassigned) - handles both null and missing field
    if (filterPoolClientSide) {
      applications = applications.filter(
        (app) => !app.assignedTo
      );
    }

    // Apply client-side search filter if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      applications = applications.filter(
        (app) =>
          app.applicantSnapshot.name.toLowerCase().includes(searchLower) ||
          app.applicationNumber.toLowerCase().includes(searchLower) ||
          app.applicantSnapshot.email.toLowerCase().includes(searchLower)
      );
    }

    // Check if there are more results
    const hasMore = applications.length > pageLimit;
    if (hasMore) {
      applications = applications.slice(0, pageLimit);
    }

    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[Math.min(snapshot.docs.length - 1, pageLimit - 1)] : null;

    return {
      applications,
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting application pool:', error);
    throw error;
  }
}

/**
 * Get applications assigned to a specific admin
 */
export async function getMyApplications(
  adminId: string,
  filters: ApplicationPoolFilters = {}
): Promise<ApplicationPoolResult> {
  return getApplicationPool({
    ...filters,
    assignedTo: adminId,
    status: filters.status || ['under_review', 'pending_documents', 'pending_verification', 'approved'],
  });
}

/**
 * Get application with full details for admin view
 */
export async function getApplicationForAdmin(
  applicationId: string
): Promise<ZakatApplication | null> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as ZakatApplication;
  } catch (error) {
    console.error('Error getting application for admin:', error);
    throw error;
  }
}

/**
 * Claim an application from the pool
 * Calls the Cloud Function to properly process with notifications
 */
export async function claimApplication(
  applicationId: string,
  _adminId: string,
  _adminName: string,
  _masjidId: string
): Promise<void> {
  try {
    const assignApplicationFn = httpsCallable<
      { applicationId: string; assignToUserId?: string },
      { success: boolean; data: { assignedTo: string } }
    >(firebaseFunctions, 'assignApplication');

    const result = await assignApplicationFn({ applicationId });

    if (!result.data.success) {
      throw new Error('Failed to claim application');
    }
  } catch (error) {
    console.error('Error claiming application:', error);
    throw error;
  }
}

/**
 * Release an application back to the pool
 * Calls the Cloud Function to properly process with notifications
 */
export async function releaseApplication(
  applicationId: string,
  _adminId: string,
  _adminName: string,
  _masjidId: string,
  reason?: string
): Promise<void> {
  try {
    const releaseApplicationFn = httpsCallable<
      { applicationId: string; reason?: string },
      { success: boolean }
    >(firebaseFunctions, 'releaseApplication');

    const result = await releaseApplicationFn({ applicationId, reason });

    if (!result.data.success) {
      throw new Error('Failed to release application');
    }
  } catch (error) {
    console.error('Error releasing application:', error);
    throw error;
  }
}

/**
 * Change application status
 * Calls the Cloud Function to properly process with notifications
 */
export async function changeApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  _adminId: string,
  _adminName: string,
  _masjidId: string,
  reason?: string
): Promise<void> {
  try {
    const changeStatusFn = httpsCallable<
      { applicationId: string; newStatus: ApplicationStatus; reason?: string },
      { success: boolean; data: { newStatus: ApplicationStatus } }
    >(firebaseFunctions, 'changeApplicationStatus');

    const result = await changeStatusFn({ applicationId, newStatus, reason });

    if (!result.data.success) {
      throw new Error('Failed to change application status');
    }
  } catch (error) {
    console.error('Error changing application status:', error);
    throw error;
  }
}

/**
 * Add admin note to application
 */
export async function addAdminNote(
  applicationId: string,
  content: string,
  adminId: string,
  adminName: string,
  masjidId: string,
  isInternal: boolean = true
): Promise<AdminNote> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Application not found');
    }

    const app = docSnap.data() as ZakatApplication;

    const newNote: AdminNote = {
      id: crypto.randomUUID(),
      content,
      createdBy: adminId,
      createdByName: adminName,
      createdByMasjid: masjidId,
      createdAt: Timestamp.now(),
      isInternal,
    };

    // Add note to application
    const updatedNotes = [...(app.adminNotes || []), newNote];

    await updateDoc(docRef, {
      adminNotes: updatedNotes,
      updatedAt: serverTimestamp(),
    });

    // Add history entry
    await addHistoryEntry(applicationId, {
      action: 'note_added',
      performedBy: adminId,
      performedByName: adminName,
      performedByRole: 'zakat_admin',
      performedByMasjid: masjidId,
      details: isInternal ? 'Internal note added' : 'Note added (visible to applicant)',
      metadata: { noteId: newNote.id },
    });

    return newNote;
  } catch (error) {
    console.error('Error adding admin note:', error);
    throw error;
  }
}

/**
 * Get application history
 */
export async function getApplicationHistory(
  applicationId: string
): Promise<ApplicationHistoryEntry[]> {
  try {
    const historyRef = collection(
      firebaseDb,
      APPLICATIONS_COLLECTION,
      applicationId,
      'history'
    );
    const q = query(historyRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as ApplicationHistoryEntry);
  } catch (error) {
    console.error('Error getting application history:', error);
    throw error;
  }
}

/**
 * Add history entry to application
 */
async function addHistoryEntry(
  applicationId: string,
  entry: Omit<ApplicationHistoryEntry, 'id' | 'createdAt'>
): Promise<void> {
  try {
    const historyRef = collection(
      firebaseDb,
      APPLICATIONS_COLLECTION,
      applicationId,
      'history'
    );

    // Filter out undefined values - Firestore doesn't accept undefined
    const filteredEntry = Object.fromEntries(
      Object.entries(entry).filter(([, value]) => value !== undefined)
    );

    const historyEntry = {
      id: crypto.randomUUID(),
      ...filteredEntry,
      createdAt: Timestamp.now(),
    };

    await addDoc(historyRef, historyEntry);
  } catch (error) {
    console.error('Error adding history entry:', error);
    // Don't throw - history is supplementary
  }
}

/**
 * Get admin dashboard statistics
 * For zakat_admin: only shows stats for pool and their own cases
 * For super_admin: shows all stats (pass masjidId as null)
 */
export async function getAdminStats(adminId: string, masjidId: string | null): Promise<{
  poolSize: number;
  myCases: number;
  pendingReview: number;
  flaggedApplicants: number;
}> {
  try {
    // Get pool size (submitted applications) - filter unassigned client-side
    const poolQuery = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('status', '==', 'submitted')
    );
    const poolSnapshot = await getDocs(poolQuery);
    // Filter unassigned client-side (handles both null and missing field)
    const poolSize = poolSnapshot.docs.filter(doc => !doc.data().assignedTo).length;

    // Get my cases (assigned to this admin)
    const myCasesQuery = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('assignedTo', '==', adminId),
      where('status', 'in', ['under_review', 'pending_documents', 'pending_verification'])
    );
    const myCasesSnapshot = await getDocs(myCasesQuery);

    let pendingReview = 0;
    let flaggedApplicants = 0;

    if (masjidId) {
      // For zakat_admin: get pending review for their masjid only
      const pendingQuery = query(
        collection(firebaseDb, APPLICATIONS_COLLECTION),
        where('assignedToMasjid', '==', masjidId),
        where('status', 'in', ['under_review', 'pending_documents', 'pending_verification'])
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      pendingReview = pendingSnapshot.size;

      // For zakat_admin: get flagged applicants for their masjid only
      const flaggedQuery = query(
        collection(firebaseDb, APPLICATIONS_COLLECTION),
        where('assignedToMasjid', '==', masjidId),
        where('applicantSnapshot.isFlagged', '==', true)
      );
      const flaggedSnapshot = await getDocs(flaggedQuery);
      flaggedApplicants = flaggedSnapshot.size;
    } else {
      // For super_admin: get all pending review
      const pendingQuery = query(
        collection(firebaseDb, APPLICATIONS_COLLECTION),
        where('status', 'in', ['under_review', 'pending_documents', 'pending_verification'])
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      pendingReview = pendingSnapshot.size;

      // For super_admin: get all flagged applicants
      const flaggedQuery = query(
        collection(firebaseDb, APPLICATIONS_COLLECTION),
        where('applicantSnapshot.isFlagged', '==', true)
      );
      const flaggedSnapshot = await getDocs(flaggedQuery);
      flaggedApplicants = flaggedSnapshot.size;
    }

    return {
      poolSize,
      myCases: myCasesSnapshot.size,
      pendingReview,
      flaggedApplicants,
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    // Return zeros on error to not break the UI
    return {
      poolSize: 0,
      myCases: 0,
      pendingReview: 0,
      flaggedApplicants: 0,
    };
  }
}

/**
 * Get all applications (for super admin)
 * Returns all applications across all masajid with optional filtering
 */
export async function getAllApplications(
  filters: ApplicationPoolFilters = {}
): Promise<ApplicationPoolResult> {
  try {
    const constraints: QueryConstraint[] = [];

    // Filter by status if provided
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      constraints.push(where('status', 'in', statuses));
    }

    // Order by submission date (newest first), fallback to createdAt
    constraints.push(orderBy('createdAt', 'desc'));

    // Pagination
    const pageLimit = filters.limit || 20;
    constraints.push(firestoreLimit(pageLimit + 1));

    if (filters.startAfterDoc) {
      constraints.push(startAfter(filters.startAfterDoc));
    }

    const q = query(collection(firebaseDb, APPLICATIONS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let applications = snapshot.docs.map((doc) => {
      const data = doc.data() as ZakatApplication;
      return {
        id: data.id,
        applicationNumber: data.applicationNumber,
        applicantSnapshot: data.applicantSnapshot,
        status: data.status,
        assignedTo: data.assignedTo,
        assignedToMasjid: data.assignedToMasjid,
        assignedToMasjidName: data.assignedToMasjidName,
        assignedToMasjidZipCode: data.assignedToMasjidZipCode,
        zakatRequest: {
          assistanceType: data.zakatRequest?.assistanceType || 'one_time',
          amountRequested: data.zakatRequest?.amountRequested || 0,
        },
        createdAt: data.createdAt,
        submittedAt: data.submittedAt,
      } as ApplicationListItem;
    });

    // Apply client-side search filter if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      applications = applications.filter(
        (app) =>
          app.applicantSnapshot.name.toLowerCase().includes(searchLower) ||
          app.applicationNumber.toLowerCase().includes(searchLower) ||
          app.applicantSnapshot.email.toLowerCase().includes(searchLower)
      );
    }

    // Check if there are more results
    const hasMore = applications.length > pageLimit;
    if (hasMore) {
      applications = applications.slice(0, pageLimit);
    }

    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[Math.min(snapshot.docs.length - 1, pageLimit - 1)] : null;

    return {
      applications,
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting all applications:', error);
    throw error;
  }
}

/**
 * Get valid status transitions for a given status
 */
export function getValidStatusTransitions(
  currentStatus: ApplicationStatus
): ApplicationStatus[] {
  const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    draft: [],
    submitted: [],
    under_review: ['pending_documents', 'pending_verification', 'approved', 'rejected'],
    pending_documents: ['under_review', 'approved', 'rejected'],
    pending_verification: ['under_review', 'approved', 'rejected'],
    approved: ['disbursed', 'closed'],
    rejected: ['closed'],
    disbursed: ['closed'],
    closed: [],
  };

  return validTransitions[currentStatus] || [];
}
