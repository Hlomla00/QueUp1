
"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const banks = [
  { name: 'FNB', color: 'bg-[#00A191]', textColor: 'text-white' },
  { name: 'Standard Bank', color: 'bg-[#0033A1]', textColor: 'text-white' },
  { name: 'Capitec', color: 'bg-[#E30613]', textColor: 'text-white' },
  { name: 'Absa', color: 'bg-[#FF0000]', textColor: 'text-white' },
  { name: 'Nedbank', color: 'bg-[#006341]', textColor: 'text-white' },
];

export default function PaymentScreen() {
  const [step, setStep] = useState<'selection' | 'details' | 'processing' | 'success'>('selection');
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const router = useRouter();

  const handleBankSelect = (bank: any) => {
    setSelectedBank(bank);
    setStep('details');
  };

  const handlePayment = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
    }, 2500);
  };

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
                <p className="text-muted-foreground">Select your payment method to confirm your spot — R65.00</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {banks.map(bank => (
                  <button
                    key={bank.name}
                    onClick={() => handleBankSelect(bank)}
                    className={`h-20 rounded-xl p-4 flex items-center justify-center font-bold text-lg transition-transform hover:scale-105 active:scale-95 ${bank.color} ${bank.textColor}`}
                  >
                    {bank.name}
                  </button>
                ))}
              </div>
              
              <div className="pt-4 flex items-center justify-center text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 mr-1" />
                PCI-DSS Compliant Secure Payment
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card className={`p-0 overflow-hidden border-none`}>
                <div className={`p-6 ${selectedBank.color} ${selectedBank.textColor} flex justify-between items-center`}>
                  <h2 className="text-xl font-bold">{selectedBank.name} — Secure Gateway</h2>
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
                <p className="text-muted-foreground">Please do not refresh or close this window...</p>
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
                <h2 className="text-4xl font-headline font-extrabold">You&apos;re in!</h2>
                <p className="text-xl text-muted-foreground">Your queue ticket has been issued.</p>
              </div>

              <Card className="p-6 bg-card border-primary/20 space-y-6 max-w-sm mx-auto">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">Your Ticket Number</p>
                  <div className="text-6xl font-headline font-extrabold">B-089</div>
                </div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Branch: <strong>Home Affairs Bellville</strong></p>
                  <p>Category: <strong>Smart ID Application</strong></p>
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
                  Track Live Dashboard
                </Button>
                <Button variant="outline" className="h-14 w-full rounded-full border-foreground/20">
                  Save to Google Wallet
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
