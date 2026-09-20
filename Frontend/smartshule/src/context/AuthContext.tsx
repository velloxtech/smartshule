import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../types';
import { apiService, setAuthToken } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateUser: (updated: Partial<AuthUser>) => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('smartshule_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    try {
      const res = await apiService.getProfile();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch {
      // If token expired or invalid, clear auth
      setUser(null);
      setAuthToken(null);
      setToken(null);
    }
  };

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      const savedToken = localStorage.getItem('smartshule_token');
      if (savedToken) {
        setAuthToken(savedToken);
        setToken(savedToken);
        await refreshProfile();
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.login(email, password);
      if (res.success && res.data) {
        setUser(res.data.user);
        setToken(res.data.accessToken);
        setIsLoading(false);
        return true;
      }
      setError(res.message || 'Login failed');
      setIsLoading(false);
      return false;
    } catch (err: any) {
      setError(err.message || 'Network error during login');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshProfile,
        updateUser,
        error,
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
