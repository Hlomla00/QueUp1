
"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, User, Fingerprint, Smartphone, Printer, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

export default function KioskView() {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState({ name: '', surname: '', id: '', phone: '' });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <main className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden text-[#F5F2EE]">
      {/* Header */}
      <div className="h-24 px-12 border-b border-white/5 flex items-center justify-between bg-card">
        <div className="flex items-baseline space-x-1">
          <span className="text-4xl font-headline font-extrabold">Que</span>
          <span className="text-4xl font-headline font-extrabold text-primary">Up</span>
        </div>
        <div className="text-right">
          <p className="text-xl font-headline font-bold">Home Affairs Bellville</p>
          <p className="text-sm text-primary font-bold uppercase tracking-widest">Self-Service Kiosk 01</p>
        </div>
      </div>

      {/* Main Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <AnimatePresence mode="wait">
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
                   <p className="text-2xl text-muted-foreground">Please enter your information using the keyboard below.</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-xl font-bold uppercase tracking-widest text-primary">First Name</label>
                      <Input className="h-20 text-3xl bg-card border-white/10 rounded-2xl px-6" placeholder="Enter first name" />
                   </div>
                   <div className="space-y-4">
                      <label className="text-xl font-bold uppercase tracking-widest text-primary">ID Number</label>
                      <Input className="h-20 text-3xl bg-card border-white/10 rounded-2xl px-6" placeholder="13 Digit SA ID" />
                   </div>
                </div>

                {/* Simulated Virtual Keyboard */}
                <div className="bg-card p-4 rounded-3xl border border-white/10 grid grid-cols-10 gap-2">
                   {['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M'].map(key => (
                      <div key={key} className="h-16 bg-white/5 rounded-xl flex items-center justify-center text-2xl font-bold hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">{key}</div>
                   ))}
                   <div className="col-span-10 h-16 bg-white/5 rounded-xl flex items-center justify-center text-xl font-bold">SPACE</div>
                </div>

                <div className="flex justify-between items-center pt-8">
                   <Button variant="ghost" onClick={prevStep} className="h-20 px-8 text-2xl font-bold text-muted-foreground hover:text-white">
                      <ChevronLeft className="h-8 w-8 mr-2" /> BACK
                   </Button>
                   <Button onClick={nextStep} className="h-20 px-16 text-3xl font-bold rounded-2xl bg-primary text-primary-foreground">
                      NEXT <ChevronRight className="h-8 w-8 ml-2" />
                   </Button>
                </div>
             </motion.div>
          )}

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
                  {[
                    { title: 'Smart ID Card', icon: <Fingerprint className="h-12 w-12" />, color: 'bg-primary/10 border-primary' },
                    { title: 'Passport Services', icon: <Globe className="h-12 w-12" />, color: 'bg-card border-white/5' },
                    { title: 'Birth Certificate', icon: <User className="h-12 w-12" />, color: 'bg-card border-white/5' },
                    { title: 'Other Inquiries', icon: <Smartphone className="h-12 w-12" />, color: 'bg-card border-white/5' },
                  ].map(service => (
                    <Card key={service.title} className={`p-12 cursor-pointer hover:scale-102 transition-all flex flex-col items-center space-y-6 text-center ${service.color}`}>
                       <div className="p-6 bg-primary/20 rounded-full text-primary">{service.icon}</div>
                       <h3 className="text-3xl font-headline font-bold">{service.title}</h3>
                       <Button variant="link" className="text-primary text-xl" onClick={nextStep}>Select Service</Button>
                    </Card>
                  ))}
               </div>
            </motion.div>
          )}

          {step === 4 && (
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
                      transition={{ delay: 1 }}
                   >
                      <CheckCircle2 className="h-8 w-8 text-white" />
                   </motion.div>
                </div>

                <div className="space-y-4">
                   <h2 className="text-7xl font-headline font-extrabold">Ticket Issued!</h2>
                   <p className="text-3xl text-muted-foreground">Please collect your ticket below.</p>
                </div>

                <Card className="max-w-md mx-auto p-12 bg-card border-white/20 space-y-8">
                   <div className="space-y-2">
                      <p className="text-xl font-bold uppercase tracking-widest text-primary">Your Number</p>
                      <div className="text-9xl font-headline font-extrabold leading-none">B-090</div>
                   </div>
                   <div className="space-y-2 text-2xl text-muted-foreground font-bold">
                      <p>Nomsa Dlamini</p>
                      <p>Smart ID Application</p>
                   </div>
                </Card>

                <p className="text-2xl text-muted-foreground">Returning to start in 10 seconds...</p>
                <Button onClick={() => setStep(1)} size="lg" className="h-20 px-12 text-2xl rounded-full bg-white/5 hover:bg-white/10 border border-white/10">Return Home</Button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
