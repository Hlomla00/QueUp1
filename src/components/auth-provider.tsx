
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';

type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'citizen' | 'consultant' | 'admin';
  phone?: string;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  signIn: (role?: 'citizen' | 'consultant') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated auth check
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('queup_user') : null;
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (role: 'citizen' | 'consultant' = 'citizen') => {
    const mockUser: UserProfile = {
      uid: 'demo-user-123',
      email: role === 'consultant' ? 'staff@gov.za' : 'demo@user.co.za',
      displayName: role === 'consultant' ? 'Sipho Nkosi' : 'Nomsa Dlamini',
      role: role,
      phone: '+27 81 234 5678',
    };
    setUser(mockUser);
    localStorage.setItem('queup_user', JSON.stringify(mockUser));
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('queup_user');
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
