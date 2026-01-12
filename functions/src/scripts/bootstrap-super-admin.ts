/**
 * Bootstrap script to create the first super admin
 *
 * Run this script ONCE to create the initial super admin user.
 * After that, use the createAdminUser Cloud Function for additional admins.
 *
 * Usage:
 *   1. Set environment variables or update the config below
 *   2. Run: npx ts-node src/scripts/bootstrap-super-admin.ts
 *
 * For Firebase Emulator:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
 *   npx ts-node src/scripts/bootstrap-super-admin.ts
 */

import * as admin from "firebase-admin";

// Configuration - UPDATE THESE VALUES
const SUPER_ADMIN_CONFIG = {
  email: "superadmin@zakat-platform.com",
  password: "ChangeThisPassword123!", // Change this!
  firstName: "Super",
  lastName: "Admin",
  phone: "1234567890",
};

async function bootstrapSuperAdmin() {
  // Initialize Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const auth = admin.auth();
  const db = admin.firestore();

  console.log("Starting super admin bootstrap...");
  console.log(`Email: ${SUPER_ADMIN_CONFIG.email}`);

  try {
    // Check if user already exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(SUPER_ADMIN_CONFIG.email);
      console.log(`User already exists with UID: ${userRecord.uid}`);
    } catch {
      // User doesn't exist, create new one
      console.log("Creating new user...");
      userRecord = await auth.createUser({
        email: SUPER_ADMIN_CONFIG.email,
        password: SUPER_ADMIN_CONFIG.password,
        displayName: `${SUPER_ADMIN_CONFIG.firstName} ${SUPER_ADMIN_CONFIG.lastName}`,
        emailVerified: true,
      });
      console.log(`Created user with UID: ${userRecord.uid}`);
    }

    // Set custom claims
    console.log("Setting custom claims...");
    await auth.setCustomUserClaims(userRecord.uid, {
      role: "super_admin",
    });
    console.log("Custom claims set: { role: 'super_admin' }");

    // Create or update Firestore document
    console.log("Creating/updating Firestore document...");
    const userDoc = {
      id: userRecord.uid,
      email: SUPER_ADMIN_CONFIG.email,
      emailVerified: true,
      firstName: SUPER_ADMIN_CONFIG.firstName,
      lastName: SUPER_ADMIN_CONFIG.lastName,
      phone: SUPER_ADMIN_CONFIG.phone,
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
      },
      role: "super_admin",
      isActive: true,
      isFlagged: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(userRecord.uid).set(userDoc, { merge: true });
    console.log("Firestore document created/updated");

    console.log("\n✅ Super admin bootstrap complete!");
    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${SUPER_ADMIN_CONFIG.email}`);
    console.log(`  Password: ${SUPER_ADMIN_CONFIG.password}`);
    console.log(`\n⚠️  IMPORTANT: Change the password after first login!`);

  } catch (error) {
    console.error("❌ Bootstrap failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

bootstrapSuperAdmin();
