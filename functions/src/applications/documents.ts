/**
 * Document Request Cloud Functions
 *
 * Functions for managing document requests:
 * - requestDocuments: Request additional documents from applicant
 * - fulfillDocumentRequest: Mark document request as fulfilled
 * - verifyDocument: Verify an uploaded document
 */

import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  RequestDocumentsRequest,
  DocumentRequest,
  ZakatApplication,
  FunctionResponse,
  CustomClaims,
  ApplicationHistoryEntry,
} from "../types";

const db = getFirestore();

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
// REQUEST DOCUMENTS
// ============================================

/**
 * Request additional documents from applicant
 * - Creates document request records
 * - Updates application status to pending_documents
 * - Notifies applicant
 */
export const requestDocuments = onCall(
  async (
    request: CallableRequest<RequestDocumentsRequest>
  ): Promise<FunctionResponse<{ requestIds: string[] }>> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { applicationId, documents, message } = data;

    if (!applicationId || !documents || documents.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Application ID and documents are required"
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
        "You don't have permission to request documents for this application"
      );
    }

    // Get admin info
    const userInfo = await getUserInfo(auth.uid);

    // Create document requests
    const batch = db.batch();
    const requestIds: string[] = [];

    for (const doc of documents) {
      const requestRef = applicationRef.collection("documentRequests").doc();
      const documentRequest: DocumentRequest = {
        id: requestRef.id,
        documentType: doc.documentType,
        description: doc.description,
        required: doc.required,
        requestedBy: auth.uid,
        requestedByName: userInfo.name,
        requestedAt: Timestamp.now(),
      };

      batch.set(requestRef, documentRequest);
      requestIds.push(requestRef.id);
    }

    // Update application status if not already pending_documents
    const previousStatus = application.status;
    if (
      application.status !== "pending_documents" &&
      ["under_review", "pending_verification"].includes(application.status)
    ) {
      batch.update(applicationRef, {
        status: "pending_documents",
        updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();

    // Create history entry
    const documentTypes = documents.map((d) => d.documentType).join(", ");
    const historyMetadata: Record<string, unknown> = {
      documentTypes: documents.map((d) => d.documentType),
      requestIds,
    };
    if (message) historyMetadata.message = message;

    await createHistoryEntry(applicationId, {
      action: "document_requested",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
      previousStatus,
      newStatus: "pending_documents",
      details: `Documents requested: ${documentTypes}`,
      metadata: historyMetadata,
    });

    // Notify applicant
    const appNum = application.applicationNumber;
    const notificationMessage = message
      ? `Additional documents needed for your application ${appNum}: ${message}`
      : `Additional documents needed for application ${appNum}. ` +
        "Please check the required documents and upload them.";

    await db.collection("notifications").add({
      userId: application.applicantId,
      type: "document_requested",
      title: "Documents Requested",
      message: notificationMessage,
      applicationId,
      read: false,
      createdAt: Timestamp.now(),
    });

    return {
      success: true,
      data: { requestIds },
    };
  }
);

// ============================================
// FULFILL DOCUMENT REQUEST
// ============================================

/**
 * Mark a document request as fulfilled
 * Called when applicant uploads requested document
 */
export const fulfillDocumentRequest = onCall(
  async (
    request: CallableRequest<{
      applicationId: string;
      requestId: string;
      storagePath: string;
    }>
  ): Promise<FunctionResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { applicationId, requestId, storagePath } = data;

    if (!applicationId || !requestId || !storagePath) {
      throw new HttpsError(
        "invalid-argument",
        "Application ID, request ID, and storage path are required"
      );
    }

    const applicationRef = db.collection("applications").doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      throw new HttpsError("not-found", "Application not found");
    }

    const application = applicationDoc.data() as ZakatApplication;

    // Check ownership or admin
    const claims = auth.token as unknown as CustomClaims;
    const isOwner = application.applicantId === auth.uid;
    const isAdmin = ["zakat_admin", "super_admin"].includes(claims?.role || "");

    if (!isOwner && !isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "You don't have permission to fulfill this document request"
      );
    }

    // Update document request
    const requestRef = applicationRef
      .collection("documentRequests")
      .doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      throw new HttpsError("not-found", "Document request not found");
    }

    await requestRef.update({
      fulfilledAt: Timestamp.now(),
      fulfilledBy: auth.uid,
      storagePath,
    });

    // Check if all required documents are fulfilled
    const allRequests = await applicationRef
      .collection("documentRequests")
      .where("required", "==", true)
      .get();

    const allFulfilled = allRequests.docs.every((doc) => doc.data().fulfilledAt);

    // Create history entry
    const userInfo = await getUserInfo(auth.uid);
    const documentRequest = requestDoc.data() as DocumentRequest;

    await createHistoryEntry(applicationId, {
      action: "document_uploaded",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      details: `Document uploaded: ${documentRequest.documentType}`,
      metadata: {
        requestId,
        documentType: documentRequest.documentType,
        storagePath,
      },
    });

    // Notify assigned admin if applicant uploaded
    if (isOwner && application.assignedTo) {
      const docMsg = `Applicant has uploaded a requested document for ` +
        `application ${application.applicationNumber}.`;
      const suffix = allFulfilled ? " All required documents have been submitted." : "";
      await db.collection("notifications").add({
        userId: application.assignedTo,
        type: "status_update",
        title: "Document Uploaded",
        message: docMsg + suffix,
        applicationId,
        read: false,
        createdAt: Timestamp.now(),
      });
    }

    return { success: true };
  }
);

// ============================================
// VERIFY DOCUMENT
// ============================================

/**
 * Verify an uploaded document
 * Admin marks document as verified or rejected
 */
export const verifyDocument = onCall(
  async (
    request: CallableRequest<{
      applicationId: string;
      documentPath: string;
      verified: boolean;
      notes?: string;
    }>
  ): Promise<FunctionResponse> => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const claims = auth.token as unknown as CustomClaims;
    validateAdmin(claims);

    const { applicationId, documentPath, verified, notes } = data;

    if (!applicationId || !documentPath) {
      throw new HttpsError(
        "invalid-argument",
        "Application ID and document path are required"
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
        "You don't have permission to verify documents for this application"
      );
    }

    // Find and update the document in the application's documents field
    // This assumes documents are stored in a map structure
    // The actual update logic depends on your document structure

    // Create history entry
    const userInfo = await getUserInfo(auth.uid);

    const verifyMetadata: Record<string, unknown> = {
      documentPath,
      verified,
    };
    if (notes) verifyMetadata.notes = notes;

    await createHistoryEntry(applicationId, {
      action: "document_verified",
      performedBy: auth.uid,
      performedByName: userInfo.name,
      performedByRole: userInfo.role,
      ...(userInfo.masjidId && { performedByMasjid: userInfo.masjidId }),
      details: verified
        ? `Document verified: ${documentPath}`
        : `Document rejected: ${documentPath}${notes ? ` - ${notes}` : ""}`,
      metadata: verifyMetadata,
    });

    // If document rejected, notify applicant
    if (!verified) {
      const issueMsg = `There is an issue with a document you uploaded for ` +
        `application ${application.applicationNumber}. ` +
        (notes || "Please check and re-upload.");
      await db.collection("notifications").add({
        userId: application.applicantId,
        type: "document_requested",
        title: "Document Issue",
        message: issueMsg,
        applicationId,
        read: false,
        createdAt: Timestamp.now(),
      });
    }

    return { success: true };
  }
);

// ============================================
// GET DOCUMENT REQUESTS
// ============================================

/**
 * Get all document requests for an application
 */
export const getDocumentRequests = onCall(
  async (
    request: CallableRequest<{ applicationId: string }>
  ): Promise<FunctionResponse<DocumentRequest[]>> => {
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
        "You don't have permission to view document requests"
      );
    }

    const requestsSnapshot = await db
      .collection("applications")
      .doc(applicationId)
      .collection("documentRequests")
      .orderBy("requestedAt", "desc")
      .get();

    const requests = requestsSnapshot.docs.map(
      (doc) => doc.data() as DocumentRequest
    );

    return {
      success: true,
      data: requests,
    };
  }
);
