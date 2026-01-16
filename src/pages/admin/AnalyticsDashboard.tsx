import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';
import { Badge } from '@/components/common/Badge';
import {
  getDashboardAnalytics,
  getFlagAnalytics,
  type DashboardAnalytics,
  type AnalyticsUserContext,
} from '@/services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import type { ApplicantFlag } from '@/types/flag';

// Simple bar chart component
function BarChart({
  data,
  height = 200,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-primary-500 rounded-t transition-all duration-300 hover:bg-primary-600"
              style={{ height: `${barHeight}%`, minHeight: item.value > 0 ? '4px' : '0' }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Simple donut chart component
function DonutChart({
  data,
  size = 160,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let cumulativePercent = 0;

  const segments = data.map((item) => {
    const percent = (item.value / total) * 100;
    const startAngle = cumulativePercent * 3.6;
    cumulativePercent += percent;
    return { ...item, percent, startAngle };
  });

  // Create conic gradient for the donut
  const gradientStops = segments
    .map((seg) => `${seg.color} ${seg.startAngle}deg ${seg.startAngle + seg.percent * 3.6}deg`)
    .join(', ');

  return (
    <div className="flex items-center gap-4">
      <div
        className="rounded-full relative"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradientStops})`,
        }}
      >
        <div
          className="absolute bg-white rounded-full"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            top: size * 0.2,
            left: size * 0.2,
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`mt-1 text-sm ${
                trend.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const { userRole, userMasjidId } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [flagAnalytics, setFlagAnalytics] = useState<{
    total: number;
    active: number;
    resolved: number;
    byMasjid: { masjidName: string; count: number }[];
    bySeverity: { warning: number; blocked: number };
    recentFlags: ApplicantFlag[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build user context for analytics queries
  const userContext: AnalyticsUserContext | undefined = useMemo(() => {
    if (!userRole) return undefined;
    return {
      role: userRole,
      masjidId: userMasjidId,
    };
  }, [userRole, userMasjidId]);

  const loadAnalytics = useCallback(async () => {
    if (!userContext) {
      setError('User context not available. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [dashboardData, flagData] = await Promise.all([
        getDashboardAnalytics(userContext),
        getFlagAnalytics(userContext),
      ]);
      setAnalytics(dashboardData);
      setFlagAnalytics(flagData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userContext]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Button onClick={loadAnalytics}>Retry</Button>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Status colors for donut chart
  const statusColors: Record<string, string> = {
    'Submitted': '#3B82F6',
    'Under Review': '#8B5CF6',
    'Pending Docs': '#F59E0B',
    'Pending Verification': '#F97316',
    'Approved': '#10B981',
    'Rejected': '#EF4444',
    'Disbursed': '#059669',
    'Closed': '#6B7280',
    'Draft': '#D1D5DB',
  };

  // Calculate month-over-month change
  const monthChange = analytics.processingMetrics.applicationsProcessedLastMonth > 0
    ? Math.round(
        ((analytics.processingMetrics.applicationsProcessedThisMonth -
          analytics.processingMetrics.applicationsProcessedLastMonth) /
          analytics.processingMetrics.applicationsProcessedLastMonth) *
          100
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive overview of application processing and performance metrics
          </p>
        </div>
        <Button variant="outline" onClick={loadAnalytics}>
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Applications"
          value={analytics.applicationStats.total}
          subtitle={`${analytics.applicationStats.pendingCount} pending`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="blue"
        />

        <StatCard
          title="Approval Rate"
          value={`${analytics.applicationStats.approvalRate}%`}
          subtitle={`${analytics.applicationStats.rejectionRate}% rejection rate`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />

        <StatCard
          title="Total Disbursed"
          value={`$${analytics.applicationStats.totalDisbursedAmount.toLocaleString()}`}
          subtitle={`Approved: $${analytics.applicationStats.totalApprovedAmount.toLocaleString()}`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="purple"
        />

        <StatCard
          title="Processed This Month"
          value={analytics.processingMetrics.applicationsProcessedThisMonth}
          trend={
            monthChange !== 0
              ? { value: monthChange, label: 'vs last month' }
              : undefined
          }
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applications Over Time */}
        <Card>
          <CardHeader
            title="Applications Over Time"
            description="New applications in the last 30 days"
          />
          <CardContent>
            {analytics.applicationsOverTime.length > 0 ? (
              <BarChart
                data={analytics.applicationsOverTime
                  .filter((_, i) => i % 3 === 0) // Show every 3rd day for readability
                  .map((d) => ({ label: d.label || d.date, value: d.count }))}
                height={200}
              />
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader
            title="Status Distribution"
            description="Current application status breakdown"
          />
          <CardContent>
            {analytics.statusDistribution.length > 0 ? (
              <DonutChart
                data={analytics.statusDistribution.slice(0, 6).map((s) => ({
                  label: s.status,
                  value: s.count,
                  color: statusColors[s.status] || '#6B7280',
                }))}
              />
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processing Metrics and Flags */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Processing Metrics */}
        <Card>
          <CardHeader
            title="Processing Metrics"
            description="Application processing time statistics"
          />
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Average Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.processingMetrics.averageProcessingDays} days
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Median Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.processingMetrics.medianProcessingDays} days
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Fastest</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.processingMetrics.fastestProcessingDays} days
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">Slowest</p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics.processingMetrics.slowestProcessingDays} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flag Statistics */}
        <Card>
          <CardHeader
            title="Flag Statistics"
            description="Cross-masjid flag overview"
          />
          <CardContent>
            {flagAnalytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{flagAnalytics.total}</p>
                    <p className="text-xs text-gray-500">Total Flags</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{flagAnalytics.active}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{flagAnalytics.resolved}</p>
                    <p className="text-xs text-gray-500">Resolved</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">By Severity</p>
                  <div className="flex gap-4">
                    <Badge variant="warning" size="lg">
                      {flagAnalytics.bySeverity.warning} Warnings
                    </Badge>
                    <Badge variant="error" size="lg">
                      {flagAnalytics.bySeverity.blocked} Blocked
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No flag data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Masjid Performance and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Masajid */}
        <Card>
          <CardHeader
            title="Masjid Performance"
            description="Applications handled by each masjid"
          />
          <CardContent>
            {analytics.topMasjids.length > 0 ? (
              <div className="space-y-3">
                {analytics.topMasjids.map((masjid, index) => (
                  <div
                    key={masjid.masjidId}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {masjid.masjidName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {masjid.applicationsInProgress} in progress
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {masjid.applicationsHandled} handled
                      </p>
                      <p className="text-xs text-gray-500">
                        {masjid.approvalRate}% approval rate
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No masjid data available</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            description="Latest application updates"
          />
          <CardContent>
            {analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.action === 'Approved' || activity.action === 'Disbursed'
                            ? 'bg-green-500'
                            : activity.action === 'Rejected'
                            ? 'bg-red-500'
                            : activity.action === 'Submitted'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.applicationNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.masjidName || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-700">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
