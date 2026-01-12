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
} from '@/services/auth';
import type { CreateUserInput } from '@/types';

interface AuthContextValue {
  // State
  user: AuthUser | null;
  profile: User | null;
  loading: boolean;
  error: string | null;

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  register: (input: CreateUserInput) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;

  // Helpers
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  userRole: UserRole | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(toAuthUser(firebaseUser));

          // Fetch user profile
          const userProfile = await getUserProfile(firebaseUser.uid);
          setProfile(userProfile);

          // Get custom claims for role
          const tokenResult = await getIdTokenResult();
          if (tokenResult?.claims?.role && userProfile) {
            // Update profile with role from claims if different
            const claimRole = tokenResult.claims.role as UserRole;
            if (claimRole !== userProfile.role) {
              setProfile({ ...userProfile, role: claimRole });
            }
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    error,
    login,
    register,
    logout,
    sendPasswordReset,
    resendVerification,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified ?? false,
    userRole: profile?.role ?? null,
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
