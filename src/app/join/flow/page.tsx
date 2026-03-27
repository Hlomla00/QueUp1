
"use client"

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ChevronRight, 
  ChevronLeft, 
  Fingerprint, 
  Globe, 
  User, 
  Smartphone, 
  Printer, 
  CheckCircle2, 
  Share2,
  Ticket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function JoinFlow() {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'kiosk' | 'qr'>('qr');
  const [details, setDetails] = useState({ name: '', phone: '' });
  const [category, setCategory] = useState('id');
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchName = searchParams.get('branch') || 'Home Affairs Bellville';

  const services = [
    { id: 'id', title: 'Smart ID Card', icon: <Fingerprint />, desc: 'Application for first-time or replacement cards.' },
    { id: 'passport', title: 'Passport Services', icon: <Globe />, desc: 'Renewals and new passport applications.' },
    { id: 'birth', title: 'Birth Certificate', icon: <User />, desc: 'Registration and unabridged certificates.' },
  ];

  const handleFinish = () => {
    setStep(4);
  };

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
                <h1 className="text-4xl font-headline font-extrabold text-foreground">Entry Method</h1>
                <p className="text-muted-foreground">How would you like to receive your ticket?</p>
              </div>

              <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'kiosk' | 'qr')} className="grid gap-4">
                <Label
                  htmlFor="qr"
                  className={`flex items-center space-x-4 p-6 rounded-2xl border transition-all cursor-pointer group ${
                    method === 'qr' ? 'border-primary bg-primary/5' : 'border-white/5 bg-card hover:border-white/20'
                  }`}
                >
                  <RadioGroupItem value="qr" id="qr" className="sr-only" />
                  <div className={`p-4 rounded-xl transition-colors ${
                    method === 'qr' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xl">QR Scan (Digital)</p>
                    <p className="text-sm text-muted-foreground">Receive your ticket via WhatsApp/SMS. Join remotely.</p>
                  </div>
                </Label>

                <Label
                  htmlFor="kiosk"
                  className={`flex items-center space-x-4 p-6 rounded-2xl border transition-all cursor-pointer group ${
                    method === 'kiosk' ? 'border-primary bg-primary/5' : 'border-white/5 bg-card hover:border-white/20'
                  }`}
                >
                  <RadioGroupItem value="kiosk" id="kiosk" className="sr-only" />
                  <div className={`p-4 rounded-xl transition-colors ${
                    method === 'kiosk' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    <Ticket className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xl">Kiosk (Physical)</p>
                    <p className="text-sm text-muted-foreground">Print a paper ticket at the branch machine.</p>
                  </div>
                </Label>
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
                <h1 className="text-4xl font-headline font-extrabold text-foreground">Your Details</h1>
                <p className="text-muted-foreground">Please provide your contact information for queue updates.</p>
              </div>

              <Card className="p-8 border-white/5 bg-card space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Nomsa Dlamini" 
                    className="h-12 text-lg" 
                    value={details.name}
                    onChange={(e) => setDetails({ ...details, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (WhatsApp/SMS)</Label>
                  <Input 
                    id="phone" 
                    placeholder="e.g. +27 81 234 5678" 
                    className="h-12 text-lg" 
                    value={details.phone}
                    onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                  />
                </div>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="h-14 flex-1 rounded-full font-bold" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-5 w-5" /> Back
                </Button>
                <Button 
                  className="h-14 flex-[2] rounded-full font-bold text-lg" 
                  disabled={!details.name || !details.phone}
                  onClick={() => setStep(3)}
                >
                  Continue <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3" 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-headline font-extrabold text-foreground">Select Service</h1>
                <p className="text-muted-foreground">What service do you require at {branchName}?</p>
              </div>

              <RadioGroup value={category} onValueChange={setCategory} className="grid gap-4">
                {services.map((service) => (
                  <Label
                    key={service.id}
                    htmlFor={service.id}
                    className={`flex items-center space-x-4 p-6 rounded-2xl border transition-all cursor-pointer group ${
                      category === service.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-card hover:border-white/20'
                    }`}
                  >
                    <RadioGroupItem value={service.id} id={service.id} className="sr-only" />
                    <div className={`p-3 rounded-xl transition-colors ${
                      category === service.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      {React.cloneElement(service.icon as React.ReactElement, { className: 'h-6 w-6' })}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{service.title}</p>
                      <p className="text-sm text-muted-foreground">{service.desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>

              <div className="flex gap-4">
                <Button variant="outline" className="h-14 flex-1 rounded-full font-bold" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 h-5 w-5" /> Back
                </Button>
                <Button className="h-14 flex-[2] rounded-full font-bold text-lg" onClick={handleFinish}>
                  Join Queue (Free)
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="success" 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="text-center space-y-8"
            >
              <div className="relative inline-block">
                {method === 'qr' ? (
                  <div className="bg-primary/20 p-6 rounded-full">
                    <CheckCircle2 className="h-20 w-20 text-primary mx-auto" />
                  </div>
                ) : (
                  <div className="bg-primary/20 p-6 rounded-full">
                    <Printer className="h-20 w-20 text-primary mx-auto" />
                  </div>
                )}
                <motion.div 
                  className="absolute inset-0 bg-primary/10 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl font-headline font-extrabold text-foreground">
                  {method === 'qr' ? 'Digital Ticket Issued!' : 'Collect Paper Ticket'}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {method === 'qr' 
                    ? `Sent to ${details.phone} via WhatsApp.` 
                    : `Please take your slip from the machine at ${branchName}.`}
                </p>
              </div>

              <Card className="p-8 bg-card border-primary/20 space-y-6 max-w-sm mx-auto shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                     method === 'qr' ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white'
                   }`}>
                     {method === 'qr' ? 'DIGITAL' : 'PHYSICAL'}
                   </div>
                </div>
                
                <div className="text-left space-y-1">
                   <p className="text-xs font-bold uppercase tracking-widest text-primary">Ticket Number</p>
                   <div className="text-7xl font-headline font-extrabold text-foreground">B-090</div>
                </div>

                <div className="text-left text-sm space-y-2 border-t border-white/5 pt-4">
                  <p className="text-muted-foreground">Branch: <strong className="text-foreground">{branchName}</strong></p>
                  <p className="text-muted-foreground">Name: <strong className="text-foreground">{details.name}</strong></p>
                  <p className="text-muted-foreground">Service: <strong className="text-foreground">{services.find(s => s.id === category)?.title}</strong></p>
                </div>

                {method === 'qr' && (
                  <div className="aspect-square bg-white p-4 rounded-xl mx-auto w-40 flex items-center justify-center">
                    <div className="grid grid-cols-8 grid-rows-8 gap-0.5 w-full h-full bg-black opacity-20" />
                  </div>
                )}
              </Card>

              <div className="flex flex-col gap-4">
                <Button 
                  onClick={() => router.push(method === 'qr' ? '/queue/ticket-123' : '/')}
                  className="h-14 w-full rounded-full bg-primary text-primary-foreground font-bold text-lg"
                >
                  {method === 'qr' ? 'Track Live Position' : 'Return to Home'}
                </Button>
                {method === 'qr' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-full border-foreground/20">
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </Button>
                    <Button variant="outline" className="h-12 rounded-full border-foreground/20" onClick={() => router.push('/')}>
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
