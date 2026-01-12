# Phase 1.2: Authentication Implementation

This document describes the authentication system implemented in Phase 1.2 of the Zakat Management Platform.

## Overview

Phase 1.2 implements a comprehensive authentication system with:
- Firebase Auth integration with custom claims
- Firestore security rules for data protection
- Cloud Functions for user management
- Role-based access control (RBAC)

## Architecture

### User Roles

The system supports three user roles with hierarchical permissions:

| Role | Description | Permissions |
|------|-------------|-------------|
| `applicant` | Zakat applicants | Can manage own profile, create/view own applications |
| `zakat_admin` | Masjid administrators | Can manage applicants and applications for their masjid |
| `super_admin` | System administrators | Full access to all resources across all masjids |

### Custom Claims

Firebase Auth custom claims are used to store role information securely:

```typescript
interface CustomClaims {
  role: 'applicant' | 'zakat_admin' | 'super_admin';
  masjidId?: string; // Only for zakat_admin
}
```

Claims are set via Cloud Functions and verified in:
- Firestore security rules
- Storage security rules
- Frontend route protection

## Cloud Functions

### Location
All Cloud Functions are located in `/functions/src/`.

### Available Functions

#### Auth Functions (`/functions/src/auth/`)

| Function | Trigger | Description |
|----------|---------|-------------|
| `onUserCreate` | Auth onCreate | Sets default claims for new users |
| `onUserDelete` | Auth onDelete | Soft deletes user document |
| `setUserRole` | Callable | Changes user role (admin only) |
| `getUserClaims` | Callable | Retrieves user custom claims |

#### User Management (`/functions/src/users/`)

| Function | Description | Access |
|----------|-------------|--------|
| `createAdminUser` | Creates admin/super_admin users | super_admin only |
| `disableUser` | Disables a user account | Admins |
| `enableUser` | Re-enables a disabled account | Admins |
| `listUsers` | Lists users with filters | Admins |
| `getUser` | Gets single user details | Self or admins |

### Function Usage

```typescript
import {
  setUserRole,
  createAdminUser,
  disableUser
} from '@/services/functions';

// Set user role (super_admin only)
await setUserRole({
  userId: 'user-123',
  role: 'zakat_admin',
  masjidId: 'masjid-abc'
});

// Create admin user (super_admin only)
await createAdminUser({
  email: 'admin@masjid.org',
  password: 'securePassword123',
  firstName: 'Admin',
  lastName: 'User',
  phone: '1234567890',
  role: 'zakat_admin',
  masjidId: 'masjid-abc'
});

// Disable user
await disableUser({
  userId: 'user-123',
  reason: 'Violation of terms'
});
```

## Security Rules

### Firestore Rules (`firestore.rules`)

The security rules enforce:

1. **User Collection**
   - Users can read/update their own profile (limited fields)
   - Admins can read any profile
   - Super admins can modify any profile
   - Users cannot change their own role

2. **Masjid Collection**
   - Authenticated users can read (for registration)
   - Only super_admin can create/update/delete

3. **Applications Collection**
   - Applicants can read/update their own applications
   - Zakat admins can access applications for their masjid
   - Super admins have full access

4. **Flags Collection**
   - Only admins can read/create flags
   - Only super_admins can delete flags

5. **Notifications Collection**
   - Users can read/delete their own notifications
   - Users can mark notifications as read

### Storage Rules (`storage.rules`)

1. **Application Documents**
   - Users can upload documents to their applications
   - Admins can read any documents
   - Max file size: 10MB
   - Allowed types: PDF, images, Word documents

2. **Profile Images**
   - Users can manage their own profile images
   - Max file size: 10MB
   - Images only

3. **Masjid Assets**
   - Authenticated users can read
   - Only super_admin can upload

## Frontend Integration

### AuthContext Updates

The AuthContext now provides:

```typescript
interface AuthContextValue {
  // State
  user: AuthUser | null;
  profile: User | null;
  claims: CustomClaims | null;
  loading: boolean;
  error: string | null;

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  register: (input: CreateUserInput) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshClaims: () => Promise<void>; // NEW: Refresh after role changes

  // Helpers
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  userRole: UserRole | null;
  userMasjidId: string | null; // NEW: For zakat_admin
  clearError: () => void;
}
```

### Using Claims in Components

```tsx
import { useAuth } from '@/contexts/AuthContext';

function AdminPanel() {
  const { userRole, userMasjidId, refreshClaims } = useAuth();

  // Check admin access
  if (userRole !== 'super_admin' && userRole !== 'zakat_admin') {
    return <Navigate to="/applicant" />;
  }

  // Access masjid ID for zakat_admin
  if (userRole === 'zakat_admin') {
    console.log('Admin for masjid:', userMasjidId);
  }

  // Refresh claims after role update
  const handleRoleUpdate = async () => {
    await updateRole();
    await refreshClaims(); // Get updated claims
  };
}
```

### Protected Routes

Routes are protected using the `ProtectedRoute` component:

```tsx
<Route
  path="/admin/*"
  element={
    <ProtectedRoute allowedRoles={['zakat_admin', 'super_admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

## Testing

### Cloud Functions Tests

Run tests:
```bash
cd functions
npm test
```

Test files:
- `src/auth/setCustomClaims.test.ts`
- `src/users/management.test.ts`
- `src/utils/validation.test.ts`

### Security Rules Tests

Run with Firestore emulator:
```bash
npm run emulators
npm run test:rules
```

Test file:
- `tests/firestore.rules.test.ts`

## Development Setup

### Prerequisites

1. Install dependencies:
```bash
npm install
cd functions && npm install
```

2. Configure Firebase:
```bash
firebase login
firebase use zakat-a63f4
```

### Running Locally

1. Start emulators:
```bash
npm run emulators
```

2. In another terminal, start dev server:
```bash
npm run dev
```

3. Access emulator UI: http://localhost:4000

### Environment Variables

Ensure `.env.local` has:
```env
VITE_USE_FIREBASE_EMULATORS=true
```

## Deployment

### Deploy Functions

```bash
cd functions
npm run deploy
```

### Deploy Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

### Deploy Everything

```bash
firebase deploy
```

## Security Considerations

1. **Custom Claims**
   - Claims are set server-side only (via Cloud Functions)
   - Claims are verified in security rules
   - Frontend never trusts client-provided role data

2. **Input Validation**
   - All inputs are validated in Cloud Functions
   - Email and phone formats are verified
   - Role values are validated against allowed list

3. **Rate Limiting**
   - Firebase automatically handles some rate limiting
   - Additional limits can be configured in Cloud Functions

4. **Audit Trail**
   - User creation/deletion events are logged
   - Role changes are tracked with timestamps

## Next Steps (Phase 1.3)

- Implement basic data layer for applications
- Add Firestore operations for CRUD
- Create application submission workflow
- Build admin review interface

## Troubleshooting

### Claims Not Updating

If custom claims don't reflect immediately:
1. Call `refreshClaims()` in AuthContext
2. Sign out and sign back in
3. Check if Cloud Function executed successfully

### Permission Denied Errors

1. Verify user has correct role in Firebase Console
2. Check if custom claims are set correctly
3. Review security rules syntax
4. Test with emulator for detailed errors

### Function Deployment Failures

1. Check `functions/package.json` for correct Node version
2. Run `npm run lint` to check for errors
3. Verify Firebase project configuration
