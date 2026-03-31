
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, User, Fingerprint, Smartphone, Printer, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

const SERVICES = [
  { title: 'Smart ID Card',      sub: 'New / Renewal',       icon: Fingerprint },
  { title: 'Passport Services',  sub: 'New / Renewal',       icon: Globe },
  { title: 'Birth Certificate',  sub: 'Registration & copy', icon: User },
  { title: 'Other Inquiries',    sub: 'General assistance',  icon: Smartphone },
];

export default function KioskView() {
  const [step, setStep]           = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [issueDate, setIssueDate]   = useState('');
  const [issueTime, setIssueTime]   = useState('');
  const [clock, setClock]           = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const next = () => setStep(s => s + 1);
  const prev = () => setStep(s => s - 1);

  const handleFinish = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      setIssueDate(new Date().toLocaleDateString('en-ZA'));
      setIssueTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setStep(4);
    }, 2500);
  };

  return (
    <main className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden text-[#F5F2EE]">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="h-16 px-8 border-b border-white/8 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-headline font-extrabold">Que</span>
          <span className="text-2xl font-headline font-extrabold text-primary">Up</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-headline font-bold leading-tight">Home Affairs Bellville</p>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Self-Service Kiosk 01</p>
        </div>
        <div className="text-right tabular-nums">
          <p className="text-xl font-headline font-extrabold text-primary">{clock}</p>
        </div>
      </header>

      {/* ── Step progress bar ────────────────────────────────────── */}
      {step < 4 && (
        <div className="h-1 bg-white/5 shrink-0">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">

          {/* Step 1 — Welcome */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-8 w-full max-w-lg"
            >
              {/* Pulsing lime dot */}
              <div className="flex justify-center">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-headline font-extrabold leading-tight">
                  Welcome.<br />
                  <span className="text-primary">Touch to begin.</span>
                </h2>
                <p className="text-sm text-muted-foreground">Home Affairs Bellville · Self-Service Queue</p>
              </div>

              <Button
                onClick={next}
                className="w-full h-16 text-xl font-headline font-extrabold rounded-2xl bg-primary text-primary-foreground hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
              >
                START
              </Button>

              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground font-bold pt-2">
                <span>English</span>
                <span className="opacity-30">|</span>
                <span>isiXhosa</span>
                <span className="opacity-30">|</span>
                <span>Afrikaans</span>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Your Details */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-headline font-extrabold">Your Details</h2>
                <p className="text-sm text-muted-foreground">Enter your info to receive your ticket.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary">First Name</label>
                  <Input className="h-14 text-lg bg-card border-white/10 rounded-xl px-4" placeholder="e.g. Thabo" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary">SA ID Number</label>
                  <Input className="h-14 text-lg bg-card border-white/10 rounded-xl px-4" placeholder="13-digit ID" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary">Phone (optional)</label>
                  <Input className="h-14 text-lg bg-card border-white/10 rounded-xl px-4" placeholder="+27 8X XXX XXXX" />
                </div>
              </div>

              {/* On-screen keyboard */}
              <div className="bg-card rounded-2xl border border-white/8 p-3">
                <div className="grid grid-cols-10 gap-1.5 mb-1.5">
                  {['Q','W','E','R','T','Y','U','I','O','P'].map(k => (
                    <div key={k} className="h-10 bg-white/5 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">{k}</div>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1.5 mb-1.5 px-4">
                  {['A','S','D','F','G','H','J','K','L'].map(k => (
                    <div key={k} className="h-10 bg-white/5 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">{k}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5 mb-1.5 px-8">
                  {['Z','X','C','V','B','N','M'].map(k => (
                    <div key={k} className="h-10 bg-white/5 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">{k}</div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="h-10 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors">123</div>
                  <div className="h-10 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors">SPACE</div>
                  <div className="h-10 bg-destructive/80 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-destructive transition-colors">⌫</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={prev} className="h-12 px-5 text-base font-bold text-muted-foreground hover:text-white">
                  <ChevronLeft className="h-5 w-5 mr-1" /> Back
                </Button>
                <Button onClick={next} className="h-12 px-10 text-base font-bold rounded-xl bg-primary text-primary-foreground">
                  Next <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Select Service */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-headline font-extrabold">Select Service</h2>
                <p className="text-sm text-muted-foreground">Touch a service to print your ticket.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {SERVICES.map(({ title, sub, icon: Icon }) => (
                  <button
                    key={title}
                    onClick={handleFinish}
                    className="p-6 bg-card rounded-2xl border border-white/8 hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all text-left space-y-3 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary group-hover:bg-primary/25 transition-colors">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-headline font-bold text-base leading-tight">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                    </div>
                    <p className="text-xs text-primary font-bold uppercase tracking-wider">Touch to print →</p>
                  </button>
                ))}
              </div>

              <Button variant="ghost" onClick={prev} className="h-11 px-5 text-sm font-bold text-muted-foreground hover:text-white">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              {/* Printing overlay */}
              <AnimatePresence>
                {isPrinting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center gap-6"
                  >
                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    <h2 className="text-3xl font-headline font-bold">Printing your ticket…</h2>
                    <p className="text-base text-muted-foreground">Please wait a moment.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Step 4 — Ticket Printed */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center space-y-6 w-full max-w-sm"
            >
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                  <Printer className="h-10 w-10 text-primary" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 h-7 w-7 bg-green-500 rounded-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </motion.div>
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl font-headline font-extrabold">Ticket Printed!</h2>
                <p className="text-sm text-muted-foreground">Collect your slip from the slot below.</p>
              </div>

              {/* Paper ticket mockup */}
              <div className="bg-white text-black rounded-2xl p-6 shadow-2xl text-left space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Ticket Number</p>
                    <div className="text-6xl font-headline font-extrabold leading-none mt-1">B-090</div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Est. Wait</p>
                    <p className="text-2xl font-headline font-extrabold text-primary">1h 45m</p>
                  </div>
                </div>
                <div className="border-t border-black/10 pt-3 space-y-1 text-xs text-gray-500">
                  <p className="font-bold text-sm text-black">Home Affairs Bellville</p>
                  <p>Date: {issueDate}</p>
                  <p>Issued: {issueTime}</p>
                  <p className="pt-1 font-semibold text-black/70">Bring: ID Photos · Proof of Residence</p>
                </div>
                <div className="flex justify-center pt-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div key={i} className="w-0.5 bg-black" style={{ height: i % 3 === 0 ? 20 : 14 }} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Returning to start in 30 seconds…</p>
              <Button onClick={() => setStep(1)} className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-bold">
                Done
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
