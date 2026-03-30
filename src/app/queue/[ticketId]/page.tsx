"use client"

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Bell, Share2, MapPin, AlertTriangle, X, Info, Clock, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import type { QueueTicket, Branch } from '@/lib/firestore';

export default function QueueDashboard() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.ticketId as string;
  const { toast } = useToast();

  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [waitingAhead, setWaitingAhead] = useState<number>(0);
  const [showCallOverlay, setShowCallOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load ticket once
  useEffect(() => {
    if (!ticketId) return;

    fetch(`/api/ticket/${ticketId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError('Ticket not found. It may have expired or been removed.');
        } else {
          setTicket(data.ticket);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load ticket. Please check your connection.');
        setLoading(false);
      });
  }, [ticketId]);

  // Subscribe to branch live data once we have the branchId
  useEffect(() => {
    if (!ticket?.branchId) return;

    const unsub = onSnapshot(
      doc(db, 'branches', ticket.branchId),
      (snap) => {
        if (snap.exists()) {
          setBranch({ id: snap.id, ...snap.data() } as Branch);
        }
      }
    );
    return () => unsub();
  }, [ticket?.branchId]);

  // Subscribe to the live queue to calculate position ahead of this ticket
  useEffect(() => {
    if (!ticket?.branchId || !ticket?.sessionId) return;

    const q = query(
      collection(db, 'queueTickets'),
      where('sessionId', '==', ticket.sessionId),
      where('status', 'in', ['WAITING', 'CALLED']),
      orderBy('issuedAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const tickets = snap.docs.map(d => d.data() as QueueTicket);
      const myIdx = tickets.findIndex(t => (t as QueueTicket & { ticketId?: string }).ticketId === ticketId || snap.docs.find(d => d.id === ticketId));
      const myDocIdx = snap.docs.findIndex(d => d.id === ticketId);
      setWaitingAhead(myDocIdx > 0 ? myDocIdx : 0);
    });
    return () => unsub();
  }, [ticket?.branchId, ticket?.sessionId, ticketId]);

  // Subscribe to ticket status for real-time "Your Turn" trigger
  useEffect(() => {
    if (!ticketId) return;

    const unsub = onSnapshot(doc(db, 'queueTickets', ticketId), (snap) => {
      if (snap.exists()) {
        const t = { ticketId: snap.id, ...snap.data() } as QueueTicket;
        setTicket(t);
        if (t.status === 'CALLED') {
          setShowCallOverlay(true);
        }
      }
    });
    return () => unsub();
  }, [ticketId]);

  const handleLeaveQueue = async () => {
    await fetch(`/api/ticket/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    toast({
      variant: "destructive",
      title: "Left Queue",
      description: "You have been removed from the queue.",
    });
    router.push('/');
  };

  const handleSharePosition = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    toast({
      title: "Link Copied",
      description: "Shareable queue status link copied to clipboard.",
    });
  };

  const formatWait = (minutes: number) => {
    if (!minutes) return '—';
    if (minutes < 60) return `~${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background pt-16 pb-24 flex items-center justify-center">
        <Navbar />
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-headline font-bold">Loading your ticket...</p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="min-h-screen bg-background pt-16 pb-24">
        <Navbar />
        <div className="container mx-auto px-4 max-w-2xl py-16 text-center space-y-4">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-headline font-bold">Ticket Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/')} className="rounded-full">Return Home</Button>
        </div>
      </main>
    );
  }

  const totalQueue = branch?.currentQueue ?? ticket.queuePositionAtIssue;
  const progressPct = totalQueue > 0
    ? Math.min(100, Math.round(((totalQueue - waitingAhead) / totalQueue) * 100))
    : 50;

  const issuedAt = ticket.issuedAt
    ? new Date((ticket.issuedAt as unknown as { seconds: number }).seconds * 1000)
        .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const issuedDate = ticket.issuedAt
    ? new Date((ticket.issuedAt as unknown as { seconds: number }).seconds * 1000)
        .toLocaleDateString()
    : '';

  const serviceLabels: Record<string, string> = {
    SMART_ID: 'Smart ID Application',
    PASSPORT: 'Passport Services',
    BIRTH_CERTIFICATE: 'Birth Certificate',
    TAX_QUERY: 'Tax Query',
    SASSA: 'SASSA Grant',
    MUNICIPAL_RATES: 'Municipal Rates',
    OTHER: 'Other Service',
  };

  return (
    <main className="min-h-screen bg-background pt-16 pb-24">
      <Navbar />

      <div className="container mx-auto px-4 md:px-8 space-y-6 py-8 max-w-2xl">
        {/* Live Pulse Indicator */}
        <div className="flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span>Live Queue Stream</span>
        </div>

        {/* Ticket Header */}
        <Card className="p-8 border-primary border-2 bg-card relative overflow-hidden text-center space-y-4">
          {ticket.isPriority && (
            <div className="absolute top-0 right-0 p-4">
               <Badge className="bg-primary text-primary-foreground font-bold">PRIORITY</Badge>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Your Ticket</p>
            <h1 className="text-8xl font-headline font-extrabold text-foreground">{ticket.ticketNumber}</h1>
          </div>

          <div className="space-y-1">
            <p className="text-xl font-headline font-bold">{ticket.citizenName}</p>
            <p className="text-sm text-muted-foreground">
              {branch?.name ?? ticket.branchId} • {serviceLabels[ticket.category] ?? ticket.category}
            </p>
          </div>

          <div className="text-left text-sm space-y-3 border-t border-white/10 pt-4">
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <p className="font-bold uppercase text-muted-foreground">Date</p>
                <p className="font-semibold">{issuedDate}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> Issued
                </p>
                <p className="font-semibold">{issuedAt}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-muted-foreground">Est. Wait</p>
                <p className="font-semibold text-primary">{formatWait(branch?.estimatedWait ?? ticket.estimatedWait)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 gap-4">
           <Card className="p-6 bg-card border-white/5 space-y-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ahead of You</p>
              <div className="text-4xl font-headline font-extrabold text-foreground">{waitingAhead}</div>
           </Card>
           <Card className="p-6 bg-card border-white/5 space-y-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. Wait</p>
              <div className="text-4xl font-headline font-extrabold text-foreground">{formatWait(branch?.estimatedWait ?? ticket.estimatedWait)}</div>
           </Card>
        </div>

        {/* Progress */}
        <Card className="p-6 bg-card border-white/5 space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-bold">Queue Position</p>
              <p className="text-2xl font-headline font-bold">
                {waitingAhead === 0 ? "You're next!" : `${waitingAhead} people ahead`}
              </p>
            </div>
            <p className="text-xs text-primary font-bold">{progressPct}% to turn</p>
          </div>
          <div className="relative pt-1">
            <Progress value={progressPct} className="h-3 bg-white/5" />
            <motion.div
               className="absolute top-0 -mt-6"
               style={{ right: `${100 - progressPct}%` }}
               animate={{ y: [0, -5, 0] }}
               transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded">YOU</div>
            </motion.div>
          </div>
          {branch?.congestionLevel === 'LOW' && (
            <p className="text-[10px] text-muted-foreground text-center">The queue is moving faster than usual. Stay close to the branch!</p>
          )}
          {branch?.surgeProbability && branch.surgeProbability > 60 && (
            <p className="text-[10px] text-amber-400 text-center">Surge detected — the queue may grow in the next hour.</p>
          )}
        </Card>

        {/* Notifications Status */}
        <Card className="p-4 bg-primary/5 border-primary/20 flex items-center space-x-4">
          <div className="p-3 bg-primary rounded-xl">
             <Bell className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Notifications Active</p>
            <p className="text-xs text-muted-foreground">We&apos;ll notify you at 10 and 5 people remaining.</p>
          </div>
          <div className="w-10 h-6 bg-primary rounded-full relative p-1 cursor-pointer">
             <div className="w-4 h-4 bg-primary-foreground rounded-full absolute right-1"></div>
          </div>
        </Card>

        {/* Branch AI Recommendation */}
        {branch?.bestTimeToVisit && (
          <Card className="p-4 bg-card border-white/5 flex items-start space-x-4">
            <div className="p-3 bg-primary/20 rounded-xl">
               <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Best Time at This Branch</p>
              <p className="text-xs text-muted-foreground">{branch.bestTimeToVisit}</p>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-4">
           <Button variant="outline" className="h-14 rounded-full border-white/10 hover:bg-white/5 space-x-2" onClick={handleSharePosition}>
              <Share2 className="h-4 w-4" />
              <span>Share Position</span>
           </Button>
           <Button variant="outline" className="h-14 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleLeaveQueue}>
              Leave Queue
           </Button>
        </div>
      </div>

      {/* Your Turn Overlay */}
      <AnimatePresence>
        {showCallOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-primary-foreground animate-pulse">IT&apos;S YOUR TURN!</h2>
                <div className="text-9xl font-headline font-extrabold text-primary-foreground">{ticket.ticketNumber}</div>
              </div>

              <div className="space-y-4">
                <p className="text-2xl font-headline font-bold text-primary-foreground/90">Please proceed to the counter</p>
              </div>

              <Button
                onClick={() => setShowCallOverlay(false)}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold text-xl h-16 w-full rounded-full shadow-2xl"
              >
                I&apos;m here!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
