/**
 * Notification Cloud Functions
 *
 * Functions for managing notifications:
 * - sendNotification: Create and send notification to user
 * - sendBulkNotification: Send notification to multiple users
 * - markNotificationRead: Mark notification as read
 * - markAllNotificationsRead: Mark all user's notifications as read
 * - deleteNotification: Delete a notification
 * - getUnreadCount: Get count of unread notifications
 */

import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { getFirestore, Timestamp, WriteBatch } from "firebase-admin/firestore";
import { FunctionResponse, CustomClaims } from "../types";

const db = getFirestore();

/**
 * Notification type
 */
export type NotificationType =
  | "application_submitted"
  | "application_assigned"
  | "application_released"
  | "status_update"
  | "document_requested"
  | "application_approved"
  | "application_rejected"
  | "new_application_in_pool"
  | "system_announcement";

/**
 * Notification document
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  masjidId?: string;
  read: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

/**
 * Validate admin permissions
 */
function validateAdmin(claims: CustomClaims | undefined): void {
  if (!claims?.role || !["zakat_admin", "super_admin"].includes(claims.role)) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can perform this action"
    );
  }
}

// ============================================
// SEND NOTIFICATION (Admin only)
// ============================================

/**
 * Send notification to a user (admin function)
 */
export const sendNotification = onCall(
  async (
    request: CallableRequest<{
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      applicationId?: string;
      masjidId?: string;
    }>
  ): Promise<FunctionResponse<{ notificationId: string }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { userId, type, title, message, applicationId, masjidId } = data;

    if (!userId || !type || !title || !message) {
      throw new HttpsError(
        "invalid-argument",
        "User ID, type, title, and message are required"
      );
    }

    // Verify user exists
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    // Create notification
    const notificationRef = db.collection("notifications").doc();
    const notification: Notification = {
      id: notificationRef.id,
      userId,
      type,
      title,
      message,
      applicationId: applicationId || undefined,
      masjidId: masjidId || undefined,
      read: false,
      createdAt: Timestamp.now(),
    };

    await notificationRef.set(notification);

    return {
      success: true,
      data: { notificationId: notificationRef.id },
    };
  }
);

// ============================================
// SEND BULK NOTIFICATION (Admin only)
// ============================================

/**
 * Send notification to multiple users
 */
export const sendBulkNotification = onCall(
  async (
    request: CallableRequest<{
      userIds: string[];
      type: NotificationType;
      title: string;
      message: string;
      applicationId?: string;
      masjidId?: string;
    }>
  ): Promise<FunctionResponse<{ count: number }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;

    // Only super admin can send bulk notifications
    if (claims.role !== "super_admin") {
      throw new HttpsError(
        "permission-denied",
        "Only super admins can send bulk notifications"
      );
    }

    const { userIds, type, title, message, applicationId, masjidId } = data;

    if (!userIds || userIds.length === 0 || !type || !title || !message) {
      throw new HttpsError(
        "invalid-argument",
        "User IDs, type, title, and message are required"
      );
    }

    if (userIds.length > 500) {
      throw new HttpsError(
        "invalid-argument",
        "Cannot send more than 500 notifications at once"
      );
    }

    // Create notifications in batches
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    for (const userId of userIds) {
      const notificationRef = db.collection("notifications").doc();
      const notification: Notification = {
        id: notificationRef.id,
        userId,
        type,
        title,
        message,
        applicationId: applicationId || undefined,
        masjidId: masjidId || undefined,
        read: false,
        createdAt: Timestamp.now(),
      };

      currentBatch.set(notificationRef, notification);
      operationCount++;

      // Firestore batches limited to 500 operations
      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Execute all batches
    await Promise.all(batches.map((batch) => batch.commit()));

    return {
      success: true,
      data: { count: userIds.length },
    };
  }
);

// ============================================
// MARK NOTIFICATION READ
// ============================================

/**
 * Mark a notification as read
 */
export const markNotificationRead = onCall(
  async (
    request: CallableRequest<{ notificationId: string }>
  ): Promise<FunctionResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { notificationId } = data;

    if (!notificationId) {
      throw new HttpsError("invalid-argument", "Notification ID is required");
    }

    const notificationRef = db.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    const notification = notificationDoc.data() as Notification;

    // Verify ownership
    if (notification.userId !== auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only mark your own notifications as read"
      );
    }

    await notificationRef.update({
      read: true,
      readAt: Timestamp.now(),
    });

    return { success: true };
  }
);

// ============================================
// MARK ALL NOTIFICATIONS READ
// ============================================

/**
 * Mark all user's notifications as read
 */
export const markAllNotificationsRead = onCall(
  async (request: CallableRequest): Promise<FunctionResponse<{ count: number }>> => {
    const { auth } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const unreadSnapshot = await db
      .collection("notifications")
      .where("userId", "==", auth.uid)
      .where("read", "==", false)
      .get();

    if (unreadSnapshot.empty) {
      return { success: true, data: { count: 0 } };
    }

    // Update in batches
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    const now = Timestamp.now();

    for (const doc of unreadSnapshot.docs) {
      currentBatch.update(doc.ref, {
        read: true,
        readAt: now,
      });
      operationCount++;

      if (operationCount === 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map((batch) => batch.commit()));

    return {
      success: true,
      data: { count: unreadSnapshot.size },
    };
  }
);

// ============================================
// DELETE NOTIFICATION
// ============================================

/**
 * Delete a notification
 */
export const deleteNotification = onCall(
  async (
    request: CallableRequest<{ notificationId: string }>
  ): Promise<FunctionResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { notificationId } = data;

    if (!notificationId) {
      throw new HttpsError("invalid-argument", "Notification ID is required");
    }

    const notificationRef = db.collection("notifications").doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      throw new HttpsError("not-found", "Notification not found");
    }

    const notification = notificationDoc.data() as Notification;

    // Verify ownership
    if (notification.userId !== auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only delete your own notifications"
      );
    }

    await notificationRef.delete();

    return { success: true };
  }
);

// ============================================
// GET UNREAD COUNT
// ============================================

/**
 * Get count of unread notifications
 */
export const getUnreadNotificationCount = onCall(
  async (request: CallableRequest): Promise<FunctionResponse<{ count: number }>> => {
    const { auth } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const countSnapshot = await db
      .collection("notifications")
      .where("userId", "==", auth.uid)
      .where("read", "==", false)
      .count()
      .get();

    return {
      success: true,
      data: { count: countSnapshot.data().count },
    };
  }
);

// ============================================
// GET USER NOTIFICATIONS
// ============================================

/**
 * Get user's notifications with pagination
 */
export const getUserNotifications = onCall(
  async (
    request: CallableRequest<{
      limit?: number;
      unreadOnly?: boolean;
      startAfter?: string;
    }>
  ): Promise<FunctionResponse<{ notifications: Notification[]; hasMore: boolean }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { limit = 20, unreadOnly = false, startAfter } = data || {};

    let query = db
      .collection("notifications")
      .where("userId", "==", auth.uid)
      .orderBy("createdAt", "desc");

    if (unreadOnly) {
      query = query.where("read", "==", false);
    }

    // Handle pagination
    if (startAfter) {
      const startDoc = await db.collection("notifications").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    // Request one extra to check if there are more
    const snapshot = await query.limit(limit + 1).get();

    const notifications = snapshot.docs
      .slice(0, limit)
      .map((doc) => doc.data() as Notification);
    const hasMore = snapshot.docs.length > limit;

    return {
      success: true,
      data: { notifications, hasMore },
    };
  }
);

// ============================================
// NOTIFY ADMINS OF NEW APPLICATION IN POOL
// ============================================

/**
 * Send notification to all admins about new application in pool
 * This is called internally by other functions
 */
export async function notifyAdminsOfNewApplication(
  applicationId: string,
  applicationNumber: string
): Promise<void> {
  // Get all active zakat admins and super admins
  const adminsSnapshot = await db
    .collection("users")
    .where("role", "in", ["zakat_admin", "super_admin"])
    .where("isActive", "==", true)
    .get();

  if (adminsSnapshot.empty) {
    return;
  }

  const batch = db.batch();

  for (const adminDoc of adminsSnapshot.docs) {
    const notificationRef = db.collection("notifications").doc();
    const notification: Notification = {
      id: notificationRef.id,
      userId: adminDoc.id,
      type: "new_application_in_pool",
      title: "New Application",
      message: `A new zakat application ${applicationNumber} has been submitted and is ready for review.`,
      applicationId,
      read: false,
      createdAt: Timestamp.now(),
    };

    batch.set(notificationRef, notification);
  }

  await batch.commit();
}
