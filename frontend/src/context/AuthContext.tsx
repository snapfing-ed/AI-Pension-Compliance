import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { SessionUser } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  currentUser: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;

  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the authenticated user from the backend session.
  useEffect(() => {
    let mounted = true;

    const initialiseAuthentication = async () => {
      try {
        const user = await AuthService.getCurrentUser();

        if (mounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Authentication initialisation failed:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialiseAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);

    try {
      const result = await AuthService.login(identifier, password);

      if (result.success && result.user) {
        setCurrentUser(result.user);
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Authentication failed.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);

    try {
      await AuthService.logout();
    } finally {
      setCurrentUser(null);
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    const user = await AuthService.getCurrentUser();
    setCurrentUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        isLoading,
        login,
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