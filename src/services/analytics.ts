/**
 * Analytics Service
 *
 * Service functions for collecting and aggregating analytics data:
 * - Application statistics (total, by status, approval rates)
 * - Processing metrics (average time, etc.)
 * - Masjid performance metrics
 * - Flag statistics
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';
import type { ApplicationStatus, ZakatApplication } from '../types/application';
import type { ApplicantFlag } from '../types/flag';

// Types for analytics data
export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  approvalRate: number;
  rejectionRate: number;
  pendingCount: number;
  averageRequestedAmount: number;
  totalApprovedAmount: number;
  totalDisbursedAmount: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  count: number;
  label?: string;
}

export interface MasjidStats {
  masjidId: string;
  masjidName: string;
  applicationsHandled: number;
  applicationsInProgress: number;
  totalDisbursed: number;
  approvalRate: number;
  activeFlags: number;
}

export interface ProcessingMetrics {
  averageProcessingDays: number;
  medianProcessingDays: number;
  fastestProcessingDays: number;
  slowestProcessingDays: number;
  applicationsProcessedThisMonth: number;
  applicationsProcessedLastMonth: number;
}

export interface DashboardAnalytics {
  applicationStats: ApplicationStats;
  processingMetrics: ProcessingMetrics;
  applicationsOverTime: TimeSeriesDataPoint[];
  statusDistribution: { status: string; count: number; percentage: number }[];
  topMasjids: MasjidStats[];
  recentActivity: {
    action: string;
    applicationNumber: string;
    date: string;
    masjidName?: string;
  }[];
}

const APPLICATIONS_COLLECTION = 'applications';
const FLAGS_COLLECTION = 'flags';
const MASAJID_COLLECTION = 'masajid';

/**
 * Get comprehensive application statistics
 */
export async function getApplicationStats(): Promise<ApplicationStats> {
  try {
    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);
    const snapshot = await getDocs(applicationsRef);

    const stats: ApplicationStats = {
      total: 0,
      byStatus: {
        draft: 0,
        submitted: 0,
        under_review: 0,
        pending_documents: 0,
        pending_verification: 0,
        approved: 0,
        rejected: 0,
        disbursed: 0,
        closed: 0,
      },
      approvalRate: 0,
      rejectionRate: 0,
      pendingCount: 0,
      averageRequestedAmount: 0,
      totalApprovedAmount: 0,
      totalDisbursedAmount: 0,
    };

    let totalRequestedAmount = 0;
    let completedApplications = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    snapshot.docs.forEach((doc) => {
      const app = doc.data() as ZakatApplication;
      stats.total++;

      // Count by status
      if (stats.byStatus[app.status] !== undefined) {
        stats.byStatus[app.status]++;
      }

      // Calculate amounts
      if (app.zakatRequest?.amountRequested) {
        totalRequestedAmount += app.zakatRequest.amountRequested;
      }

      // Track completed applications for rate calculation
      if (app.status === 'approved' || app.status === 'disbursed') {
        approvedCount++;
        completedApplications++;
        if (app.resolution?.amountApproved) {
          stats.totalApprovedAmount += app.resolution.amountApproved;
        }
        // Track actual disbursed amounts
        if (app.status === 'disbursed' && app.resolution?.amountDisbursed) {
          stats.totalDisbursedAmount += app.resolution.amountDisbursed;
        }
      } else if (app.status === 'rejected' || app.status === 'closed') {
        if (app.resolution?.decision === 'rejected') {
          rejectedCount++;
        }
        completedApplications++;
      }

      // Count pending
      if (['submitted', 'under_review', 'pending_documents', 'pending_verification'].includes(app.status)) {
        stats.pendingCount++;
      }
    });

    // Calculate rates
    if (completedApplications > 0) {
      stats.approvalRate = Math.round((approvedCount / completedApplications) * 100);
      stats.rejectionRate = Math.round((rejectedCount / completedApplications) * 100);
    }

    // Calculate average
    if (stats.total > 0) {
      stats.averageRequestedAmount = Math.round(totalRequestedAmount / stats.total);
    }

    return stats;
  } catch (error) {
    console.error('Error getting application stats:', error);
    return {
      total: 0,
      byStatus: {
        draft: 0,
        submitted: 0,
        under_review: 0,
        pending_documents: 0,
        pending_verification: 0,
        approved: 0,
        rejected: 0,
        disbursed: 0,
        closed: 0,
      },
      approvalRate: 0,
      rejectionRate: 0,
      pendingCount: 0,
      averageRequestedAmount: 0,
      totalApprovedAmount: 0,
      totalDisbursedAmount: 0,
    };
  }
}

/**
 * Get applications over time (last 30 days)
 */
export async function getApplicationsOverTime(days: number = 30): Promise<TimeSeriesDataPoint[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);
    const q = query(
      applicationsRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);

    // Group by date
    const countsByDate: Record<string, number> = {};

    // Initialize all dates with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      countsByDate[dateStr] = 0;
    }

    snapshot.docs.forEach((doc) => {
      const app = doc.data() as ZakatApplication;
      if (app.createdAt) {
        const date = app.createdAt.toDate().toISOString().split('T')[0];
        if (countsByDate[date] !== undefined) {
          countsByDate[date]++;
        }
      }
    });

    return Object.entries(countsByDate).map(([date, count]) => ({
      date,
      count,
      label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  } catch (error) {
    console.error('Error getting applications over time:', error);
    return [];
  }
}

/**
 * Get status distribution for pie/donut chart
 */
export async function getStatusDistribution(): Promise<{ status: string; count: number; percentage: number }[]> {
  try {
    const stats = await getApplicationStats();
    const total = stats.total || 1; // Avoid division by zero

    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under Review',
      pending_documents: 'Pending Docs',
      pending_verification: 'Pending Verification',
      approved: 'Approved',
      rejected: 'Rejected',
      disbursed: 'Disbursed',
      closed: 'Closed',
    };

    return Object.entries(stats.byStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        status: statusLabels[status] || status,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error getting status distribution:', error);
    return [];
  }
}

/**
 * Get masjid performance statistics
 */
export async function getMasjidStats(): Promise<MasjidStats[]> {
  try {
    const masjidsRef = collection(firebaseDb, MASAJID_COLLECTION);
    const masjidsSnapshot = await getDocs(masjidsRef);

    const masjidStatsPromises = masjidsSnapshot.docs.map(async (doc) => {
      const masjid = doc.data();

      // Get active flags for this masjid
      const flagsRef = collection(firebaseDb, FLAGS_COLLECTION);
      const flagsQuery = query(
        flagsRef,
        where('flaggedByMasjid', '==', doc.id),
        where('isActive', '==', true)
      );
      const flagsSnapshot = await getDocs(flagsQuery);

      // Get applications handled by this masjid
      const appsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);
      const appsQuery = query(
        appsRef,
        where('assignedToMasjid', '==', doc.id)
      );
      const appsSnapshot = await getDocs(appsQuery);

      let approved = 0;
      let total = 0;
      appsSnapshot.docs.forEach((appDoc) => {
        const app = appDoc.data() as ZakatApplication;
        if (['approved', 'rejected', 'disbursed', 'closed'].includes(app.status)) {
          total++;
          if (app.status === 'approved' || app.status === 'disbursed') {
            approved++;
          }
        }
      });

      return {
        masjidId: doc.id,
        masjidName: masjid.name,
        applicationsHandled: masjid.stats?.totalApplicationsHandled || 0,
        applicationsInProgress: masjid.stats?.applicationsInProgress || 0,
        totalDisbursed: masjid.stats?.totalAmountDisbursed || 0,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        activeFlags: flagsSnapshot.size,
      };
    });

    const stats = await Promise.all(masjidStatsPromises);
    return stats.sort((a, b) => b.applicationsHandled - a.applicationsHandled);
  } catch (error) {
    console.error('Error getting masjid stats:', error);
    return [];
  }
}

/**
 * Get processing metrics
 */
export async function getProcessingMetrics(): Promise<ProcessingMetrics> {
  try {
    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);

    // Get applications with resolution (completed)
    const completedQuery = query(
      applicationsRef,
      where('status', 'in', ['approved', 'rejected', 'disbursed', 'closed']),
      firestoreLimit(500)
    );
    const completedSnapshot = await getDocs(completedQuery);

    const processingTimes: number[] = [];
    let thisMonthCount = 0;
    let lastMonthCount = 0;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    completedSnapshot.docs.forEach((doc) => {
      const app = doc.data() as ZakatApplication;

      // Calculate processing time
      if (app.submittedAt && app.resolution?.decidedAt) {
        const submitted = app.submittedAt.toDate();
        const decided = app.resolution.decidedAt.toDate();
        const days = Math.ceil((decided.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          processingTimes.push(days);
        }
      }

      // Count by month
      if (app.resolution?.decidedAt) {
        const decidedDate = app.resolution.decidedAt.toDate();
        if (decidedDate >= thisMonthStart) {
          thisMonthCount++;
        } else if (decidedDate >= lastMonthStart && decidedDate <= lastMonthEnd) {
          lastMonthCount++;
        }
      }
    });

    // Calculate metrics
    processingTimes.sort((a, b) => a - b);
    const metrics: ProcessingMetrics = {
      averageProcessingDays: 0,
      medianProcessingDays: 0,
      fastestProcessingDays: 0,
      slowestProcessingDays: 0,
      applicationsProcessedThisMonth: thisMonthCount,
      applicationsProcessedLastMonth: lastMonthCount,
    };

    if (processingTimes.length > 0) {
      metrics.averageProcessingDays = Math.round(
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      );
      metrics.medianProcessingDays = processingTimes[Math.floor(processingTimes.length / 2)];
      metrics.fastestProcessingDays = processingTimes[0];
      metrics.slowestProcessingDays = processingTimes[processingTimes.length - 1];
    }

    return metrics;
  } catch (error) {
    console.error('Error getting processing metrics:', error);
    return {
      averageProcessingDays: 0,
      medianProcessingDays: 0,
      fastestProcessingDays: 0,
      slowestProcessingDays: 0,
      applicationsProcessedThisMonth: 0,
      applicationsProcessedLastMonth: 0,
    };
  }
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
  limit: number = 10
): Promise<{ action: string; applicationNumber: string; date: string; masjidName?: string }[]> {
  try {
    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);
    const q = query(
      applicationsRef,
      orderBy('updatedAt', 'desc'),
      firestoreLimit(limit)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const app = doc.data() as ZakatApplication;
      let action = 'Updated';

      if (app.status === 'submitted') {
        action = 'Submitted';
      } else if (app.status === 'approved') {
        action = 'Approved';
      } else if (app.status === 'rejected') {
        action = 'Rejected';
      } else if (app.status === 'under_review') {
        action = 'Under Review';
      } else if (app.status === 'disbursed') {
        action = 'Disbursed';
      }

      return {
        action,
        applicationNumber: app.applicationNumber,
        date: app.updatedAt?.toDate().toLocaleDateString() || 'Unknown',
        masjidName: app.assignedToMasjidName ?? undefined,
      };
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

/**
 * Get comprehensive dashboard analytics
 */
export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  try {
    const [
      applicationStats,
      processingMetrics,
      applicationsOverTime,
      statusDistribution,
      topMasjids,
      recentActivity,
    ] = await Promise.all([
      getApplicationStats(),
      getProcessingMetrics(),
      getApplicationsOverTime(30),
      getStatusDistribution(),
      getMasjidStats(),
      getRecentActivity(10),
    ]);

    return {
      applicationStats,
      processingMetrics,
      applicationsOverTime,
      statusDistribution,
      topMasjids: topMasjids.slice(0, 5),
      recentActivity,
    };
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    throw error;
  }
}

/**
 * Get flag analytics
 */
export async function getFlagAnalytics(): Promise<{
  total: number;
  active: number;
  resolved: number;
  byMasjid: { masjidName: string; count: number }[];
  bySeverity: { warning: number; blocked: number };
  recentFlags: ApplicantFlag[];
}> {
  try {
    const flagsRef = collection(firebaseDb, FLAGS_COLLECTION);
    const snapshot = await getDocs(flagsRef);

    let active = 0;
    let resolved = 0;
    let warning = 0;
    let blocked = 0;
    const byMasjidMap: Record<string, { masjidName: string; count: number }> = {};

    const allFlags = snapshot.docs.map((doc) => doc.data() as ApplicantFlag);

    allFlags.forEach((flag) => {
      if (flag.isActive) {
        active++;
        if (flag.severity === 'warning') warning++;
        if (flag.severity === 'blocked') blocked++;
      } else {
        resolved++;
      }

      if (flag.flaggedByMasjid) {
        if (!byMasjidMap[flag.flaggedByMasjid]) {
          byMasjidMap[flag.flaggedByMasjid] = {
            masjidName: flag.flaggedByMasjidName || flag.flaggedByMasjid,
            count: 0,
          };
        }
        byMasjidMap[flag.flaggedByMasjid].count++;
      }
    });

    // Sort flags by createdAt for recent flags
    const recentFlags = allFlags
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    return {
      total: allFlags.length,
      active,
      resolved,
      byMasjid: Object.values(byMasjidMap).sort((a, b) => b.count - a.count),
      bySeverity: { warning, blocked },
      recentFlags,
    };
  } catch (error) {
    console.error('Error getting flag analytics:', error);
    return {
      total: 0,
      active: 0,
      resolved: 0,
      byMasjid: [],
      bySeverity: { warning: 0, blocked: 0 },
      recentFlags: [],
    };
  }
}
