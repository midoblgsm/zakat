# Zakat Management Platform - Architecture & Planning Document

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Firebase Services](#firebase-services)
4. [Data Models](#data-models)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Security Rules](#security-rules)
7. [Application Workflows](#application-workflows)
8. [Development Phases](#development-phases)
9. [API Design](#api-design)
10. [UI/UX Structure](#uiux-structure)

---

## Executive Summary

### Vision
A multi-tenant Zakat management platform that enables multiple masajid (mosques) to collaborate on processing Zakat applications through a shared pool system, while maintaining individual masjid identity and customization.

### Key Features
- **Multi-Masjid Support**: Onboard and manage multiple masajid with individual branding
- **Shared Application Pool**: All Zakat applications are accessible to all participating masajid
- **Application Ownership**: Admins can "claim" applications, process them, or release back to pool
- **Complete Audit Trail**: Full history tracking of all application changes
- **Applicant Flagging**: Cross-masjid visibility of rejected/flagged applicants
- **Document Management**: Secure upload and verification of supporting documents

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Applicant   │  │ Zakat Admin  │  │   Super      │              │
│  │    Portal    │  │  Dashboard   │  │    Admin     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           │                                         │
│              ┌────────────┴────────────┐                           │
│              │    React SPA (Vite)     │                           │
│              │   Firebase SDK Client   │                           │
│              └────────────┬────────────┘                           │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                    FIREBASE SERVICES                                 │
├───────────────────────────┼─────────────────────────────────────────┤
│                           │                                         │
│  ┌────────────────────────┴────────────────────────┐               │
│  │                                                  │               │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────┐│               │
│  │  │   Firebase   │  │   Cloud      │  │Firebase││               │
│  │  │    Auth      │  │  Firestore   │  │Storage ││               │
│  │  └──────────────┘  └──────────────┘  └────────┘│               │
│  │                                                  │               │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────┐│               │
│  │  │   Cloud      │  │   Firebase   │  │Firebase││               │
│  │  │  Functions   │  │   Hosting    │  │ Admin  ││               │
│  │  └──────────────┘  └──────────────┘  └────────┘│               │
│  │                                                  │               │
│  └──────────────────────────────────────────────────┘               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **React SPA** | Single Page Application handling all UI rendering and client-side logic |
| **Firebase Auth** | User authentication, role management via custom claims |
| **Cloud Firestore** | Primary database for all application data |
| **Firebase Storage** | Secure document uploads (IDs, lease agreements, etc.) |
| **Cloud Functions** | Server-side logic, triggers, email notifications, admin operations |
| **Firebase Hosting** | CDN-backed hosting for the web application |

---

## Firebase Services

### 1. Firebase Authentication
**Purpose**: User identity and access management

**Features Used**:
- Email/Password authentication
- Custom claims for role-based access control (RBAC)
- Email verification
- Password reset flows

**Custom Claims Structure**:
```javascript
{
  role: 'applicant' | 'zakat_admin' | 'super_admin',
  masjidId: 'masjid_abc123',  // Only for zakat_admin
  permissions: ['read', 'write', 'approve', 'reject', 'flag']
}
```

### 2. Cloud Firestore
**Purpose**: Primary NoSQL database

**Collections**:
- `users` - User profiles and metadata
- `masajid` - Masjid configurations and branding
- `applications` - Zakat applications (shared pool)
- `applicationHistory` - Audit trail subcollection
- `flags` - Flagged applicant records
- `notifications` - User notifications

### 3. Firebase Storage
**Purpose**: Secure file storage

**Bucket Structure**:
```
/applications/{applicationId}/
  ├── photo_id.pdf
  ├── ssn_card.pdf
  ├── lease_agreement.pdf
  └── other_documents/
      ├── doc_1.pdf
      └── doc_2.pdf
```

### 4. Cloud Functions
**Purpose**: Server-side operations

**Implemented Functions** (see `functions/API.md` for full documentation):

**Auth Functions:**
- `onUserCreate` - Initialize user profile on Firebase Auth creation
- `onUserDelete` - Soft delete user on Firebase Auth deletion
- `setUserRole` - Set user role and custom claims
- `getUserClaims` - Get user's custom claims

**User Management:**
- `createAdminUser` - Create zakat_admin or super_admin users
- `disableUser` / `enableUser` - Manage user account status
- `listUsers` / `getUser` - Query user data

**Application Management:**
- `submitApplication` - Submit draft with auto-generated number
- `assignApplication` - Claim/assign from pool
- `releaseApplication` - Return to shared pool
- `changeApplicationStatus` - With status transition validation
- `getApplication` / `listApplications` - Query applications

**Document Management:**
- `requestDocuments` - Admin requests additional documents
- `fulfillDocumentRequest` - Mark request as fulfilled
- `verifyDocument` - Verify uploaded documents
- `getDocumentRequests` - List document requests

**Notes & Resolution:**
- `addAdminNote` - Add internal/external notes
- `resolveApplication` - Approve/reject with resolution details
- `flagApplicant` / `unflagApplicant` - Flag management
- `getApplicationHistory` - Full audit trail

**Notifications:**
- `sendNotification` / `sendBulkNotification` - Send notifications
- `markNotificationRead` / `markAllNotificationsRead`
- `deleteNotification` / `getUnreadNotificationCount`
- `getUserNotifications` - Paginated notification list

**Admin Bootstrap:**
- `bootstrapSuperAdmin` - One-time initial super admin setup

### 5. Firebase Hosting
**Purpose**: Static file hosting with CDN

**Configuration**:
- SPA routing (all routes → index.html)
- Custom domain support for each masjid (future)
- Automatic SSL certificates

---

## Data Models

### Users Collection (`/users/{userId}`)

```typescript
interface User {
  // Core Identity
  id: string;                    // Firebase Auth UID
  email: string;
  emailVerified: boolean;

  // Profile
  firstName: string;
  lastName: string;
  phone: string;
  phoneSecondary?: string;

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Role & Permissions
  role: 'applicant' | 'zakat_admin' | 'super_admin';
  masjidId?: string;             // For zakat_admin only
  permissions?: string[];

  // Status
  isActive: boolean;
  isFlagged: boolean;            // True if flagged as rejected
  flaggedReason?: string;
  flaggedAt?: Timestamp;
  flaggedBy?: string;            // Admin who flagged
  flaggedByMasjid?: string;      // Masjid that flagged

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

### Masajid Collection (`/masajid/{masjidId}`)

```typescript
interface Masjid {
  // Identity
  id: string;
  name: string;
  slug: string;                  // URL-friendly name

  // Contact
  email: string;
  phone: string;
  website?: string;

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Customization
  description: string;           // Rich text description
  logo?: string;                 // Storage URL
  primaryColor?: string;         // Hex color for branding
  secondaryColor?: string;
  welcomeMessage?: string;       // Custom welcome for applicants

  // Zakat Configuration
  zakatConfig: {
    nisabThreshold: number;      // Current nisab amount
    nisabLastUpdated: Timestamp;
    assistanceTypes: string[];   // ['monthly', 'one-time', 'emergency']
    maxMonthlyAmount?: number;
    maxOneTimeAmount?: number;
    requiresReferences: boolean;
    requiredDocuments: string[];
  };

  // Statistics (denormalized for performance)
  stats: {
    totalApplicationsHandled: number;
    applicationsInProgress: number;
    totalAmountDisbursed: number;
  };

  // Status
  isActive: boolean;
  onboardedAt: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;             // Super admin who created
}
```

### Applications Collection (`/applications/{applicationId}`)

```typescript
interface ZakatApplication {
  // Identity
  id: string;
  applicationNumber: string;     // Human-readable: ZKT-2025-00001

  // Applicant Reference
  applicantId: string;           // User ID
  applicantSnapshot: {           // Denormalized for quick access
    name: string;
    email: string;
    phone: string;
    isFlagged: boolean;
  };

  // Status & Assignment
  status: ApplicationStatus;
  assignedTo?: string;           // Zakat admin user ID
  assignedToMasjid?: string;     // Masjid ID of assigned admin
  assignedAt?: Timestamp;

  // Demographics
  demographics: {
    fullName: string;
    age: number;
    gender: 'male' | 'female';
    ssn: string;                 // Encrypted
    hasDriverLicense: boolean;
    driverLicenseNumber?: string;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    primaryLanguage: string;
    speaksEnglish: boolean;
    associatedMasjid?: string;   // Masjid they attend
  };

  // Contact
  contact: {
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    phone: string;
    phoneSecondary?: string;
    email: string;
  };

  // Household
  household: HouseholdMember[];

  // Financial Information
  financial: {
    // Assets
    assets: {
      house?: AssetItem;
      business?: AssetItem;
      cars?: AssetItem;
      cash?: AssetItem;
      other: AssetItem[];
      totalValue: number;
    };

    // Income
    monthlyIncome: number;
    incomeSource?: string;
    receivesGovernmentAid: boolean;
    governmentAidDetails?: string;

    // Debts
    debts: DebtItem[];
    totalDebt: number;

    // Expenses
    expenses: ExpenseItem[];
    totalMonthlyExpenses: number;
  };

  // Circumstances
  circumstances: {
    residenceType: 'own' | 'rent' | 'shelter' | 'subsidized' | 'other';
    residenceDetails?: string;
    rentAmount?: number;
    sharesRent: boolean;
    rentShareDetails?: string;

    transportationType: 'own_car' | 'public' | 'rideshare' | 'other';
    transportationDetails?: string;

    employmentStatus: 'employed' | 'unemployed' | 'self_employed' | 'retired' | 'disabled';
    employerName?: string;
    employerAddress?: string;

    hasHealthInsurance: boolean;
    healthInsuranceType?: string;

    educationLevel: string;
  };

  // Zakat Request
  zakatRequest: {
    isEligible: boolean;         // Self-declared
    reasonForApplication: string;
    assistanceType: 'monthly' | 'one_time';
    monthlyDuration?: number;    // If monthly
    amountRequested: number;
  };

  // References
  references: Reference[];

  // Documents
  documents: {
    photoId: DocumentFile;
    ssnCard: DocumentFile;
    leaseAgreement?: DocumentFile;
    otherDocuments: DocumentFile[];
  };

  // Previous Applications
  previousApplications: {
    appliedToMHMA: boolean;
    mhmaDate?: Timestamp;
    mhmaOutcome?: string;
    otherOrganizations: {
      name: string;
      date: Timestamp;
      approved: boolean;
    }[];
  };

  // Admin Notes & Actions
  adminNotes: AdminNote[];

  // Resolution
  resolution?: {
    decision: 'approved' | 'rejected' | 'partial';
    decidedBy: string;
    decidedByMasjid: string;
    decidedAt: Timestamp;
    amountApproved?: number;
    disbursementMethod?: string;
    rejectionReason?: string;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt: Timestamp;
}

// Enums and Sub-types
type ApplicationStatus =
  | 'draft'              // Applicant still editing
  | 'submitted'          // In shared pool, awaiting review
  | 'under_review'       // Claimed by an admin
  | 'pending_documents'  // Waiting for applicant to upload docs
  | 'pending_verification' // Documents being verified
  | 'approved'           // Zakat approved
  | 'rejected'           // Zakat rejected
  | 'disbursed'          // Funds have been distributed
  | 'closed';            // Application closed

interface HouseholdMember {
  name: string;
  age: number;
  relationship: string;
  isDependent: boolean;
  incomeSource?: string;
}

interface AssetItem {
  value: number;
  dateOwned?: Timestamp;
  description?: string;
}

interface DebtItem {
  amount: number;
  lender: string;
  paymentFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  dueDate?: Timestamp;
  purpose: string;
}

interface ExpenseItem {
  category: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semester';
}

interface Reference {
  name: string;
  phone: string;
  relationship: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface DocumentFile {
  fileName: string;
  storagePath: string;
  uploadedAt: Timestamp;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
}

interface AdminNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdByMasjid: string;
  createdAt: Timestamp;
  isInternal: boolean;           // If true, only visible to admins
}
```

### Application History Subcollection (`/applications/{applicationId}/history/{historyId}`)

```typescript
interface ApplicationHistoryEntry {
  id: string;

  // What changed
  action: HistoryAction;

  // Who made the change
  performedBy: string;           // User ID
  performedByName: string;
  performedByRole: string;
  performedByMasjid?: string;

  // Change details
  previousStatus?: ApplicationStatus;
  newStatus?: ApplicationStatus;
  previousAssignee?: string;
  newAssignee?: string;

  // Additional context
  details: string;               // Human-readable description
  metadata?: Record<string, any>; // Any additional data

  // Timestamp
  createdAt: Timestamp;
}

type HistoryAction =
  | 'created'
  | 'submitted'
  | 'assigned'
  | 'released'
  | 'status_changed'
  | 'note_added'
  | 'document_uploaded'
  | 'document_verified'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'flagged'
  | 'edited';
```

### Flags Collection (`/flags/{flagId}`)

```typescript
interface ApplicantFlag {
  id: string;

  // Who is flagged
  applicantId: string;
  applicantName: string;
  applicantEmail: string;

  // Flag details
  reason: string;
  severity: 'warning' | 'blocked';

  // Related application
  applicationId: string;
  applicationNumber: string;

  // Who flagged
  flaggedBy: string;
  flaggedByName: string;
  flaggedByMasjid: string;
  flaggedByMasjidName: string;

  // Status
  isActive: boolean;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  resolutionNotes?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Notifications Collection (`/notifications/{notificationId}`)

```typescript
interface Notification {
  id: string;

  // Recipient
  userId: string;

  // Content
  type: NotificationType;
  title: string;
  message: string;

  // Reference
  applicationId?: string;
  masjidId?: string;

  // Status
  read: boolean;
  readAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
}

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

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN                               │
│  - Full system access                                            │
│  - Masjid onboarding & management                                │
│  - User role management                                          │
│  - System configuration                                          │
│  - View all applications & statistics                            │
│  - Cannot be assigned applications (oversight role)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ZAKAT ADMIN                               │
│  - Assigned to one masjid                                        │
│  - Update masjid page & description                              │
│  - View shared application pool                                  │
│  - Claim/release applications                                    │
│  - Process applications (approve/reject)                         │
│  - Add notes, request documents                                  │
│  - Flag rejected applicants                                      │
│  - View application history                                      │
│  - View flagged applicants from all masajid                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICANT                                 │
│  - Create and manage own account                                 │
│  - Submit zakat applications                                     │
│  - View own application status                                   │
│  - Upload supporting documents                                   │
│  - Respond to document requests                                  │
│  - View own application history                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Action | Applicant | Zakat Admin | Super Admin |
|--------|-----------|-------------|-------------|
| Register account | ✅ | Via invite | Via system |
| Submit application | ✅ | ❌ | ❌ |
| View own applications | ✅ | ✅ | ✅ |
| View all applications | ❌ | ✅ (pool) | ✅ |
| Claim application | ❌ | ✅ | ❌ |
| Release application | ❌ | ✅ (own) | ✅ |
| Change app status | ❌ | ✅ (claimed) | ✅ |
| Add admin notes | ❌ | ✅ | ✅ |
| Approve/Reject | ❌ | ✅ (claimed) | ✅ |
| Flag applicant | ❌ | ✅ | ✅ |
| View flags | ❌ | ✅ | ✅ |
| Unflag applicant | ❌ | ❌ | ✅ |
| Edit masjid info | ❌ | ✅ (own) | ✅ |
| Onboard masjid | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View statistics | ❌ | ✅ (own masjid) | ✅ (all) |

---

## Security Rules

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isEmailVerified() {
      return request.auth.token.email_verified == true;
    }

    function getUserRole() {
      return request.auth.token.role;
    }

    function isApplicant() {
      return getUserRole() == 'applicant';
    }

    function isZakatAdmin() {
      return getUserRole() == 'zakat_admin';
    }

    function isSuperAdmin() {
      return getUserRole() == 'super_admin';
    }

    function isAdminOfMasjid(masjidId) {
      return isZakatAdmin() && request.auth.token.masjidId == masjidId;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      // Users can read their own profile
      // Admins can read all profiles
      allow read: if isOwner(userId) || isZakatAdmin() || isSuperAdmin();

      // Users can update their own profile (except role fields)
      allow update: if isOwner(userId) &&
        !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['role', 'permissions', 'isFlagged', 'flaggedBy']);

      // Only super admins can update roles
      allow update: if isSuperAdmin();

      // Account creation handled by Cloud Functions
      allow create: if false;
    }

    // Masajid collection
    match /masajid/{masjidId} {
      // Anyone authenticated can read masjid info (for dropdowns, etc.)
      allow read: if isAuthenticated();

      // Only assigned admin or super admin can update
      allow update: if isAdminOfMasjid(masjidId) || isSuperAdmin();

      // Only super admin can create/delete
      allow create, delete: if isSuperAdmin();
    }

    // Applications collection
    match /applications/{applicationId} {
      // Applicants can read their own applications
      // Admins can read all applications (shared pool)
      allow read: if isOwner(resource.data.applicantId) ||
                     isZakatAdmin() ||
                     isSuperAdmin();

      // Applicants can create applications
      allow create: if isApplicant() &&
                       isEmailVerified() &&
                       request.resource.data.applicantId == request.auth.uid;

      // Applicants can update their own draft applications
      allow update: if isOwner(resource.data.applicantId) &&
                       resource.data.status == 'draft';

      // Admins can update applications they've claimed
      allow update: if (isZakatAdmin() &&
                        resource.data.assignedTo == request.auth.uid) ||
                       isSuperAdmin();

      // Application history subcollection
      match /history/{historyId} {
        // Anyone who can read the application can read history
        allow read: if isOwner(get(/databases/$(database)/documents/applications/$(applicationId)).data.applicantId) ||
                       isZakatAdmin() ||
                       isSuperAdmin();

        // History is append-only via Cloud Functions
        allow write: if false;
      }
    }

    // Flags collection
    match /flags/{flagId} {
      // Only admins can read flags
      allow read: if isZakatAdmin() || isSuperAdmin();

      // Only via Cloud Functions
      allow write: if false;
    }

    // Notifications collection
    match /notifications/{notificationId} {
      // Users can only read their own notifications
      allow read: if isOwner(resource.data.userId);

      // Users can mark their own notifications as read
      allow update: if isOwner(resource.data.userId) &&
                       request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['read', 'readAt']);

      // Created via Cloud Functions
      allow create: if false;
    }
  }
}
```

### Firebase Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserRole() {
      return request.auth.token.role;
    }

    function isApplicant() {
      return getUserRole() == 'applicant';
    }

    function isZakatAdmin() {
      return getUserRole() == 'zakat_admin';
    }

    function isSuperAdmin() {
      return getUserRole() == 'super_admin';
    }

    // Application documents
    match /applications/{applicationId}/{allPaths=**} {
      // Applicants can upload to their own application folder
      // This is validated in Cloud Functions against actual ownership
      allow write: if isAuthenticated() &&
                      request.resource.size < 10 * 1024 * 1024 && // 10MB max
                      request.resource.contentType.matches('image/.*|application/pdf');

      // Admins can read all documents
      allow read: if isZakatAdmin() || isSuperAdmin();
    }

    // Masjid logos
    match /masajid/{masjidId}/{allPaths=**} {
      // Anyone can read masjid assets
      allow read: if isAuthenticated();

      // Only masjid admin or super admin can upload
      allow write: if (isZakatAdmin() && request.auth.token.masjidId == masjidId) ||
                      isSuperAdmin();
    }
  }
}
```

---

## Application Workflows

### 1. Applicant Registration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│  Register   │────▶│   Verify    │────▶│  Complete   │
│    Page     │     │   Email/    │     │   Email     │     │   Profile   │
│             │     │  Password   │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │  Applicant  │
                                                            │  Dashboard  │
                                                            └─────────────┘
```

### 2. Application Submission Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Start     │────▶│    Fill     │────▶│   Upload    │────▶│   Review    │
│ Application │     │    Form     │     │  Documents  │     │  & Submit   │
│             │     │ (10 steps)  │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                                        │
                          │ (Auto-save as draft)                   │
                          ▼                                        ▼
                    ┌─────────────┐                          ┌─────────────┐
                    │    Draft    │                          │   Shared    │
                    │   Status    │                          │    Pool     │
                    └─────────────┘                          └─────────────┘
```

### 3. Application Processing Flow (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SHARED APPLICATION POOL                           │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │App 1│ │App 2│ │App 3│ │App 4│ │App 5│ │App 6│ │App 7│ │App 8│          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │   Admin Claims    │
                          │   Application     │
                          └─────────┬─────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REVIEW PROCESS                                  │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │    Review    │────▶│   Verify     │────▶│    Make      │                │
│  │   Details    │     │  Documents   │     │   Decision   │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  Add Notes   │     │   Request    │     │   Approve/   │                │
│  │              │     │   More Docs  │     │   Reject     │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                   │                         │
│         ┌───────────────────┬───────────────────┬┘                         │
│         ▼                   ▼                   ▼                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Release    │    │   Approve    │    │   Reject &   │                  │
│  │   to Pool    │    │  & Disburse  │    │    Flag      │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Application Status State Machine

```
                                    ┌──────────────────────┐
                                    │                      │
                                    ▼                      │
┌─────────┐     ┌───────────┐     ┌─────────────┐         │
│  DRAFT  │────▶│ SUBMITTED │────▶│UNDER_REVIEW │─────────┤ (Release)
└─────────┘     └───────────┘     └─────────────┘         │
                     ▲                   │                 │
                     │                   │                 │
                     │            ┌──────┴──────┐         │
                     │            ▼             ▼         │
                     │   ┌───────────────┐ ┌─────────────────────┐
                     │   │   PENDING_    │ │     PENDING_        │
                     │   │  DOCUMENTS    │ │   VERIFICATION      │
                     │   └───────────────┘ └─────────────────────┘
                     │            │                   │
                     │            └─────────┬─────────┘
                     │                      │
                     │                      ▼
                     │            ┌─────────────────┐
                     │            │    DECISION     │
                     │            └─────────────────┘
                     │              │           │
                     │              ▼           ▼
                     │       ┌──────────┐ ┌──────────┐
                     │       │ APPROVED │ │ REJECTED │
                     │       └──────────┘ └──────────┘
                     │              │           │
                     │              ▼           │
                     │       ┌──────────┐      │
                     │       │DISBURSED │      │
                     │       └──────────┘      │
                     │              │           │
                     │              ▼           ▼
                     │       ┌─────────────────────┐
                     └───────│       CLOSED        │
                             └─────────────────────┘
```

### 5. Flagging Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION REJECTED                                 │
│                                                                              │
│   Admin reviews application ───▶ Decides to reject ───▶ Flag option shown   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLAGGING DECISION                                  │
│                                                                              │
│   ┌────────────────────┐           ┌────────────────────┐                   │
│   │  Flag: WARNING     │           │  Flag: BLOCKED     │                   │
│   │  - Visible alert   │           │  - Cannot apply    │                   │
│   │  - Can still apply │           │  - Requires review │                   │
│   └────────────────────┘           └────────────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CROSS-MASJID VISIBILITY                              │
│                                                                              │
│   All Zakat Admins across all masajid can:                                  │
│   - See flagged status when viewing applicant                               │
│   - See reason for flagging                                                 │
│   - See which masjid flagged them                                           │
│   - See related application details                                         │
│                                                                              │
│   Only Super Admin can:                                                     │
│   - Remove flags                                                            │
│   - Change flag severity                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Development Phases

### Phase 1: Foundation (MVP)
**Goal**: Basic working system with core functionality

#### 1.1 Project Setup
- [ ] Initialize React project with Vite
- [ ] Set up TypeScript configuration
- [ ] Configure Firebase project
- [ ] Set up Firebase Hosting
- [ ] Configure ESLint and Prettier
- [ ] Set up folder structure

#### 1.2 Authentication
- [ ] Firebase Auth integration
- [ ] Email/Password registration
- [ ] Email verification flow
- [ ] Login/Logout functionality
- [ ] Password reset flow
- [ ] Protected routes

#### 1.3 Basic Data Layer ✅ COMPLETED
- [x] Set up Firestore collections (users, applications, masjids, flags, notifications)
- [x] Implement comprehensive security rules with validation
- [x] Create data models/types (TypeScript interfaces)
- [x] Set up Firebase Admin SDK
- [x] Create Cloud Functions:
  - Application management (submit, assign, release, status change)
  - Document management (request, fulfill, verify)
  - Admin notes and resolution (add notes, approve/reject, flag/unflag)
  - Notifications (send, bulk send, mark read, delete)
- [x] Firebase Storage structure with security rules
- [x] Collection initialization scripts with seed data

See `functions/API.md` for complete Cloud Functions documentation.

#### 1.4 Applicant Portal (Basic)
- [ ] Convert existing HTML form to React
- [ ] Multi-step form wizard
- [ ] Form validation
- [ ] Draft auto-save
- [ ] Submit application
- [ ] View application status

#### 1.5 Admin Dashboard (Basic)
- [ ] Application list view (shared pool)
- [ ] Application detail view
- [ ] Claim/Release functionality
- [ ] Basic status changes

**Deliverable**: Applicants can register and submit applications; Admins can view and claim applications

---

### Phase 2: Multi-Masjid Support
**Goal**: Full multi-tenant functionality

#### 2.1 Masjid Management
- [ ] Masjid onboarding (Super Admin)
- [ ] Masjid profile pages
- [ ] Masjid customization (logo, colors, description)
- [ ] Zakat configuration per masjid

#### 2.2 Role-Based Access Control
- [ ] Custom claims implementation
- [ ] Super Admin dashboard
- [ ] Zakat Admin assignment to masajid
- [ ] Permission enforcement

#### 2.3 Enhanced Admin Features
- [ ] Admin notes on applications
- [ ] Document verification workflow
- [ ] Request additional documents
- [ ] Approve/Reject with notes

**Deliverable**: Multiple masajid can operate independently with their own admins

---

### Phase 3: Document Management & History
**Goal**: Complete document handling and audit trail

#### 3.1 Document Upload
- [ ] Firebase Storage integration
- [ ] Secure file upload
- [ ] File type validation
- [ ] Image preview
- [ ] PDF viewer
- [ ] Document verification UI

#### 3.2 Application History
- [ ] History subcollection implementation
- [ ] Automatic history logging (Cloud Functions)
- [ ] History timeline UI
- [ ] Filter and search history

#### 3.3 Notifications
- [ ] In-app notifications
- [ ] Email notifications (optional)
- [ ] Notification preferences
- [ ] Real-time updates

**Deliverable**: Full document management and complete audit trail

---

### Phase 4: Flagging & Advanced Features
**Goal**: Cross-masjid collaboration features

#### 4.1 Applicant Flagging
- [ ] Flag on rejection
- [ ] Flag severity levels
- [ ] Cross-masjid flag visibility
- [ ] Flag management (Super Admin)
- [ ] Flag history

#### 4.2 Advanced Search & Filtering
- [ ] Search applications
- [ ] Filter by status, date, masjid
- [ ] Sort options
- [ ] Saved filters

#### 4.3 Reporting & Statistics
- [ ] Dashboard statistics
- [ ] Application analytics
- [ ] Export reports
- [ ] Masjid-level reports

**Deliverable**: Full collaborative flagging system with analytics

---

### Phase 5: Polish & Optimization
**Goal**: Production-ready application

#### 5.1 UI/UX Enhancement
- [ ] Responsive design refinement
- [ ] Accessibility (WCAG 2.1)
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states

#### 5.2 Performance
- [ ] Query optimization
- [ ] Pagination
- [ ] Caching strategies
- [ ] Bundle optimization

#### 5.3 Security Hardening
- [ ] Security audit
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] SSN encryption

#### 5.4 Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security tests

**Deliverable**: Production-ready, secure, performant application

---

## API Design

### Cloud Functions Endpoints

#### Authentication Functions

```typescript
// Callable Functions
setUserRole(userId: string, role: Role, masjidId?: string): Promise<void>
inviteZakatAdmin(email: string, masjidId: string): Promise<void>
```

#### Application Functions

```typescript
// Callable Functions
claimApplication(applicationId: string): Promise<void>
releaseApplication(applicationId: string): Promise<void>
updateApplicationStatus(applicationId: string, status: Status, notes?: string): Promise<void>
approveApplication(applicationId: string, amount: number, notes: string): Promise<void>
rejectApplication(applicationId: string, reason: string, shouldFlag: boolean, flagSeverity?: FlagSeverity): Promise<void>
requestDocuments(applicationId: string, documentTypes: string[], message: string): Promise<void>

// Triggers
onApplicationCreate: functions.firestore.document('applications/{appId}').onCreate()
onApplicationUpdate: functions.firestore.document('applications/{appId}').onUpdate()
```

#### Masjid Functions

```typescript
// Callable Functions
createMasjid(masjidData: MasjidCreateInput): Promise<string>
updateMasjidConfig(masjidId: string, config: ZakatConfig): Promise<void>
```

#### Flag Functions

```typescript
// Callable Functions
flagApplicant(applicantId: string, applicationId: string, reason: string, severity: FlagSeverity): Promise<void>
unflagApplicant(flagId: string, resolutionNotes: string): Promise<void>
```

#### Notification Functions

```typescript
// Triggers
sendNotificationEmail: functions.firestore.document('notifications/{notificationId}').onCreate()

// Scheduled
cleanupOldNotifications: functions.pubsub.schedule('every 24 hours')
```

---

## UI/UX Structure

### Page Structure

```
/                           # Landing page (public)
├── /login                  # Login page
├── /register               # Registration page
├── /verify-email           # Email verification
├── /forgot-password        # Password reset
│
├── /applicant              # Applicant portal (protected)
│   ├── /dashboard          # Applicant dashboard
│   ├── /apply              # New application form
│   ├── /applications       # List of own applications
│   └── /applications/:id   # Application detail/status
│
├── /admin                  # Zakat Admin portal (protected)
│   ├── /dashboard          # Admin dashboard with stats
│   ├── /pool               # Shared application pool
│   ├── /my-applications    # Applications assigned to me
│   ├── /applications/:id   # Application detail/processing
│   ├── /flags              # Flagged applicants list
│   └── /masjid             # Masjid profile management
│
└── /super-admin            # Super Admin portal (protected)
    ├── /dashboard          # System-wide dashboard
    ├── /masajid            # Masjid management
    ├── /masajid/:id        # Masjid detail
    ├── /users              # User management
    ├── /applications       # All applications
    ├── /flags              # Flag management
    └── /settings           # System settings
```

### Component Architecture

```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Modal/
│   │   ├── Card/
│   │   ├── Table/
│   │   ├── Badge/
│   │   ├── Alert/
│   │   └── Loading/
│   │
│   ├── layout/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   ├── Footer/
│   │   └── PageContainer/
│   │
│   ├── auth/
│   │   ├── LoginForm/
│   │   ├── RegisterForm/
│   │   ├── ProtectedRoute/
│   │   └── RoleGuard/
│   │
│   ├── application/
│   │   ├── ApplicationForm/
│   │   │   ├── DemographicsStep/
│   │   │   ├── CircumstancesStep/
│   │   │   ├── AssetsStep/
│   │   │   ├── DebtsStep/
│   │   │   ├── ExpensesStep/
│   │   │   ├── EligibilityStep/
│   │   │   ├── ReasonStep/
│   │   │   ├── ReferencesStep/
│   │   │   ├── DocumentsStep/
│   │   │   └── ReviewStep/
│   │   ├── ApplicationCard/
│   │   ├── ApplicationDetail/
│   │   ├── ApplicationHistory/
│   │   ├── ApplicationStatus/
│   │   └── DocumentViewer/
│   │
│   ├── admin/
│   │   ├── ApplicationPool/
│   │   ├── ApplicationReview/
│   │   ├── AdminNotes/
│   │   ├── StatusChanger/
│   │   ├── FlagApplicant/
│   │   └── Statistics/
│   │
│   └── masjid/
│       ├── MasjidProfile/
│       ├── MasjidEditor/
│       └── MasjidSelector/
│
├── hooks/
│   ├── useAuth.ts
│   ├── useApplications.ts
│   ├── useApplication.ts
│   ├── useMasjid.ts
│   ├── useNotifications.ts
│   └── useFlags.ts
│
├── services/
│   ├── firebase.ts
│   ├── auth.ts
│   ├── applications.ts
│   ├── masajid.ts
│   ├── storage.ts
│   └── notifications.ts
│
├── store/                  # State management (if using)
│   ├── authSlice.ts
│   ├── applicationsSlice.ts
│   └── notificationsSlice.ts
│
├── types/
│   ├── user.ts
│   ├── application.ts
│   ├── masjid.ts
│   ├── notification.ts
│   └── flag.ts
│
├── utils/
│   ├── validation.ts
│   ├── formatting.ts
│   ├── encryption.ts
│   └── constants.ts
│
└── pages/
    ├── Landing.tsx
    ├── applicant/
    ├── admin/
    └── super-admin/
```

---

## Technology Stack Summary

| Category | Technology | Reason |
|----------|------------|--------|
| **Frontend** | React 18 + TypeScript | Component-based, type safety |
| **Build Tool** | Vite | Fast development, optimized builds |
| **Styling** | Tailwind CSS | Rapid UI development, consistent design |
| **State** | React Context + React Query | Simple state, cached server state |
| **Forms** | React Hook Form + Zod | Performance, validation |
| **Routing** | React Router v6 | Standard React routing |
| **Auth** | Firebase Auth | Integrated with Firebase |
| **Database** | Cloud Firestore | Real-time, scalable NoSQL |
| **Storage** | Firebase Storage | Secure file storage |
| **Functions** | Cloud Functions (Node.js) | Server-side logic |
| **Hosting** | Firebase Hosting | CDN, easy deployment |
| **Testing** | Vitest + Testing Library | Fast, React-focused |

---

## Next Steps

1. **Review this document** and provide feedback on any requirements changes
2. **Prioritize features** for the first iteration
3. **Begin Phase 1.1** - Project setup and Firebase configuration
4. **Iterate** through each phase with regular check-ins

---

*Document Version: 1.0*
*Created: January 2025*
*Last Updated: January 2025*
