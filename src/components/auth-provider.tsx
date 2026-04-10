"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const DEPARTMENTS = [
  'Home Affairs',
  'SASSA',
  'DLTC',
  'Department of Labour',
  'Department of Health',
];

export type UserRole = 'citizen' | 'consultant' | 'admin';

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  department?: string;
  phone?: string;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadOrCreateUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as {
      displayName?: string;
      role: UserRole;
      department?: string;
      phone?: string;
    };

    let { department } = data;

    // First login for a consultant with no department assigned yet
    if (data.role === 'consultant' && !department) {
      department = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
      await updateDoc(userRef, { department, lastLoginAt: serverTimestamp() });
    } else {
      // Fire-and-forget lastLoginAt update — don't block on it
      updateDoc(userRef, { lastLoginAt: serverTimestamp() }).catch(() => {});
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: data.displayName ?? firebaseUser.displayName,
      role: data.role,
      department,
      phone: data.phone,
    };
  }

  // No Firestore doc — auto-create a minimal citizen profile
  const displayName = firebaseUser.displayName ?? firebaseUser.email ?? 'User';
  await setDoc(userRef, {
    displayName,
    email: firebaseUser.email,
    role: 'citizen' as UserRole,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName,
    role: 'citizen',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await loadOrCreateUserProfile(firebaseUser);
        setUser(profile);
      } catch (err) {
        console.error('[AuthProvider] Failed to load user profile:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<UserProfile> => {
    const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);
    const profile = await loadOrCreateUserProfile(fbUser);
    setUser(profile);
    return profile;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
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
