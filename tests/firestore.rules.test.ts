import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";

let testEnv: RulesTestEnvironment;

const RULES_PATH = "firestore.rules";

// Test user IDs
const SUPER_ADMIN_UID = "super-admin-uid";
const ZAKAT_ADMIN_UID = "zakat-admin-uid";
const APPLICANT_UID = "applicant-uid";
const OTHER_APPLICANT_UID = "other-applicant-uid";
const MASJID_ID = "masjid-1";

describe("Firestore Security Rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "zakat-test",
      firestore: {
        rules: readFileSync(RULES_PATH, "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // Helper functions
  function getAuthenticatedContext(uid: string, claims: Record<string, unknown> = {}) {
    return testEnv.authenticatedContext(uid, claims);
  }

  function getSuperAdminContext() {
    return getAuthenticatedContext(SUPER_ADMIN_UID, { role: "super_admin" });
  }

  function getZakatAdminContext() {
    return getAuthenticatedContext(ZAKAT_ADMIN_UID, { role: "zakat_admin", masjidId: MASJID_ID });
  }

  function getApplicantContext() {
    return getAuthenticatedContext(APPLICANT_UID, { role: "applicant" });
  }

  function getUnauthenticatedContext() {
    return testEnv.unauthenticatedContext();
  }

  // ============================================
  // USERS COLLECTION TESTS
  // ============================================
  describe("Users Collection", () => {
    describe("Read", () => {
      it("allows users to read their own profile", async () => {
        const adminContext = getSuperAdminContext();
        // First create the user document
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "users", APPLICANT_UID), {
            id: APPLICANT_UID,
            email: "applicant@example.com",
            role: "applicant",
          });
        });

        const db = getApplicantContext().firestore();
        await assertSucceeds(getDoc(doc(db, "users", APPLICANT_UID)));
      });

      it("denies users from reading other user profiles", async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "users", OTHER_APPLICANT_UID), {
            id: OTHER_APPLICANT_UID,
            email: "other@example.com",
            role: "applicant",
          });
        });

        const db = getApplicantContext().firestore();
        await assertFails(getDoc(doc(db, "users", OTHER_APPLICANT_UID)));
      });

      it("allows admins to read any user profile", async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "users", APPLICANT_UID), {
            id: APPLICANT_UID,
            email: "applicant@example.com",
            role: "applicant",
          });
        });

        const db = getSuperAdminContext().firestore();
        await assertSucceeds(getDoc(doc(db, "users", APPLICANT_UID)));
      });

      it("denies unauthenticated access", async () => {
        const db = getUnauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, "users", APPLICANT_UID)));
      });
    });

    describe("Create", () => {
      it("allows users to create their own profile with applicant role", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(
          setDoc(doc(db, "users", APPLICANT_UID), {
            id: APPLICANT_UID,
            email: "applicant@example.com",
            role: "applicant",
          })
        );
      });

      it("denies creating profile with different UID", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(
          setDoc(doc(db, "users", OTHER_APPLICANT_UID), {
            id: OTHER_APPLICANT_UID,
            email: "other@example.com",
            role: "applicant",
          })
        );
      });

      it("denies creating profile with admin role", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(
          setDoc(doc(db, "users", APPLICANT_UID), {
            id: APPLICANT_UID,
            email: "applicant@example.com",
            role: "super_admin",
          })
        );
      });
    });

    describe("Update", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "users", APPLICANT_UID), {
            id: APPLICANT_UID,
            email: "applicant@example.com",
            role: "applicant",
            firstName: "John",
            lastName: "Doe",
            createdAt: new Date(),
          });
        });
      });

      it("allows users to update their own allowed fields", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(
          updateDoc(doc(db, "users", APPLICANT_UID), {
            firstName: "Jane",
            lastName: "Smith",
          })
        );
      });

      it("allows super admin to update any user", async () => {
        const db = getSuperAdminContext().firestore();
        await assertSucceeds(
          updateDoc(doc(db, "users", APPLICANT_UID), {
            role: "zakat_admin",
            masjidId: MASJID_ID,
          })
        );
      });
    });

    describe("Delete", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "users", APPLICANT_UID), {
            id: APPLICANT_UID,
            email: "applicant@example.com",
            role: "applicant",
          });
        });
      });

      it("allows super admin to delete users", async () => {
        const db = getSuperAdminContext().firestore();
        await assertSucceeds(deleteDoc(doc(db, "users", APPLICANT_UID)));
      });

      it("denies zakat admin from deleting users", async () => {
        const db = getZakatAdminContext().firestore();
        await assertFails(deleteDoc(doc(db, "users", APPLICANT_UID)));
      });

      it("denies applicants from deleting users", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(deleteDoc(doc(db, "users", APPLICANT_UID)));
      });
    });
  });

  // ============================================
  // MASJIDS COLLECTION TESTS
  // ============================================
  describe("Masjids Collection", () => {
    describe("Read", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "masjids", MASJID_ID), {
            id: MASJID_ID,
            name: "Test Masjid",
          });
        });
      });

      it("allows authenticated users to read masjids", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(getDoc(doc(db, "masjids", MASJID_ID)));
      });

      it("denies unauthenticated users from reading masjids", async () => {
        const db = getUnauthenticatedContext().firestore();
        await assertFails(getDoc(doc(db, "masjids", MASJID_ID)));
      });
    });

    describe("Write", () => {
      it("allows super admin to create masjids", async () => {
        const db = getSuperAdminContext().firestore();
        await assertSucceeds(
          setDoc(doc(db, "masjids", "new-masjid"), {
            id: "new-masjid",
            name: "New Masjid",
          })
        );
      });

      it("denies zakat admin from creating masjids", async () => {
        const db = getZakatAdminContext().firestore();
        await assertFails(
          setDoc(doc(db, "masjids", "new-masjid"), {
            id: "new-masjid",
            name: "New Masjid",
          })
        );
      });

      it("denies applicants from creating masjids", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(
          setDoc(doc(db, "masjids", "new-masjid"), {
            id: "new-masjid",
            name: "New Masjid",
          })
        );
      });
    });
  });

  // ============================================
  // APPLICATIONS COLLECTION TESTS
  // ============================================
  describe("Applications Collection", () => {
    const APPLICATION_ID = "app-1";

    describe("Read", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "applications", APPLICATION_ID), {
            id: APPLICATION_ID,
            applicantId: APPLICANT_UID,
            masjidId: MASJID_ID,
            status: "submitted",
          });
        });
      });

      it("allows applicants to read their own applications", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(getDoc(doc(db, "applications", APPLICATION_ID)));
      });

      it("allows zakat admin to read applications for their masjid", async () => {
        const db = getZakatAdminContext().firestore();
        await assertSucceeds(getDoc(doc(db, "applications", APPLICATION_ID)));
      });

      it("allows super admin to read any application", async () => {
        const db = getSuperAdminContext().firestore();
        await assertSucceeds(getDoc(doc(db, "applications", APPLICATION_ID)));
      });
    });

    describe("Create", () => {
      it("allows applicants to create draft applications", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(
          setDoc(doc(db, "applications", "new-app"), {
            id: "new-app",
            applicantId: APPLICANT_UID,
            masjidId: MASJID_ID,
            status: "draft",
          })
        );
      });

      it("denies creating application with non-draft status", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(
          setDoc(doc(db, "applications", "new-app"), {
            id: "new-app",
            applicantId: APPLICANT_UID,
            masjidId: MASJID_ID,
            status: "submitted",
          })
        );
      });

      it("denies creating application for another user", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(
          setDoc(doc(db, "applications", "new-app"), {
            id: "new-app",
            applicantId: OTHER_APPLICANT_UID,
            masjidId: MASJID_ID,
            status: "draft",
          })
        );
      });
    });

    describe("Update", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "applications", APPLICATION_ID), {
            id: APPLICATION_ID,
            applicantId: APPLICANT_UID,
            masjidId: MASJID_ID,
            status: "draft",
          });
        });
      });

      it("allows applicants to update their draft applications", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(
          updateDoc(doc(db, "applications", APPLICATION_ID), {
            notes: "Updated notes",
          })
        );
      });

      it("allows zakat admin to update applications in their masjid", async () => {
        const db = getZakatAdminContext().firestore();
        await assertSucceeds(
          updateDoc(doc(db, "applications", APPLICATION_ID), {
            status: "under_review",
          })
        );
      });
    });

    describe("Delete", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "applications", APPLICATION_ID), {
            id: APPLICATION_ID,
            applicantId: APPLICANT_UID,
            masjidId: MASJID_ID,
            status: "draft",
          });
        });
      });

      it("allows super admin to delete applications", async () => {
        const db = getSuperAdminContext().firestore();
        await assertSucceeds(deleteDoc(doc(db, "applications", APPLICATION_ID)));
      });

      it("denies applicants from deleting applications", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(deleteDoc(doc(db, "applications", APPLICATION_ID)));
      });
    });
  });

  // ============================================
  // FLAGS COLLECTION TESTS
  // ============================================
  describe("Flags Collection", () => {
    const FLAG_ID = "flag-1";

    describe("Read", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "flags", FLAG_ID), {
            id: FLAG_ID,
            applicantId: APPLICANT_UID,
            createdBy: ZAKAT_ADMIN_UID,
          });
        });
      });

      it("allows admins to read flags", async () => {
        const db = getZakatAdminContext().firestore();
        await assertSucceeds(getDoc(doc(db, "flags", FLAG_ID)));
      });

      it("denies applicants from reading flags", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(getDoc(doc(db, "flags", FLAG_ID)));
      });
    });

    describe("Create", () => {
      it("allows admins to create flags", async () => {
        const db = getZakatAdminContext().firestore();
        await assertSucceeds(
          setDoc(doc(db, "flags", "new-flag"), {
            id: "new-flag",
            applicantId: APPLICANT_UID,
            createdBy: ZAKAT_ADMIN_UID,
            reason: "Test flag",
          })
        );
      });

      it("denies applicants from creating flags", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(
          setDoc(doc(db, "flags", "new-flag"), {
            id: "new-flag",
            applicantId: OTHER_APPLICANT_UID,
            createdBy: APPLICANT_UID,
            reason: "Test flag",
          })
        );
      });
    });

    describe("Delete", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "flags", FLAG_ID), {
            id: FLAG_ID,
            applicantId: APPLICANT_UID,
            createdBy: ZAKAT_ADMIN_UID,
          });
        });
      });

      it("allows super admin to delete flags", async () => {
        const db = getSuperAdminContext().firestore();
        await assertSucceeds(deleteDoc(doc(db, "flags", FLAG_ID)));
      });

      it("denies zakat admin from deleting flags", async () => {
        const db = getZakatAdminContext().firestore();
        await assertFails(deleteDoc(doc(db, "flags", FLAG_ID)));
      });
    });
  });

  // ============================================
  // NOTIFICATIONS COLLECTION TESTS
  // ============================================
  describe("Notifications Collection", () => {
    const NOTIFICATION_ID = "notif-1";

    describe("Read", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "notifications", NOTIFICATION_ID), {
            id: NOTIFICATION_ID,
            userId: APPLICANT_UID,
            message: "Test notification",
            read: false,
          });
        });
      });

      it("allows users to read their own notifications", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(getDoc(doc(db, "notifications", NOTIFICATION_ID)));
      });

      it("denies users from reading other users notifications", async () => {
        const db = getAuthenticatedContext(OTHER_APPLICANT_UID, { role: "applicant" }).firestore();
        await assertFails(getDoc(doc(db, "notifications", NOTIFICATION_ID)));
      });
    });

    describe("Update", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "notifications", NOTIFICATION_ID), {
            id: NOTIFICATION_ID,
            userId: APPLICANT_UID,
            message: "Test notification",
            read: false,
          });
        });
      });

      it("allows users to mark their notifications as read", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(
          updateDoc(doc(db, "notifications", NOTIFICATION_ID), {
            read: true,
            readAt: new Date(),
          })
        );
      });

      it("denies users from modifying other notification fields", async () => {
        const db = getApplicantContext().firestore();
        await assertFails(
          updateDoc(doc(db, "notifications", NOTIFICATION_ID), {
            message: "Modified message",
          })
        );
      });
    });

    describe("Delete", () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const adminDb = context.firestore();
          await setDoc(doc(adminDb, "notifications", NOTIFICATION_ID), {
            id: NOTIFICATION_ID,
            userId: APPLICANT_UID,
            message: "Test notification",
            read: false,
          });
        });
      });

      it("allows users to delete their own notifications", async () => {
        const db = getApplicantContext().firestore();
        await assertSucceeds(deleteDoc(doc(db, "notifications", NOTIFICATION_ID)));
      });

      it("denies users from deleting other users notifications", async () => {
        const db = getAuthenticatedContext(OTHER_APPLICANT_UID, { role: "applicant" }).firestore();
        await assertFails(deleteDoc(doc(db, "notifications", NOTIFICATION_ID)));
      });
    });
  });
});
