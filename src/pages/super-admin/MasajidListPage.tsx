import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Alert } from '@/components/common/Alert';
import { getMasajid, toggleMasjidActive } from '@/services/masjid';
import type { Masjid } from '@/types';

export function MasajidListPage() {
  const [masajid, setMasajid] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadMasajid();
  }, [showInactive]);

  const loadMasajid = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMasajid({
        isActive: showInactive ? undefined : true,
        limit: 100,
      });
      setMasajid(result.masajid);
    } catch (err) {
      console.error('Error loading masajid:', err);
      setError('Failed to load masajid. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (masjidId: string, currentStatus: boolean) => {
    setTogglingId(masjidId);
    try {
      await toggleMasjidActive(masjidId, !currentStatus);
      setMasajid(prev =>
        prev.map(m =>
          m.id === masjidId ? { ...m, isActive: !currentStatus } : m
        )
      );
    } catch (err) {
      console.error('Error toggling masjid status:', err);
      setError('Failed to update masjid status.');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredMasajid = masajid.filter(m => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      m.address.city.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Masajid Management</h1>
          <p className="mt-1 text-gray-600">
            Onboard and manage masajid on the platform
          </p>
        </div>
        <Link to="/super-admin/masajid/new">
          <Button>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Masjid
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader title="All Masajid" />
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name, email, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Show inactive</span>
            </label>
          </div>

          {/* Masajid List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredMasajid.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No masajid found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Get started by adding a new masjid'}
              </p>
              {!searchQuery && (
                <div className="mt-6">
                  <Link to="/super-admin/masajid/new">
                    <Button>
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Masjid
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Masjid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMasajid.map((masjid) => (
                    <tr key={masjid.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {masjid.logo ? (
                            <img
                              src={masjid.logo}
                              alt={masjid.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: masjid.primaryColor || '#6366f1',
                              }}
                            >
                              <span className="text-white font-bold text-lg">
                                {masjid.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {masjid.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              /{masjid.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{masjid.email}</p>
                        <p className="text-xs text-gray-500">{masjid.phone}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">
                          {masjid.address.city}, {masjid.address.state}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">
                          {masjid.stats?.applicationsInProgress || 0} active
                        </p>
                        <p className="text-xs text-gray-500">
                          {masjid.stats?.totalApplicationsHandled || 0} total
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            masjid.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {masjid.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/super-admin/masajid/${masjid.id}`}>
                            <Button variant="outline" size="sm">
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(masjid.id, masjid.isActive)}
                            disabled={togglingId === masjid.id}
                          >
                            {togglingId === masjid.id ? (
                              <LoadingSpinner size="sm" />
                            ) : masjid.isActive ? (
                              'Deactivate'
                            ) : (
                              'Activate'
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
