import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  resendVerificationEmail,
  getUserProfile,
  toAuthUser,
  subscribeToAuthState,
  getCurrentUser,
} from './auth';
import { firebaseAuth } from './firebase';

// Mock Firebase modules
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('./firebase', () => ({
  firebaseAuth: {
    currentUser: null,
  },
  firebaseDb: {},
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should create user and set up profile', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
      };
      const mockCredential = { user: mockUser };

      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(
        mockCredential as never
      );
      vi.mocked(updateProfile).mockResolvedValue(undefined);
      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(sendEmailVerification).mockResolvedValue(undefined);
      vi.mocked(doc).mockReturnValue({} as never);

      const input = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
        },
      };

      const result = await registerUser(input);

      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'John Doe',
      });
      expect(setDoc).toHaveBeenCalled();
      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockCredential);
    });
  });

  describe('loginUser', () => {
    it('should sign in user and update last login', async () => {
      const mockUser = { uid: 'test-uid' };
      const mockCredential = { user: mockUser };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue(
        mockCredential as never
      );
      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(doc).mockReturnValue({} as never);

      const result = await loginUser('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled();
      expect(result).toEqual(mockCredential);
    });
  });

  describe('logoutUser', () => {
    it('should sign out user', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined);

      await logoutUser();

      expect(signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);

      await resetPassword('test@example.com');

      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('resendVerificationEmail', () => {
    it('should send verification email when user exists', async () => {
      const mockUser = { email: 'test@example.com' };
      Object.defineProperty(firebaseAuth, 'currentUser', {
        value: mockUser,
        writable: true,
      });

      vi.mocked(sendEmailVerification).mockResolvedValue(undefined);

      await resendVerificationEmail();

      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
    });

    it('should not send verification email when no user', async () => {
      Object.defineProperty(firebaseAuth, 'currentUser', {
        value: null,
        writable: true,
      });

      await resendVerificationEmail();

      expect(sendEmailVerification).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile when document exists', async () => {
      const mockData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      vi.mocked(doc).mockReturnValue({} as never);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        id: 'test-uid',
        data: () => mockData,
      } as never);

      const result = await getUserProfile('test-uid');

      expect(result).toEqual({ id: 'test-uid', ...mockData });
    });

    it('should return null when document does not exist', async () => {
      vi.mocked(doc).mockReturnValue({} as never);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as never);

      const result = await getUserProfile('test-uid');

      expect(result).toBeNull();
    });
  });

  describe('toAuthUser', () => {
    it('should convert Firebase user to AuthUser', () => {
      const firebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'John Doe',
        photoURL: 'https://example.com/photo.jpg',
      };

      const result = toAuthUser(firebaseUser as never);

      expect(result).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'John Doe',
        photoURL: 'https://example.com/photo.jpg',
      });
    });

    it('should handle null values', () => {
      const firebaseUser = {
        uid: 'test-uid',
        email: null,
        emailVerified: false,
        displayName: null,
        photoURL: null,
      };

      const result = toAuthUser(firebaseUser as never);

      expect(result).toEqual({
        uid: 'test-uid',
        email: null,
        emailVerified: false,
        displayName: null,
        photoURL: null,
      });
    });
  });

  describe('subscribeToAuthState', () => {
    it('should set up auth state listener', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();

      vi.mocked(onAuthStateChanged).mockReturnValue(unsubscribe);

      const result = subscribeToAuthState(callback);

      expect(onAuthStateChanged).toHaveBeenCalled();
      expect(typeof result).toBe('function');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when logged in', () => {
      const mockUser = { uid: 'test-uid' };
      Object.defineProperty(firebaseAuth, 'currentUser', {
        value: mockUser,
        writable: true,
      });

      const result = getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when not logged in', () => {
      Object.defineProperty(firebaseAuth, 'currentUser', {
        value: null,
        writable: true,
      });

      const result = getCurrentUser();

      expect(result).toBeNull();
    });
  });
});
