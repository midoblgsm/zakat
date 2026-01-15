/**
 * Query Cache Service
 * Provides in-memory caching for Firestore queries to reduce redundant network calls.
 * Implements time-based expiration and automatic cache invalidation.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to refresh in background when stale (default: true) */
  staleWhileRevalidate?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 0.75; // Consider stale at 75% of TTL

class QueryCacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  /**
   * Get cached data or fetch fresh data
   * @param key - Unique cache key
   * @param fetcher - Function to fetch data if not cached
   * @param options - Cache options
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = DEFAULT_TTL, staleWhileRevalidate = true } = options;
    const now = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    // Return fresh cached data
    if (entry && entry.expiresAt > now) {
      const isStale = now > entry.timestamp + ttl * STALE_THRESHOLD;

      // If stale but not expired, return cached and refresh in background
      if (isStale && staleWhileRevalidate) {
        this.refreshInBackground(key, fetcher, ttl);
      }

      return entry.data;
    }

    // Check for pending request (dedupe concurrent requests)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Fetch fresh data
    const fetchPromise = this.fetchAndCache(key, fetcher, ttl);
    this.pendingRequests.set(key, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Fetch data and store in cache
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const data = await fetcher();
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    return data;
  }

  /**
   * Refresh cache entry in background
   */
  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    // Don't queue multiple background refreshes for the same key
    if (this.pendingRequests.has(`bg-${key}`)) {
      return;
    }

    const refreshPromise = this.fetchAndCache(key, fetcher, ttl);
    this.pendingRequests.set(`bg-${key}`, refreshPromise);

    try {
      await refreshPromise;
    } catch (error) {
      // Silently fail background refreshes - stale data is still valid
      console.warn(`Background refresh failed for key "${key}":`, error);
    } finally {
      this.pendingRequests.delete(`bg-${key}`);
    }
  }

  /**
   * Manually set cache entry
   */
  set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all entries matching a prefix
   * Useful for invalidating all entries related to a resource type
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate a cache key from query parameters
   */
  static createKey(...parts: (string | number | boolean | undefined | null)[]): string {
    return parts.filter((p) => p !== undefined && p !== null).join(':');
  }
}

// Export singleton instance
export const queryCache = new QueryCacheService();

// Export class for testing or custom instances
export { QueryCacheService };

// Cache key prefixes for different resource types
export const CacheKeys = {
  APPLICATIONS: 'applications',
  APPLICATION: 'application',
  USERS: 'users',
  USER: 'user',
  MASAJID: 'masajid',
  MASJID: 'masjid',
  FLAGS: 'flags',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
} as const;
