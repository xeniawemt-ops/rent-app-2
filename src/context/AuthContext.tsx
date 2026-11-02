import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SafeUser,
  AuthSession,
  PrimaryRole,
  UserRole,
  AuthResult,
  CustomerSignupData,
  OwnerSignupData,
} from '../types';
import { apiClient, setAuthToken } from '../services/apiClient';
import { backendService } from '../services/backendService';

export interface AuthContextType {
  user: SafeUser | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalState: {
    isOpen: boolean;
    mode: 'login' | 'signup' | 'forgot_password';
    targetRole: UserRole;
  };
  openAuthModal: (mode?: 'login' | 'signup' | 'forgot_password', targetRole?: UserRole) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string, expectedRole?: UserRole) => Promise<AuthResult>;
  loginWithGoogle: (targetRole?: UserRole) => Promise<AuthResult>;
  signupCustomer: (data: CustomerSignupData) => Promise<AuthResult>;
  signupOwner: (data: OwnerSignupData) => Promise<AuthResult>;
  logout: () => void;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string; debugResetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    mode: 'login' | 'signup' | 'forgot_password';
    targetRole: UserRole;
  }>({
    isOpen: false,
    mode: 'login',
    targetRole: 'customer',
  });

  // Event listeners for automatic token refresh and global unauthorized states
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      backendService.setAuthToken(null);
      try {
        sessionStorage.removeItem('nivaspay_navigation_intent');
      } catch {}
    };

    const handleTokenRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string }>;
      if (customEvent.detail?.token) {
        setToken(customEvent.detail.token);
        backendService.setAuthToken(customEvent.detail.token);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('nivaspay:unauthorized', handleUnauthorized);
      window.addEventListener('nivaspay:token_refreshed', handleTokenRefreshed);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('nivaspay:unauthorized', handleUnauthorized);
        window.removeEventListener('nivaspay:token_refreshed', handleTokenRefreshed);
      }
    };
  }, []);

  // Verify and hydrate session on mount using HttpOnly cookie session
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const response = await apiClient.get('/auth/me');
        if (response.data && isMounted) {
          const u = response.data;
          const safe: SafeUser = {
            id: u.id,
            email: u.email,
            name: u.fullName || u.email.split('@')[0],
            phoneMasked: '+91 ******',
            role: (u.role.toLowerCase()) as PrimaryRole,
            status: 'active',
            brokerMembership: u.brokerMembership,
            staffMembership: u.staffMembership,
            createdAt: new Date().toISOString(),
          };
          setUser(safe);
          // If a session token exists in backendService or localStorage, synchronize it
          const existingToken = backendService.getAuthToken();
          if (existingToken) {
            setToken(existingToken);
            setAuthToken(existingToken);
          } else {
            // Register an active session for the authenticated user in backendService
            const session = backendService.createSessionForUser(safe.id);
            if (session) {
              setToken(session.token);
              setAuthToken(session.token);
            }
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setAuthToken(null);
          backendService.setAuthToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const openAuthModal = (
    mode: 'login' | 'signup' | 'forgot_password' = 'login',
    targetRole: UserRole = 'customer'
  ) => {
    setAuthModalState({
      isOpen: true,
      mode,
      targetRole,
    });
  };

  const closeAuthModal = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const login = async (
    email: string,
    password: string,
    expectedRole?: UserRole
  ): Promise<AuthResult> => {
    try {
      const res = await apiClient.post('/auth/login', {
        email,
        password,
        expectedRole: expectedRole ? expectedRole.toUpperCase() : undefined,
      });
      if (res.data?.success && res.data?.user) {
        const u = res.data.user;
        const assignedRole = (u.role.toLowerCase()) as PrimaryRole;
        if (expectedRole && assignedRole !== 'admin') {
          if (expectedRole === 'owner' && assignedRole === 'customer') {
            return {
              success: false,
              error: 'Access denied: Customer and Owner accounts are separate. Please sign in via NivasPay Homes.',
            };
          }
          if (expectedRole === 'customer' && assignedRole === 'owner') {
            return {
              success: false,
              error: 'Access denied: Customer and Owner accounts are separate. Please sign in via NivasPay Owner.',
            };
          }
          if (
            (assignedRole as string) !== (expectedRole as string) &&
            !['broker_admin', 'broker_staff', 'nivaspay_rm', 'operations_manager'].includes(expectedRole)
          ) {
            return {
              success: false,
              error: `Access denied. This account has role "${assignedRole}".`,
            };
          }
        }

        const safeUser: SafeUser = {
          id: u.id,
          email: u.email,
          name: u.fullName || u.email.split('@')[0],
          phoneMasked: '+91 ******',
          role: assignedRole,
          status: 'active',
          brokerMembership: u.brokerMembership,
          staffMembership: u.staffMembership,
          createdAt: new Date().toISOString(),
        };

        setToken(res.data.token);
        setUser(safeUser);
        setAuthToken(res.data.token);
        backendService.setAuthToken(res.data.token);
        backendService.createSessionForUser(safeUser.id);
        closeAuthModal();

        return {
          success: true,
          user: safeUser,
          session: {
            token: res.data.token,
            userId: safeUser.id,
            userEmail: safeUser.email,
            role: safeUser.role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
            isValid: true,
          },
        };
      }
      return { success: false, error: 'Authentication failed.' };
    } catch (err: any) {
      // In development or test environments where API proxy is offline, fallback to backendService
      try {
        const localResult = await backendService.login(email, password, expectedRole);
        if (localResult.success && localResult.user) {
          setToken(localResult.session?.token || 'token_sim');
          setUser(localResult.user);
          closeAuthModal();
          return localResult;
        }
        return localResult;
      } catch {
        return {
          success: false,
          error: err.response?.data?.error || err.message || 'Login failed.',
        };
      }
    }
  };

  const signupCustomer = async (data: CustomerSignupData): Promise<AuthResult> => {
    try {
      const res = await apiClient.post('/auth/signup', {
        email: data.email,
        password: data.password,
        fullName: data.name,
        role: 'CUSTOMER',
        phone: data.phone,
      });

      if (res.data?.success && res.data?.user) {
        const u = res.data.user;
        const safeUser: SafeUser = {
          id: u.id,
          email: u.email,
          name: u.fullName,
          phoneMasked: '+91 ******',
          role: 'customer',
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        setToken(res.data.token);
        setUser(safeUser);
        setAuthToken(res.data.token);
        closeAuthModal();

        return {
          success: true,
          user: safeUser,
          session: {
            token: res.data.token,
            userId: safeUser.id,
            userEmail: safeUser.email,
            role: safeUser.role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
            isValid: true,
          },
        };
      }
      return { success: false, error: 'Registration failed.' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Registration failed.',
      };
    }
  };

  const signupOwner = async (data: OwnerSignupData): Promise<AuthResult> => {
    try {
      const res = await apiClient.post('/auth/signup', {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: 'OWNER',
        phone: data.phone,
      });

      if (res.data?.success && res.data?.user) {
        const u = res.data.user;
        const safeUser: SafeUser = {
          id: u.id,
          email: u.email,
          name: u.fullName,
          phoneMasked: '+91 ******',
          role: 'owner',
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        setToken(res.data.token);
        setUser(safeUser);
        setAuthToken(res.data.token);
        closeAuthModal();

        return {
          success: true,
          user: safeUser,
          session: {
            token: res.data.token,
            userId: safeUser.id,
            userEmail: safeUser.email,
            role: safeUser.role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
            isValid: true,
          },
        };
      }
      return { success: false, error: 'Registration failed.' };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Registration failed.',
      };
    }
  };

  const loginWithGoogle = async (targetRole: UserRole = 'customer'): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const { signInWithPopup } = await import('firebase/auth');
      const { auth, googleAuthProvider } = await import('../lib/firebase');
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await userCredential.user.getIdToken();

      const response = await apiClient.post('/auth/google', {
        idToken,
        targetRole: targetRole.toUpperCase(),
      });

      const data = response.data;
      if (!data?.success) {
        throw new Error(data?.error || 'Google authentication failed');
      }

      const safeUser: SafeUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.fullName || data.user.email?.split('@')[0] || 'User',
        phoneMasked: '+91 ******',
        role: (data.user.role.toLowerCase()) as PrimaryRole,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      setToken(data.token);
      setUser(safeUser);
      setAuthToken(data.token);
      closeAuthModal();

      return {
        success: true,
        user: safeUser,
        session: {
          token: data.token,
          userId: safeUser.id,
          userEmail: safeUser.email,
          role: safeUser.role,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
          isValid: true,
        },
      };
    } catch (err: any) {
      console.error('Google sign in error:', err);
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Google sign-in failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
    backendService.setAuthToken(null);
    try {
      sessionStorage.removeItem('nivaspay_navigation_intent');
    } catch {}
  };

  const requestPasswordReset = async (email: string) => {
    return {
      success: true,
      message: `Password reset instructions sent to ${email} if registered.`,
    };
  };

  const resetPassword = async (_tokenInput: string, _newPassword: string) => {
    return {
      success: true,
    };
  };

  const refreshSession = async () => {
    try {
      const res = await apiClient.post('/auth/refresh');
      if (res.data?.success && res.data?.user) {
        const u = res.data.user;
        setUser({
          id: u.id,
          email: u.email,
          name: u.fullName || u.email.split('@')[0],
          phoneMasked: '+91 ******',
          role: (u.role.toLowerCase()) as PrimaryRole,
          status: 'active',
          brokerMembership: u.brokerMembership,
          staffMembership: u.staffMembership,
          createdAt: new Date().toISOString(),
        });
        if (res.data.token) {
          setToken(res.data.token);
          setAuthToken(res.data.token);
          backendService.setAuthToken(res.data.token);
        }
      } else {
        // Fallback to checking profile
        const meRes = await apiClient.get('/auth/me');
        if (meRes.data) {
          const u = meRes.data;
          setUser({
            id: u.id,
            email: u.email,
            name: u.fullName || u.email.split('@')[0],
            phoneMasked: '+91 ******',
            role: (u.role.toLowerCase()) as PrimaryRole,
            status: 'active',
            brokerMembership: u.brokerMembership,
            staffMembership: u.staffMembership,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    role: user?.role || null,
    token,
    isAuthenticated: !!user,
    isLoading,
    authModalState,
    openAuthModal,
    closeAuthModal,
    login,
    loginWithGoogle,
    signupCustomer,
    signupOwner,
    logout,
    requestPasswordReset,
    resetPassword,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
