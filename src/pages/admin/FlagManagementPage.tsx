import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';
import { Badge, SeverityBadge } from '@/components/common/Badge';
import { FlagCard, FlagListItem } from '@/components/flags';
import { FlagDetailModal } from '@/components/flags/FlagDetailModal';
import { getFlags, getFlagStats, resolveFlag } from '@/services/flag';
import { useAuth } from '@/contexts/AuthContext';
import type { ApplicantFlag, FlagSeverity } from '@/types/flag';
import type { FlagStats } from '@/services/flag';

type FilterTab = 'all' | 'active' | 'resolved';
type ViewMode = 'cards' | 'list';

export function FlagManagementPage() {
  const { user, claims } = useAuth();
  const [flags, setFlags] = useState<ApplicantFlag[]>([]);
  const [stats, setStats] = useState<FlagStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [severityFilter, setSeverityFilter] = useState<FlagSeverity | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlag, setSelectedFlag] = useState<ApplicantFlag | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isSuperAdmin = claims?.role === 'super_admin';
  const canResolve = isSuperAdmin; // Only super admin can resolve flags

  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isActive = activeTab === 'all' ? undefined : activeTab === 'active';
      const result = await getFlags({
        isActive,
        severity: severityFilter || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setFlags(result.flags);
    } catch (err) {
      console.error('Error loading flags:', err);
      setError('Failed to load flags. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, severityFilter, searchQuery]);

  const loadStats = useCallback(async () => {
    try {
      const flagStats = await getFlagStats();
      setStats(flagStats);
    } catch (err) {
      console.error('Error loading flag stats:', err);
    }
  }, []);

  useEffect(() => {
    loadFlags();
    loadStats();
  }, [loadFlags, loadStats]);

  const handleViewDetails = (flag: ApplicantFlag) => {
    setSelectedFlag(flag);
    setIsDetailModalOpen(true);
  };

  const handleResolveFlag = async (flagId: string, resolutionNotes: string) => {
    await resolveFlag(flagId, resolutionNotes);
    // Reload flags and stats
    await loadFlags();
    await loadStats();
  };

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'active', label: 'Active Flags', count: stats?.active },
    { key: 'resolved', label: 'Resolved', count: stats?.resolved },
    { key: 'all', label: 'All Flags', count: stats?.total },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flagged Applicants</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage flagged applicants across all participating masajid
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Flags</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Warnings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.bySeverity.warning}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Blocked</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.bySeverity.blocked}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.resolved}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cross-Masjid Notice */}
      <Alert variant="info">
        <strong>Cross-Masjid Visibility:</strong> Flags are shared across all participating masajid to help prevent fraud and duplicate applications.
        {!isSuperAdmin && ' Only Super Admins can resolve flags.'}
      </Alert>

      {/* Filters and Controls */}
      <Card>
        <div className="space-y-4">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        activeTab === tab.key
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as FlagSeverity | '')}
              className="rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Severities</option>
              <option value="warning">Warning</option>
              <option value="blocked">Blocked</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`rounded px-3 py-1 text-sm ${
                  viewMode === 'cards'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1 text-sm ${
                  viewMode === 'list'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                List
              </button>
            </div>

            {/* Refresh Button */}
            <Button variant="ghost" onClick={() => { loadFlags(); loadStats(); }}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <Alert variant="error">{error}</Alert>
      ) : flags.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No flags found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'active'
                ? 'There are no active flags at this time.'
                : activeTab === 'resolved'
                ? 'No resolved flags found.'
                : 'No flags match your search criteria.'}
            </p>
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flags.map((flag) => (
            <FlagCard
              key={flag.id}
              flag={flag}
              onViewDetails={handleViewDetails}
              onResolve={canResolve ? handleViewDetails : undefined}
              canResolve={canResolve}
              showMasjidInfo
            />
          ))}
        </div>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-gray-100">
            {flags.map((flag) => (
              <FlagListItem
                key={flag.id}
                flag={flag}
                onClick={handleViewDetails}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Flag Detail Modal */}
      <FlagDetailModal
        flag={selectedFlag}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedFlag(null);
        }}
        onResolve={canResolve ? handleResolveFlag : undefined}
        canResolve={canResolve}
      />
    </div>
  );
}
