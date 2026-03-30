"use client"

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, User, Fingerprint, Smartphone, Printer, CheckCircle2, ChevronRight, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';

const BRANCH_ID = 'ha-bellville';
const BRANCH_NAME = 'Home Affairs Bellville';

const SERVICE_OPTIONS = [
  { title: 'Smart ID Card',      icon: <Fingerprint className="h-12 w-12" />, category: 'SMART_ID'          },
  { title: 'Passport Services',  icon: <Globe className="h-12 w-12" />,       category: 'PASSPORT'          },
  { title: 'Birth Certificate',  icon: <User className="h-12 w-12" />,        category: 'BIRTH_CERTIFICATE' },
  { title: 'Other Inquiries',    icon: <Smartphone className="h-12 w-12" />,  category: 'OTHER'             },
];

export default function KioskView() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketNumber: string;
    estimatedWait: number;
    queuePosition: number;
    issuedAt: string;
    issuedDate: string;
    requiredDocs: string[];
    serviceTitle: string;
  } | null>(null);
  // For branch-full scenario (hlomla2 demo)
  const [branchFullMsg, setBranchFullMsg] = useState<string | null>(null);
  const [redirectRec, setRedirectRec] = useState<string | null>(null);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleServiceSelect = async (service: typeof SERVICE_OPTIONS[0]) => {
    if (!firstName.trim()) {
      setSubmitError('Please enter your name first.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: BRANCH_ID,
          citizenName: firstName.trim(),
          category: service.category,
          channel: 'KIOSK',
          paymentStatus: 'FREE',
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Branch full — get Claude redirect recommendation
        setBranchFullMsg(data.message);
        const redirectRes = await fetch('/api/redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentBranchId: BRANCH_ID,
            serviceType: service.title,
            citizenLocation: BRANCH_NAME,
          }),
        });
        const redirectData = await redirectRes.json();
        setRedirectRec(redirectData.recommendation || null);
        setStep(5);
        return;
      }

      if (!res.ok) {
        setSubmitError('Something went wrong. Please try again or ask staff for assistance.');
        return;
      }

      const ticket = data.ticket;
      const docsMap: Record<string, string[]> = {
        SMART_ID: ['Birth Certificate', 'ID Photos', 'Proof of Residence'],
        PASSPORT: ['Old Passport', 'ID Document', 'R600 Fee'],
        BIRTH_CERTIFICATE: ["Proof of Birth", "Parents' Identity Documents"],
        OTHER: ['ID Document'],
      };

      setIssuedTicket({
        ticketNumber: ticket.ticketNumber,
        estimatedWait: ticket.estimatedWait,
        queuePosition: ticket.queuePositionAtIssue,
        issuedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        issuedDate: new Date().toLocaleDateString(),
        requiredDocs: docsMap[service.category] || ['ID Document'],
        serviceTitle: service.title,
      });
      setStep(4);
    } catch {
      setSubmitError('Network error. Please ask staff for assistance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatWait = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <main className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden text-[#F5F2EE]">
      {/* Header */}
      <div className="h-24 px-12 border-b border-white/5 flex items-center justify-between bg-card">
        <div className="flex items-baseline space-x-1">
          <span className="text-4xl font-headline font-extrabold">Que</span>
          <span className="text-4xl font-headline font-extrabold text-primary">Up</span>
        </div>
        <div className="text-right">
          <p className="text-xl font-headline font-bold">{BRANCH_NAME}</p>
          <p className="text-sm text-primary font-bold uppercase tracking-widest">Self-Service Kiosk 01</p>
        </div>
      </div>

      {/* Main Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <AnimatePresence mode="wait">

          {/* Step 1 — Welcome */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-12"
            >
              <h2 className="text-7xl font-headline font-extrabold max-w-4xl leading-tight">Welcome. Touch the screen to begin.</h2>
              <Button
                onClick={nextStep}
                className="h-32 px-24 text-4xl font-headline font-extrabold rounded-3xl bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/20"
              >
                START
              </Button>
              <div className="pt-12 flex items-center justify-center space-x-8 text-xl text-muted-foreground font-bold">
                 <span>English</span>
                 <span className="opacity-40">|</span>
                 <span>isiXhosa</span>
                 <span className="opacity-40">|</span>
                 <span>Afrikaans</span>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Name Entry */}
          {step === 2 && (
             <motion.div
               key="step2"
               initial={{ opacity: 0, x: 100 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -100 }}
               className="w-full max-w-4xl space-y-12"
             >
                <div className="space-y-4 text-center">
                   <h2 className="text-5xl font-headline font-extrabold">Your Details</h2>
                   <p className="text-2xl text-muted-foreground">Please enter your first name for the paper ticket.</p>
                </div>

                <div className="min-h-[72px]">
                  {submitError && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-400 text-xl font-bold">
                      <AlertTriangle className="h-6 w-6 shrink-0" />
                      {submitError}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                   <label className="text-xl font-bold uppercase tracking-widest text-primary">First Name</label>
                   <input
                     className="w-full h-20 text-3xl bg-card border border-white/10 rounded-2xl px-6 text-white placeholder-white/30 focus:outline-none focus:border-primary"
                     placeholder="Enter your first name"
                     value={firstName}
                     onChange={e => setFirstName(e.target.value)}
                   />
                </div>

                {/* Simulated Virtual Keyboard */}
                <div className="bg-card p-4 rounded-3xl border border-white/10 grid grid-cols-10 gap-2">
                   {['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M'].map(key => (
                      <div
                        key={key}
                        onClick={() => setFirstName(prev => prev + key)}
                        className="h-16 bg-white/5 rounded-xl flex items-center justify-center text-2xl font-bold hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors select-none"
                      >{key}</div>
                   ))}
                   <div
                     onClick={() => setFirstName(prev => prev.slice(0, -1))}
                     className="col-span-5 h-16 bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold cursor-pointer hover:bg-destructive/20 select-none"
                   >DELETE</div>
                   <div
                     onClick={() => setFirstName(prev => prev + ' ')}
                     className="col-span-5 h-16 bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold cursor-pointer hover:bg-white/10 select-none"
                   >SPACE</div>
                </div>

                <div className="flex justify-between items-center pt-8">
                   <Button variant="ghost" onClick={prevStep} className="h-20 px-8 text-2xl font-bold text-muted-foreground hover:text-white">
                      <ChevronLeft className="h-8 w-8 mr-2" /> BACK
                   </Button>
                   <Button
                     onClick={nextStep}
                     disabled={!firstName.trim()}
                     className="h-20 px-16 text-3xl font-bold rounded-2xl bg-primary text-primary-foreground disabled:opacity-50"
                   >
                      NEXT <ChevronRight className="h-8 w-8 ml-2" />
                   </Button>
                </div>
             </motion.div>
          )}

          {/* Step 3 — Service Selection */}
          {step === 3 && (
            <motion.div
               key="step3"
               initial={{ opacity: 0, x: 100 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -100 }}
               className="w-full max-w-5xl space-y-12"
            >
               <h2 className="text-5xl font-headline font-extrabold text-center">Select Service</h2>
               <div className="grid grid-cols-2 gap-6">
                  {SERVICE_OPTIONS.map(service => (
                    <Card
                      key={service.title}
                      onClick={() => !isSubmitting && handleServiceSelect(service)}
                      className={`p-12 cursor-pointer hover:bg-primary/5 hover:border-primary transition-all flex flex-col items-center space-y-6 text-center border-white/5 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                       <div className="p-6 bg-primary/20 rounded-full text-primary">{service.icon}</div>
                       <h3 className="text-3xl font-headline font-bold">{service.title}</h3>
                       <p className="text-primary font-bold">Touch to Print Ticket</p>
                    </Card>
                  ))}
               </div>

               {isSubmitting && (
                 <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center space-y-8">
                    <Loader2 className="h-32 w-32 text-primary animate-spin" />
                    <h2 className="text-5xl font-headline font-bold">Issuing your ticket...</h2>
                    <p className="text-2xl text-muted-foreground">Please wait a moment.</p>
                 </div>
               )}
            </motion.div>
          )}

          {/* Step 4 — Ticket Printed */}
          {step === 4 && issuedTicket && (
             <motion.div
               key="step4"
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center space-y-12"
             >
                <div className="relative inline-block">
                   <Printer className="h-32 w-32 text-primary mx-auto" />
                   <motion.div
                      className="absolute -top-4 -right-4 h-12 w-12 bg-green-500 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 }}
                   >
                      <CheckCircle2 className="h-8 w-8 text-white" />
                   </motion.div>
                </div>

                <div className="space-y-4">
                   <h2 className="text-7xl font-headline font-extrabold">Ticket Printed!</h2>
                   <p className="text-3xl text-muted-foreground">Please collect your paper slip from the slot below.</p>
                </div>

                <Card className="max-w-md mx-auto p-12 bg-white text-black space-y-8 shadow-2xl">
                   <div className="space-y-2">
                      <p className="text-xl font-bold uppercase tracking-widest text-primary">Ticket Number</p>
                      <div className="text-9xl font-headline font-extrabold leading-none">{issuedTicket.ticketNumber}</div>
                   </div>
                   <div className="space-y-2 text-2xl font-bold border-t border-black/10 pt-4">
                      <p>{BRANCH_NAME}</p>
                      <p className="text-lg font-normal text-gray-600">{issuedTicket.serviceTitle}</p>
                   </div>
                   <div className="space-y-2 border-t border-black/10 pt-4 text-left">
                      <p className="text-muted-foreground text-lg">Date: {issuedTicket.issuedDate}</p>
                      <p className="text-muted-foreground text-lg">Issue Time: {issuedTicket.issuedAt}</p>
                      <p className="text-muted-foreground text-lg">Est. Wait: {formatWait(issuedTicket.estimatedWait)}</p>
                      <p className="text-muted-foreground text-lg">Position: #{issuedTicket.queuePosition}</p>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-widest text-primary">Documents Needed</p>
                        <p className="text-sm text-muted-foreground">{issuedTicket.requiredDocs.join(', ')}</p>
                      </div>
                   </div>
                </Card>

                <p className="text-2xl text-muted-foreground">Returning to start automatically...</p>
                <Button onClick={() => { setStep(1); setFirstName(''); setIssuedTicket(null); }} size="lg" className="h-20 px-12 text-2xl rounded-full bg-white/5 border border-white/10">Done</Button>
             </motion.div>
          )}

          {/* Step 5 — Branch Full */}
          {step === 5 && (
            <motion.div
              key="full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-12 max-w-3xl"
            >
              <div className="bg-destructive/20 p-8 rounded-full inline-block">
                <AlertTriangle className="h-32 w-32 text-destructive mx-auto" />
              </div>
              <div className="space-y-4">
                <h2 className="text-6xl font-headline font-extrabold">Branch Full Today</h2>
                <p className="text-2xl text-muted-foreground">{branchFullMsg || 'This branch has reached its daily capacity.'}</p>
              </div>
              {redirectRec && (
                <Card className="p-8 bg-card border-primary/30 text-left space-y-4">
                  <p className="text-xl font-bold text-primary uppercase tracking-widest">QueUp AI Recommends</p>
                  <p className="text-xl leading-relaxed">{redirectRec}</p>
                </Card>
              )}
              <Button
                onClick={() => { setStep(1); setFirstName(''); setBranchFullMsg(null); setRedirectRec(null); }}
                className="h-20 px-16 text-3xl rounded-2xl bg-primary text-primary-foreground"
              >
                Return to Start
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
