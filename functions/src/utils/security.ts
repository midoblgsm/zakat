import { HttpsError } from "firebase-functions/v2/https";
import * as crypto from "crypto";

/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize string input by removing dangerous characters
 * Prevents XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove JavaScript event handlers
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    // Encode special characters
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    throw new HttpsError("invalid-argument", "Invalid email address format");
  }

  // Prevent email header injection
  if (/[\r\n]/.test(trimmed)) {
    throw new HttpsError("invalid-argument", "Invalid email address");
  }

  return trimmed;
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // US phone number: 10 digits, optionally with +1 prefix
  const phoneRegex = /^\+?1?\d{10,14}$/;

  if (!phoneRegex.test(cleaned)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid phone number. Must be 10-14 digits."
    );
  }

  return cleaned;
}

/**
 * Validate SSN format (XXX-XX-XXXX)
 */
export function validateSSN(ssn: string): boolean {
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  return ssnRegex.test(ssn);
}

/**
 * Hash sensitive data using SHA-256
 * Used for creating searchable hashes of PII without storing plaintext
 */
export function hashSensitiveData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Validate request origin (CSRF protection)
 */
export function validateOrigin(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return false;
  }
  return allowedOrigins.includes(origin);
}

/**
 * Check for SQL injection patterns (for document IDs)
 */
export function isSafeDocumentId(id: string): boolean {
  // Document IDs should be alphanumeric with optional hyphens/underscores
  const safeIdRegex = /^[a-zA-Z0-9_-]+$/;

  if (!safeIdRegex.test(id)) {
    return false;
  }

  // Additional length check
  if (id.length > 128) {
    return false;
  }

  return true;
}

/**
 * Validate and sanitize document ID
 */
export function validateDocumentId(id: unknown, fieldName = "id"): string {
  if (typeof id !== "string" || !id) {
    throw new HttpsError("invalid-argument", `${fieldName} is required`);
  }

  if (!isSafeDocumentId(id)) {
    throw new HttpsError("invalid-argument", `Invalid ${fieldName} format`);
  }

  return id;
}

/**
 * Deep sanitize an object by sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Rate limit key generator based on IP (for unauthenticated endpoints)
 */
export function getIpRateLimitKey(
  ip: string | undefined,
  functionName: string
): string {
  // Hash IP for privacy
  const ipHash = ip ? hashSensitiveData(ip) : "unknown";
  return `ip:${ipHash}:${functionName}`;
}

/**
 * Audit log entry creator
 */
export interface AuditLogEntry {
  action: string;
  userId: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export function createAuditLogEntry(
  action: string,
  userId: string,
  options?: Partial<Omit<AuditLogEntry, "action" | "userId" | "timestamp">>
): AuditLogEntry {
  return {
    action,
    userId,
    ...options,
    timestamp: new Date(),
  };
}
