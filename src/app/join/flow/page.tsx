"use client"

import React, { useState, Suspense } from 'react';
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
  Ticket,
  Clock,
  FileText,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Map UI service IDs to backend ServiceCategory enum values
const SERVICE_MAP: Record<string, string> = {
  id: 'SMART_ID',
  passport: 'PASSPORT',
  birth: 'BIRTH_CERTIFICATE',
  tax: 'TAX_QUERY',
  sassa: 'SASSA',
  rates: 'MUNICIPAL_RATES',
};

// Map branchName query param to Firestore branchId
const BRANCH_ID_MAP: Record<string, string> = {
  'Home Affairs Bellville': 'ha-bellville',
  'Home Affairs Cape Town CBD': 'ha-cbd',
  'Home Affairs Mitchells Plain': 'ha-mitchells-plain',
  'SASSA Tygervalley': 'sassa-tygervalley',
  'SARS Pinelands': 'sars-pinelands',
};

function JoinFlowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const source = searchParams?.get('source');
  const branchName = searchParams?.get('branch') || 'Home Affairs Bellville';
  const branchId = searchParams?.get('branchId') || BRANCH_ID_MAP[branchName] || 'ha-bellville';
  const preselectedService = searchParams?.get('service') || 'id';

  const initialStep = source === 'signup' ? 3 : 1;
  const [step, setStep] = useState(initialStep);
  const [method, setMethod] = useState<'kiosk' | 'qr'>(source === 'signup' ? 'qr' : 'qr');
  const [details, setDetails] = useState({ name: '', phone: '' });
  const [category, setCategory] = useState(preselectedService);

  // Real ticket data returned from the backend
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketId: string;
    ticketNumber: string;
    estimatedWait: number;
    queuePosition: number;
    issuedAt: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // For queue-full redirect
  const [redirectRecommendation, setRedirectRecommendation] = useState<string | null>(null);

  const services = [
    {
      id: 'id',
      title: 'Smart ID Card',
      icon: <Fingerprint />,
      desc: 'Application for first-time or replacement cards.',
      docs: ["Birth Certificate", "ID Photos", "R140 Fee (if replacement)"]
    },
    {
      id: 'passport',
      title: 'Passport Services',
      icon: <Globe />,
      desc: 'Renewals and new passport applications.',
      docs: ["Old Passport", "ID Document", "R600 Fee"]
    },
    {
      id: 'birth',
      title: 'Birth Certificate',
      icon: <User />,
      desc: 'Registration and unabridged certificates.',
      docs: ["Proof of Birth", "Parents' Identity Documents"]
    },
  ];

  const handleFinish = async () => {
    if (source === 'signup') {
      const paymentParams = new URLSearchParams({ source: 'signup', branch: branchName, service: category });
      router.push(`/payment?${paymentParams.toString()}`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          citizenName: details.name,
          citizenPhone: details.phone || undefined,
          category: SERVICE_MAP[category] || 'OTHER',
          channel: 'QR',
          paymentStatus: 'FREE',
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Branch is full — fetch Claude redirect recommendation
        const redirectRes = await fetch('/api/redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentBranchId: branchId,
            serviceType: services.find(s => s.id === category)?.title || category,
            citizenLocation: branchName,
          }),
        });
        const redirectData = await redirectRes.json();
        setRedirectRecommendation(redirectData.recommendation || data.message);
        setStep(5); // branch-full step
        return;
      }

      if (!res.ok) {
        setSubmitError('Something went wrong. Please try again.');
        return;
      }

      const ticket = data.ticket;
      setIssuedTicket({
        ticketId: ticket.ticketId,
        ticketNumber: ticket.ticketNumber,
        estimatedWait: ticket.estimatedWait,
        queuePosition: ticket.queuePositionAtIssue,
        issuedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setStep(4);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatWait = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
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
                disabled={!details.name.trim()}
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

            {submitError && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}

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
              <Button variant="outline" className="h-14 flex-1 rounded-full font-bold" onClick={() => {
                if (source === 'signup') {
                   router.push('/join/browse?source=signup');
                } else {
                   setStep(2);
                }
              }}>
                <ChevronLeft className="mr-2 h-5 w-5" /> Back
              </Button>
              <Button
                className="h-14 flex-[2] rounded-full font-bold text-lg"
                disabled={isSubmitting}
                onClick={handleFinish}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining Queue...</>
                ) : source === 'signup' ? (
                  'Proceed to Payment (R65)'
                ) : (
                  'Join Queue (Free)'
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4 — Success */}
        {step === 4 && issuedTicket && (
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
                  ? details.phone ? `Sent to ${details.phone} via WhatsApp.` : 'Your ticket is confirmed.'
                  : `Please take your slip from the machine at ${branchName}.`}
              </p>
            </div>

            <Card className="p-8 bg-card border-primary/20 space-y-6 max-w-sm mx-auto shadow-2xl relative overflow-hidden text-left">
              <div className="absolute top-4 right-4 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded">
                {method === 'qr' ? 'DIGITAL' : 'PHYSICAL'}
              </div>

              <div className="space-y-1">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Ticket Number</p>
                 <div className="text-7xl font-headline font-extrabold text-foreground">{issuedTicket.ticketNumber}</div>
              </div>

              <div className="text-sm space-y-4 border-t border-white/5 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" /> Issued
                    </p>
                    <p className="font-bold">{issuedTicket.issuedAt}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" /> Est. Wait
                    </p>
                    <p className="font-bold text-primary">{formatWait(issuedTicket.estimatedWait)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Service Details</p>
                  <p className="text-xs"><strong>Branch:</strong> {branchName}</p>
                  <p className="text-xs"><strong>Position:</strong> #{issuedTicket.queuePosition} in queue</p>
                  <p className="text-xs"><strong>Type:</strong> {services.find(s => s.id === category)?.title}</p>
                </div>

                <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center">
                    <FileText className="h-3 w-3 mr-1" /> Required Documents
                  </p>
                  <ul className="text-[10px] space-y-1 pl-1">
                    {services.find(s => s.id === category)?.docs.map((doc, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-primary mr-1.5">•</span>
                        <span className="text-foreground/80">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Button
                onClick={() => router.push(`/queue/${issuedTicket.ticketId}`)}
                className="h-14 w-full rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20"
              >
                Track Live Position
              </Button>
              {method === 'kiosk' && (
                <Button variant="outline" className="h-12 w-full rounded-full border-white/10">
                  <Printer className="mr-2 h-4 w-4" /> Print Ticket
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-12 w-full rounded-full text-muted-foreground"
                onClick={() => router.push('/')}
              >
                Return to Home
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 5 — Branch Full + Claude Redirect */}
        {step === 5 && (
          <motion.div
            key="full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8"
          >
            <div className="bg-destructive/20 p-6 rounded-full inline-block">
              <AlertTriangle className="h-20 w-20 text-destructive mx-auto" />
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-headline font-extrabold text-foreground">Branch Full</h1>
              <p className="text-lg text-muted-foreground">
                {branchName} has reached its daily capacity.
              </p>
            </div>

            {redirectRecommendation && (
              <Card className="p-6 bg-card border-primary/30 text-left space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">QueUp AI Recommendation</p>
                <p className="text-sm leading-relaxed">{redirectRecommendation}</p>
              </Card>
            )}

            <Button
              className="h-14 w-full rounded-full font-bold text-lg"
              onClick={() => router.push('/join/browse')}
            >
              Find Nearby Branch
            </Button>
            <Button
              variant="ghost"
              className="h-12 w-full rounded-full text-muted-foreground"
              onClick={() => router.push('/')}
            >
              Return to Home
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function JoinFlow() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground font-headline font-bold">Loading queue details...</p>
          </div>
        </div>
      }>
        <JoinFlowContent />
      </Suspense>
    </main>
  );
}
