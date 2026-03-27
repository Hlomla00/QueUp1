
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';

type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'citizen' | 'consultant' | 'admin';
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated auth check
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const signIn = async () => {
    setUser({
      uid: 'demo-user-123',
      email: 'demo@user.co.za',
      displayName: 'Nomsa Dlamini',
      role: 'citizen',
    });
  };

  const signOut = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
