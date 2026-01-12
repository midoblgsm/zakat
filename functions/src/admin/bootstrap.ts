import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { auth, db, COLLECTIONS, CORS_ORIGINS } from "../config";
import { isValidEmail, isValidPhone, sanitizeString } from "../utils/validation";
import { Address, CustomClaims } from "../types";

interface BootstrapSuperAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  bootstrapKey: string;
}

/**
 * Bootstrap the first super admin
 *
 * This function can ONLY be called when:
 * 1. No super_admin exists in the system
 * 2. The correct bootstrap key is provided
 *
 * Set the bootstrap key in Firebase environment config:
 *   firebase functions:config:set bootstrap.key="your-secret-key"
 *
 * Or for local development, use .secret.local file
 */
export const bootstrapSuperAdmin = onCall<BootstrapSuperAdminRequest>(
  {
    cors: CORS_ORIGINS,
  },
  async (request) => {
    const { email, password, firstName, lastName, phone, bootstrapKey } = request.data;

    // Validate bootstrap key (use environment variable or hardcoded for testing)
    const expectedKey = process.env.BOOTSTRAP_KEY || "CHANGE_THIS_IN_PRODUCTION";

    if (!bootstrapKey || bootstrapKey !== expectedKey) {
      throw new HttpsError("permission-denied", "Invalid bootstrap key");
    }

    // Check if any super_admin already exists
    const existingSuperAdmins = await db
      .collection(COLLECTIONS.USERS)
      .where("role", "==", "super_admin")
      .limit(1)
      .get();

    if (!existingSuperAdmins.empty) {
      throw new HttpsError(
        "failed-precondition",
        "A super admin already exists. Use createAdminUser function instead."
      );
    }

    // Validate inputs
    if (!email || !isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }

    if (!password || password.length < 8) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 8 characters"
      );
    }

    if (!firstName || !lastName) {
      throw new HttpsError("invalid-argument", "First and last name are required");
    }

    if (!phone || !isValidPhone(phone)) {
      throw new HttpsError("invalid-argument", "Valid phone number is required");
    }

    let uid: string;

    try {
      // Create Firebase Auth user
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: true,
      });

      uid = userRecord.uid;
    } catch (error) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Email already in use");
      }
      console.error("Error creating user:", error);
      throw new HttpsError("internal", "Failed to create user");
    }

    // Set custom claims
    const customClaims: CustomClaims = { role: "super_admin" };
    await auth.setCustomUserClaims(uid, customClaims);

    // Create user document in Firestore
    const defaultAddress: Address = {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    };

    const userDoc = {
      id: uid,
      email,
      emailVerified: true,
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      phone: sanitizeString(phone),
      address: defaultAddress,
      role: "super_admin",
      isActive: true,
      isFlagged: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTIONS.USERS).doc(uid).set(userDoc);

    return {
      success: true,
      data: {
        userId: uid,
        email,
        role: "super_admin",
        message: "Super admin created successfully. Please change your password after first login.",
      },
    };
  }
);
