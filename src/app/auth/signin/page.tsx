"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { ShieldCheck, AlertCircle } from 'lucide-react';

function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'auth/invalid-email':        return 'Invalid email address.';
    case 'auth/user-not-found':       return 'No account found with this email.';
    case 'auth/wrong-password':       return 'Incorrect password.';
    case 'auth/invalid-credential':   return 'Invalid email or password.';
    case 'auth/too-many-requests':    return 'Too many attempts. Please try again later.';
    case 'auth/profile-load-failed':  return 'Credentials verified, but your profile could not be loaded. Firestore security rules may need updating — check the console.';
    default:                          return `Sign in failed (${code ?? 'unknown'}). Please try again.`;
  }
}

export default function SigninPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('');
  const [consultantEmail, setConsultantEmail] = useState('');
  const [consultantPassword, setConsultantPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignin = async (role: 'citizen' | 'consultant') => {
    const email = role === 'consultant' ? consultantEmail : citizenEmail;
    const password = role === 'consultant' ? consultantPassword : citizenPassword;

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profile = await signIn(email.trim(), password);

      if (role === 'consultant' && profile.role !== 'consultant') {
        setError('This account does not have consultant access.');
        setIsLoading(false);
        return;
      }

      router.push(profile.role === 'consultant' ? '/consultant' : '/queue/my-tickets');
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
              <h1 className="text-4xl font-headline font-extrabold">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to manage your time.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Tabs defaultValue="citizen" className="w-full" onValueChange={() => setError(null)}>
              <TabsList className="grid w-full grid-cols-2 rounded-full h-12 p-1">
                <TabsTrigger value="citizen" className="rounded-full">Citizen</TabsTrigger>
                <TabsTrigger value="consultant" className="rounded-full">Consultant</TabsTrigger>
              </TabsList>

              <TabsContent value="citizen" className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-c">Email</Label>
                    <Input
                      id="email-c"
                      type="email"
                      placeholder="nomsa@example.com"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignin('citizen')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-c">Password</Label>
                    <Input
                      id="pass-c"
                      type="password"
                      placeholder="••••••••"
                      value={citizenPassword}
                      onChange={(e) => setCitizenPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignin('citizen')}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handleSignin('citizen')}
                  className="w-full h-12 rounded-full font-bold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In…' : 'Sign In as Citizen'}
                </Button>
              </TabsContent>

              <TabsContent value="consultant" className="pt-6 space-y-6">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start space-x-3">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">Official Government Portal. Authorised staff only. Unauthorised access is prohibited.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-s">Staff Email</Label>
                    <Input
                      id="email-s"
                      type="email"
                      placeholder="s.nkosi@homeaffairs.gov.za"
                      value={consultantEmail}
                      onChange={(e) => setConsultantEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignin('consultant')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-s">System PIN</Label>
                    <Input
                      id="pass-s"
                      type="password"
                      placeholder="••••••••"
                      value={consultantPassword}
                      onChange={(e) => setConsultantPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignin('consultant')}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handleSignin('consultant')}
                  className="w-full h-12 rounded-full font-bold bg-primary text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? 'Authenticating…' : 'Sign In to Counter'}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/auth/signup')}>
                Sign Up
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
