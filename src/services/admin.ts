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
import { firebaseDb } from './firebase';
import type {
  ZakatApplication,
  ApplicationStatus,
  ApplicationListItem,
  AdminNote,
  ApplicationHistoryEntry,
  HistoryAction,
} from '../types/application';

const APPLICATIONS_COLLECTION = 'applications';

export interface ApplicationPoolFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  search?: string;
  assignedTo?: string | null;
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

    // By default, get submitted applications that are not assigned
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      constraints.push(where('status', 'in', statuses));
    } else {
      // Default to submitted applications
      constraints.push(where('status', '==', 'submitted'));
    }

    // Filter by assignment status
    if (filters.assignedTo === null) {
      // Not assigned to anyone (in pool)
      constraints.push(where('assignedTo', '==', null));
    } else if (filters.assignedTo) {
      // Assigned to specific admin
      constraints.push(where('assignedTo', '==', filters.assignedTo));
    }

    // Order by submission date
    constraints.push(orderBy('submittedAt', 'desc'));

    // Pagination
    const pageLimit = filters.limit || 20;
    constraints.push(firestoreLimit(pageLimit + 1)); // Get one extra to check if there are more

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
    status: filters.status || ['under_review', 'pending_documents', 'pending_verification'],
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
 */
export async function claimApplication(
  applicationId: string,
  adminId: string,
  adminName: string,
  masjidId: string
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Application not found');
    }

    const app = docSnap.data() as ZakatApplication;

    // Check if already assigned
    if (app.assignedTo) {
      throw new Error('Application is already assigned to another admin');
    }

    // Check if status allows claiming
    if (app.status !== 'submitted') {
      throw new Error('Only submitted applications can be claimed');
    }

    // Update application
    await updateDoc(docRef, {
      assignedTo: adminId,
      assignedToMasjid: masjidId,
      assignedAt: serverTimestamp(),
      status: 'under_review',
      updatedAt: serverTimestamp(),
    });

    // Add history entry
    await addHistoryEntry(applicationId, {
      action: 'assigned',
      performedBy: adminId,
      performedByName: adminName,
      performedByRole: 'zakat_admin',
      performedByMasjid: masjidId,
      previousStatus: app.status,
      newStatus: 'under_review',
      previousAssignee: undefined,
      newAssignee: adminId,
      details: `Application claimed by ${adminName}`,
    });
  } catch (error) {
    console.error('Error claiming application:', error);
    throw error;
  }
}

/**
 * Release an application back to the pool
 */
export async function releaseApplication(
  applicationId: string,
  adminId: string,
  adminName: string,
  masjidId: string
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Application not found');
    }

    const app = docSnap.data() as ZakatApplication;

    // Check if assigned to this admin
    if (app.assignedTo !== adminId) {
      throw new Error('You can only release applications assigned to you');
    }

    // Update application
    await updateDoc(docRef, {
      assignedTo: null,
      assignedToMasjid: null,
      assignedAt: null,
      status: 'submitted',
      updatedAt: serverTimestamp(),
    });

    // Add history entry
    await addHistoryEntry(applicationId, {
      action: 'released',
      performedBy: adminId,
      performedByName: adminName,
      performedByRole: 'zakat_admin',
      performedByMasjid: masjidId,
      previousStatus: app.status,
      newStatus: 'submitted',
      previousAssignee: adminId,
      newAssignee: undefined,
      details: `Application released by ${adminName}`,
    });
  } catch (error) {
    console.error('Error releasing application:', error);
    throw error;
  }
}

/**
 * Change application status
 */
export async function changeApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  adminId: string,
  adminName: string,
  masjidId: string,
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(firebaseDb, APPLICATIONS_COLLECTION, applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Application not found');
    }

    const app = docSnap.data() as ZakatApplication;

    // Validate status transition
    if (!isValidStatusTransition(app.status, newStatus)) {
      throw new Error(`Invalid status transition from ${app.status} to ${newStatus}`);
    }

    // Update application
    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    // Add history entry
    await addHistoryEntry(applicationId, {
      action: 'status_changed',
      performedBy: adminId,
      performedByName: adminName,
      performedByRole: 'zakat_admin',
      performedByMasjid: masjidId,
      previousStatus: app.status,
      newStatus: newStatus,
      details: notes || `Status changed from ${app.status} to ${newStatus}`,
    });
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

    const historyEntry: ApplicationHistoryEntry = {
      id: crypto.randomUUID(),
      ...entry,
      createdAt: Timestamp.now(),
    };

    await addDoc(historyRef, historyEntry);
  } catch (error) {
    console.error('Error adding history entry:', error);
    // Don't throw - history is supplementary
  }
}

/**
 * Check if status transition is valid
 */
function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus
): boolean {
  const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    draft: ['submitted'],
    submitted: ['under_review'],
    under_review: ['pending_documents', 'pending_verification', 'approved', 'rejected', 'submitted'],
    pending_documents: ['under_review', 'approved', 'rejected'],
    pending_verification: ['under_review', 'approved', 'rejected'],
    approved: ['disbursed', 'closed'],
    rejected: ['closed'],
    disbursed: ['closed'],
    closed: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(adminId: string): Promise<{
  poolSize: number;
  myCases: number;
  pendingReview: number;
  flaggedApplicants: number;
}> {
  try {
    // Get pool size (submitted, unassigned)
    const poolQuery = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('status', '==', 'submitted'),
      where('assignedTo', '==', null)
    );
    const poolSnapshot = await getDocs(poolQuery);

    // Get my cases
    const myCasesQuery = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('assignedTo', '==', adminId),
      where('status', 'in', ['under_review', 'pending_documents', 'pending_verification'])
    );
    const myCasesSnapshot = await getDocs(myCasesQuery);

    // Get pending review (applications under review by anyone)
    const pendingQuery = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('status', 'in', ['under_review', 'pending_documents', 'pending_verification'])
    );
    const pendingSnapshot = await getDocs(pendingQuery);

    // Get flagged applicants (applications with flagged applicants)
    const flaggedQuery = query(
      collection(firebaseDb, APPLICATIONS_COLLECTION),
      where('applicantSnapshot.isFlagged', '==', true)
    );
    const flaggedSnapshot = await getDocs(flaggedQuery);

    return {
      poolSize: poolSnapshot.size,
      myCases: myCasesSnapshot.size,
      pendingReview: pendingSnapshot.size,
      flaggedApplicants: flaggedSnapshot.size,
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
