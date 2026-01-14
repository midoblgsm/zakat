import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getMasjidSummaryStats, getActiveMasajid } from '@/services/masjid';
import { listUsers } from '@/services/functions';
import type { Masjid } from '@/types';

interface DashboardStats {
  totalMasajid: number;
  activeMasajid: number;
  totalUsers: number;
  totalAdmins: number;
  totalApplicationsHandled: number;
  totalAmountDisbursed: number;
}

export function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMasajid, setRecentMasajid] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [masjidStats, masajid, usersResult] = await Promise.all([
        getMasjidSummaryStats(),
        getActiveMasajid(),
        listUsers({ limit: 100 }),
      ]);

      const users = usersResult.success && usersResult.data ? usersResult.data.users : [];
      const admins = (users as { role: string }[]).filter(
        u => u.role === 'zakat_admin' || u.role === 'super_admin'
      );

      setStats({
        totalMasajid: masjidStats.totalMasajid,
        activeMasajid: masjidStats.activeMasajid,
        totalUsers: users.length,
        totalAdmins: admins.length,
        totalApplicationsHandled: masjidStats.totalApplicationsHandled,
        totalAmountDisbursed: masjidStats.totalAmountDisbursed,
      });

      setRecentMasajid(masajid.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats
    ? [
        {
          label: 'Active Masajid',
          value: stats.activeMasajid.toString(),
          icon: BuildingOffice2Icon,
          color: 'bg-primary-500',
          link: '/super-admin/masajid',
        },
        {
          label: 'Total Users',
          value: stats.totalUsers.toString(),
          icon: UserGroupIcon,
          color: 'bg-blue-500',
          link: '/super-admin/users',
        },
        {
          label: 'Applications Handled',
          value: stats.totalApplicationsHandled.toString(),
          icon: DocumentTextIcon,
          color: 'bg-green-500',
          link: '/super-admin/applications',
        },
        {
          label: 'Total Disbursed',
          value: `$${stats.totalAmountDisbursed.toLocaleString()}`,
          icon: CurrencyDollarIcon,
          color: 'bg-amber-500',
          link: null,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Super Admin Dashboard
        </h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {profile?.firstName}. Manage the entire Zakat platform.
        </p>
      </div>

      {/* Statistics */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const content = (
                <Card key={stat.label} padding="sm" className="hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              );

              return stat.link ? (
                <Link key={stat.label} to={stat.link}>
                  {content}
                </Link>
              ) : (
                <div key={stat.label}>{content}</div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader title="Masajid Management" />
              <CardContent>
                <p className="text-sm text-gray-600">
                  Onboard new masajid and manage existing ones.
                </p>
                <div className="mt-4 space-y-2">
                  <Link to="/super-admin/masajid" className="block">
                    <Button fullWidth>Manage Masajid</Button>
                  </Link>
                  <Link to="/super-admin/masajid/new" className="block">
                    <Button variant="outline" fullWidth>
                      + Add New Masjid
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="User Management" />
              <CardContent>
                <p className="text-sm text-gray-600">
                  Manage users and assign admin roles.
                </p>
                <div className="mt-4 space-y-2">
                  <Link to="/super-admin/users" className="block">
                    <Button fullWidth>Manage Users</Button>
                  </Link>
                  <p className="text-center text-xs text-gray-500">
                    {stats?.totalAdmins || 0} admin users
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Applications" />
              <CardContent>
                <p className="text-sm text-gray-600">
                  View and monitor all zakat applications across all masajid.
                </p>
                <Link to="/super-admin/applications" className="mt-4 block">
                  <Button fullWidth>
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    View All Applications
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent Masajid */}
          <Card>
            <CardHeader
              title="Active Masajid"
              description="Recently active mosques on the platform"
            />
            <CardContent>
              {recentMasajid.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No masajid yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by onboarding your first masjid.
                  </p>
                  <div className="mt-6">
                    <Link to="/super-admin/masajid/new">
                      <Button>Add Masjid</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Masjid
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Active Cases
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Total Handled
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentMasajid.map(masjid => (
                        <tr key={masjid.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center"
                                style={{
                                  backgroundColor: masjid.primaryColor || '#6366f1',
                                }}
                              >
                                <span className="text-white font-bold text-sm">
                                  {masjid.name.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {masjid.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {masjid.address.city}, {masjid.address.state}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {masjid.stats?.applicationsInProgress || 0}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {masjid.stats?.totalApplicationsHandled || 0}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <Link to={`/super-admin/masajid/${masjid.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Overview */}
          <Card>
            <CardHeader
              title="Platform Overview"
              description="Platform-wide statistics and metrics"
            />
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <ChartBarIcon className="h-8 w-8 text-primary-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.totalMasajid || 0}
                      </p>
                      <p className="text-sm text-gray-500">Total Masajid</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <UserGroupIcon className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.totalAdmins || 0}
                      </p>
                      <p className="text-sm text-gray-500">Admin Users</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${(stats?.totalAmountDisbursed || 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Total Disbursed</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
