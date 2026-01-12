import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from './firebase';
import type { User, CreateUserInput, AuthUser } from '@/types';

/**
 * Register a new user with email and password
 */
export async function registerUser(input: CreateUserInput): Promise<UserCredential> {
  const { email, password, firstName, lastName, phone, address } = input;

  // Create Firebase auth user
  const userCredential = await createUserWithEmailAndPassword(
    firebaseAuth,
    email,
    password
  );

  // Update display name
  await updateProfile(userCredential.user, {
    displayName: `${firstName} ${lastName}`,
  });

  // Create user profile in Firestore
  const userDoc: Omit<User, 'id'> = {
    email,
    emailVerified: false,
    firstName,
    lastName,
    phone,
    address,
    role: 'applicant',
    isActive: true,
    isFlagged: false,
    createdAt: serverTimestamp() as never,
    updatedAt: serverTimestamp() as never,
    lastLoginAt: serverTimestamp() as never,
  };

  await setDoc(doc(firebaseDb, 'users', userCredential.user.uid), userDoc);

  // Send verification email
  await sendEmailVerification(userCredential.user);

  return userCredential;
}

/**
 * Sign in with email and password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<UserCredential> {
  const userCredential = await signInWithEmailAndPassword(
    firebaseAuth,
    email,
    password
  );

  // Update last login timestamp
  await setDoc(
    doc(firebaseDb, 'users', userCredential.user.uid),
    { lastLoginAt: serverTimestamp() },
    { merge: true }
  );

  return userCredential;
}

/**
 * Sign out the current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(firebaseAuth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

/**
 * Resend email verification
 */
export async function resendVerificationEmail(): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (user) {
    await sendEmailVerification(user);
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const userDoc = await getDoc(doc(firebaseDb, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
}

/**
 * Convert Firebase user to AuthUser
 */
export function toAuthUser(user: FirebaseUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(firebaseAuth, callback);
}

/**
 * Get the current user
 */
export function getCurrentUser(): FirebaseUser | null {
  return firebaseAuth.currentUser;
}

/**
 * Get ID token with custom claims
 */
export async function getIdTokenResult() {
  const user = firebaseAuth.currentUser;
  if (user) {
    return user.getIdTokenResult();
  }
  return null;
}

/**
 * Force refresh the ID token (call after role changes)
 */
export async function refreshIdToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (user) {
    return user.getIdToken(true); // Force refresh
  }
  return null;
}
