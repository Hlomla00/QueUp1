
"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, CheckCircle2, Smartphone, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Bank = {
  name: string;
  color: string;
  textColor: string;
  logo: string;
};

const banks = [
  { name: 'FNB', color: 'bg-[#00A191]', textColor: 'text-white', logo: '/images/fnb.jpeg' },
  { name: 'Standard Bank', color: 'bg-[#0033A1]', textColor: 'text-white', logo: '/images/stbank.jpeg' },
  { name: 'Capitec', color: 'bg-[#E30613]', textColor: 'text-white', logo: '/images/capitec.jpeg' },
  { name: 'Absa', color: 'bg-[#FF0000]', textColor: 'text-white', logo: '/images/absa.jpeg' },
  { name: 'Nedbank', color: 'bg-[#006341]', textColor: 'text-white', logo: '/images/nedbank.png' },
] as const satisfies ReadonlyArray<Bank>;

export default function PaymentScreen() {
  const [step, setStep] = useState<'selection' | 'details' | 'processing' | 'success'>('selection');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [issueTime, setIssueTime] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [estWait] = useState('1h 45m');
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSignupFlow = searchParams.get('signup') === '1';
  const serviceId = searchParams.get('service') || 'id';
  const branchName = searchParams.get('branch') || 'Home Affairs Bellville';

  const serviceNames: Record<string, string> = {
    id: 'Smart ID Card',
    passport: 'Passport Services',
    birth: 'Birth Certificate',
  };

  const serviceDocs: Record<string, string[]> = {
    id: ['Birth Certificate', 'ID Photos', 'Proof of Residence'],
    passport: ['Old Passport', 'ID Document', 'Passport Photos'],
    birth: ['Proof of Birth', "Parents' Identity Documents", 'Clinic Card'],
  };

  useEffect(() => {
    if (!isSignupFlow) {
      router.replace('/auth/signup');
    }
  }, [isSignupFlow, router]);

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
    setStep('details');
  };

  const handlePayment = () => {
    setStep('processing');
    setTimeout(() => {
      setIssueDate(new Date().toLocaleDateString());
      setIssueTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setStep('success');
    }, 2500);
  };

  if (!isSignupFlow) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-headline font-extrabold">Secure Queue Booking</h1>
                <p className="text-muted-foreground">Select payment method to receive your <span className="text-primary font-bold">Digital Ticket</span> via WhatsApp/SMS — R65.00</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {banks.map(bank => (
                  <button
                    key={bank.name}
                    onClick={() => handleBankSelect(bank)}
                    className={`relative h-20 rounded-xl overflow-hidden transition-transform hover:scale-105 active:scale-95 ${bank.color} ${bank.textColor}`}
                  >
                    <Image
                      src={bank.logo}
                      alt={`${bank.name} logo`}
                      fill
                      sizes="(max-width: 768px) 50vw, 220px"
                      className="object-cover"
                    />
                    <span className="sr-only">{bank.name}</span>
                  </button>
                ))}
              </div>
              
              <div className="pt-4 flex items-center justify-center text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 mr-1" />
                PCI-DSS Compliant Secure Payment
              </div>
            </motion.div>
          )}

          {step === 'details' && selectedBank && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card className={`p-0 overflow-hidden border-none`}>
                <div className={`p-6 ${selectedBank.color} ${selectedBank.textColor} flex justify-between items-center`}>
                  <div className="flex items-center gap-3">
                    <Image
                      src={selectedBank.logo}
                      alt={`${selectedBank.name} logo`}
                      width={32}
                      height={32}
                      className="rounded-md bg-white/90 p-0.5 object-cover"
                    />
                    <h2 className="text-xl font-bold">{selectedBank.name} - Secure Gateway</h2>
                  </div>
                  <div className="text-sm font-bold opacity-80">R65.00</div>
                </div>
                <div className="p-8 bg-card space-y-6">
                  <div className="space-y-2">
                    <Label>Account Number / Cellphone Number</Label>
                    <Input className="h-12" placeholder="e.g. 1234567890" defaultValue="1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label>App PIN / Secret Code</Label>
                    <Input className="h-12" type="password" placeholder="••••" />
                  </div>
                  <Button 
                    onClick={handlePayment} 
                    className={`w-full h-14 text-lg font-bold rounded-full ${selectedBank.color} ${selectedBank.textColor}`}
                  >
                    Authorize Payment
                  </Button>
                  <Button variant="ghost" onClick={() => setStep('selection')} className="w-full">
                    Cancel & Go Back
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
              <div className="space-y-2">
                <h2 className="text-2xl font-headline font-bold">Processing Secure Payment</h2>
                <p className="text-muted-foreground">Generating your encrypted digital ticket...</p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="relative">
                <CheckCircle2 className="h-24 w-24 text-primary mx-auto" />
                <motion.div 
                  className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl font-headline font-extrabold">Digital Ticket Issued!</h2>
                <p className="text-lg text-muted-foreground">We've sent your ticket to <span className="text-foreground font-bold">+27 81 234 5678</span> via WhatsApp.</p>
              </div>

              <Card className="p-6 bg-card border-primary/20 space-y-6 max-w-sm mx-auto shadow-2xl">
                <div className="flex justify-between items-start">
                   <div className="text-left space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Your Number</p>
                      <div className="text-6xl font-headline font-extrabold">B-089</div>
                   </div>
                   <div className="p-2 bg-primary/10 rounded-lg">
                      <Smartphone className="h-6 w-6 text-primary" />
                   </div>
                </div>
                <div className="text-left text-sm space-y-1 text-muted-foreground">
                  <p>Branch: <strong>{branchName}</strong></p>
                  <p>Category: <strong>{serviceNames[serviceId] || 'Smart ID Card'}</strong></p>
                </div>
                <div className="text-left text-sm space-y-3 border-y border-white/5 py-4">
                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <p className="font-bold uppercase text-muted-foreground">Date</p>
                      <p className="font-semibold">{issueDate}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-muted-foreground">Issued</p>
                      <p className="font-semibold">{issueTime}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-muted-foreground">Est. Time</p>
                      <p className="font-semibold text-primary">{estWait}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Required Documents</p>
                    <ul className="text-[11px] space-y-1">
                      {(serviceDocs[serviceId] || serviceDocs.id).map((doc) => (
                        <li key={doc}>• {doc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="aspect-square bg-white p-4 rounded-xl mx-auto w-48 flex items-center justify-center">
                   {/* Mock QR */}
                   <div className="grid grid-cols-8 grid-rows-8 gap-0.5 w-full h-full bg-black opacity-10" />
                </div>
              </Card>

              <div className="flex flex-col gap-4">
                <Button 
                  onClick={() => router.push('/queue/ticket-123')}
                  className="h-14 w-full rounded-full bg-primary text-primary-foreground font-bold text-lg"
                >
                  Track Live on Phone
                </Button>
                <div className="grid grid-cols-2 gap-3">
                   <Button variant="outline" className="h-12 rounded-full border-foreground/20">
                    <Share2 className="h-4 w-4 mr-2" /> Share
                   </Button>
                   <Button variant="outline" className="h-12 rounded-full border-foreground/20">
                    Save to Wallet
                   </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
