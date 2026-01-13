# Zakat Management System - Cloud Functions API

This document describes all Cloud Functions available in the Zakat Management System.

## Table of Contents

- [Authentication](#authentication)
- [Auth Functions](#auth-functions)
- [User Management](#user-management)
- [Application Management](#application-management)
- [Document Management](#document-management)
- [Notes & Resolution](#notes--resolution)
- [Notifications](#notifications)
- [Error Codes](#error-codes)

---

## Authentication

All callable functions require Firebase Authentication. The user's role and permissions are determined by custom claims set on their Firebase Auth token:

```typescript
interface CustomClaims {
  role: 'applicant' | 'zakat_admin' | 'super_admin';
  masjidId?: string; // Required for zakat_admin
}
```

### Role Permissions

| Role | Description |
|------|-------------|
| `applicant` | Can create/submit applications, view own applications |
| `zakat_admin` | Can manage applications for their masjid |
| `super_admin` | Full system access, can manage all resources |

---

## Auth Functions

### setUserRole

Set a user's role and custom claims.

**Permission:** `super_admin` only (zakat_admin can set `applicant` role only)

```typescript
// Request
{
  userId: string;
  role: 'applicant' | 'zakat_admin' | 'super_admin';
  masjidId?: string; // Required for zakat_admin
}

// Response
{
  success: boolean;
  data?: { role: string };
  error?: string;
}
```

### getUserClaims

Get a user's custom claims.

**Permission:** Own claims or admin

```typescript
// Request
{
  userId?: string; // Optional, defaults to calling user
}

// Response
{
  success: boolean;
  data?: { role: string; masjidId?: string };
  error?: string;
}
```

---

## User Management

### createAdminUser

Create a new admin user (zakat_admin or super_admin).

**Permission:** `super_admin` only

```typescript
// Request
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'zakat_admin' | 'super_admin';
  masjidId?: string; // Required for zakat_admin
}

// Response
{
  success: boolean;
  data?: { userId: string };
  error?: string;
}
```

### disableUser

Disable a user account.

**Permission:** `super_admin` only

```typescript
// Request
{
  userId: string;
  reason?: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

### enableUser

Enable a disabled user account.

**Permission:** `super_admin` only

```typescript
// Request
{
  userId: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

### listUsers

List users with optional filtering.

**Permission:** `zakat_admin` (own masjid) or `super_admin`

```typescript
// Request
{
  role?: 'applicant' | 'zakat_admin' | 'super_admin';
  masjidId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// Response
{
  success: boolean;
  data?: User[];
  error?: string;
}
```

### getUser

Get a single user by ID.

**Permission:** Own profile or admin

```typescript
// Request
{
  userId: string;
}

// Response
{
  success: boolean;
  data?: User;
  error?: string;
}
```

---

## Application Management

### submitApplication

Submit a draft application for review.

**Permission:** Application owner only

```typescript
// Request
{
  applicationId: string;
}

// Response
{
  success: boolean;
  data?: { applicationNumber: string }; // e.g., "ZKT-00000001"
  error?: string;
}
```

**Side Effects:**
- Generates unique application number
- Updates status to `submitted`
- Creates history entry
- Notifies applicant

### assignApplication

Assign/claim an application from the pool.

**Permission:** `zakat_admin` or `super_admin`

```typescript
// Request
{
  applicationId: string;
  assignToUserId?: string; // Optional, defaults to calling admin
}

// Response
{
  success: boolean;
  data?: { assignedTo: string };
  error?: string;
}
```

**Side Effects:**
- Updates status to `under_review`
- Sets assignedTo and assignedToMasjid
- Creates history entry
- Notifies applicant and assignee

### releaseApplication

Release an assigned application back to the pool.

**Permission:** Assigned admin or `super_admin`

```typescript
// Request
{
  applicationId: string;
  reason?: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

**Side Effects:**
- Updates status back to `submitted`
- Clears assignment
- Creates history entry

### changeApplicationStatus

Change application status with validation.

**Permission:** Assigned admin or `super_admin`

```typescript
// Request
{
  applicationId: string;
  newStatus: ApplicationStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// Response
{
  success: boolean;
  data?: { newStatus: ApplicationStatus };
  error?: string;
}
```

**Valid Status Transitions:**
```
draft → submitted
submitted → under_review, rejected
under_review → pending_documents, pending_verification, approved, rejected
pending_documents → under_review, rejected, closed
pending_verification → approved, rejected, under_review
approved → disbursed, closed
rejected → closed
disbursed → closed
```

### getApplication

Get a single application with permission check.

**Permission:** Owner, assigned admin, or `super_admin`

```typescript
// Request
{
  applicationId: string;
}

// Response
{
  success: boolean;
  data?: ZakatApplication;
  error?: string;
}
```

### listApplications

List applications with filtering.

**Permission:** Filtered by role

```typescript
// Request
{
  status?: ApplicationStatus;
  masjidId?: string;
  assignedTo?: string;
  applicantId?: string;
  limit?: number;
  poolOnly?: boolean; // Show unassigned submitted applications
}

// Response
{
  success: boolean;
  data?: ZakatApplication[];
  error?: string;
}
```

---

## Document Management

### requestDocuments

Request additional documents from an applicant.

**Permission:** Assigned admin or `super_admin`

```typescript
// Request
{
  applicationId: string;
  documents: Array<{
    documentType: string;
    description: string;
    required: boolean;
  }>;
  message?: string;
}

// Response
{
  success: boolean;
  data?: { requestIds: string[] };
  error?: string;
}
```

**Side Effects:**
- Creates document request records
- Updates status to `pending_documents`
- Notifies applicant

### fulfillDocumentRequest

Mark a document request as fulfilled.

**Permission:** Application owner or admin

```typescript
// Request
{
  applicationId: string;
  requestId: string;
  storagePath: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

**Side Effects:**
- Updates document request with storage path
- Creates history entry
- Notifies assigned admin if all documents fulfilled

### verifyDocument

Verify or reject an uploaded document.

**Permission:** Assigned admin or `super_admin`

```typescript
// Request
{
  applicationId: string;
  documentPath: string;
  verified: boolean;
  notes?: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

**Side Effects:**
- Creates history entry
- If rejected, notifies applicant

### getDocumentRequests

Get all document requests for an application.

**Permission:** Owner or admin

```typescript
// Request
{
  applicationId: string;
}

// Response
{
  success: boolean;
  data?: DocumentRequest[];
  error?: string;
}
```

---

## Notes & Resolution

### addAdminNote

Add a note to an application.

**Permission:** Assigned admin or `super_admin`

```typescript
// Request
{
  applicationId: string;
  content: string; // Max 5000 characters
  isInternal: boolean; // Internal notes hidden from applicant
}

// Response
{
  success: boolean;
  data?: { noteId: string };
  error?: string;
}
```

**Side Effects:**
- Creates history entry
- If external note, notifies applicant

### resolveApplication

Approve or reject an application.

**Permission:** Assigned admin or `super_admin`

```typescript
// Request
{
  applicationId: string;
  decision: 'approved' | 'rejected' | 'partial';
  amountApproved?: number; // Required for approved/partial
  disbursementMethod?: string;
  rejectionReason?: string; // Required for rejected
  notes?: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

**Side Effects:**
- Updates status to `approved` or `rejected`
- Creates resolution record
- Creates history entry
- Notifies applicant
- Updates masjid statistics

### flagApplicant

Flag an applicant for fraud/eligibility concerns.

**Permission:** `zakat_admin` or `super_admin`

```typescript
// Request
{
  applicantId: string;
  applicationId?: string;
  reason: string;
  severity: 'warning' | 'blocked';
}

// Response
{
  success: boolean;
  data?: { flagId: string };
  error?: string;
}
```

**Side Effects:**
- Creates flag record
- Updates user's flagged status
- Creates history entry (if applicationId provided)
- Creates audit log

### unflagApplicant

Remove a flag from an applicant.

**Permission:** Flag creator or `super_admin`

```typescript
// Request
{
  flagId: string;
  resolutionNotes: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

**Side Effects:**
- Deactivates flag
- Updates user's flagged status (if no other active flags)
- Creates audit log

### getApplicationHistory

Get full history of an application.

**Permission:** Owner or admin

```typescript
// Request
{
  applicationId: string;
}

// Response
{
  success: boolean;
  data?: ApplicationHistoryEntry[];
  error?: string;
}
```

---

## Notifications

### sendNotification

Send a notification to a user.

**Permission:** `zakat_admin` or `super_admin`

```typescript
// Request
{
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  masjidId?: string;
}

// Response
{
  success: boolean;
  data?: { notificationId: string };
  error?: string;
}
```

### sendBulkNotification

Send notification to multiple users.

**Permission:** `super_admin` only

```typescript
// Request
{
  userIds: string[]; // Max 500
  type: NotificationType;
  title: string;
  message: string;
  applicationId?: string;
  masjidId?: string;
}

// Response
{
  success: boolean;
  data?: { count: number };
  error?: string;
}
```

### markNotificationRead

Mark a notification as read.

**Permission:** Notification owner only

```typescript
// Request
{
  notificationId: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

### markAllNotificationsRead

Mark all user's notifications as read.

**Permission:** Authenticated user (own notifications)

```typescript
// Request: (empty)

// Response
{
  success: boolean;
  data?: { count: number };
  error?: string;
}
```

### deleteNotification

Delete a notification.

**Permission:** Notification owner only

```typescript
// Request
{
  notificationId: string;
}

// Response
{
  success: boolean;
  error?: string;
}
```

### getUnreadNotificationCount

Get count of unread notifications.

**Permission:** Authenticated user (own notifications)

```typescript
// Request: (empty)

// Response
{
  success: boolean;
  data?: { count: number };
  error?: string;
}
```

### getUserNotifications

Get user's notifications with pagination.

**Permission:** Authenticated user (own notifications)

```typescript
// Request
{
  limit?: number; // Default 20
  unreadOnly?: boolean;
  startAfter?: string; // Notification ID for pagination
}

// Response
{
  success: boolean;
  data?: {
    notifications: Notification[];
    hasMore: boolean;
  };
  error?: string;
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `unauthenticated` | User is not authenticated |
| `permission-denied` | User lacks required permissions |
| `invalid-argument` | Missing or invalid parameters |
| `not-found` | Requested resource not found |
| `failed-precondition` | Action not allowed in current state |
| `already-exists` | Resource already exists |
| `internal` | Internal server error |

---

## Notification Types

```typescript
type NotificationType =
  | 'application_submitted'
  | 'application_assigned'
  | 'application_released'
  | 'status_update'
  | 'document_requested'
  | 'application_approved'
  | 'application_rejected'
  | 'new_application_in_pool'
  | 'system_announcement';
```

---

## Application Statuses

```typescript
type ApplicationStatus =
  | 'draft'           // Started but not submitted
  | 'submitted'       // In pool, awaiting assignment
  | 'under_review'    // Assigned to admin
  | 'pending_documents' // Waiting for documents
  | 'pending_verification' // Documents being verified
  | 'approved'        // Application approved
  | 'rejected'        // Application rejected
  | 'disbursed'       // Funds disbursed
  | 'closed';         // Application closed
```
