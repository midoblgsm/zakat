import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryCacheService, CacheKeys } from './queryCache';

describe('QueryCacheService', () => {
  let cache: QueryCacheService;

  beforeEach(() => {
    cache = new QueryCacheService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get', () => {
    it('should fetch data when cache is empty', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const result = await cache.get('test-key', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: 'test' });
    });

    it('should return cached data on subsequent calls', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });

      await cache.get('test-key', fetcher);
      const result = await cache.get('test-key', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: 'test' });
    });

    it('should refetch when cache expires', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' });
      const ttl = 1000; // 1 second

      await cache.get('test-key', fetcher, { ttl });

      // Advance time past TTL
      vi.advanceTimersByTime(ttl + 100);

      await cache.get('test-key', fetcher, { ttl });

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should dedupe concurrent requests', async () => {
      let resolvePromise: (value: unknown) => void;
      const slowFetcher = vi.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const promise1 = cache.get('test-key', slowFetcher);
      const promise2 = cache.get('test-key', slowFetcher);

      // Resolve the promise
      resolvePromise!({ data: 'test' });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(slowFetcher).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
    });
  });

  describe('set', () => {
    it('should set cache entry manually', async () => {
      const fetcher = vi.fn();

      cache.set('test-key', { data: 'manual' });
      const result = await cache.get('test-key', fetcher);

      expect(fetcher).not.toHaveBeenCalled();
      expect(result).toEqual({ data: 'manual' });
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific cache entry', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'new' });

      cache.set('test-key', { data: 'old' });
      cache.invalidate('test-key');

      const result = await cache.get('test-key', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: 'new' });
    });
  });

  describe('invalidateByPrefix', () => {
    it('should invalidate all entries with prefix', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'new' });

      cache.set('users:1', { id: 1 });
      cache.set('users:2', { id: 2 });
      cache.set('posts:1', { id: 1 });

      cache.invalidateByPrefix('users');

      // Users should be refetched
      await cache.get('users:1', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Posts should still be cached
      const postFetcher = vi.fn();
      await cache.get('posts:1', postFetcher);
      expect(postFetcher).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'new' });

      cache.set('key1', { data: 1 });
      cache.set('key2', { data: 2 });
      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);

      await cache.get('key1', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', { data: 1 });
      cache.set('key2', { data: 2 });

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });

  describe('createKey', () => {
    it('should create cache key from parts', () => {
      const key = QueryCacheService.createKey('users', 123, 'profile');
      expect(key).toBe('users:123:profile');
    });

    it('should filter out undefined and null values', () => {
      const key = QueryCacheService.createKey('users', undefined, null, 'active');
      expect(key).toBe('users:active');
    });
  });

  describe('CacheKeys', () => {
    it('should have predefined cache key prefixes', () => {
      expect(CacheKeys.APPLICATIONS).toBe('applications');
      expect(CacheKeys.USERS).toBe('users');
      expect(CacheKeys.MASAJID).toBe('masajid');
      expect(CacheKeys.FLAGS).toBe('flags');
      expect(CacheKeys.NOTIFICATIONS).toBe('notifications');
      expect(CacheKeys.ANALYTICS).toBe('analytics');
    });
  });
});
