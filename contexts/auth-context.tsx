'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { setAuthFailureHandler } from '@/lib/auth-interceptor';

interface User {
  id: string;
  registrationId: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  handleAuthFailure: () => Promise<void>;
  makeAuthenticatedRequest: (url: string, options?: RequestInit) => Promise<Response>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up the global auth failure handler
    setAuthFailureHandler(handleAuthFailure);

    // Check if user is logged in on app start and validate token
    const validateAndSetAuth = async () => {
      const savedToken = localStorage.getItem('auth-token');
      const savedUser = localStorage.getItem('auth-user');
      
      if (savedToken && savedUser) {
        try {
          // Validate token by making a test request
          const response = await fetch('/api/auth/validate', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${savedToken}`,
            },
          });

          if (response.ok) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          } else {
            // Token is invalid, clear auth data
            console.log('Token validation failed, clearing auth data');
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-user');
            // Redirect to login page
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }
        } catch (error) {
          // Network error or other issue, clear auth data
          console.log('Token validation error, clearing auth data:', error);
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-user');
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }
      }
      
      setLoading(false);
    };

    validateAndSetAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    
    setUser(data.user);
    setToken(data.token);
    
    localStorage.setItem('auth-token', data.token);
    localStorage.setItem('auth-user', JSON.stringify(data.user));
  };

  // Function to handle authentication failures and auto-logout
  const handleAuthFailure = async () => {
    console.log('Authentication failed, logging out...');
    await logout();
    // Optionally redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // Utility function to make authenticated requests with auto-logout on auth failure
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    // Check for authentication failures
    if (response.status === 401) {
      await handleAuthFailure();
      throw new Error('Authentication failed - session expired');
    }

    return response;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
  };

  const value = {
    user,
    token,
    login,
    logout,
    handleAuthFailure,
    makeAuthenticatedRequest,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}