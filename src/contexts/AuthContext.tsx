import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginAsGuest: () => void;
  logout: () => void;
  updateProfile: (name: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLoggedIn() {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        if (token === 'guest-token-session') {
          setUser(JSON.parse(savedUser));
        } else {
          try {
            const res = await apiRequest('/auth/me');
            if (res.user) {
              setUser(res.user);
              localStorage.setItem('user', JSON.stringify(res.user));
            } else {
              logout();
            }
          } catch (e) {
            // Token expired or invalid
            logout();
          }
        }
      }
      setLoading(false);
    }
    checkLoggedIn();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const loginAsGuest = () => {
    const guestUser: User = {
      id: 0,
      email: 'guest@unimus.ac.id',
      name: 'Pengunjung Umum (Guest)',
      role: 'GUEST'
    };
    localStorage.setItem('token', 'guest-token-session');
    localStorage.setItem('user', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (name: string, email: string): Promise<void> => {
    const token = localStorage.getItem('token');
    if (token === 'guest-token-session') {
      const updatedGuest = { ...user!, name, email };
      setUser(updatedGuest);
      localStorage.setItem('user', JSON.stringify(updatedGuest));
      return;
    }

    const res = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email })
    });

    if (res.user) {
      setUser(res.user);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsGuest, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
