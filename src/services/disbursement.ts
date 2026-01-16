/**
 * Disbursement Service
 *
 * Handles recording and tracking disbursements for zakat applications.
 * Supports monthly disbursement tracking and person-level aggregation.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  collectionGroup,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseDb, firebaseFunctions } from './firebase';
import type {
  Disbursement,
  CreateDisbursementInput,
  ApplicationDisbursementSummary,
  ApplicantDisbursementSummary,
  DisbursementWithApplication,
  MasjidDisbursementBreakdown,
  AllApplicantsDisbursementSummary,
} from '../types/disbursement';
import type { ZakatApplication } from '../types/application';

const APPLICATIONS_COLLECTION = 'applications';
const DISBURSEMENTS_SUBCOLLECTION = 'disbursements';

/**
 * Record a new disbursement for an application
 * Uses Cloud Function to ensure proper validation and stat updates
 */
export async function recordDisbursement(
  input: CreateDisbursementInput
): Promise<{ success: boolean; disbursementId: string }> {
  try {
    const recordDisbursementFn = httpsCallable<
      CreateDisbursementInput,
      { success: boolean; data: { disbursementId: string } }
    >(firebaseFunctions, 'recordDisbursement');

    const result = await recordDisbursementFn(input);

    if (!result.data.success) {
      throw new Error('Failed to record disbursement');
    }

    return {
      success: true,
      disbursementId: result.data.data.disbursementId,
    };
  } catch (error) {
    console.error('Error recording disbursement:', error);
    throw error;
  }
}

/**
 * Get all disbursements for a specific application
 */
export async function getApplicationDisbursements(
  applicationId: string
): Promise<ApplicationDisbursementSummary> {
  try {
    const disbursementsRef = collection(
      firebaseDb,
      APPLICATIONS_COLLECTION,
      applicationId,
      DISBURSEMENTS_SUBCOLLECTION
    );
    const q = query(disbursementsRef, orderBy('disbursedAt', 'desc'));
    const snapshot = await getDocs(q);

    const disbursements = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Disbursement[];

    const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
    const lastDisbursement = disbursements[0];

    return {
      applicationId,
      totalDisbursed,
      disbursementCount: disbursements.length,
      lastDisbursedAt: lastDisbursement?.disbursedAt,
      disbursements,
    };
  } catch (error) {
    console.error('Error getting application disbursements:', error);
    throw error;
  }
}

/**
 * Get disbursement summary for a specific person (applicant)
 * Aggregates across all their applications with breakdown by masjid
 */
export async function getApplicantDisbursementSummary(
  applicantId: string
): Promise<ApplicantDisbursementSummary> {
  try {
    // Get all applications for this applicant
    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);
    const appQuery = query(applicationsRef, where('applicantId', '==', applicantId));
    const appSnapshot = await getDocs(appQuery);

    // Get applicant name from first application
    let applicantName = 'Unknown Applicant';
    if (appSnapshot.docs.length > 0) {
      const firstApp = appSnapshot.docs[0].data() as ZakatApplication;
      applicantName = firstApp.applicantSnapshot?.name || firstApp.demographics?.fullName || 'Unknown';
    }

    // Build application number map
    const applicationNumberMap: Record<string, string> = {};
    appSnapshot.docs.forEach((doc) => {
      const data = doc.data() as ZakatApplication;
      applicationNumberMap[doc.id] = data.applicationNumber || doc.id;
    });

    // Get all disbursements for this applicant using collectionGroup query
    const allDisbursementsRef = collectionGroup(firebaseDb, DISBURSEMENTS_SUBCOLLECTION);
    const disbQuery = query(
      allDisbursementsRef,
      where('applicantId', '==', applicantId),
      orderBy('disbursedAt', 'desc')
    );
    const disbSnapshot = await getDocs(disbQuery);

    const disbursements: DisbursementWithApplication[] = disbSnapshot.docs.map((doc) => {
      const data = doc.data() as Disbursement;
      return {
        ...data,
        id: doc.id,
        applicationNumber: applicationNumberMap[data.applicationId] || data.applicationId,
      };
    });

    // Calculate totals
    const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);
    const lastDisbursement = disbursements[0];

    // Calculate breakdown by masjid
    const masjidMap = new Map<string, MasjidDisbursementBreakdown>();
    disbursements.forEach((d) => {
      const existing = masjidMap.get(d.masjidId);
      if (existing) {
        existing.totalDisbursed += d.amount;
        existing.disbursementCount += 1;
      } else {
        masjidMap.set(d.masjidId, {
          masjidId: d.masjidId,
          masjidName: d.masjidName,
          totalDisbursed: d.amount,
          disbursementCount: 1,
        });
      }
    });

    return {
      applicantId,
      applicantName,
      totalDisbursed,
      disbursementCount: disbursements.length,
      applicationCount: appSnapshot.size,
      lastDisbursedAt: lastDisbursement?.disbursedAt,
      byMasjid: Array.from(masjidMap.values()).sort((a, b) => b.totalDisbursed - a.totalDisbursed),
      disbursements,
    };
  } catch (error) {
    console.error('Error getting applicant disbursement summary:', error);
    throw error;
  }
}

/**
 * Get disbursement summaries for all applicants (Super Admin view)
 * Returns aggregated view with breakdown by masjid
 */
export async function getAllApplicantsDisbursements(): Promise<AllApplicantsDisbursementSummary> {
  try {
    // Get all disbursements across all applications using collectionGroup
    const allDisbursementsRef = collectionGroup(firebaseDb, DISBURSEMENTS_SUBCOLLECTION);
    const q = query(allDisbursementsRef, orderBy('disbursedAt', 'desc'));
    const snapshot = await getDocs(q);

    const disbursements = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Disbursement[];

    // Group by applicant
    const applicantMap = new Map<string, {
      disbursements: Disbursement[];
      applicationIds: Set<string>;
    }>();

    disbursements.forEach((d) => {
      const existing = applicantMap.get(d.applicantId);
      if (existing) {
        existing.disbursements.push(d);
        existing.applicationIds.add(d.applicationId);
      } else {
        applicantMap.set(d.applicantId, {
          disbursements: [d],
          applicationIds: new Set([d.applicationId]),
        });
      }
    });

    // Get application numbers for all applications
    const allApplicationIds = new Set<string>();
    applicantMap.forEach((data) => {
      data.applicationIds.forEach((id) => allApplicationIds.add(id));
    });

    const applicationNumberMap: Record<string, string> = {};
    const applicantNameMap: Record<string, string> = {};

    // Fetch application details in batches
    const appIds = Array.from(allApplicationIds);
    for (const appId of appIds) {
      try {
        const appDoc = await getDoc(doc(firebaseDb, APPLICATIONS_COLLECTION, appId));
        if (appDoc.exists()) {
          const appData = appDoc.data() as ZakatApplication;
          applicationNumberMap[appId] = appData.applicationNumber || appId;
          if (!applicantNameMap[appData.applicantId]) {
            applicantNameMap[appData.applicantId] =
              appData.applicantSnapshot?.name || appData.demographics?.fullName || 'Unknown';
          }
        }
      } catch {
        // Skip if can't fetch - use ID as fallback
        applicationNumberMap[appId] = appId;
      }
    }

    // Build summary for each applicant
    const applicants: ApplicantDisbursementSummary[] = [];

    for (const [applicantId, data] of applicantMap) {
      const totalDisbursed = data.disbursements.reduce((sum, d) => sum + d.amount, 0);

      // Calculate breakdown by masjid
      const masjidMap = new Map<string, MasjidDisbursementBreakdown>();
      data.disbursements.forEach((d) => {
        const existing = masjidMap.get(d.masjidId);
        if (existing) {
          existing.totalDisbursed += d.amount;
          existing.disbursementCount += 1;
        } else {
          masjidMap.set(d.masjidId, {
            masjidId: d.masjidId,
            masjidName: d.masjidName,
            totalDisbursed: d.amount,
            disbursementCount: 1,
          });
        }
      });

      const disbursementsWithApp: DisbursementWithApplication[] = data.disbursements.map((d) => ({
        ...d,
        applicationNumber: applicationNumberMap[d.applicationId] || d.applicationId,
      }));

      applicants.push({
        applicantId,
        applicantName: applicantNameMap[applicantId] || 'Unknown',
        totalDisbursed,
        disbursementCount: data.disbursements.length,
        applicationCount: data.applicationIds.size,
        lastDisbursedAt: data.disbursements[0]?.disbursedAt,
        byMasjid: Array.from(masjidMap.values()).sort((a, b) => b.totalDisbursed - a.totalDisbursed),
        disbursements: disbursementsWithApp,
      });
    }

    // Sort by total disbursed (highest first)
    applicants.sort((a, b) => b.totalDisbursed - a.totalDisbursed);

    const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);

    return {
      applicants,
      totalDisbursed,
      totalApplicants: applicants.length,
    };
  } catch (error) {
    console.error('Error getting all applicants disbursements:', error);
    throw error;
  }
}

/**
 * Get disbursements for a specific masjid (Zakat Admin view)
 */
export async function getMasjidDisbursements(
  masjidId: string
): Promise<{ disbursements: Disbursement[]; totalDisbursed: number }> {
  try {
    const allDisbursementsRef = collectionGroup(firebaseDb, DISBURSEMENTS_SUBCOLLECTION);
    const q = query(
      allDisbursementsRef,
      where('masjidId', '==', masjidId),
      orderBy('disbursedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const disbursements = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as Disbursement[];

    const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);

    return {
      disbursements,
      totalDisbursed,
    };
  } catch (error) {
    console.error('Error getting masjid disbursements:', error);
    throw error;
  }
}

/**
 * Check if an application has any disbursements
 */
export async function hasApplicationDisbursements(
  applicationId: string
): Promise<boolean> {
  try {
    const disbursementsRef = collection(
      firebaseDb,
      APPLICATIONS_COLLECTION,
      applicationId,
      DISBURSEMENTS_SUBCOLLECTION
    );
    const snapshot = await getDocs(disbursementsRef);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking disbursements:', error);
    return false;
  }
}

/**
 * Get total disbursed for an application (quick lookup)
 */
export async function getApplicationTotalDisbursed(
  applicationId: string
): Promise<number> {
  try {
    const summary = await getApplicationDisbursements(applicationId);
    return summary.totalDisbursed;
  } catch (error) {
    console.error('Error getting application total disbursed:', error);
    return 0;
  }
}

/**
 * Format disbursement amount for display
 */
export function formatDisbursementAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format disbursement date for display
 */
export function formatDisbursementDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get month/year label for a disbursement period
 */
export function getDisbursementPeriodLabel(month: number, year: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}
