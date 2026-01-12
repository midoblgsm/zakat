import type { Timestamp } from 'firebase/firestore';

/**
 * User roles in the system
 */
export type UserRole = 'applicant' | 'zakat_admin' | 'super_admin';

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
  // Core Identity
  id: string;
  email: string;
  emailVerified: boolean;

  // Profile
  firstName: string;
  lastName: string;
  phone: string;
  phoneSecondary?: string;

  // Address
  address: Address;

  // Role & Permissions
  role: UserRole;
  masjidId?: string; // For zakat_admin only
  permissions?: string[];

  // Status
  isActive: boolean;
  isFlagged: boolean;
  flaggedReason?: string;
  flaggedAt?: Timestamp;
  flaggedBy?: string;
  flaggedByMasjid?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

/**
 * User creation input (for registration)
 */
export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: Address;
}

/**
 * User profile update input
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneSecondary?: string;
  address?: Partial<Address>;
}

/**
 * Auth context user (includes Firebase auth data)
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Extended auth state with user profile
 */
export interface AuthState {
  user: AuthUser | null;
  profile: User | null;
  loading: boolean;
  error: string | null;
}
