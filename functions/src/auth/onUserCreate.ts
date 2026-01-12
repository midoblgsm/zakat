import { auth as authFunctions } from "firebase-functions/v1";
import { auth, db, COLLECTIONS } from "../config";
import { FieldValue } from "firebase-admin/firestore";
import { CustomClaims } from "../types";

/**
 * Triggered when a new user is created in Firebase Auth
 * Sets default custom claims and ensures user document exists
 */
export const onUserCreate = authFunctions.user().onCreate(async (user) => {
  const { uid, email, emailVerified } = user;

  console.log(`New user created: ${uid} (${email})`);

  // Set default custom claims (applicant role)
  const defaultClaims: CustomClaims = {
    role: "applicant",
  };

  try {
    await auth.setCustomUserClaims(uid, defaultClaims);
    console.log(`Set default claims for user ${uid}:`, defaultClaims);
  } catch (error) {
    console.error(`Failed to set claims for user ${uid}:`, error);
    throw error;
  }

  // Check if user document exists (may have been created during registration)
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    // Create basic user document if it doesn't exist
    // This handles cases where user was created directly in Firebase Console
    // or through other auth providers
    try {
      await userRef.set({
        id: uid,
        email: email || "",
        emailVerified: emailVerified || false,
        firstName: "",
        lastName: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
        },
        role: "applicant",
        isActive: true,
        isFlagged: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
      });
      console.log(`Created user document for ${uid}`);
    } catch (error) {
      console.error(`Failed to create user document for ${uid}:`, error);
      throw error;
    }
  } else {
    // Update the existing document to ensure role is synced
    try {
      await userRef.update({
        role: "applicant",
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Updated existing user document for ${uid}`);
    } catch (error) {
      console.error(`Failed to update user document for ${uid}:`, error);
    }
  }

  return { success: true, userId: uid };
});

/**
 * Triggered when a user is deleted from Firebase Auth
 * Optionally clean up user data (soft delete recommended)
 */
export const onUserDelete = authFunctions.user().onDelete(async (user) => {
  const { uid, email } = user;

  console.log(`User deleted: ${uid} (${email})`);

  // Soft delete: Mark user as inactive instead of deleting document
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    try {
      await userRef.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
        deletedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Soft deleted user document for ${uid}`);
    } catch (error) {
      console.error(`Failed to soft delete user document for ${uid}:`, error);
    }
  }

  return { success: true, userId: uid };
});
