import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Rate Limiter Configuration
 */
interface RateLimitConfig {
  /** Time window in seconds */
  windowSeconds: number;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Optional custom key generator (defaults to user UID) */
  keyGenerator?: (uid: string, functionName: string) => string;
}

/**
 * Rate limit presets for different function types
 */
export const RateLimitPresets = {
  /** Standard API calls: 100 requests per minute */
  STANDARD: { windowSeconds: 60, maxRequests: 100 },
  /** Write operations: 30 requests per minute */
  WRITE: { windowSeconds: 60, maxRequests: 30 },
  /** Sensitive operations (auth changes): 10 requests per minute */
  SENSITIVE: { windowSeconds: 60, maxRequests: 10 },
  /** Bulk operations: 5 requests per minute */
  BULK: { windowSeconds: 60, maxRequests: 5 },
  /** Auth attempts (login): 5 requests per 15 minutes */
  AUTH: { windowSeconds: 900, maxRequests: 5 },
  /** Email sending: 10 emails per hour */
  EMAIL: { windowSeconds: 3600, maxRequests: 10 },
} as const;

const RATE_LIMIT_COLLECTION = "rateLimits";

/**
 * Check if a request should be rate limited
 * Uses Firestore for distributed rate limiting across function instances
 *
 * @param uid - User ID or IP address
 * @param functionName - Name of the function being rate limited
 * @param config - Rate limit configuration
 * @throws HttpsError if rate limit exceeded
 */
export async function checkRateLimit(
  uid: string,
  functionName: string,
  config: RateLimitConfig
): Promise<void> {
  const key = config.keyGenerator
    ? config.keyGenerator(uid, functionName)
    : `${uid}:${functionName}`;

  const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(key);
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        // First request - create entry
        transaction.set(docRef, {
          requests: [now],
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { allowed: true, remaining: config.maxRequests - 1 };
      }

      const data = doc.data();
      const requests: number[] = data?.requests || [];

      // Filter out old requests outside the window
      const validRequests = requests.filter((timestamp) => timestamp > windowStart);

      if (validRequests.length >= config.maxRequests) {
        // Rate limit exceeded
        const oldestRequest = Math.min(...validRequests);
        const resetTime = oldestRequest + config.windowSeconds * 1000;
        const retryAfterSeconds = Math.ceil((resetTime - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          retryAfter: retryAfterSeconds,
        };
      }

      // Add current request and update
      validRequests.push(now);
      transaction.update(docRef, {
        requests: validRequests,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        allowed: true,
        remaining: config.maxRequests - validRequests.length,
      };
    });

    if (!result.allowed) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
      );
    }
  } catch (error) {
    // Re-throw HttpsError, otherwise log and allow (fail open for system errors)
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if rate limiter fails
  }
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically by a scheduled function
 */
export async function cleanupRateLimits(): Promise<number> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  const batch = db.batch();
  let deletedCount = 0;

  const snapshot = await db
    .collection(RATE_LIMIT_COLLECTION)
    .where("updatedAt", "<", new Date(cutoff))
    .limit(500) // Process in batches
    .get();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deletedCount++;
  });

  if (deletedCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Get current rate limit status for a user/function
 */
export async function getRateLimitStatus(
  uid: string,
  functionName: string,
  config: RateLimitConfig
): Promise<{ remaining: number; resetAt: number }> {
  const key = `${uid}:${functionName}`;
  const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(key);
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  const doc = await docRef.get();

  if (!doc.exists) {
    return {
      remaining: config.maxRequests,
      resetAt: now + config.windowSeconds * 1000,
    };
  }

  const data = doc.data();
  const requests: number[] = data?.requests || [];
  const validRequests = requests.filter((timestamp) => timestamp > windowStart);
  const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now;

  return {
    remaining: Math.max(0, config.maxRequests - validRequests.length),
    resetAt: oldestRequest + config.windowSeconds * 1000,
  };
}
