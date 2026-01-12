/**
 * Cloud Functions for Zakat Management System
 *
 * This module exports all Cloud Functions for the application:
 * - Auth triggers: onUserCreate, onUserDelete
 * - Callable functions: setUserRole, getUserClaims
 * - User management: createAdminUser, disableUser, enableUser, listUsers, getUser
 * - Admin: bootstrapSuperAdmin (one-time setup)
 */

// Auth functions
export { setUserRole, getUserClaims, onUserCreate, onUserDelete } from "./auth";

// User management functions
export { createAdminUser, disableUser, enableUser, listUsers, getUser } from "./users";

// Admin bootstrap function
export { bootstrapSuperAdmin } from "./admin";
