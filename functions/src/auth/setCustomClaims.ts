import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { auth, db, COLLECTIONS } from "../config";
import { SetUserRoleRequest, CustomClaims, UserRole } from "../types";
import { isValidRole, hasPermission } from "../utils/validation";

/**
 * Set custom claims for a user (role and masjidId)
 * Can only be called by super_admin or zakat_admin (for their masjid only)
 */
export const setUserRole = onCall<SetUserRoleRequest>(
  { cors: true },
  async (request) => {
    // Verify caller is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token as unknown as CustomClaims & { [key: string]: unknown };
    const { userId, role, masjidId } = request.data;

    // Validate input
    if (!userId || typeof userId !== "string") {
      throw new HttpsError("invalid-argument", "userId is required");
    }

    if (!role || !isValidRole(role)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid role. Must be: applicant, zakat_admin, or super_admin"
      );
    }

    // Authorization checks
    const callerRole = callerClaims.role as UserRole | undefined;

    // Only super_admin can assign any role
    // zakat_admin can only assign applicant role within their masjid
    if (callerRole !== "super_admin") {
      if (callerRole === "zakat_admin") {
        if (role !== "applicant") {
          throw new HttpsError(
            "permission-denied",
            "Zakat admins can only assign applicant role"
          );
        }
        if (masjidId && masjidId !== callerClaims.masjidId) {
          throw new HttpsError(
            "permission-denied",
            "Cannot assign users to a different masjid"
          );
        }
      } else {
        throw new HttpsError(
          "permission-denied",
          "Insufficient permissions to set user roles"
        );
      }
    }

    // Prevent self-demotion for super_admin
    if (callerUid === userId && callerRole === "super_admin" && role !== "super_admin") {
      throw new HttpsError(
        "failed-precondition",
        "Super admins cannot demote themselves"
      );
    }

    // Validate masjidId requirement for zakat_admin role
    if (role === "zakat_admin" && !masjidId) {
      throw new HttpsError(
        "invalid-argument",
        "masjidId is required for zakat_admin role"
      );
    }

    // Verify target user exists
    try {
      await auth.getUser(userId);
    } catch {
      throw new HttpsError("not-found", "Target user not found");
    }

    // Build custom claims
    const customClaims: CustomClaims = { role };
    if (masjidId && role === "zakat_admin") {
      customClaims.masjidId = masjidId;
    }

    // Set custom claims
    await auth.setCustomUserClaims(userId, customClaims);

    // Update user document in Firestore
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const updateData: Record<string, unknown> = {
      role,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (role === "zakat_admin" && masjidId) {
      updateData.masjidId = masjidId;
    } else if (role !== "zakat_admin") {
      // Remove masjidId if not zakat_admin
      updateData.masjidId = FieldValue.delete();
    }

    await userRef.update(updateData);

    return {
      success: true,
      data: {
        userId,
        role,
        masjidId: customClaims.masjidId || null,
      },
    };
  }
);

/**
 * Get custom claims for a user
 * Can be called by the user themselves or by admins
 */
export const getUserClaims = onCall<{ userId?: string }>(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token as unknown as CustomClaims & { [key: string]: unknown };
    const targetUserId = request.data.userId || callerUid;

    // Users can only get their own claims unless they're admins
    if (targetUserId !== callerUid) {
      if (!hasPermission(callerClaims.role as UserRole, "zakat_admin")) {
        throw new HttpsError(
          "permission-denied",
          "Cannot view other users' claims"
        );
      }
    }

    try {
      const user = await auth.getUser(targetUserId);
      return {
        success: true,
        data: {
          userId: targetUserId,
          customClaims: user.customClaims || {},
        },
      };
    } catch {
      throw new HttpsError("not-found", "User not found");
    }
  }
);
