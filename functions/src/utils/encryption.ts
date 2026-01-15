import * as crypto from "crypto";
import { defineString } from "firebase-functions/params";

/**
 * SSN Encryption Service
 * Uses AES-256-GCM for encrypting sensitive PII data at rest.
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV for each encryption
 * - Authentication tag to detect tampering
 * - Key rotation support via versioned keys
 */

// Encryption key from Firebase environment (set via Firebase CLI)
// firebase functions:secrets:set SSN_ENCRYPTION_KEY
const SSN_ENCRYPTION_KEY = defineString("SSN_ENCRYPTION_KEY", {
  description: "AES-256 encryption key for SSN data (32 bytes hex-encoded)",
});

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const KEY_VERSION = 1; // For key rotation support

interface EncryptedData {
  /** Encrypted ciphertext (base64) */
  ciphertext: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Authentication tag (base64) */
  authTag: string;
  /** Key version for rotation support */
  keyVersion: number;
}

/**
 * Get encryption key from environment
 * Falls back to a development key in emulator environment
 */
function getEncryptionKey(): Buffer {
  try {
    const keyHex = SSN_ENCRYPTION_KEY.value();
    if (keyHex && keyHex.length === 64) {
      return Buffer.from(keyHex, "hex");
    }
  } catch {
    // Running in emulator or key not set
  }

  // Development fallback - NEVER use in production
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    console.warn("Using development encryption key - NOT FOR PRODUCTION");
    return crypto.scryptSync("dev-password-not-for-production", "salt", 32);
  }

  throw new Error("SSN_ENCRYPTION_KEY not configured");
}

/**
 * Encrypt sensitive data using AES-256-GCM
 *
 * @param plaintext - The data to encrypt (e.g., SSN)
 * @returns Encrypted data object with ciphertext, IV, and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param encrypted - The encrypted data object
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(encrypted: EncryptedData): string {
  if (encrypted.keyVersion !== KEY_VERSION) {
    throw new Error(`Unsupported key version: ${encrypted.keyVersion}`);
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const authTag = Buffer.from(encrypted.authTag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(encrypted.ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

/**
 * Encrypt SSN for storage
 * Returns a JSON string that can be stored in Firestore
 */
export function encryptSSN(ssn: string): string {
  // Validate SSN format
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  if (!ssnRegex.test(ssn)) {
    throw new Error("Invalid SSN format. Expected XXX-XX-XXXX");
  }

  const encrypted = encrypt(ssn);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt SSN from storage
 * Parses the JSON string and decrypts
 */
export function decryptSSN(encryptedJson: string): string {
  try {
    const encrypted = JSON.parse(encryptedJson) as EncryptedData;
    return decrypt(encrypted);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Invalid encrypted SSN format");
    }
    throw error;
  }
}

/**
 * Mask SSN for display (shows only last 4 digits)
 * Can be used on either encrypted or decrypted SSNs
 */
export function maskSSN(ssn: string): string {
  // If this is an encrypted SSN (JSON), decrypt first
  if (ssn.startsWith("{")) {
    ssn = decryptSSN(ssn);
  }

  // Return masked format: ***-**-1234
  const last4 = ssn.slice(-4);
  return `***-**-${last4}`;
}

/**
 * Create a searchable hash of SSN for lookups
 * Uses HMAC-SHA256 to create a deterministic but secure hash
 */
export function hashSSNForSearch(ssn: string): string {
  const key = getEncryptionKey();
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(ssn.replace(/-/g, "")); // Remove dashes for consistent hashing
  return hmac.digest("hex");
}

/**
 * Check if a value is an encrypted SSN
 */
export function isEncryptedSSN(value: unknown): boolean {
  if (typeof value !== "string") return false;

  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "ciphertext" in parsed &&
      "iv" in parsed &&
      "authTag" in parsed &&
      "keyVersion" in parsed
    );
  } catch {
    return false;
  }
}
