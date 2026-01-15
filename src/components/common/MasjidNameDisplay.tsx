import { useState, useEffect } from 'react';
import { getMasjid } from '@/services/masjid';

// Simple in-memory cache for masjid names to avoid repeated fetches
const masjidNameCache: Record<string, { name: string; zipCode?: string }> = {};

interface MasjidNameDisplayProps {
  masjidId?: string | null;
  masjidName?: string | null;
  zipCode?: string | null;
  showZipCode?: boolean;
  className?: string;
  fallback?: string;
}

/**
 * Component that displays a masjid name, fetching it from the database
 * if not already provided via the masjidName prop.
 */
export function MasjidNameDisplay({
  masjidId,
  masjidName,
  zipCode,
  showZipCode = true,
  className = '',
  fallback = 'Unknown',
}: MasjidNameDisplayProps) {
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  const [fetchedZipCode, setFetchedZipCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If we already have the name, no need to fetch
    if (masjidName) {
      return;
    }

    // If no masjid ID, nothing to fetch
    if (!masjidId) {
      return;
    }

    // Check cache first
    const cached = masjidNameCache[masjidId];
    if (cached) {
      setFetchedName(cached.name);
      setFetchedZipCode(cached.zipCode || null);
      return;
    }

    // Fetch the masjid name
    const fetchMasjidName = async () => {
      setIsLoading(true);
      try {
        const masjid = await getMasjid(masjidId);
        if (masjid) {
          // Cache the result
          masjidNameCache[masjidId] = {
            name: masjid.name,
            zipCode: masjid.address?.zipCode,
          };
          setFetchedName(masjid.name);
          setFetchedZipCode(masjid.address?.zipCode || null);
        }
      } catch (error) {
        console.error('Error fetching masjid name:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasjidName();
  }, [masjidId, masjidName]);

  // Determine what to display
  const displayName = masjidName || fetchedName;
  const displayZipCode = zipCode || fetchedZipCode;

  if (isLoading) {
    return (
      <span className={`text-gray-400 ${className}`}>
        Loading...
      </span>
    );
  }

  if (!displayName) {
    return (
      <span className={`text-gray-500 ${className}`}>
        {fallback}
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="font-medium text-gray-700">{displayName}</span>
      {showZipCode && displayZipCode && (
        <span className="text-gray-500 ml-1">({displayZipCode})</span>
      )}
    </span>
  );
}
