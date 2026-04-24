'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  role: 'citizen' | 'admin' | 'officer' | 'panchayat_secretary' | 'collector';
  village?: string;
  villageCode?: string;
  mandal?: string;
  department?: string;
  district?: string;
  avatar?: string;
  language?: string;
  notificationsEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (mobile: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('sgpims_token');
    const storedUser = localStorage.getItem('sgpims_user');
    
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // If we have both token and user, we can stop loading immediately
          // and let the background check update the user data later.
          setLoading(false);
        } catch (e) {
          console.error('Failed to parse stored user');
        }
      }
      
      api.getMe()
        .then(res => {
          setUser(res.user);
          localStorage.setItem('sgpims_user', JSON.stringify(res.user));
        })
        .catch((err) => { 
          console.error('Auth check failed:', err);
          // Only logout if the error is 401 (Unauthorized) or 403 (Forbidden)
          if (err.status === 401 || err.status === 403) {
            localStorage.removeItem('sgpims_token');
            localStorage.removeItem('sgpims_user');
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          // Ensure loading is false even if no storedUser was found
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (mobile: string, password: string): Promise<User> => {
    const res = await api.login({ mobile, password });
    localStorage.setItem('sgpims_token', res.token);
    localStorage.setItem('sgpims_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data: any): Promise<User> => {
    const res = await api.register(data);
    localStorage.setItem('sgpims_token', res.token);
    localStorage.setItem('sgpims_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      if (token) await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('sgpims_token');
      localStorage.removeItem('sgpims_user');
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (data: any) => {
    setUser(prev => {
      const newUser = prev ? { ...prev, ...data } : null;
      if (newUser) {
        localStorage.setItem('sgpims_user', JSON.stringify(newUser));
      }
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
