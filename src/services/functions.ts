import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from './firebase';
import type { UserRole } from '@/types';

/**
 * Response structure from Cloud Functions
 */
export interface FunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Custom claims structure
 */
export interface CustomClaims {
  role: UserRole;
  masjidId?: string;
}

/**
 * Set user role request
 */
export interface SetUserRoleRequest {
  userId: string;
  role: UserRole;
  masjidId?: string;
}

/**
 * Create admin user request
 */
export interface CreateAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'zakat_admin' | 'super_admin';
  masjidId?: string;
}

/**
 * Disable user request
 */
export interface DisableUserRequest {
  userId: string;
  reason?: string;
}

/**
 * User list filters
 */
export interface ListUsersFilters {
  role?: UserRole;
  masjidId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// Response types
type SetUserRoleResponse = FunctionResponse<{ userId: string; role: UserRole; masjidId: string | null }>;
type GetUserClaimsResponse = FunctionResponse<{ userId: string; customClaims: CustomClaims }>;
type CreateAdminResponse = FunctionResponse<{ userId: string; email: string; role: UserRole; masjidId: string | null }>;
type DisableUserResponse = FunctionResponse<{ userId: string; disabled: boolean }>;
type ListUsersResponse = FunctionResponse<{ users: unknown[]; total: number; limit: number; offset: number }>;

/**
 * Set user role (callable by admins)
 */
export async function setUserRole(
  request: SetUserRoleRequest
): Promise<SetUserRoleResponse> {
  const callable = httpsCallable<SetUserRoleRequest, SetUserRoleResponse>(
    firebaseFunctions,
    'setUserRole'
  );
  const result = await callable(request);
  return result.data;
}

/**
 * Get user custom claims
 */
export async function getUserClaims(
  userId?: string
): Promise<GetUserClaimsResponse> {
  const callable = httpsCallable<{ userId?: string }, GetUserClaimsResponse>(
    firebaseFunctions,
    'getUserClaims'
  );
  const result = await callable({ userId });
  return result.data;
}

/**
 * Create admin user (super admin only)
 */
export async function createAdminUser(
  request: CreateAdminRequest
): Promise<CreateAdminResponse> {
  const callable = httpsCallable<CreateAdminRequest, CreateAdminResponse>(
    firebaseFunctions,
    'createAdminUser'
  );
  const result = await callable(request);
  return result.data;
}

/**
 * Disable user account
 */
export async function disableUser(
  request: DisableUserRequest
): Promise<DisableUserResponse> {
  const callable = httpsCallable<DisableUserRequest, DisableUserResponse>(
    firebaseFunctions,
    'disableUser'
  );
  const result = await callable(request);
  return result.data;
}

/**
 * Enable user account
 */
export async function enableUser(
  userId: string
): Promise<DisableUserResponse> {
  const callable = httpsCallable<{ userId: string }, DisableUserResponse>(
    firebaseFunctions,
    'enableUser'
  );
  const result = await callable({ userId });
  return result.data;
}

/**
 * List users with filters
 */
export async function listUsers(
  filters: ListUsersFilters = {}
): Promise<ListUsersResponse> {
  const callable = httpsCallable<ListUsersFilters, ListUsersResponse>(
    firebaseFunctions,
    'listUsers'
  );
  const result = await callable(filters);
  return result.data;
}

/**
 * Get single user by ID
 */
export async function getUser(
  userId: string
): Promise<FunctionResponse<unknown>> {
  const callable = httpsCallable<{ userId: string }, FunctionResponse<unknown>>(
    firebaseFunctions,
    'getUser'
  );
  const result = await callable({ userId });
  return result.data;
}
