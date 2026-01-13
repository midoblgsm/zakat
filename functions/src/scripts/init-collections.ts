/**
 * Firestore Collection Initialization Script
 *
 * This script initializes the Firestore collections with seed data for development.
 * Run with: npx ts-node scripts/init-collections.ts
 */

import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin
const app = admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || "zakat-a63f4",
});

const db = admin.firestore();

// Enable emulator if running locally
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("Using Firestore emulator");
}

/**
 * Seed Masjids Collection
 */
async function seedMasjids(): Promise<void> {
  const masjids = [
    {
      id: "masjid-mhma",
      name: "MHMA - Muslim Help & Mutual Aid",
      slug: "mhma",
      email: "zakat@mhma.org",
      phone: "555-123-4567",
      website: "https://mhma.org",
      address: {
        street: "123 Islamic Center Dr",
        city: "Houston",
        state: "TX",
        zipCode: "77001",
      },
      description: "Main hub for zakat distribution and community support",
      logo: "",
      primaryColor: "#10b981",
      secondaryColor: "#059669",
      welcomeMessage:
        "Welcome to MHMA Zakat Application Portal. We are here to help.",
      nisabThreshold: 5500,
      assistanceTypes: ["rent", "utilities", "medical", "food", "education"],
      maxMonthlyAmount: 1500,
      maxOneTimeAmount: 3000,
      applicationLimit: 2,
      applicationLimitPeriod: "year",
      totalApplicationsHandled: 0,
      applicationsInProgress: 0,
      totalAmountDisbursed: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: "masjid-icna",
      name: "ICNA Relief",
      slug: "icna-relief",
      email: "help@icnarelief.org",
      phone: "555-234-5678",
      website: "https://icnarelief.org",
      address: {
        street: "456 Community Ave",
        city: "Dallas",
        state: "TX",
        zipCode: "75201",
      },
      description: "ICNA Relief zakat distribution center",
      logo: "",
      primaryColor: "#3b82f6",
      secondaryColor: "#2563eb",
      welcomeMessage: "ICNA Relief - Serving humanity with compassion",
      nisabThreshold: 5500,
      assistanceTypes: ["rent", "utilities", "medical", "food", "emergency"],
      maxMonthlyAmount: 1200,
      maxOneTimeAmount: 2500,
      applicationLimit: 1,
      applicationLimitPeriod: "year",
      totalApplicationsHandled: 0,
      applicationsInProgress: 0,
      totalAmountDisbursed: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  const batch = db.batch();
  for (const masjid of masjids) {
    const ref = db.collection("masjids").doc(masjid.id);
    batch.set(ref, masjid, { merge: true });
  }
  await batch.commit();
  console.log(`✓ Seeded ${masjids.length} masjids`);
}

/**
 * Seed System Settings
 */
async function seedSettings(): Promise<void> {
  const settings = [
    {
      id: "general",
      applicationNumberPrefix: "ZKT",
      applicationNumberLength: 8,
      defaultNisabThreshold: 5500,
      defaultCurrency: "USD",
      maintenanceMode: false,
      maintenanceMessage: "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: "notifications",
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: false,
      applicationSubmittedTemplate: "Your application {{applicationNumber}} has been submitted.",
      statusUpdateTemplate: "Your application {{applicationNumber}} status has been updated to {{status}}.",
      documentRequestTemplate: "Documents have been requested for your application {{applicationNumber}}.",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: "limits",
      maxActiveApplicationsPerUser: 1,
      maxDocumentSizeMB: 10,
      allowedDocumentTypes: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
      sessionTimeoutMinutes: 60,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  const batch = db.batch();
  for (const setting of settings) {
    const ref = db.collection("settings").doc(setting.id);
    batch.set(ref, setting, { merge: true });
  }
  await batch.commit();
  console.log(`✓ Seeded ${settings.length} system settings`);
}

/**
 * Create collection with schema documentation
 * This creates a _schema document in each collection for documentation
 */
async function createSchemaDocuments(): Promise<void> {
  const schemas = {
    users: {
      _schema: true,
      description: "User profiles and authentication metadata",
      fields: {
        id: "string - Firebase Auth UID",
        email: "string - User email address",
        emailVerified: "boolean - Email verification status",
        firstName: "string - User first name",
        lastName: "string - User last name",
        phone: "string - Primary phone number",
        phoneSecondary: "string? - Secondary phone number",
        address: "Address - User address object",
        role: "UserRole - applicant | zakat_admin | super_admin",
        masjidId: "string? - Associated masjid for admins",
        permissions: "string[]? - Custom permissions",
        isActive: "boolean - Account active status",
        isFlagged: "boolean - Flag status",
        flaggedReason: "string? - Reason for flag",
        flaggedAt: "Timestamp? - When flagged",
        flaggedBy: "string? - Who flagged",
        createdAt: "Timestamp - Creation date",
        updatedAt: "Timestamp - Last update date",
        lastLoginAt: "Timestamp - Last login date",
      },
      updatedAt: Timestamp.now(),
    },
    applications: {
      _schema: true,
      description: "Zakat assistance applications",
      fields: {
        id: "string - Application ID",
        applicationNumber: "string - Human-readable application number (e.g., ZKT-00001234)",
        applicantId: "string - User ID of applicant",
        applicantSnapshot: "ApplicantSnapshot - Denormalized applicant info",
        status: "ApplicationStatus - Current application status",
        assignedTo: "string? - Admin user ID who has claimed this application",
        assignedToMasjid: "string? - Masjid ID handling this application",
        assignedAt: "Timestamp? - When assigned",
        demographics: "Demographics - Applicant demographics section",
        contact: "ContactInfo - Contact information section",
        household: "HouseholdMember[] - Household members",
        financial: "FinancialInfo - Financial information section",
        circumstances: "Circumstances - Living circumstances section",
        zakatRequest: "ZakatRequest - Assistance request details",
        references: "Reference[] - Personal references",
        documents: "ApplicationDocuments - Uploaded documents",
        previousApplications: "PreviousApplications - Previous assistance history",
        adminNotes: "AdminNote[] - Notes from admins",
        resolution: "ApplicationResolution? - Final resolution",
        createdAt: "Timestamp - Creation date",
        updatedAt: "Timestamp - Last update date",
        submittedAt: "Timestamp? - Submission date",
      },
      statuses: [
        "draft - Application started but not submitted",
        "submitted - Application submitted, in pool",
        "under_review - Assigned to admin for review",
        "pending_documents - Waiting for additional documents",
        "pending_verification - Documents being verified",
        "approved - Application approved",
        "rejected - Application rejected",
        "disbursed - Funds disbursed",
        "closed - Application closed",
      ],
      subcollections: {
        history: "Application activity log entries",
      },
      updatedAt: Timestamp.now(),
    },
    masjids: {
      _schema: true,
      description: "Masjid (mosque) information and zakat configuration",
      fields: {
        id: "string - Masjid ID",
        name: "string - Masjid name",
        slug: "string - URL-friendly name",
        email: "string - Contact email",
        phone: "string - Contact phone",
        website: "string? - Website URL",
        address: "Address - Masjid address",
        description: "string - Masjid description",
        logo: "string - Logo URL",
        primaryColor: "string - Primary brand color",
        secondaryColor: "string - Secondary brand color",
        welcomeMessage: "string - Welcome message for applicants",
        nisabThreshold: "number - Nisab threshold in USD",
        assistanceTypes: "string[] - Types of assistance offered",
        maxMonthlyAmount: "number - Max monthly assistance amount",
        maxOneTimeAmount: "number - Max one-time assistance amount",
        applicationLimit: "number - Max applications per period",
        applicationLimitPeriod: "string - Limit period (year/lifetime)",
        totalApplicationsHandled: "number - Total applications processed",
        applicationsInProgress: "number - Current active applications",
        totalAmountDisbursed: "number - Total amount disbursed",
        isActive: "boolean - Masjid active status",
        createdAt: "Timestamp - Creation date",
        updatedAt: "Timestamp - Last update date",
      },
      updatedAt: Timestamp.now(),
    },
    flags: {
      _schema: true,
      description: "Applicant flags for fraud/eligibility concerns",
      fields: {
        id: "string - Flag ID",
        applicantId: "string - Flagged user ID",
        applicantName: "string - Flagged user name",
        applicantEmail: "string - Flagged user email",
        reason: "string - Reason for flag",
        severity: "string - warning | blocked",
        applicationId: "string? - Related application ID",
        applicationNumber: "string? - Related application number",
        flaggedBy: "string - Admin user ID who created flag",
        flaggedByName: "string - Admin name",
        flaggedByMasjid: "string - Admin's masjid ID",
        isActive: "boolean - Flag active status",
        resolvedAt: "Timestamp? - Resolution date",
        resolvedBy: "string? - Who resolved",
        resolutionNotes: "string? - Resolution notes",
        createdAt: "Timestamp - Creation date",
        updatedAt: "Timestamp - Last update date",
      },
      updatedAt: Timestamp.now(),
    },
    notifications: {
      _schema: true,
      description: "User notifications for application events",
      fields: {
        id: "string - Notification ID",
        userId: "string - Target user ID",
        type: "NotificationType - Notification type",
        title: "string - Notification title",
        message: "string - Notification message",
        applicationId: "string? - Related application ID",
        masjidId: "string? - Related masjid ID",
        read: "boolean - Read status",
        readAt: "Timestamp? - When read",
        createdAt: "Timestamp - Creation date",
      },
      types: [
        "application_submitted",
        "application_assigned",
        "application_released",
        "status_update",
        "document_requested",
        "application_approved",
        "application_rejected",
        "new_application_in_pool",
        "system_announcement",
      ],
      updatedAt: Timestamp.now(),
    },
    auditLogs: {
      _schema: true,
      description: "System audit log (write-only via Cloud Functions)",
      fields: {
        id: "string - Log ID",
        action: "string - Action performed",
        performedBy: "string - User ID who performed action",
        performedByEmail: "string - User email",
        performedByRole: "string - User role at time of action",
        targetCollection: "string - Affected collection",
        targetDocumentId: "string - Affected document ID",
        previousData: "object? - Data before change",
        newData: "object? - Data after change",
        metadata: "object? - Additional metadata",
        ipAddress: "string? - Client IP address",
        userAgent: "string? - Client user agent",
        createdAt: "Timestamp - Log creation date",
      },
      updatedAt: Timestamp.now(),
    },
  };

  const batch = db.batch();
  for (const [collection, schema] of Object.entries(schemas)) {
    const ref = db.collection(collection).doc("_schema");
    batch.set(ref, schema, { merge: true });
  }
  await batch.commit();
  console.log(`✓ Created schema documentation for ${Object.keys(schemas).length} collections`);
}

/**
 * Main initialization function
 */
async function initializeCollections(): Promise<void> {
  console.log("Starting Firestore collection initialization...\n");

  try {
    await seedMasjids();
    await seedSettings();
    await createSchemaDocuments();

    console.log("\n✓ All collections initialized successfully!");
  } catch (error) {
    console.error("Error initializing collections:", error);
    process.exit(1);
  } finally {
    await app.delete();
  }
}

// Run if executed directly
if (require.main === module) {
  initializeCollections();
}

export { seedMasjids, seedSettings, createSchemaDocuments, initializeCollections };
