import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fungsi untuk memuat data user dari token yang ada
  const loadUserFromToken = async (token: string) => {
    try {
      // Simpan token dulu agar bisa dipakai untuk request
      localStorage.setItem('token', token);
      
      // Ambil data user dari endpoint /me
      const response = await api.get('/auth/me');
      
      if (response && response.user) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Gagal memuat data user:', error);
      // Jika token tidak valid, hapus token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  };

  // Inisialisasi auth saat aplikasi pertama kali jalan
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        // Jika ada storedUser, tampilkan dulu (agar tidak kedip loading)
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch (e) {
            console.error("Gagal membaca data user lokal", e);
          }
        }

        // Verifikasi token ke server
        if (token) {
          try {
            const response = await api.get('/auth/me');
            if (response && response.user) {
              setUser(response.user);
              localStorage.setItem('user', JSON.stringify(response.user));
            }
          } catch (error: any) {
            console.warn("Verifikasi token gagal:", error);
            // Jika error 401, hapus token dan user
            if (error?.message?.includes('401') || error?.message?.toLowerCase().includes('unauthorized')) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error in initAuth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // FUNGSI LOGIN - DIPERBAIKI
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Panggil endpoint login
      const response = await api.post('/auth/login', { email, password });
      
      // Pastikan response mengandung token dan user
      if (!response.token) {
        throw new Error('Response tidak mengandung token');
      }
      
      if (!response.user) {
        throw new Error('Response tidak mengandung data user');
      }
      
      // Bersihkan token dari kutipan yang tidak perlu
      const cleanToken = response.token.replace(/['"]+/g, '');
      
      // Simpan token dan user ke localStorage
      localStorage.setItem('token', cleanToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update state
      setUser(response.user);
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login gagal. Periksa email dan password Anda.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
    // Redirect ke halaman login
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook untuk menggunakan auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};