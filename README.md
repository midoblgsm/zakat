# Zakat Management Platform

A multi-tenant Zakat management platform that enables multiple masajid (mosques) to collaborate on processing Zakat applications through a shared pool system.

## Features

- **Multi-Masjid Support**: Onboard and manage multiple masajid with individual branding
- **Shared Application Pool**: All Zakat applications are accessible to all participating masajid
- **Application Ownership**: Admins can "claim" applications, process them, or release back to pool
- **Complete Audit Trail**: Full history tracking of all application changes
- **Applicant Flagging**: Cross-masjid visibility of rejected/flagged applicants
- **Document Management**: Secure upload and verification of supporting documents

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Forms**: React Hook Form + Zod

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Firebase project

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your Firebase credentials to .env.local

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## Documentation

- [Architecture Overview](./ARCHITECTURE.md) - Complete system design and data models
- [Phase 1.1 Setup](./docs/PHASE-1.1-SETUP.md) - Project setup documentation

## Project Status

- [x] Phase 1.1: Project Setup
- [ ] Phase 1.2: Authentication
- [ ] Phase 1.3: Basic Data Layer
- [ ] Phase 1.4: Applicant Portal
- [ ] Phase 1.5: Admin Dashboard
- [ ] Phase 2: Multi-Masjid Support
- [ ] Phase 3: Document Management & History
- [ ] Phase 4: Flagging & Advanced Features
- [ ] Phase 5: Polish & Optimization

## License

Private - All rights reserved
