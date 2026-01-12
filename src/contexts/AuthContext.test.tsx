import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { AuthProvider, useAuth } from './AuthContext';
import * as authService from '@/services/auth';

// Mock auth service
vi.mock('@/services/auth', () => ({
  subscribeToAuthState: vi.fn(),
  getUserProfile: vi.fn(),
  toAuthUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
  resetPassword: vi.fn(),
  resendVerificationEmail: vi.fn(),
  getIdTokenResult: vi.fn(),
  refreshIdToken: vi.fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: no user logged in
    vi.mocked(authService.subscribeToAuthState).mockImplementation((callback) => {
      callback(null);
      return vi.fn();
    });
  });

  describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context value', async () => {
      vi.mocked(authService.subscribeToAuthState).mockImplementation((callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('profile');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('sendPasswordReset');
      expect(result.current).toHaveProperty('resendVerification');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('isEmailVerified');
      expect(result.current).toHaveProperty('userRole');
      expect(result.current).toHaveProperty('clearError');
    });

    it('should have correct initial state when no user', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isEmailVerified).toBe(false);
      expect(result.current.userRole).toBeNull();
    });

    it('should update state when user logs in', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        emailVerified: true,
      };

      const mockAuthUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: null,
      };

      const mockProfile = {
        id: 'test-uid',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'applicant' as const,
      };

      vi.mocked(authService.subscribeToAuthState).mockImplementation((callback) => {
        setTimeout(() => callback(mockFirebaseUser as never), 0);
        return vi.fn();
      });

      vi.mocked(authService.toAuthUser).mockReturnValue(mockAuthUser);
      vi.mocked(authService.getUserProfile).mockResolvedValue(mockProfile as never);
      vi.mocked(authService.getIdTokenResult).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockAuthUser);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isEmailVerified).toBe(true);
      expect(result.current.userRole).toBe('applicant');
    });
  });

  describe('login', () => {
    it('should call loginUser service', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({} as never);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(authService.loginUser).toHaveBeenCalledWith(
        'test@example.com',
        'password'
      );
    });

    it('should throw error on login failure', async () => {
      vi.mocked(authService.loginUser).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Expect the login to throw the error
      await expect(
        result.current.login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should call registerUser service', async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({} as never);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

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

      await act(async () => {
        await result.current.register(input);
      });

      expect(authService.registerUser).toHaveBeenCalledWith(input);
    });
  });

  describe('logout', () => {
    it('should call logoutUser service', async () => {
      vi.mocked(authService.logoutUser).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logoutUser).toHaveBeenCalled();
    });
  });

  describe('sendPasswordReset', () => {
    it('should call resetPassword service', async () => {
      vi.mocked(authService.resetPassword).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.sendPasswordReset('test@example.com');
      });

      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('resendVerification', () => {
    it('should call resendVerificationEmail service', async () => {
      vi.mocked(authService.resendVerificationEmail).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.resendVerification();
      });

      expect(authService.resendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should be a function that can be called', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify clearError is a function and can be called
      expect(typeof result.current.clearError).toBe('function');

      // Call clearError - it should not throw
      act(() => {
        result.current.clearError();
      });

      // Error should be null (it starts as null)
      expect(result.current.error).toBeNull();
    });
  });
});
