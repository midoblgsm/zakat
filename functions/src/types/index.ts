import { Timestamp } from "firebase-admin/firestore";

/**
 * User roles in the system
 */
export type UserRole = "applicant" | "zakat_admin" | "super_admin";

/**
 * Custom claims structure for Firebase Auth
 */
export interface CustomClaims {
  role: UserRole;
  masjidId?: string;
}

/**
 * User address structure
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * User document stored in Firestore /users/{userId}
 */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  phoneSecondary?: string;
  address: Address;
  role: UserRole;
  masjidId?: string;
  permissions?: string[];
  isActive: boolean;
  isFlagged: boolean;
  flaggedReason?: string;
  flaggedAt?: Timestamp;
  flaggedBy?: string;
  flaggedByMasjid?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

/**
 * Request payload for setting user role
 */
export interface SetUserRoleRequest {
  userId: string;
  role: UserRole;
  masjidId?: string;
}

/**
 * Request payload for creating admin user
 */
export interface CreateAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "zakat_admin" | "super_admin";
  masjidId?: string;
}

/**
 * Request payload for disabling user
 */
export interface DisableUserRequest {
  userId: string;
  reason?: string;
}

/**
 * Response structure for Cloud Functions
 */
export interface FunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
