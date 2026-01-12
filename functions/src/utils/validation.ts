import { UserRole } from "../types";

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (US format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?1?\d{10,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ""));
}

/**
 * Validate user role
 */
export function isValidRole(role: string): role is UserRole {
  return ["applicant", "zakat_admin", "super_admin"].includes(role);
}

/**
 * Check if caller has sufficient role to perform action
 */
export function hasPermission(
  callerRole: UserRole | undefined,
  requiredRole: UserRole
): boolean {
  if (!callerRole) return false;

  const hierarchy: Record<UserRole, number> = {
    applicant: 1,
    zakat_admin: 2,
    super_admin: 3,
  };

  return hierarchy[callerRole] >= hierarchy[requiredRole];
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}
