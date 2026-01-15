/**
 * Cloud Functions for Zakat Management System
 *
 * This module exports all Cloud Functions for the application:
 *
 * Auth Functions:
 * - onUserCreate: Trigger on new Firebase Auth user
 * - onUserDelete: Trigger on user deletion
 * - setUserRole: Set user role and custom claims
 * - getUserClaims: Get user's custom claims
 *
 * User Management:
 * - createAdminUser: Create zakat_admin or super_admin
 * - disableUser: Disable user account
 * - enableUser: Enable user account
 * - listUsers: List users with filters
 * - getUser: Get single user
 *
 * Admin Bootstrap:
 * - bootstrapSuperAdmin: One-time setup for initial super admin
 *
 * Application Management:
 * - submitApplication: Submit a draft application
 * - assignApplication: Claim/assign application to admin
 * - releaseApplication: Release application back to pool
 * - changeApplicationStatus: Update application status
 * - getApplication: Get single application
 * - listApplications: List applications with filters
 *
 * Document Management:
 * - requestDocuments: Request additional documents
 * - fulfillDocumentRequest: Mark request as fulfilled
 * - verifyDocument: Verify uploaded document
 * - getDocumentRequests: Get document requests for application
 *
 * Notes & Resolution:
 * - addAdminNote: Add note to application
 * - resolveApplication: Approve/reject application
 * - flagApplicant: Flag applicant for review
 * - unflagApplicant: Remove flag
 * - getApplicationHistory: Get application history
 *
 * Notifications:
 * - sendNotification: Send notification to user
 * - sendBulkNotification: Send to multiple users
 * - markNotificationRead: Mark notification read
 * - markAllNotificationsRead: Mark all read
 * - deleteNotification: Delete notification
 * - getUnreadNotificationCount: Get unread count
 * - getUserNotifications: Get user's notifications
 */

// Firebase Admin initialization
import { initializeApp } from "firebase-admin/app";
initializeApp();

// Auth functions
export { setUserRole, getUserClaims, onUserCreate, onUserDelete } from "./auth";

// User management functions
export { createAdminUser, disableUser, enableUser, listUsers, getUser } from "./users";

// Admin bootstrap function
export { bootstrapSuperAdmin } from "./admin";

// Application management functions
export {
  submitApplication,
  assignApplication,
  releaseApplication,
  changeApplicationStatus,
  getApplication,
  listApplications,
} from "./applications";

// Document management functions
export {
  requestDocuments,
  fulfillDocumentRequest,
  verifyDocument,
  verifyRequestedDocument,
  getDocumentRequests,
} from "./applications/documents";

// Notes and resolution functions
export {
  addAdminNote,
  resolveApplication,
  flagApplicant,
  unflagApplicant,
  getApplicationHistory,
} from "./applications/notes";

// Notification functions
export {
  sendNotification,
  sendBulkNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getUnreadNotificationCount,
  getUserNotifications,
} from "./notifications";

// Email functions (triggered by Firestore)
export {
  onNotificationCreated,
} from "./email";
