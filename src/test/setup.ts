import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  connectAuthEmulator: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn((_, callback) => {
    callback(null);
    return vi.fn();
  }),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  connectStorageEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  connectFunctionsEmulator: vi.fn(),
}));

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    DEV: false,
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: '1:123:web:abc',
    VITE_FIREBASE_MEASUREMENT_ID: 'G-TEST',
    VITE_USE_FIREBASE_EMULATORS: 'false',
  },
});
