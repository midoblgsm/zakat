/**
 * Application Management Cloud Functions
 *
 * Functions for handling zakat applications:
 * - submitApplication: Submit a draft application
 * - assignApplication: Claim/assign application to admin
 * - releaseApplication: Release application back to pool
 * - changeApplicationStatus: Update application status
 * - getApplication: Get single application
 * - listApplications: List applications with filters
 */

import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  ApplicationStatus,
  SubmitApplicationRequest,
  AssignApplicationRequest,
  ReleaseApplicationRequest,
  ChangeStatusRequest,
  ListApplicationsRequest,
  ZakatApplication,
  ApplicationHistoryEntry,
  VALID_STATUS_TRANSITIONS,
  FunctionResponse,
  CustomClaims,
} from "../types";

const db = getFirestore();

/**
 * Safely decrement a masjid stat counter, ensuring it never goes below 0
 */
async function safeDecrementMasjidStat(
  masjidId: string,
  statField: string
): Promise<void> {
  const masjidRef = db.collection("masajid").doc(masjidId);

  await db.runTransaction(async (transaction) => {
    const masjidDoc = await transaction.get(masjidRef);
    if (!masjidDoc.exists) return;

    const currentValue = masjidDoc.data()?.stats?.[statField] || 0;
    if (currentValue > 0) {
      transaction.update(masjidRef, {
        [`stats.${statField}`]: FieldValue.increment(-1),
      });
    }
  });
}

/**
 * Generate unique application number
 */
async function generateApplicationNumber(): Promise<string> {
  const counterRef = db.collection("counters").doc("applications");

  const newNumber = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let currentCount = 1;
    if (counterDoc.exists) {
      currentCount = (counterDoc.data()?.count || 0) + 1;
    }

    transaction.set(counterRef, { count: currentCount }, { merge: true });
    return currentCount;
  });

  // Format: ZKT-00001234
  return `ZKT-${String(newNumber).padStart(8, "0")}`;
}

/**
 * Create history entry for an application
 */
async function createHistoryEntry(
  applicationId: string,
  entry: Omit<ApplicationHistoryEntry, "id" | "createdAt">
): Promise<void> {
  const historyRef = db
    .collection("applications")
    .doc(applicationId)
    .collection("history")
    .doc();

  await historyRef.set({
    ...entry,
    id: historyRef.id,
    createdAt: Timestamp.now(),
  });
}

/**
 * Get user info for history entries
 */
async function getUserInfo(
  userId: string
): Promise<{ name: string; role: string; masjidId?: string }> {
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();

  if (!userData) {
    return { name: "Unknown User", role: "unknown" };
  }

  return {
    name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email,
    role: userData.role,
    masjidId: userData.masjidId,
  };
}

/**
 * Validate that user has admin permissions
 */
function validateAdmin(claims: CustomClaims | undefined): void {
  if (!claims?.role || !["zakat_admin", "super_admin"].includes(claims.role)) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can perform this action"
    );
  }
}

/**
 * Validate status transition
 */
function validateStatusTransition(
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus
): void {
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!validTransitions?.includes(newStatus)) {
    throw new HttpsError(
      "failed-precondition",
      `Invalid status transition from ${currentStatus} to ${newStatus}`
    );
  }
}

// ============================================
// SUBMIT APPLICATION
// ============================================

/**
 * Submit a draft application
 * - Generates application number
 * - Updates status to submitted
 * - Creates history entry
 * - Notifies admins of new application
 */
export const submitApplication = onCall(
  async (
    request: CallableRequest<SubmitApplicationRequest>
  ): Promise<FunctionResponse<{ applicationNumber: string }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { applicationId } = data;

    if (!applicationId) {
      throw new HttpsError("invalid-argument", "Application ID is required");
    }

    const applicationRef = db.collection("applications").doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;

    // Verify ownership
    if (application.applicantId !== auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "You can only submit your own applications"
      );
    }

    // Verify status is draft
    if (application.status !== "draft") {
      throw new HttpsError(
        "failed-precondition",
        "Only draft applications can be submitted"
      );
    }

    // Generate application number
    const applicationNumber = await generateApplicationNumber();

    // Update application
    await applicationRef.update({
      applicationNumber,
      status: "submitted",
      submittedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Create history entry
    const userInfo = await getUserInfo(auth.uid);
    await createHistoryEntry(applicationId, {
      action: "submitted",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      previousStatus: "draft",
      newStatus: "submitted",
      details: `Application ${applicationNumber} submitted`,
    });

    // Create notification for applicant
    await db.collection("notifications").add({
      userId: auth.uid,
      type: "application_submitted",
      title: "Application Submitted",
      message: `Your application ${applicationNumber} has been submitted and is now in the review queue.`,
      applicationId,
      read: false,
      createdAt: Timestamp.now(),
    });

    return {
      success: true,
      data: { applicationNumber },
    };
  }
);

// ============================================
// ASSIGN APPLICATION
// ============================================

/**
 * Assign an application to an admin
 * - Validates application is in pool or reassignable
 * - Updates assignedTo, assignedToMasjid
 * - Creates history entry
 * - Notifies relevant parties
 */
export const assignApplication = onCall(
  async (
    request: CallableRequest<AssignApplicationRequest>
  ): Promise<FunctionResponse<{ assignedTo: string }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { applicationId, assignToUserId } = data;
    const targetUserId = assignToUserId || auth.uid;

    if (!applicationId) {
      throw new HttpsError("invalid-argument", "Application ID is required");
    }

    const applicationRef = db.collection("applications").doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;

    // Check if application can be assigned
    if (application.status !== "submitted") {
      // Super admins can reassign at any time except closed/disbursed
      if (
        claims.role !== "super_admin" ||
        ["closed", "disbursed"].includes(application.status)
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Application cannot be assigned in current status"
        );
      }
    }

    // Get target user's masjid
    let targetMasjidId = claims.masjidId;
    if (targetUserId !== auth.uid) {
      // Super admin assigning to someone else
      if (claims.role !== "super_admin") {
        throw new HttpsError(
          "permission-denied",
          "Only super admins can assign to other users"
        );
      }

      const targetUserClaims = await getAuth().getUser(targetUserId);
      targetMasjidId = (targetUserClaims.customClaims as CustomClaims)?.masjidId;
    }

    // Fetch masjid details to denormalize name and zip code
    let targetMasjidName: string | null = null;
    let targetMasjidZipCode: string | null = null;
    if (targetMasjidId) {
      const masjidDoc = await db.collection("masajid").doc(targetMasjidId).get();
      if (masjidDoc.exists) {
        const masjidData = masjidDoc.data();
        targetMasjidName = masjidData?.name || null;
        targetMasjidZipCode = masjidData?.address?.zipCode || null;
      }
    }

    const previousAssignee = application.assignedTo;
    const previousMasjidId = application.assignedToMasjid;

    // Update application
    const newStatus: ApplicationStatus =
      application.status === "submitted" ? "under_review" : application.status;

    await applicationRef.update({
      assignedTo: targetUserId,
      assignedToMasjid: targetMasjidId || null,
      assignedToMasjidName: targetMasjidName,
      assignedToMasjidZipCode: targetMasjidZipCode,
      assignedAt: Timestamp.now(),
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    // Update masjid stats when application is newly assigned
    if (application.status === "submitted" && targetMasjidId) {
      // New assignment - increment the target masjid's in-progress count
      const masjidRef = db.collection("masajid").doc(targetMasjidId);
      await masjidRef.update({
        "stats.applicationsInProgress": FieldValue.increment(1),
      });
    } else if (previousMasjidId && targetMasjidId &&
               previousMasjidId !== targetMasjidId) {
      // Reassignment to different masjid - safely decrement old, increment new
      await safeDecrementMasjidStat(previousMasjidId, "applicationsInProgress");
      const newMasjidRef = db.collection("masajid").doc(targetMasjidId);
      await newMasjidRef.update({
        "stats.applicationsInProgress": FieldValue.increment(1),
      });
    }

    // Create history entry
    const userInfo = await getUserInfo(auth.uid);
    const targetUserInfo = await getUserInfo(targetUserId);

    await createHistoryEntry(applicationId, {
      action: "assigned",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
      ...(previousAssignee && { previousAssignee }),
      newAssignee: targetUserId,
      previousStatus: application.status,
      newStatus,
      details:
        targetUserId === auth.uid
          ? `Application claimed by ${userInfo.name}`
          : `Application assigned to ${targetUserInfo.name} by ${userInfo.name}`,
    });

    // Notify assignee if different from requester
    if (targetUserId !== auth.uid) {
      await db.collection("notifications").add({
        userId: targetUserId,
        type: "application_assigned",
        title: "Application Assigned",
        message: `Application ${application.applicationNumber} has been assigned to you.`,
        applicationId,
        read: false,
        createdAt: Timestamp.now(),
      });
    }

    // Notify applicant of status change
    await db.collection("notifications").add({
      userId: application.applicantId,
      type: "status_update",
      title: "Application Under Review",
      message: `Your application ${application.applicationNumber} is now being reviewed.`,
      applicationId,
      read: false,
      createdAt: Timestamp.now(),
      // Additional data for email template
      previousStatus: application.status,
      newStatus,
    });

    return {
      success: true,
      data: { assignedTo: targetUserId },
    };
  }
);

// ============================================
// RELEASE APPLICATION
// ============================================

/**
 * Release an application back to the pool
 * - Clears assignment
 * - Updates status back to submitted
 * - Creates history entry
 */
export const releaseApplication = onCall(
  async (
    request: CallableRequest<ReleaseApplicationRequest>
  ): Promise<FunctionResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { applicationId, reason } = data;

    if (!applicationId) {
      throw new HttpsError("invalid-argument", "Application ID is required");
    }

    const applicationRef = db.collection("applications").doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;

    // Check permissions
    if (
      claims.role !== "super_admin" &&
      application.assignedTo !== auth.uid
    ) {
      throw new HttpsError(
        "permission-denied",
        "You can only release applications assigned to you"
      );
    }

    // Check if application can be released
    if (
      !["under_review", "pending_documents", "pending_verification"].includes(
        application.status
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Application cannot be released in current status"
      );
    }

    const previousAssignee = application.assignedTo;
    const previousMasjidId = application.assignedToMasjid;

    // Update application
    await applicationRef.update({
      assignedTo: FieldValue.delete(),
      assignedToMasjid: FieldValue.delete(),
      assignedToMasjidName: FieldValue.delete(),
      assignedToMasjidZipCode: FieldValue.delete(),
      assignedAt: FieldValue.delete(),
      status: "submitted",
      updatedAt: Timestamp.now(),
    });

    // Decrement masjid's in-progress count when releasing (never go below 0)
    if (previousMasjidId) {
      await safeDecrementMasjidStat(previousMasjidId, "applicationsInProgress");
    }

    // Create history entry
    const userInfo = await getUserInfo(auth.uid);

    await createHistoryEntry(applicationId, {
      action: "released",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
      ...(previousAssignee && { previousAssignee }),
      previousStatus: application.status,
      newStatus: "submitted",
      details: reason
        ? `Application released to pool: ${reason}`
        : "Application released to pool",
      ...(reason && { metadata: { reason } }),
    });

    return { success: true };
  }
);

// ============================================
// CHANGE APPLICATION STATUS
// ============================================

/**
 * Change application status with validation
 * - Validates status transition
 * - Creates history entry
 * - Sends notifications
 * - Tracks disbursed amounts
 */
export const changeApplicationStatus = onCall(
  async (
    request: CallableRequest<ChangeStatusRequest>
  ): Promise<FunctionResponse<{ newStatus: ApplicationStatus }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { applicationId, newStatus, reason, metadata, disbursedAmount } = data;

    if (!applicationId || !newStatus) {
      throw new HttpsError(
        "invalid-argument",
        "Application ID and new status are required"
      );
    }

    // Require disbursedAmount when changing to disbursed status
    if (newStatus === "disbursed" && (disbursedAmount === undefined || disbursedAmount <= 0)) {
      throw new HttpsError(
        "invalid-argument",
        "Disbursed amount is required when marking as disbursed"
      );
    }

    const applicationRef = db.collection("applications").doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;

    // Check permissions
    if (
      claims.role !== "super_admin" &&
      application.assignedTo !== auth.uid &&
      application.assignedToMasjid !== claims.masjidId
    ) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to change this application's status"
      );
    }

    // Validate transition
    validateStatusTransition(application.status, newStatus);

    const previousStatus = application.status;

    // Get user info early as it may be needed for resolution and history
    const userInfo = await getUserInfo(auth.uid);

    // Check if application was already resolved (via resolveApplication)
    // This prevents double-counting stats when moving from approved -> disbursed
    const wasAlreadyResolved = !!application.resolution?.decidedAt;

    // Build update object
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: Timestamp.now(),
    };

    // Set resolution.decidedAt for terminal statuses if not already set
    // This is needed for analytics to calculate processing time metrics
    const terminalStatuses = ["approved", "rejected", "disbursed", "closed"];
    if (terminalStatuses.includes(newStatus) && !wasAlreadyResolved) {
      updateData["resolution.decidedAt"] = Timestamp.now();
      updateData["resolution.decidedBy"] = auth.uid;
      updateData["resolution.decidedByName"] = userInfo.name;
      if (newStatus === "rejected" || newStatus === "closed") {
        updateData["resolution.decision"] = newStatus === "rejected" ? "rejected" : "closed";
      }
    }

    // Add disbursed amount to resolution when disbursing
    if (newStatus === "disbursed" && disbursedAmount) {
      updateData["resolution.amountDisbursed"] = disbursedAmount;
      updateData["resolution.disbursedAt"] = Timestamp.now();
      updateData["resolution.disbursedBy"] = auth.uid;

      // Update masjid stats - only totalAmountDisbursed
      // totalApplicationsHandled and applicationsInProgress were already updated by resolveApplication
      if (application.assignedToMasjid) {
        const masjidRef = db.collection("masajid").doc(application.assignedToMasjid);
        await masjidRef.update({
          "stats.totalAmountDisbursed": FieldValue.increment(disbursedAmount),
        });
      }
    }

    // Update masjid stats for terminal statuses if not already resolved
    // This handles direct rejections/closures that bypass resolveApplication
    if (!wasAlreadyResolved && ["rejected", "closed"].includes(newStatus) && application.assignedToMasjid) {
      const masjidRef = db.collection("masajid").doc(application.assignedToMasjid);
      await masjidRef.update({
        "stats.totalApplicationsHandled": FieldValue.increment(1),
      });
      await safeDecrementMasjidStat(application.assignedToMasjid, "applicationsInProgress");
    }

    // Update application
    await applicationRef.update(updateData);

    // Create history entry
    let historyDetails: string;
    if (newStatus === "disbursed" && disbursedAmount) {
      const amt = `$${disbursedAmount.toLocaleString()}`;
      const reasonSuffix = reason ? `. ${reason}` : "";
      historyDetails = `Status changed from ${previousStatus} to ${newStatus}. ` +
        `Amount disbursed: ${amt}${reasonSuffix}`;
    } else if (reason) {
      historyDetails = `Status changed from ${previousStatus} to ${newStatus}: ${reason}`;
    } else {
      historyDetails = `Status changed from ${previousStatus} to ${newStatus}`;
    }

    await createHistoryEntry(applicationId, {
      action: "status_changed",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
      previousStatus,
      newStatus,
      details: historyDetails,
      metadata: {
        ...metadata,
        ...(disbursedAmount && { disbursedAmount }),
      },
    });

    // Notify applicant
    const statusMessages: Record<ApplicationStatus, string> = {
      draft: "",
      submitted: "Your application has been submitted.",
      under_review: "Your application is now being reviewed.",
      pending_documents: "Additional documents are needed for your application.",
      pending_verification: "Your application documents are being verified.",
      approved: "Congratulations! Your application has been approved.",
      rejected: "We regret to inform you that your application has been declined.",
      disbursed: disbursedAmount
        ? `Funds of $${disbursedAmount.toLocaleString()} for your application have been disbursed.`
        : "Funds for your application have been disbursed.",
      closed: "Your application has been closed.",
    };

    await db.collection("notifications").add({
      userId: application.applicantId,
      type: "status_update",
      title: `Application ${newStatus.replace("_", " ").toUpperCase()}`,
      message: statusMessages[newStatus] || `Application status: ${newStatus}`,
      applicationId,
      read: false,
      createdAt: Timestamp.now(),
      // Additional data for email template
      previousStatus,
      newStatus,
      ...(disbursedAmount && { disbursedAmount }),
    });

    return {
      success: true,
      data: { newStatus },
    };
  }
);

// ============================================
// GET APPLICATION
// ============================================

/**
 * Get a single application with permissions check
 */
export const getApplication = onCall(
  async (
    request: CallableRequest<{ applicationId: string }>
  ): Promise<FunctionResponse<ZakatApplication>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { applicationId } = data;

    if (!applicationId) {
      throw new HttpsError("invalid-argument", "Application ID is required");
    }

    const applicationDoc = await db
      .collection("applications")
      .doc(applicationId)
      .get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;
    const claims = auth.token as unknown as CustomClaims;

    // Check permissions
    const isOwner = application.applicantId === auth.uid;
    const isSuperAdmin = claims.role === "super_admin";
    const isAssignedAdmin =
      claims.role === "zakat_admin" &&
      (application.assignedTo === auth.uid ||
        application.assignedToMasjid === claims.masjidId);
    const isPoolApplication =
      claims.role === "zakat_admin" &&
      application.status === "submitted" &&
      !application.assignedTo;

    if (!isOwner && !isSuperAdmin && !isAssignedAdmin && !isPoolApplication) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to view this application"
      );
    }

    return {
      success: true,
      data: application,
    };
  }
);

// ============================================
// LIST APPLICATIONS
// ============================================

/**
 * List applications with filters
 */
export const listApplications = onCall(
  async (
    request: CallableRequest<ListApplicationsRequest>
  ): Promise<FunctionResponse<ZakatApplication[]>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    const {
      status,
      masjidId,
      assignedTo,
      applicantId,
      limit = 50,
      poolOnly,
    } = data;

    let query = db.collection("applications").orderBy("createdAt", "desc");

    // Apply filters based on role and request
    if (claims.role === "applicant") {
      // Applicants can only see their own applications
      query = query.where("applicantId", "==", auth.uid);
    } else if (claims.role === "zakat_admin") {
      if (poolOnly) {
        // Show unassigned submitted applications
        query = query
          .where("status", "==", "submitted")
          .where("assignedTo", "==", null);
      } else if (assignedTo) {
        query = query.where("assignedTo", "==", assignedTo);
      } else if (masjidId) {
        query = query.where("assignedToMasjid", "==", masjidId);
      } else {
        // Default: show their masjid's applications
        query = query.where("assignedToMasjid", "==", claims.masjidId);
      }
    } else if (claims.role === "super_admin") {
      // Super admins can filter by anything
      if (poolOnly) {
        query = query
          .where("status", "==", "submitted")
          .where("assignedTo", "==", null);
      } else if (applicantId) {
        query = query.where("applicantId", "==", applicantId);
      } else if (assignedTo) {
        query = query.where("assignedTo", "==", assignedTo);
      } else if (masjidId) {
        query = query.where("assignedToMasjid", "==", masjidId);
      }
    }

    // Additional status filter
    if (status && !poolOnly) {
      query = query.where("status", "==", status);
    }

    // Apply limit
    query = query.limit(limit);

    const snapshot = await query.get();
    const applications = snapshot.docs.map(
      (doc) => doc.data() as ZakatApplication
    );

    return {
      success: true,
      data: applications,
    };
  }
);
