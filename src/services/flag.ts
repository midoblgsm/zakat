/**
 * Flag Service
 *
 * Service functions for managing applicant flags:
 * - Listing flags with filters
 * - Creating flags via Cloud Functions
 * - Resolving flags via Cloud Functions
 * - Getting flag statistics
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  QueryConstraint,
  DocumentSnapshot,
  getCountFromServer,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseDb, firebaseFunctions } from './firebase';
import type { ApplicantFlag, FlagSeverity, CreateFlagInput } from '../types/flag';

const FLAGS_COLLECTION = 'flags';

export interface FlagFilters {
  isActive?: boolean;
  severity?: FlagSeverity;
  flaggedByMasjid?: string;
  applicantId?: string;
  search?: string;
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
}

export interface FlagListResult {
  flags: ApplicantFlag[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface FlagStats {
  total: number;
  active: number;
  resolved: number;
  byMasjid: Record<string, { name: string; count: number }>;
  bySeverity: {
    warning: number;
    blocked: number;
  };
}

/**
 * Get flags with optional filters
 */
export async function getFlags(
  filters: FlagFilters = {}
): Promise<FlagListResult> {
  try {
    const constraints: QueryConstraint[] = [];

    // Filter by active status
    if (filters.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    }

    // Filter by severity
    if (filters.severity) {
      constraints.push(where('severity', '==', filters.severity));
    }

    // Filter by masjid
    if (filters.flaggedByMasjid) {
      constraints.push(where('flaggedByMasjid', '==', filters.flaggedByMasjid));
    }

    // Filter by applicant
    if (filters.applicantId) {
      constraints.push(where('applicantId', '==', filters.applicantId));
    }

    // Order by creation date
    constraints.push(orderBy('createdAt', 'desc'));

    // Pagination
    const pageLimit = filters.limit || 20;
    constraints.push(firestoreLimit(pageLimit + 1));

    if (filters.startAfterDoc) {
      constraints.push(startAfter(filters.startAfterDoc));
    }

    const q = query(collection(firebaseDb, FLAGS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    let flags = snapshot.docs.map((doc) => doc.data() as ApplicantFlag);

    // Client-side search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      flags = flags.filter(
        (flag) =>
          flag.applicantName.toLowerCase().includes(searchLower) ||
          flag.applicantEmail.toLowerCase().includes(searchLower) ||
          flag.reason.toLowerCase().includes(searchLower) ||
          (flag.applicationNumber && flag.applicationNumber.toLowerCase().includes(searchLower))
      );
    }

    // Check for more results
    const hasMore = flags.length > pageLimit;
    if (hasMore) {
      flags = flags.slice(0, pageLimit);
    }

    const lastDoc = snapshot.docs.length > 0
      ? snapshot.docs[Math.min(snapshot.docs.length - 1, pageLimit - 1)]
      : null;

    return {
      flags,
      lastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('Error getting flags:', error);
    throw error;
  }
}

/**
 * Get a single flag by ID
 */
export async function getFlag(flagId: string): Promise<ApplicantFlag | null> {
  try {
    const docRef = doc(firebaseDb, FLAGS_COLLECTION, flagId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as ApplicantFlag;
  } catch (error) {
    console.error('Error getting flag:', error);
    throw error;
  }
}

/**
 * Get flags for a specific applicant
 */
export async function getFlagsForApplicant(
  applicantId: string
): Promise<ApplicantFlag[]> {
  try {
    const q = query(
      collection(firebaseDb, FLAGS_COLLECTION),
      where('applicantId', '==', applicantId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as ApplicantFlag);
  } catch (error) {
    console.error('Error getting flags for applicant:', error);
    throw error;
  }
}

/**
 * Create a flag for an applicant (calls Cloud Function)
 */
export async function createFlag(input: CreateFlagInput): Promise<string> {
  try {
    const flagApplicantFn = httpsCallable<
      {
        applicantId: string;
        applicationId?: string;
        reason: string;
        severity: FlagSeverity;
      },
      { success: boolean; data: { flagId: string } }
    >(firebaseFunctions, 'flagApplicant');

    const result = await flagApplicantFn({
      applicantId: input.applicantId,
      applicationId: input.applicationId,
      reason: input.reason,
      severity: input.severity,
    });

    if (!result.data.success) {
      throw new Error('Failed to create flag');
    }

    return result.data.data.flagId;
  } catch (error) {
    console.error('Error creating flag:', error);
    throw error;
  }
}

/**
 * Resolve a flag (calls Cloud Function)
 */
export async function resolveFlag(
  flagId: string,
  resolutionNotes: string
): Promise<void> {
  try {
    const unflagApplicantFn = httpsCallable<
      { flagId: string; resolutionNotes: string },
      { success: boolean }
    >(firebaseFunctions, 'unflagApplicant');

    const result = await unflagApplicantFn({ flagId, resolutionNotes });

    if (!result.data.success) {
      throw new Error('Failed to resolve flag');
    }
  } catch (error) {
    console.error('Error resolving flag:', error);
    throw error;
  }
}

/**
 * Get flag statistics
 */
export async function getFlagStats(): Promise<FlagStats> {
  try {
    // Get all flags to compute statistics
    const flagsRef = collection(firebaseDb, FLAGS_COLLECTION);

    // Total count
    const totalSnapshot = await getCountFromServer(flagsRef);
    const total = totalSnapshot.data().count;

    // Active count
    const activeQuery = query(flagsRef, where('isActive', '==', true));
    const activeSnapshot = await getCountFromServer(activeQuery);
    const active = activeSnapshot.data().count;

    // Resolved count
    const resolved = total - active;

    // Get all flags for detailed breakdown
    const allFlagsSnapshot = await getDocs(query(flagsRef, firestoreLimit(500)));

    const byMasjid: Record<string, { name: string; count: number }> = {};
    let warningCount = 0;
    let blockedCount = 0;

    allFlagsSnapshot.docs.forEach((doc) => {
      const flag = doc.data() as ApplicantFlag;

      // Count by severity (only active)
      if (flag.isActive) {
        if (flag.severity === 'warning') {
          warningCount++;
        } else if (flag.severity === 'blocked') {
          blockedCount++;
        }
      }

      // Count by masjid (all flags)
      if (flag.flaggedByMasjid) {
        if (!byMasjid[flag.flaggedByMasjid]) {
          byMasjid[flag.flaggedByMasjid] = {
            name: flag.flaggedByMasjidName || flag.flaggedByMasjid,
            count: 0,
          };
        }
        byMasjid[flag.flaggedByMasjid].count++;
      }
    });

    return {
      total,
      active,
      resolved,
      byMasjid,
      bySeverity: {
        warning: warningCount,
        blocked: blockedCount,
      },
    };
  } catch (error) {
    console.error('Error getting flag stats:', error);
    return {
      total: 0,
      active: 0,
      resolved: 0,
      byMasjid: {},
      bySeverity: { warning: 0, blocked: 0 },
    };
  }
}

/**
 * Check if an applicant is flagged
 */
export async function isApplicantFlagged(applicantId: string): Promise<boolean> {
  try {
    const q = query(
      collection(firebaseDb, FLAGS_COLLECTION),
      where('applicantId', '==', applicantId),
      where('isActive', '==', true),
      firestoreLimit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if applicant is flagged:', error);
    return false;
  }
}

/**
 * Get active flags count for an applicant
 */
export async function getActiveFlagCount(applicantId: string): Promise<number> {
  try {
    const q = query(
      collection(firebaseDb, FLAGS_COLLECTION),
      where('applicantId', '==', applicantId),
      where('isActive', '==', true)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting active flag count:', error);
    return 0;
  }
}
