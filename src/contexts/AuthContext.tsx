import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User, AuthUser, UserRole } from '@/types';
import {
  subscribeToAuthState,
  getUserProfile,
  toAuthUser,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  resendVerificationEmail,
  getIdTokenResult,
  refreshIdToken,
} from '@/services/auth';
import type { CreateUserInput } from '@/types';

/**
 * Custom claims structure from Firebase Auth
 */
export interface CustomClaims {
  role?: UserRole;
  masjidId?: string;
}

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
  refreshClaims: () => Promise<void>;

  // Helpers
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  userRole: UserRole | null;
  userMasjidId: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [claims, setClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load claims from token
  const loadClaims = useCallback(async (): Promise<CustomClaims | null> => {
    const tokenResult = await getIdTokenResult();
    console.log('[Auth] Token result claims:', tokenResult?.claims);
    if (tokenResult?.claims) {
      const newClaims: CustomClaims = {
        role: tokenResult.claims.role as UserRole | undefined,
        masjidId: tokenResult.claims.masjidId as string | undefined,
      };
      console.log('[Auth] Parsed claims:', newClaims);
      setClaims(newClaims);
      return newClaims;
    }
    console.log('[Auth] No claims found in token');
    return null;
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser: FirebaseUser | null) => {
      console.log('[Auth] Auth state changed, user:', firebaseUser?.uid ?? 'null');
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(toAuthUser(firebaseUser));

          // Fetch user profile
          const userProfile = await getUserProfile(firebaseUser.uid);
          console.log('[Auth] User profile from Firestore:', userProfile);
          console.log('[Auth] Profile role:', userProfile?.role);
          setProfile(userProfile);

          // Get custom claims for role
          const loadedClaims = await loadClaims();
          console.log('[Auth] Final role determination:');
          console.log('[Auth]   - Claims role:', loadedClaims?.role);
          console.log('[Auth]   - Profile role:', userProfile?.role);
          console.log('[Auth]   - Effective role:', loadedClaims?.role ?? userProfile?.role ?? 'null');

          if (loadedClaims?.role && userProfile) {
            // Update profile with role from claims if different
            if (loadedClaims.role !== userProfile.role) {
              console.log('[Auth] Updating profile role from claims:', loadedClaims.role);
              setProfile({ ...userProfile, role: loadedClaims.role });
            }
          }
        } else {
          console.log('[Auth] No user, clearing state');
          setUser(null);
          setProfile(null);
          setClaims(null);
        }
      } catch (err) {
        console.error('[Auth] Error in auth state change:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadClaims]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginUser(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (input: CreateUserInput) => {
    setError(null);
    setLoading(true);
    try {
      await registerUser(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await logoutUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await resetPassword(email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(message);
      throw err;
    }
  }, []);

  const resendVerification = useCallback(async () => {
    setError(null);
    try {
      await resendVerificationEmail();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh claims (call after role changes)
  const refreshClaims = useCallback(async () => {
    try {
      // Force refresh the token to get updated claims
      await refreshIdToken();
      const newClaims = await loadClaims();

      // Update profile if role changed
      if (newClaims?.role && profile && newClaims.role !== profile.role) {
        // Refetch profile to get updated data
        const userProfile = await getUserProfile(profile.id);
        if (userProfile) {
          setProfile({ ...userProfile, role: newClaims.role });
        }
      }
    } catch (err) {
      console.error('Error refreshing claims:', err);
      setError('Failed to refresh user claims');
    }
  }, [loadClaims, profile]);

  const value: AuthContextValue = {
    user,
    profile,
    claims,
    loading,
    error,
    login,
    register,
    logout,
    sendPasswordReset,
    resendVerification,
    refreshClaims,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified ?? false,
    userRole: claims?.role ?? profile?.role ?? null,
    userMasjidId: claims?.masjidId ?? null,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
