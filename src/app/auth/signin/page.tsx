
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
import { User, ShieldCheck } from 'lucide-react';

export default function SigninPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async (role: 'citizen' | 'consultant') => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    await signIn(role);
    router.push(role === 'consultant' ? '/consultant' : '/queue/my-tickets');
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

            <Tabs defaultValue="citizen" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-full h-12 p-1">
                <TabsTrigger value="citizen" className="rounded-full">Citizen</TabsTrigger>
                <TabsTrigger value="consultant" className="rounded-full">Consultant</TabsTrigger>
              </TabsList>
              
              <TabsContent value="citizen" className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-c">Email / Phone</Label>
                    <Input id="email-c" placeholder="nomsa@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-c">Password</Label>
                    <Input id="pass-c" type="password" placeholder="••••••••" />
                  </div>
                </div>
                <Button onClick={() => handleSignin('citizen')} className="w-full h-12 rounded-full font-bold" disabled={isLoading}>
                  {isLoading ? "Signing In..." : "Sign In as Citizen"}
                </Button>
              </TabsContent>

              <TabsContent value="consultant" className="pt-6 space-y-6">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4 flex items-start space-x-3">
                   <ShieldCheck className="h-5 w-5 text-primary mt-1" />
                   <p className="text-xs text-muted-foreground">Official Government Portal. Unauthorized access is prohibited.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-s">Staff Email</Label>
                    <Input id="email-s" placeholder="s.nkosi@homeaffairs.gov.za" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass-s">System PIN</Label>
                    <Input id="pass-s" type="password" placeholder="••••••••" />
                  </div>
                </div>
                <Button onClick={() => handleSignin('consultant')} className="w-full h-12 rounded-full font-bold bg-primary text-primary-foreground" disabled={isLoading}>
                  {isLoading ? "Authenticating..." : "Sign In to Counter"}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account? <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/auth/signup')}>Sign Up</Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
