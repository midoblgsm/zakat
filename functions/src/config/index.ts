import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
// When deployed, this will use the default service account
// For local development with emulators, it auto-detects the emulator
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  MASJIDS: "masjids",
  APPLICATIONS: "applications",
  FLAGS: "flags",
  NOTIFICATIONS: "notifications",
} as const;

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<string, number> = {
  applicant: 1,
  zakat_admin: 2,
  super_admin: 3,
};

export { admin };
