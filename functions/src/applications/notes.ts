/**
 * Admin Notes and Resolution Cloud Functions
 *
 * Functions for managing admin notes and application resolution:
 * - addAdminNote: Add a note to an application
 * - resolveApplication: Approve/reject application with resolution details
 * - flagApplicant: Flag an applicant for review
 * - unflagApplicant: Remove flag from applicant
 */

import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  AddNoteRequest,
  ResolveApplicationRequest,
  AdminNote,
  ApplicationResolution,
  ZakatApplication,
  ApplicationHistoryEntry,
  FunctionResponse,
  CustomClaims,
} from "../types";

const db = getFirestore();

/**
 * Get user info for history entries
 */
async function getUserInfo(
  userId: string
): Promise<{ name: string; email: string; role: string; masjidId?: string }> {
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();

  if (!userData) {
    return { name: "Unknown User", email: "", role: "unknown" };
  }

  return {
    name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email,
    email: userData.email,
    role: userData.role,
    masjidId: userData.masjidId,
  };
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
// ADD ADMIN NOTE
// ============================================

/**
 * Add a note to an application
 * - Internal notes visible only to admins
 * - External notes visible to applicant
 */
export const addAdminNote = onCall(
  async (
    request: CallableRequest<AddNoteRequest>
  ): Promise<FunctionResponse<{ noteId: string }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { applicationId, content, isInternal } = data;

    if (!applicationId || !content) {
      throw new HttpsError(
        "invalid-argument",
        "Application ID and content are required"
      );
    }

    if (content.length > 5000) {
      throw new HttpsError(
        "invalid-argument",
        "Note content cannot exceed 5000 characters"
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
        "You don't have permission to add notes to this application"
      );
    }

    // Get admin info
    const userInfo = await getUserInfo(auth.uid);

    // Create note
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const note: AdminNote = {
      id: noteId,
      content,
      createdBy: auth.uid,
      createdByName: userInfo.name,
      createdByMasjid: userInfo.masjidId || "",
      createdAt: Timestamp.now(),
      isInternal,
    };

    // Update application with new note
    await applicationRef.update({
      adminNotes: FieldValue.arrayUnion(note),
      updatedAt: Timestamp.now(),
    });

    // Create history entry
    await createHistoryEntry(applicationId, {
      action: "note_added",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
      details: isInternal
        ? "Internal note added"
        : "Note added (visible to applicant)",
      metadata: { noteId, isInternal },
    });

    // If external note, notify applicant
    if (!isInternal) {
      await db.collection("notifications").add({
        userId: application.applicantId,
        type: "status_update",
        title: "New Message",
        message: `A note has been added to your application ${application.applicationNumber}.`,
        applicationId,
        read: false,
        createdAt: Timestamp.now(),
      });
    }

    return {
      success: true,
      data: { noteId },
    };
  }
);

// ============================================
// RESOLVE APPLICATION
// ============================================

/**
 * Resolve an application (approve/reject)
 * - Sets resolution details
 * - Updates status
 * - Creates history
 * - Sends notifications
 */
export const resolveApplication = onCall(
  async (
    request: CallableRequest<ResolveApplicationRequest>
  ): Promise<FunctionResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const {
      applicationId,
      decision,
      amountApproved,
      disbursementMethod,
      rejectionReason,
      notes,
    } = data;

    if (!applicationId || !decision) {
      throw new HttpsError(
        "invalid-argument",
        "Application ID and decision are required"
      );
    }

    // Validate decision-specific requirements
    if (decision === "approved" || decision === "partial") {
      if (!amountApproved || amountApproved <= 0) {
        throw new HttpsError(
          "invalid-argument",
          "Approved amount is required for approval"
        );
      }
    }

    if (decision === "rejected" && !rejectionReason) {
      throw new HttpsError(
        "invalid-argument",
        "Rejection reason is required"
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
        "You don't have permission to resolve this application"
      );
    }

    // Check if application can be resolved
    if (
      !["under_review", "pending_verification", "pending_documents"].includes(
        application.status
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Application cannot be resolved in current status"
      );
    }

    // Get admin info
    const userInfo = await getUserInfo(auth.uid);

    // Create resolution - only include defined fields to avoid Firestore errors
    const resolution: ApplicationResolution = {
      decision,
      decidedBy: auth.uid,
      decidedByName: userInfo.name,
      decidedByMasjid: userInfo.masjidId || "",
      decidedAt: Timestamp.now(),
      ...(decision !== "rejected" && amountApproved && { amountApproved }),
      ...(decision !== "rejected" && disbursementMethod && { disbursementMethod }),
      ...(decision === "rejected" && rejectionReason && { rejectionReason }),
    };

    // Determine new status
    const newStatus = decision === "rejected" ? "rejected" : "approved";
    const previousStatus = application.status;

    // Update application
    await applicationRef.update({
      resolution,
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    // Create history entry - filter out undefined metadata values
    const historyMetadata: Record<string, unknown> = { decision };
    if (amountApproved !== undefined) historyMetadata.amountApproved = amountApproved;
    if (disbursementMethod) historyMetadata.disbursementMethod = disbursementMethod;
    if (rejectionReason) historyMetadata.rejectionReason = rejectionReason;

    await createHistoryEntry(applicationId, {
      action: decision === "rejected" ? "rejected" : "approved",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
      previousStatus,
      newStatus,
      details:
        decision === "rejected"
          ? `Application rejected: ${rejectionReason}`
          : `Application approved for $${amountApproved}`,
      metadata: historyMetadata,
    });

    // Add notes if provided
    if (notes) {
      const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const adminNote: AdminNote = {
        id: noteId,
        content: notes,
        createdBy: auth.uid,
        createdByName: userInfo.name,
        createdByMasjid: userInfo.masjidId || "",
        createdAt: Timestamp.now(),
        isInternal: false,
      };

      await applicationRef.update({
        adminNotes: FieldValue.arrayUnion(adminNote),
      });
    }

    // Notify applicant
    const notificationTitle =
      decision === "rejected" ? "Application Declined" : "Application Approved";
    const appNum = application.applicationNumber;
    const notificationMessage =
      decision === "rejected"
        ? `We regret to inform you that your application ${appNum} ` +
          `has been declined. Reason: ${rejectionReason}`
        : `Congratulations! Your application ${appNum} ` +
          `has been approved for $${amountApproved}.`;

    await db.collection("notifications").add({
      userId: application.applicantId,
      type: decision === "rejected" ? "application_rejected" : "application_approved",
      title: notificationTitle,
      message: notificationMessage,
      applicationId,
      read: false,
      createdAt: Timestamp.now(),
    });

    // Update masjid statistics
    // Note: totalAmountDisbursed is NOT updated here because this only approves the application.
    // The actual disbursement (and stats update) happens via changeApplicationStatus when status -> disbursed
    if (application.assignedToMasjid) {
      const masjidRef = db.collection("masajid").doc(application.assignedToMasjid);
      await masjidRef.update({
        "stats.totalApplicationsHandled": FieldValue.increment(1),
        "stats.applicationsInProgress": FieldValue.increment(-1),
      });
    }

    return { success: true };
  }
);

// ============================================
// FLAG APPLICANT
// ============================================

/**
 * Flag an applicant for fraud/eligibility concerns
 */
export const flagApplicant = onCall(
  async (
    request: CallableRequest<{
      applicantId: string;
      applicationId?: string;
      reason: string;
      severity: "warning" | "blocked";
    }>
  ): Promise<FunctionResponse<{ flagId: string }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { applicantId, applicationId, reason, severity } = data;

    if (!applicantId || !reason || !severity) {
      throw new HttpsError(
        "invalid-argument",
        "Applicant ID, reason, and severity are required"
      );
    }

    // Get applicant info
    const applicantDoc = await db.collection("users").doc(applicantId).get();
    if (!applicantDoc.exists) {
      throw new HttpsError("not-found", "Applicant not found");
    }
    const applicantData = applicantDoc.data()!;

    // Get admin info
    const userInfo = await getUserInfo(auth.uid);

    // Get application info if provided
    let applicationNumber: string | undefined;
    if (applicationId) {
      const appDoc = await db.collection("applications").doc(applicationId).get();
      if (appDoc.exists) {
        applicationNumber = appDoc.data()?.applicationNumber;
      }
    }

    // Create flag
    const flagRef = db.collection("flags").doc();
    const flagData = {
      id: flagRef.id,
      applicantId,
      applicantName: `${applicantData.firstName || ""} ${applicantData.lastName || ""}`.trim(),
      applicantEmail: applicantData.email,
      reason,
      severity,
      applicationId: applicationId || null,
      applicationNumber: applicationNumber || null,
      flaggedBy: auth.uid,
      flaggedByName: userInfo.name,
      flaggedByMasjid: userInfo.masjidId || null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await flagRef.set(flagData);

    // Update user's flagged status
    await db.collection("users").doc(applicantId).update({
      isFlagged: true,
      flaggedReason: reason,
      flaggedAt: Timestamp.now(),
      flaggedBy: auth.uid,
      flaggedByMasjid: userInfo.masjidId || null,
      updatedAt: Timestamp.now(),
    });

    // Update applicantSnapshot.isFlagged on ALL applications for this applicant
    // This ensures the flag shows up across all masajid
    const applicantAppsSnapshot = await db
      .collection("applications")
      .where("applicantId", "==", applicantId)
      .get();

    const batch = db.batch();
    applicantAppsSnapshot.docs.forEach((appDoc) => {
      batch.update(appDoc.ref, {
        "applicantSnapshot.isFlagged": true,
        updatedAt: Timestamp.now(),
      });
    });
    await batch.commit();

    // If application provided, create history entry
    if (applicationId) {
      await createHistoryEntry(applicationId, {
        action: "flagged",
        performedBy: auth.uid,
        performedByName: userInfo.name,
        performedByRole: userInfo.role,
        ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
        details: `Applicant flagged: ${reason} (${severity})`,
        metadata: { flagId: flagRef.id, severity },
      });
    }

    // Create audit log
    await db.collection("auditLogs").add({
      action: "flag_created",
      performedBy: auth.uid,
      performedByEmail: userInfo.email,
      performedByRole: userInfo.role,
      targetCollection: "flags",
      targetDocumentId: flagRef.id,
      newData: flagData,
      createdAt: Timestamp.now(),
    });

    return {
      success: true,
      data: { flagId: flagRef.id },
    };
  }
);

// ============================================
// UNFLAG APPLICANT
// ============================================

/**
 * Remove flag from applicant
 */
export const unflagApplicant = onCall(
  async (
    request: CallableRequest<{
      flagId: string;
      resolutionNotes: string;
    }>
  ): Promise<FunctionResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { flagId, resolutionNotes } = data;

    if (!flagId || !resolutionNotes) {
      throw new HttpsError(
        "invalid-argument",
        "Flag ID and resolution notes are required"
      );
    }

    const flagRef = db.collection("flags").doc(flagId);
    const flagDoc = await flagRef.get();

    if (!flagDoc.exists) {
      throw new HttpsError("not-found", "Flag not found");
    }

    const flagData = flagDoc.data()!;

    // Check permissions - only super admin or flag creator can unflag
    if (claims.role !== "super_admin" && flagData.flaggedBy !== auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Only super admins or the flag creator can unflag"
      );
    }

    // Update flag
    await flagRef.update({
      isActive: false,
      resolvedAt: Timestamp.now(),
      resolvedBy: auth.uid,
      resolutionNotes,
      updatedAt: Timestamp.now(),
    });

    // Check if user has other active flags
    const otherFlags = await db
      .collection("flags")
      .where("applicantId", "==", flagData.applicantId)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    // If no other active flags, unflag user and all their applications
    if (otherFlags.empty) {
      await db.collection("users").doc(flagData.applicantId).update({
        isFlagged: false,
        flaggedReason: FieldValue.delete(),
        flaggedAt: FieldValue.delete(),
        flaggedBy: FieldValue.delete(),
        flaggedByMasjid: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });

      // Update applicantSnapshot.isFlagged on ALL applications for this applicant
      const applicantAppsSnapshot = await db
        .collection("applications")
        .where("applicantId", "==", flagData.applicantId)
        .get();

      const batch = db.batch();
      applicantAppsSnapshot.docs.forEach((appDoc) => {
        batch.update(appDoc.ref, {
          "applicantSnapshot.isFlagged": false,
          updatedAt: Timestamp.now(),
        });
      });
      await batch.commit();
    }

    // Create audit log
    const userInfo = await getUserInfo(auth.uid);
    await db.collection("auditLogs").add({
      action: "flag_resolved",
      performedBy: auth.uid,
      performedByEmail: userInfo.email,
      performedByRole: userInfo.role,
      targetCollection: "flags",
      targetDocumentId: flagId,
      previousData: { isActive: true },
      newData: { isActive: false, resolutionNotes },
      createdAt: Timestamp.now(),
    });

    return { success: true };
  }
);

// ============================================
// GET APPLICATION HISTORY
// ============================================

/**
 * Get application history entries
 */
export const getApplicationHistory = onCall(
  async (
    request: CallableRequest<{ applicationId: string }>
  ): Promise<FunctionResponse<ApplicationHistoryEntry[]>> => {
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
    const isAdmin = ["zakat_admin", "super_admin"].includes(claims?.role || "");

    if (!isOwner && !isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to view application history"
      );
    }

    const historySnapshot = await db
      .collection("applications")
      .doc(applicationId)
      .collection("history")
      .orderBy("createdAt", "desc")
      .get();

    const history = historySnapshot.docs.map(
      (doc) => doc.data() as ApplicationHistoryEntry
    );

    return {
      success: true,
      data: history,
    };
  }
);
