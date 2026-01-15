import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MasjidCard } from '@/components/public/MasjidCard';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getActiveMasajid } from '@/services/masjid';
import { MagnifyingGlassIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import type { Masjid } from '@/types/masjid';

export function PublicMasajidListPage() {
  const [masajid, setMasajid] = useState<Masjid[]>([]);
  const [filteredMasajid, setFilteredMasajid] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchMasajid() {
      try {
        setLoading(true);
        const activeMasajid = await getActiveMasajid();
        setMasajid(activeMasajid);
        setFilteredMasajid(activeMasajid);
      } catch (err) {
        console.error('Error fetching masajid:', err);
        setError('Failed to load masajid. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchMasajid();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMasajid(masajid);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = masajid.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.address.city.toLowerCase().includes(query) ||
        m.address.state.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
    );
    setFilteredMasajid(filtered);
  }, [searchQuery, masajid]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Zakat Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Apply Now</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            <BuildingLibraryIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Participating Masajid
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-lg text-gray-600">
            Discover the mosques in our network that are working together to distribute Zakat to those in need.
          </p>
        </div>

        {/* Search */}
        <div className="mt-8 mx-auto max-w-lg">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="mt-16 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-gray-500">Loading masajid...</p>
          </div>
        ) : error ? (
          <div className="mt-16 text-center">
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : filteredMasajid.length === 0 ? (
          <div className="mt-16 text-center">
            {searchQuery ? (
              <>
                <p className="text-gray-600">No masajid found matching "{searchQuery}"</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </Button>
              </>
            ) : (
              <p className="text-gray-600">No masajid are currently available.</p>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <p className="mt-8 text-sm text-gray-500 text-center">
              Showing {filteredMasajid.length} {filteredMasajid.length === 1 ? 'masjid' : 'masajid'}
              {searchQuery && ` for "${searchQuery}"`}
            </p>

            {/* Masajid Grid */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMasajid.map((masjid) => (
                <MasjidCard key={masjid.id} masjid={masjid} />
              ))}
            </div>
          </>
        )}

        {/* CTA Section */}
        <div className="mt-16 rounded-2xl bg-primary-600 p-8 text-center text-white sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Need Zakat Assistance?</h2>
          <p className="mt-4 mx-auto max-w-2xl text-primary-100">
            If you are eligible for Zakat, you can apply through our platform and your application
            will be reviewed by participating masajid in your area.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button
                className="bg-white text-primary-600 hover:bg-primary-50"
              >
                Start Your Application
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="ghost"
                className="text-white hover:bg-primary-500"
              >
                Already Applied? Check Status
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Zakat Management Platform. All rights reserved.
            </p>
            <Link to="/" className="text-sm text-primary-600 hover:text-primary-700">
              Back to Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
