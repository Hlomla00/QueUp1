
"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight, ChevronLeft, Fingerprint, Globe, User, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function JoinFlow() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const services = [
    { id: 'id', title: 'Smart ID Card', icon: <Fingerprint />, desc: 'Application for first-time or replacement cards.' },
    { id: 'passport', title: 'Passport Services', icon: <Globe />, desc: 'Renewals and new passport applications.' },
    { id: 'birth', title: 'Birth Certificate', icon: <User />, desc: 'Registration and unabridged certificates.' },
  ];

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1" 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-headline font-extrabold">Select your service</h1>
                <p className="text-muted-foreground">What brings you to Home Affairs today?</p>
              </div>

              <RadioGroup defaultValue="id" className="grid gap-4">
                {services.map((service) => (
                  <Label
                    key={service.id}
                    htmlFor={service.id}
                    className="flex items-center space-x-4 p-6 rounded-2xl border border-white/5 bg-card hover:border-primary/50 transition-colors cursor-pointer group"
                  >
                    <RadioGroupItem value={service.id} id={service.id} className="sr-only" />
                    <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {React.cloneElement(service.icon as React.ReactElement, { className: 'h-6 w-6' })}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{service.title}</p>
                      <p className="text-sm text-muted-foreground">{service.desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>

              <Button className="w-full h-14 rounded-full text-lg font-bold" onClick={() => setStep(2)}>
                Next Step <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2" 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-headline font-extrabold">Confirmation</h1>
                <p className="text-muted-foreground">Review your booking for Home Affairs Bellville.</p>
              </div>

              <Card className="p-6 border-white/5 bg-card space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/5 pb-4">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="font-bold">Home Affairs Bellville</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-4">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-bold">Smart ID Application</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-4">
                    <span className="text-muted-foreground">Estimated Wait</span>
                    <span className="font-bold text-primary">2.5 Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Fee</span>
                    <span className="font-bold">R65.00</span>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex items-start space-x-3">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    By confirming, you will be added to the live queue. A booking fee of R65.00 applies for remote entry.
                  </p>
                </div>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="h-14 flex-1 rounded-full font-bold" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-5 w-5" /> Back
                </Button>
                <Button className="h-14 flex-2 rounded-full font-bold text-lg" onClick={() => router.push('/payment')}>
                  Confirm & Pay
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
