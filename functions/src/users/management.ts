import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { auth, db, COLLECTIONS, CORS_ORIGINS } from "../config";
import {
  CreateAdminRequest,
  DisableUserRequest,
  CustomClaims,
  UserRole,
  Address,
} from "../types";
import { isValidEmail, isValidPhone, hasPermission, sanitizeString } from "../utils/validation";

/**
 * Create an admin user (zakat_admin or super_admin)
 * Can only be called by super_admin
 */
export const createAdminUser = onCall<CreateAdminRequest>(
  { cors: CORS_ORIGINS },
  async (request) => {
    // Verify caller is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const callerClaims = request.auth.token as unknown as CustomClaims & { [key: string]: unknown };

    // Only super_admin can create admin users
    if (callerClaims.role !== "super_admin") {
      throw new HttpsError(
        "permission-denied",
        "Only super admins can create admin users"
      );
    }

    const { email, password, firstName, lastName, phone, role, masjidId } = request.data;

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

    if (role !== "zakat_admin" && role !== "super_admin") {
      throw new HttpsError(
        "invalid-argument",
        "Role must be zakat_admin or super_admin"
      );
    }

    if (role === "zakat_admin" && !masjidId) {
      throw new HttpsError(
        "invalid-argument",
        "masjidId is required for zakat_admin role"
      );
    }

    // Verify masjid exists if provided
    if (masjidId) {
      const masjidDoc = await db.collection(COLLECTIONS.MASJIDS).doc(masjidId).get();
      if (!masjidDoc.exists) {
        throw new HttpsError("not-found", "Masjid not found");
      }
    }

    let uid: string;

    try {
      // Create Firebase Auth user
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: true, // Admin users are pre-verified
      });

      uid = userRecord.uid;
    } catch (error) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Email already in use");
      }
      throw new HttpsError("internal", "Failed to create user");
    }

    // Set custom claims
    const customClaims: CustomClaims = { role };
    if (masjidId && role === "zakat_admin") {
      customClaims.masjidId = masjidId;
    }

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
      role,
      masjidId: masjidId || null,
      isActive: true,
      isFlagged: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    };

    await db.collection(COLLECTIONS.USERS).doc(uid).set(userDoc);

    return {
      success: true,
      data: {
        userId: uid,
        email,
        role,
        masjidId: masjidId || null,
      },
    };
  }
);

/**
 * Disable a user account
 * Can be called by super_admin, or zakat_admin for users in their masjid
 */
export const disableUser = onCall<DisableUserRequest>(
  { cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token as unknown as CustomClaims & { [key: string]: unknown };
    const { userId, reason } = request.data;

    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    // Prevent self-disable
    if (callerUid === userId) {
      throw new HttpsError("failed-precondition", "Cannot disable your own account");
    }

    // Check permissions
    if (!hasPermission(callerClaims.role as UserRole, "zakat_admin")) {
      throw new HttpsError("permission-denied", "Insufficient permissions");
    }

    // Get target user
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();

    // zakat_admin can only disable applicants in their masjid
    if (callerClaims.role === "zakat_admin") {
      if (userData?.role !== "applicant") {
        throw new HttpsError(
          "permission-denied",
          "Zakat admins can only disable applicants"
        );
      }
      // Check if user has applications in caller's masjid
      // For now, we'll allow zakat_admin to disable any applicant
      // More restrictive logic can be added later
    }

    // Cannot disable super_admin unless you are super_admin
    if (userData?.role === "super_admin" && callerClaims.role !== "super_admin") {
      throw new HttpsError(
        "permission-denied",
        "Only super admins can disable other super admins"
      );
    }

    // Disable in Firebase Auth
    await auth.updateUser(userId, { disabled: true });

    // Update Firestore document
    await userRef.update({
      isActive: false,
      disabledAt: FieldValue.serverTimestamp(),
      disabledBy: callerUid,
      disabledReason: reason || "No reason provided",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      data: { userId, disabled: true },
    };
  }
);

/**
 * Enable a previously disabled user account
 * Can be called by super_admin, or zakat_admin for applicants
 */
export const enableUser = onCall<{ userId: string }>(
  { cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const callerClaims = request.auth.token as unknown as CustomClaims & { [key: string]: unknown };
    const { userId } = request.data;

    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    // Check permissions
    if (!hasPermission(callerClaims.role as UserRole, "zakat_admin")) {
      throw new HttpsError("permission-denied", "Insufficient permissions");
    }

    // Get target user
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();

    // zakat_admin can only enable applicants
    if (callerClaims.role === "zakat_admin" && userData?.role !== "applicant") {
      throw new HttpsError(
        "permission-denied",
        "Zakat admins can only enable applicants"
      );
    }

    // Enable in Firebase Auth
    await auth.updateUser(userId, { disabled: false });

    // Update Firestore document
    await userRef.update({
      isActive: true,
      disabledAt: FieldValue.delete(),
      disabledBy: FieldValue.delete(),
      disabledReason: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      data: { userId, disabled: false },
    };
  }
);

/**
 * List users with optional filters
 * Can be called by zakat_admin (their masjid only) or super_admin (all)
 */
export const listUsers = onCall<{
  role?: UserRole;
  masjidId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}>(
  { cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const callerClaims = request.auth.token as unknown as CustomClaims & { [key: string]: unknown };

    // Check permissions
    if (!hasPermission(callerClaims.role as UserRole, "zakat_admin")) {
      throw new HttpsError("permission-denied", "Insufficient permissions");
    }

    const { role, masjidId, isActive, limit = 50, offset = 0 } = request.data;

    let query = db.collection(COLLECTIONS.USERS).orderBy("createdAt", "desc");

    // Apply filters
    if (role) {
      query = query.where("role", "==", role);
    }

    if (typeof isActive === "boolean") {
      query = query.where("isActive", "==", isActive);
    }

    // zakat_admin can only see their masjid's users or applicants
    if (callerClaims.role === "zakat_admin") {
      if (masjidId && masjidId !== callerClaims.masjidId) {
        throw new HttpsError(
          "permission-denied",
          "Cannot view users from other masjids"
        );
      }
      // For zakat_admin, we'd need a more complex query
      // For simplicity, we'll just filter applicants
      if (!role) {
        query = query.where("role", "==", "applicant");
      }
    } else if (masjidId) {
      query = query.where("masjidId", "==", masjidId);
    }

    // Apply pagination
    const snapshot = await query.limit(limit).offset(offset).get();

    const users = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));

    return {
      success: true,
      data: {
        users,
        total: users.length,
        limit,
        offset,
      },
    };
  }
);

/**
 * Get a single user by ID
 * Can be called by the user themselves or by admins
 */
export const getUser = onCall<{ userId: string }>(
  { cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token as unknown as CustomClaims & { [key: string]: unknown };
    const { userId } = request.data;

    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    // Users can view their own profile, admins can view any
    if (userId !== callerUid && !hasPermission(callerClaims.role as UserRole, "zakat_admin")) {
      throw new HttpsError("permission-denied", "Cannot view other users' profiles");
    }

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    return {
      success: true,
      data: {
        ...userDoc.data(),
        id: userDoc.id,
      },
    };
  }
);
