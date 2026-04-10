"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/invalid-email':        return 'Invalid email address.';
    case 'auth/weak-password':        return 'Password must be at least 6 characters.';
    default:                          return 'Sign up failed. Please try again.';
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await setDoc(doc(db, 'users', credential.user.uid), {
        displayName: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        idNumber: idNumber.trim(),
        role: 'citizen',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      router.push('/join?source=signup');
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 border-white/5 bg-card space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-headline font-extrabold">Join QueUp</h1>
              <p className="text-muted-foreground">Stop waiting, start living.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Nomsa Dlamini" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (for SMS/WhatsApp)</Label>
                  <Input id="phone" type="tel" placeholder="+27 81 234 5678" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input id="idNumber" placeholder="830112 5555 081" required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="nomsa@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="terms" required />
                <Label htmlFor="terms" className="text-xs text-muted-foreground leading-none">
                  I agree to receive queue notifications via SMS/WhatsApp.
                </Label>
              </div>

              <Button type="submit" className="w-full h-12 rounded-full font-bold text-lg" disabled={isLoading}>
                {isLoading ? 'Creating Account…' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/auth/signin')}>
                Sign In
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
