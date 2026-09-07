import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../types';
import { apiService, setAuthToken } from '../services/api';

export interface DemoAccount {
  label: string;
  role: UserRole;
  email: string;
  password: string;
  name: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Super Administrator',
    role: UserRole.SUPER_ADMIN,
    email: 'admin@smartshule.ac.ke',
    password: 'Admin@123',
    name: 'Don Mutua',
    description: 'Full system control, academic configuration, finance and approvals',
  },
  {
    label: 'Science Teacher (Grade 7)',
    role: UserRole.TEACHER,
    email: 'sarah.mwangi@smartshule.ac.ke',
    password: 'Teacher@123',
    name: 'Sarah Mwangi',
    description: 'Formative & summative CBC rubrics, lesson plans, daily roll call',
  },
  {
    label: 'Finance Officer / Bursar',
    role: UserRole.ACCOUNTANT,
    email: 'finance@smartshule.ac.ke',
    password: 'Finance@123',
    name: 'Grace Njeri',
    description: 'Fee structures, invoices, M-Pesa STK collections, defaulter tracking',
  },
  {
    label: 'Parent / Guardian',
    role: UserRole.GUARDIAN,
    email: 'mary.kariuki@gmail.com',
    password: 'Guardian@123',
    name: 'Mary Kariuki',
    description: 'View child CBC report cards, attendance alerts, M-Pesa fee payments',
  },
];

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchDemoAccount: (account: DemoAccount) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
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

  const switchDemoAccount = async (account: DemoAccount): Promise<boolean> => {
    return login(account.email, account.password);
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
        switchDemoAccount,
        refreshProfile,
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
