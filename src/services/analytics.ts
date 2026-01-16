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
  or,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';
import type { ApplicationStatus, ZakatApplication } from '../types/application';
import type { ApplicantFlag } from '../types/flag';
import type { UserRole } from '../types';

/**
 * User context for analytics queries - determines what data the user can access
 */
export interface AnalyticsUserContext {
  role: UserRole;
  masjidId?: string | null;
}

/**
 * Safely convert a Firestore timestamp to a Date object.
 * Handles both Timestamp instances and plain objects {seconds, nanoseconds}.
 */
function timestampToDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;

  // If it's a Firestore Timestamp with toDate method
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }

  // If it's a plain object with seconds (serialized Timestamp)
  const ts = timestamp as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
  if (typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  if (typeof ts.seconds === 'number') {
    return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
  }

  return null;
}

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
 * Returns empty application stats (used when no permissions or errors)
 */
function getEmptyApplicationStats(): ApplicationStats {
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

/**
 * Returns empty processing metrics (used when no permissions or errors)
 */
function getEmptyProcessingMetrics(): ProcessingMetrics {
  return {
    averageProcessingDays: 0,
    medianProcessingDays: 0,
    fastestProcessingDays: 0,
    slowestProcessingDays: 0,
    applicationsProcessedThisMonth: 0,
    applicationsProcessedLastMonth: 0,
  };
}

/**
 * Returns empty flag analytics (used when no permissions or errors)
 */
function getEmptyFlagAnalytics() {
  return {
    total: 0,
    active: 0,
    resolved: 0,
    byMasjid: [],
    bySeverity: { warning: 0, blocked: 0 },
    recentFlags: [] as ApplicantFlag[],
  };
}

/**
 * Build application query based on user permissions
 * Super admins can see all applications
 * Zakat admins can only see applications assigned to their masjid or in the pool (submitted)
 */
function buildApplicationQuery(userContext: AnalyticsUserContext) {
  const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);

  if (userContext.role === 'super_admin') {
    // Super admins can see everything
    return query(applicationsRef);
  }

  if (userContext.role === 'zakat_admin' && userContext.masjidId) {
    // Zakat admins can see applications assigned to their masjid OR submitted (in pool)
    return query(
      applicationsRef,
      or(
        where('assignedToMasjid', '==', userContext.masjidId),
        where('status', '==', 'submitted')
      )
    );
  }

  // Default: no access - return query that will likely return empty
  return query(applicationsRef, where('__name__', '==', '__nonexistent__'));
}

/**
 * Get comprehensive application statistics
 */
export async function getApplicationStats(userContext?: AnalyticsUserContext): Promise<ApplicationStats> {
  try {
    // If no user context provided, return empty stats (permission error prevention)
    if (!userContext) {
      console.warn('getApplicationStats called without user context');
      return getEmptyApplicationStats();
    }

    const q = buildApplicationQuery(userContext);
    const snapshot = await getDocs(q);

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
    return getEmptyApplicationStats();
  }
}

/**
 * Get applications over time (last 30 days)
 */
export async function getApplicationsOverTime(days: number = 30, userContext?: AnalyticsUserContext): Promise<TimeSeriesDataPoint[]> {
  try {
    if (!userContext) {
      console.warn('getApplicationsOverTime called without user context');
      return [];
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);

    let q;
    if (userContext.role === 'super_admin') {
      // Super admins can see all applications
      q = query(
        applicationsRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'asc')
      );
    } else if (userContext.role === 'zakat_admin' && userContext.masjidId) {
      // Zakat admins: query applications assigned to their masjid with date filter
      // Note: We can't combine 'or' with orderBy on different fields in Firestore
      // So we filter client-side for zakat admins
      q = query(
        applicationsRef,
        where('assignedToMasjid', '==', userContext.masjidId)
      );
    } else {
      return [];
    }

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
      const createdDate = timestampToDate(app.createdAt);
      if (createdDate) {
        // For zakat admins, filter by date client-side
        if (userContext.role === 'zakat_admin' && createdDate < startDate) {
          return;
        }
        const date = createdDate.toISOString().split('T')[0];
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
export async function getStatusDistribution(userContext?: AnalyticsUserContext): Promise<{ status: string; count: number; percentage: number }[]> {
  try {
    const stats = await getApplicationStats(userContext);
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
export async function getMasjidStats(userContext?: AnalyticsUserContext): Promise<MasjidStats[]> {
  try {
    if (!userContext) {
      console.warn('getMasjidStats called without user context');
      return [];
    }

    const masjidsRef = collection(firebaseDb, MASAJID_COLLECTION);

    // For zakat admins, only show their own masjid
    let masjidsQuery;
    if (userContext.role === 'super_admin') {
      masjidsQuery = query(masjidsRef);
    } else if (userContext.role === 'zakat_admin' && userContext.masjidId) {
      masjidsQuery = query(masjidsRef, where('__name__', '==', userContext.masjidId));
    } else {
      return [];
    }

    const masjidsSnapshot = await getDocs(masjidsQuery);

    const masjidStatsPromises = masjidsSnapshot.docs.map(async (doc) => {
      const masjid = doc.data();

      // Get active flags for this masjid (admins can read flags for their own masjid)
      let activeFlags = 0;
      try {
        const flagsRef = collection(firebaseDb, FLAGS_COLLECTION);
        const flagsQuery = query(
          flagsRef,
          where('flaggedByMasjid', '==', doc.id),
          where('isActive', '==', true)
        );
        const flagsSnapshot = await getDocs(flagsQuery);
        activeFlags = flagsSnapshot.size;
      } catch {
        // If can't read flags, just show 0
        console.warn('Could not read flags for masjid:', doc.id);
      }

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
        activeFlags,
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
export async function getProcessingMetrics(userContext?: AnalyticsUserContext): Promise<ProcessingMetrics> {
  try {
    if (!userContext) {
      console.warn('getProcessingMetrics called without user context');
      return getEmptyProcessingMetrics();
    }

    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);

    // Get applications with resolution (completed)
    let completedQuery;
    if (userContext.role === 'super_admin') {
      completedQuery = query(
        applicationsRef,
        where('status', 'in', ['approved', 'rejected', 'disbursed', 'closed']),
        firestoreLimit(500)
      );
    } else if (userContext.role === 'zakat_admin' && userContext.masjidId) {
      // Zakat admins can only see metrics for their masjid's applications
      completedQuery = query(
        applicationsRef,
        where('assignedToMasjid', '==', userContext.masjidId),
        where('status', 'in', ['approved', 'rejected', 'disbursed', 'closed']),
        firestoreLimit(500)
      );
    } else {
      return getEmptyProcessingMetrics();
    }

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
      const submittedDate = timestampToDate(app.submittedAt);
      const decidedDate = timestampToDate(app.resolution?.decidedAt);

      if (submittedDate && decidedDate) {
        const days = Math.ceil((decidedDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          processingTimes.push(days);
        }
      }

      // Count by month
      if (decidedDate) {
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
    return getEmptyProcessingMetrics();
  }
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
  limit: number = 10,
  userContext?: AnalyticsUserContext
): Promise<{ action: string; applicationNumber: string; date: string; masjidName?: string }[]> {
  try {
    if (!userContext) {
      console.warn('getRecentActivity called without user context');
      return [];
    }

    const applicationsRef = collection(firebaseDb, APPLICATIONS_COLLECTION);

    let q;
    if (userContext.role === 'super_admin') {
      q = query(
        applicationsRef,
        orderBy('updatedAt', 'desc'),
        firestoreLimit(limit)
      );
    } else if (userContext.role === 'zakat_admin' && userContext.masjidId) {
      // Zakat admins: query applications assigned to their masjid
      // Note: Can't combine where with orderBy on different fields easily, so fetch more and sort client-side
      q = query(
        applicationsRef,
        where('assignedToMasjid', '==', userContext.masjidId),
        firestoreLimit(limit * 2) // Fetch extra to account for sorting
      );
    } else {
      return [];
    }

    const snapshot = await getDocs(q);

    let results = snapshot.docs.map((doc) => {
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

      const updatedDate = timestampToDate(app.updatedAt);
      return {
        action,
        applicationNumber: app.applicationNumber,
        date: updatedDate?.toLocaleDateString() || 'Unknown',
        masjidName: app.assignedToMasjidName ?? undefined,
        _updatedAt: updatedDate?.getTime() || 0, // For sorting
      };
    });

    // Sort by updatedAt descending for zakat admins (since we couldn't use orderBy with where)
    if (userContext.role === 'zakat_admin') {
      results.sort((a, b) => b._updatedAt - a._updatedAt);
    }

    // Remove the internal sorting field and limit results
    return results.slice(0, limit).map(({ _updatedAt, ...rest }) => rest);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

/**
 * Get comprehensive dashboard analytics
 */
export async function getDashboardAnalytics(userContext?: AnalyticsUserContext): Promise<DashboardAnalytics> {
  try {
    if (!userContext) {
      console.warn('getDashboardAnalytics called without user context');
      return {
        applicationStats: getEmptyApplicationStats(),
        processingMetrics: getEmptyProcessingMetrics(),
        applicationsOverTime: [],
        statusDistribution: [],
        topMasjids: [],
        recentActivity: [],
      };
    }

    const [
      applicationStats,
      processingMetrics,
      applicationsOverTime,
      statusDistribution,
      topMasjids,
      recentActivity,
    ] = await Promise.all([
      getApplicationStats(userContext),
      getProcessingMetrics(userContext),
      getApplicationsOverTime(30, userContext),
      getStatusDistribution(userContext),
      getMasjidStats(userContext),
      getRecentActivity(10, userContext),
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
export async function getFlagAnalytics(userContext?: AnalyticsUserContext): Promise<{
  total: number;
  active: number;
  resolved: number;
  byMasjid: { masjidName: string; count: number }[];
  bySeverity: { warning: number; blocked: number };
  recentFlags: ApplicantFlag[];
}> {
  try {
    if (!userContext) {
      console.warn('getFlagAnalytics called without user context');
      return getEmptyFlagAnalytics();
    }

    const flagsRef = collection(firebaseDb, FLAGS_COLLECTION);

    // Both super_admin and zakat_admin can read flags according to rules
    // But zakat admins may want to see only their masjid's flags for relevance
    let q;
    if (userContext.role === 'super_admin') {
      q = query(flagsRef);
    } else if (userContext.role === 'zakat_admin' && userContext.masjidId) {
      // For zakat admins, show flags they created
      q = query(flagsRef, where('flaggedByMasjid', '==', userContext.masjidId));
    } else {
      return getEmptyFlagAnalytics();
    }

    const snapshot = await getDocs(q);

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
        const aTime = timestampToDate(a.createdAt)?.getTime() || 0;
        const bTime = timestampToDate(b.createdAt)?.getTime() || 0;
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
    return getEmptyFlagAnalytics();
  }
}
