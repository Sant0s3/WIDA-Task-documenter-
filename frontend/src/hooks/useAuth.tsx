'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('wida_token');
    const savedUsername = localStorage.getItem('wida_username');
    if (savedToken && savedUsername) {
      setToken(savedToken);
      setUsername(savedUsername);
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUsername: string) => {
    localStorage.setItem('wida_token', newToken);
    localStorage.setItem('wida_username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
    router.push('/');
  };

  const logout = () => {
    localStorage.removeItem('wida_token');
    localStorage.removeItem('wida_username');
    setToken(null);
    setUsername(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
