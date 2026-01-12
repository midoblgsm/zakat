# Phase 1.1: Project Setup - Documentation

This document describes the project setup completed in Phase 1.1 of the Zakat Management Platform.

## Overview

Phase 1.1 establishes the foundational infrastructure for the application, including:
- React 18 with TypeScript and Vite build system
- Firebase integration for authentication and database
- Tailwind CSS for styling
- ESLint and Prettier for code quality
- Complete folder structure following best practices
- Base UI components and layouts
- Authentication flow scaffolding

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.x | UI Framework |
| TypeScript | 5.6.x | Type Safety |
| Vite | 6.x | Build Tool |
| Firebase | 11.x | Backend Services |
| Tailwind CSS | 3.4.x | Styling |
| React Router | 7.x | Routing |
| React Hook Form | 7.x | Form Management |
| Zod | 3.x | Schema Validation |

## Project Structure

```
zakat/
├── public/                    # Static assets
├── src/
│   ├── components/
│   │   ├── auth/             # Authentication components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── common/           # Reusable UI components
│   │   │   ├── Alert.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── index.ts
│   │   └── layout/           # Layout components
│   │       ├── Header.tsx
│   │       ├── RootLayout.tsx
│   │       ├── Sidebar.tsx
│   │       └── index.ts
│   ├── contexts/
│   │   └── AuthContext.tsx   # Authentication state management
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── VerifyEmailPage.tsx
│   │   ├── applicant/
│   │   │   └── ApplicantDashboard.tsx
│   │   ├── admin/
│   │   │   └── AdminDashboard.tsx
│   │   ├── super-admin/
│   │   │   └── SuperAdminDashboard.tsx
│   │   ├── LandingPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── services/
│   │   ├── auth.ts           # Authentication service
│   │   └── firebase.ts       # Firebase configuration
│   ├── types/
│   │   ├── application.ts    # Zakat application types
│   │   ├── flag.ts           # Applicant flag types
│   │   ├── masjid.ts         # Masjid types
│   │   ├── notification.ts   # Notification types
│   │   ├── user.ts           # User types
│   │   └── index.ts
│   ├── utils/
│   │   ├── cn.ts             # Class name utility
│   │   ├── constants.ts      # Application constants
│   │   └── index.ts
│   ├── App.tsx               # Root component with routing
│   ├── index.css             # Global styles
│   ├── main.tsx              # Application entry point
│   └── vite-env.d.ts         # Vite type definitions
├── docs/                      # Documentation
├── .env.example              # Environment template
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm 9+
- A Firebase project (create at https://console.firebase.google.com)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd zakat
   npm install
   ```

2. **Configure Firebase**

   Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## Components Created

### Common Components

| Component | Description |
|-----------|-------------|
| `Button` | Primary button with variants (primary, secondary, danger, outline, ghost) and loading state |
| `Input` | Form input with label, error, and hint support |
| `Alert` | Alert box with variants (info, success, warning, error) |
| `Card` | Card container with header, content, and footer sections |
| `LoadingSpinner` | Animated loading indicator |

### Layout Components

| Component | Description |
|-----------|-------------|
| `RootLayout` | Main layout with sidebar and header |
| `Header` | Top navigation with user info and logout |
| `Sidebar` | Role-based navigation menu |

### Auth Components

| Component | Description |
|-----------|-------------|
| `ProtectedRoute` | Route wrapper for authentication and role-based access |

## TypeScript Types

All data models from the architecture document have been implemented as TypeScript interfaces:

- **User types**: `User`, `UserRole`, `AuthUser`, `CreateUserInput`
- **Masjid types**: `Masjid`, `ZakatConfig`, `MasjidStats`
- **Application types**: `ZakatApplication`, `ApplicationStatus`, `Demographics`, `FinancialInfo`, etc.
- **Notification types**: `Notification`, `NotificationType`
- **Flag types**: `ApplicantFlag`, `FlagSeverity`

## Authentication Flow

The application implements a complete authentication flow:

1. **Registration**: User creates account with email/password
2. **Email Verification**: Verification email sent on registration
3. **Login**: Email/password authentication
4. **Password Reset**: Self-service password recovery
5. **Protected Routes**: Role-based access control

### Auth Context

The `AuthContext` provides:
- Current user state
- User profile from Firestore
- Login/logout/register methods
- Password reset functionality
- Email verification resend
- Role-based access helpers

## Routing Structure

```
/                           → Landing page (public)
/login                      → Login page
/register                   → Registration page
/forgot-password            → Password reset
/verify-email               → Email verification

/applicant/*                → Applicant portal (protected)
  /applicant                → Dashboard
  /applicant/applications   → My applications (placeholder)
  /applicant/apply          → New application (placeholder)

/admin/*                    → Zakat Admin portal (protected)
  /admin                    → Dashboard
  /admin/pool               → Application pool (placeholder)
  /admin/my-applications    → My cases (placeholder)
  /admin/flags              → Flagged applicants (placeholder)
  /admin/masjid             → Masjid settings (placeholder)

/super-admin/*              → Super Admin portal (protected)
  /super-admin              → Dashboard
  /super-admin/masajid      → Masjid management (placeholder)
  /super-admin/users        → User management (placeholder)
  /super-admin/applications → All applications (placeholder)
  /super-admin/flags        → Flag management (placeholder)
```

## Firebase Configuration

### Required Firebase Services
1. **Authentication** - Enable Email/Password sign-in method
2. **Cloud Firestore** - Create database in production mode
3. **Cloud Storage** - For document uploads (later phases)

### Firebase Emulators (Optional)
To use Firebase emulators for local development:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize emulators:
   ```bash
   firebase init emulators
   ```

3. Set environment variable:
   ```env
   VITE_USE_FIREBASE_EMULATORS=true
   ```

4. Start emulators:
   ```bash
   firebase emulators:start
   ```

## Styling

### Tailwind Configuration

Custom colors are configured in `tailwind.config.js`:

- **Primary**: Green shades (Islamic theme)
- **Secondary**: Slate/gray shades

### CSS Classes

Custom utility classes defined in `index.css`:

- `.btn`, `.btn-primary`, `.btn-secondary`, etc. - Button styles
- `.card` - Card container
- `.form-label`, `.form-error`, `.form-hint` - Form styles

## Next Steps (Phase 1.2+)

1. **Phase 1.2: Authentication**
   - Implement actual Firebase Auth integration
   - Create Firestore security rules
   - Set up Cloud Functions for user management

2. **Phase 1.3: Basic Data Layer**
   - Initialize Firestore collections
   - Implement data services
   - Create initial Cloud Functions

3. **Phase 1.4: Applicant Portal**
   - Convert HTML form to React multi-step form
   - Implement form validation
   - Add draft auto-save functionality

4. **Phase 1.5: Admin Dashboard**
   - Application pool list view
   - Application detail view
   - Claim/release functionality

## Troubleshooting

### Common Issues

1. **Firebase connection errors**
   - Verify `.env.local` has correct credentials
   - Check Firebase console for service status

2. **Type errors**
   - Run `npm run type-check` to identify issues
   - Ensure all imports use correct paths (`@/` alias)

3. **Build warnings about chunk size**
   - Expected with Firebase SDK
   - Will be optimized with code splitting in later phases

## Contributing

1. Follow the existing code style (enforced by ESLint/Prettier)
2. Add types for all new code
3. Update documentation for significant changes
4. Test locally before committing
