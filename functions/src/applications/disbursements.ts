/**
 * Disbursement Cloud Functions
 *
 * Functions for recording and tracking disbursements for zakat applications.
 */

import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  RecordDisbursementRequest,
  GetApplicantDisbursementRequest,
  Disbursement,
  ZakatApplication,
  ApplicationHistoryEntry,
  FunctionResponse,
  CustomClaims,
} from "../types";

const db = getFirestore();

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
 * Get masjid info
 */
async function getMasjidInfo(
  masjidId: string
): Promise<{ name: string }> {
  const masjidDoc = await db.collection("masajid").doc(masjidId).get();
  const masjidData = masjidDoc.data();

  return {
    name: masjidData?.name || "Unknown Masjid",
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

// ============================================
// RECORD DISBURSEMENT
// ============================================

/**
 * Record a new disbursement for an application
 * - Validates application is in approved or disbursed status
 * - Creates disbursement record in subcollection
 * - Updates masjid stats
 * - Creates history entry
 * - Notifies applicant
 */
export const recordDisbursement = onCall(
  async (
    request: CallableRequest<RecordDisbursementRequest>
  ): Promise<FunctionResponse<{ disbursementId: string }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const {
      applicationId,
      amount,
      method,
      referenceNumber,
      notes,
      periodMonth,
      periodYear,
    } = data;

    // Validate required fields
    if (!applicationId) {
      throw new HttpsError("invalid-argument", "Application ID is required");
    }

    if (!amount || amount <= 0) {
      throw new HttpsError("invalid-argument", "Amount must be a positive number");
    }

    if (!method) {
      throw new HttpsError("invalid-argument", "Disbursement method is required");
    }

    // Validate masjid assignment for zakat_admin
    if (claims.role === "zakat_admin" && !claims.masjidId) {
      throw new HttpsError(
        "failed-precondition",
        "Zakat admin must be assigned to a masjid"
      );
    }

    // Get application
    const applicationRef = db.collection("applications").doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;

    // Verify application is in correct status for disbursement
    if (!["approved", "disbursed"].includes(application.status)) {
      throw new HttpsError(
        "failed-precondition",
        "Application must be in approved or disbursed status to record disbursements"
      );
    }

    // Verify admin has permission to disburse
    if (
      claims.role !== "super_admin" &&
      application.assignedTo !== auth.uid &&
      application.assignedToMasjid !== claims.masjidId
    ) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to record disbursements for this application"
      );
    }

    // Get user and masjid info
    const userInfo = await getUserInfo(auth.uid);
    const masjidId = claims.masjidId || application.assignedToMasjid;

    if (!masjidId) {
      throw new HttpsError(
        "failed-precondition",
        "No masjid associated with this disbursement"
      );
    }

    const masjidInfo = await getMasjidInfo(masjidId);

    // Create disbursement record
    const disbursementRef = db
      .collection("applications")
      .doc(applicationId)
      .collection("disbursements")
      .doc();

    const now = Timestamp.now();
    const disbursement: Disbursement = {
      id: disbursementRef.id,
      applicationId,
      applicantId: application.applicantId,
      amount,
      method,
      ...(referenceNumber && { referenceNumber }),
      ...(notes && { notes }),
      disbursedBy: auth.uid,
      disbursedByName: userInfo.name,
      masjidId,
      masjidName: masjidInfo.name,
      disbursedAt: now,
      ...(periodMonth && { periodMonth }),
      ...(periodYear && { periodYear }),
      createdAt: now,
    };

    await disbursementRef.set(disbursement);

    // Update application status to disbursed if not already
    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (application.status === "approved") {
      updateData.status = "disbursed";
      updateData["resolution.amountDisbursed"] = amount;
      updateData["resolution.disbursedAt"] = now;
      updateData["resolution.disbursedBy"] = auth.uid;
    }

    await applicationRef.update(updateData);

    // Update masjid stats
    const masjidRef = db.collection("masajid").doc(masjidId);
    await masjidRef.update({
      "stats.totalAmountDisbursed": FieldValue.increment(amount),
    });

    // Create history entry
    const periodLabel = periodMonth && periodYear
      ? ` for ${new Date(periodYear, periodMonth - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
      : "";

    await createHistoryEntry(applicationId, {
      action: "disbursed",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      performedByMasjid: masjidId,
      previousStatus: application.status,
      newStatus: "disbursed",
      details: `Disbursement of $${amount.toLocaleString()} recorded via ${method}${periodLabel}`,
      metadata: {
        disbursementId: disbursementRef.id,
        amount,
        method,
        ...(referenceNumber && { referenceNumber }),
        ...(periodMonth && { periodMonth }),
        ...(periodYear && { periodYear }),
      },
    });

    // Notify applicant
    await db.collection("notifications").add({
      userId: application.applicantId,
      type: "status_update",
      title: "Disbursement Received",
      message: `A disbursement of $${amount.toLocaleString()} has been recorded ` +
        `for your application ${application.applicationNumber}${periodLabel}.`,
      applicationId,
      read: false,
      createdAt: now,
      disbursementAmount: amount,
    });

    return {
      success: true,
      data: { disbursementId: disbursementRef.id },
    };
  }
);

// ============================================
// GET APPLICATION DISBURSEMENTS
// ============================================

/**
 * Get all disbursements for a specific application
 */
export const getApplicationDisbursements = onCall(
  async (
    request: CallableRequest<{ applicationId: string }>
  ): Promise<FunctionResponse<{ disbursements: Disbursement[]; totalDisbursed: number }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { applicationId } = data;

    if (!applicationId) {
      throw new HttpsError("invalid-argument", "Application ID is required");
    }

    // Get application to verify access
    const applicationDoc = await db
      .collection("applications")
      .doc(applicationId)
      .get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;
    const claims = auth.token as unknown as CustomClaims;

    // Verify access
    const isOwner = application.applicantId === auth.uid;
    const isSuperAdmin = claims.role === "super_admin";
    const isZakatAdmin = claims.role === "zakat_admin";

    if (!isOwner && !isSuperAdmin && !isZakatAdmin) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to view this application's disbursements"
      );
    }

    // Get disbursements
    const disbursementsRef = db
      .collection("applications")
      .doc(applicationId)
      .collection("disbursements");

    const snapshot = await disbursementsRef
      .orderBy("disbursedAt", "desc")
      .get();

    const disbursements = snapshot.docs.map((doc) => doc.data() as Disbursement);
    const totalDisbursed = disbursements.reduce((sum, d) => sum + d.amount, 0);

    return {
      success: true,
      data: { disbursements, totalDisbursed },
    };
  }
);

// ============================================
// GET APPLICANT DISBURSEMENT SUMMARY
// ============================================

/**
 * Get disbursement summary for a specific applicant
 * Aggregates across all their applications with breakdown by masjid
 */
export const getApplicantDisbursementSummary = onCall(
  async (
    request: CallableRequest<GetApplicantDisbursementRequest>
  ): Promise<FunctionResponse<{
    totalDisbursed: number;
    disbursementCount: number;
    applicationCount: number;
    byMasjid: Array<{ masjidId: string; masjidName: string; totalDisbursed: number; count: number }>;
  }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    const { applicantId } = data;

    if (!applicantId) {
      throw new HttpsError("invalid-argument", "Applicant ID is required");
    }

    // Only admins can query other users' disbursement summaries
    if (auth.uid !== applicantId && !["zakat_admin", "super_admin"].includes(claims.role || "")) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to view this user's disbursement summary"
      );
    }

    // Get all applications for this applicant
    const applicationsSnapshot = await db
      .collection("applications")
      .where("applicantId", "==", applicantId)
      .get();

    let totalDisbursed = 0;
    let disbursementCount = 0;
    type MasjidEntry = {
      masjidId: string;
      masjidName: string;
      totalDisbursed: number;
      count: number;
    };
    const masjidMap = new Map<string, MasjidEntry>();

    // For each application, get disbursements
    for (const appDoc of applicationsSnapshot.docs) {
      const disbursementsSnapshot = await db
        .collection("applications")
        .doc(appDoc.id)
        .collection("disbursements")
        .get();

      for (const disbDoc of disbursementsSnapshot.docs) {
        const disb = disbDoc.data() as Disbursement;
        totalDisbursed += disb.amount;
        disbursementCount++;

        // Update masjid breakdown
        const existing = masjidMap.get(disb.masjidId);
        if (existing) {
          existing.totalDisbursed += disb.amount;
          existing.count++;
        } else {
          masjidMap.set(disb.masjidId, {
            masjidId: disb.masjidId,
            masjidName: disb.masjidName,
            totalDisbursed: disb.amount,
            count: 1,
          });
        }
      }
    }

    const byMasjid = Array.from(masjidMap.values()).sort(
      (a, b) => b.totalDisbursed - a.totalDisbursed
    );

    return {
      success: true,
      data: {
        totalDisbursed,
        disbursementCount,
        applicationCount: applicationsSnapshot.size,
        byMasjid,
      },
    };
  }
);

// ============================================
// GET ALL DISBURSEMENTS (Super Admin)
// ============================================

/**
 * Get all disbursements across all applications (Super Admin only)
 * Returns aggregated view with breakdown by applicant and masjid
 */
export const getAllDisbursements = onCall(
  async (
    request: CallableRequest<{ limit?: number }>
  ): Promise<FunctionResponse<{
    totalDisbursed: number;
    totalApplicants: number;
    applicants: Array<{
      applicantId: string;
      applicantName: string;
      totalDisbursed: number;
      disbursementCount: number;
      byMasjid: Array<{ masjidId: string; masjidName: string; totalDisbursed: number }>;
    }>;
  }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;

    if (claims.role !== "super_admin") {
      throw new HttpsError(
        "permission-denied",
        "Only super admins can view all disbursements"
      );
    }

    const limitValue = data.limit || 100;

    // Get all applications with disbursements using collectionGroup
    const disbursementsSnapshot = await db
      .collectionGroup("disbursements")
      .orderBy("disbursedAt", "desc")
      .limit(limitValue * 10) // Get more to aggregate
      .get();

    // Group by applicant
    const applicantMap = new Map<string, {
      applicantId: string;
      applicantName: string;
      totalDisbursed: number;
      disbursementCount: number;
      byMasjid: Map<string, { masjidId: string; masjidName: string; totalDisbursed: number }>;
    }>();

    let totalDisbursed = 0;

    for (const disbDoc of disbursementsSnapshot.docs) {
      const disb = disbDoc.data() as Disbursement;
      totalDisbursed += disb.amount;

      let applicantEntry = applicantMap.get(disb.applicantId);
      if (!applicantEntry) {
        // Get applicant name from application
        const pathParts = disbDoc.ref.path.split("/");
        const applicationId = pathParts[1]; // applications/{appId}/disbursements/{disbId}
        const appDoc = await db.collection("applications").doc(applicationId).get();
        const appData = appDoc.data() as ZakatApplication | undefined;

        applicantEntry = {
          applicantId: disb.applicantId,
          applicantName: appData?.applicantSnapshot?.name || "Unknown",
          totalDisbursed: 0,
          disbursementCount: 0,
          byMasjid: new Map(),
        };
        applicantMap.set(disb.applicantId, applicantEntry);
      }

      applicantEntry.totalDisbursed += disb.amount;
      applicantEntry.disbursementCount++;

      // Update masjid breakdown
      const masjidEntry = applicantEntry.byMasjid.get(disb.masjidId);
      if (masjidEntry) {
        masjidEntry.totalDisbursed += disb.amount;
      } else {
        applicantEntry.byMasjid.set(disb.masjidId, {
          masjidId: disb.masjidId,
          masjidName: disb.masjidName,
          totalDisbursed: disb.amount,
        });
      }
    }

    // Convert to array and sort by total disbursed
    const applicants = Array.from(applicantMap.values())
      .map((a) => ({
        ...a,
        byMasjid: Array.from(a.byMasjid.values()).sort(
          (x, y) => y.totalDisbursed - x.totalDisbursed
        ),
      }))
      .sort((a, b) => b.totalDisbursed - a.totalDisbursed)
      .slice(0, limitValue);

    return {
      success: true,
      data: {
        totalDisbursed,
        totalApplicants: applicantMap.size,
        applicants,
      },
    };
  }
);
