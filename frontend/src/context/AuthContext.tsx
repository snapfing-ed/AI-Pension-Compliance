import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionUser, UserRole } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  currentUser: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  bootstrapAdmin: (
    name: string,
    email: string,
    password: string,
    bootstrapKey: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DB and validate active session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await AuthService.init();
        const activeUser = await AuthService.getActiveSessionUser();
        setCurrentUser(activeUser);
      } catch (err) {
        console.error('Failed to initialize authentication repository:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    try {
      const result = await AuthService.login(email, password, rememberMe);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error || 'Authentication failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred during sign-in.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string) => {
    setIsLoading(true);
    try {
      const result = await AuthService.register(name, email, password, confirmPassword);
      if (result.success && result.user) {
        // Automatically sign in the freshly registered compliance monitor
        await AuthService.login(email, password, false);
        setCurrentUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error || 'Registration failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred during registration.' };
    } finally {
      setIsLoading(false);
    }
  };

  const bootstrapAdmin = async (name: string, email: string, password: string, bootstrapKey: string) => {
    setIsLoading(true);
    try {
      const result = await AuthService.bootstrapAdministrator(name, email, password, bootstrapKey);
      if (result.success && result.user) {
        await AuthService.login(email, password, false);
        setCurrentUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error || 'Administrator bootstrap failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Bootstrap exception occurred.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    const active = await AuthService.getActiveSessionUser();
    setCurrentUser(active);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        register,
        bootstrapAdmin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
