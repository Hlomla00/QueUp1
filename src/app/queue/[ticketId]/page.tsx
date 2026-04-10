"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Bell, Share2, AlertTriangle, X, Info, Clock, Loader2, Home, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  doc, onSnapshot, collection, query, where, orderBy, getDocs,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketData = {
  ticketId: string;
  ticketNumber: string;
  branchId: string;
  branchName?: string;
  sessionId?: string;
  citizenName: string;
  category: string;
  serviceLabel?: string;
  departmentName?: string;
  status: string;
  isPriority?: boolean;
  estimatedWait: number;
  queuePositionAtIssue: number;
  issuedAt: { seconds: number; nanoseconds: number } | null;
  calledAt?: { seconds: number; nanoseconds: number } | null;
};

type BranchData = {
  id: string;
  name: string;
  estimatedWait?: number;
  congestionLevel?: string;
  surgeProbability?: number;
  bestTimeToVisit?: string;
  currentQueue?: number;
  nowServing?: string | null;
};

const SERVICE_LABELS: Record<string, string> = {
  SMART_ID: 'Smart ID Application',
  PASSPORT: 'Passport Services',
  BIRTH_CERTIFICATE: 'Birth Certificate',
  TAX_QUERY: 'Tax Query',
  SASSA: 'SASSA Grant',
  MUNICIPAL_RATES: 'Municipal Services',
  OTHER: 'General Service',
};

function formatWait(minutes: number) {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `~${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

// ─── Queue Tracker ────────────────────────────────────────────────────────────

export default function QueueDashboard() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.ticketId as string;
  const { toast } = useToast();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [branch, setBranch] = useState<BranchData | null>(null);
  const [waitingAhead, setWaitingAhead] = useState<number>(0);
  const [showCallOverlay, setShowCallOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoOffset, setDemoOffset] = useState(0); // auto-advance counter

  // Demo auto-advance: every 30 seconds, queue moves forward by 1
  const demoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    demoIntervalRef.current = setInterval(() => {
      setDemoOffset(prev => prev + 1);
    }, 30_000);
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, []);

  // Load ticket once via REST API
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

  // Subscribe to branch live data
  useEffect(() => {
    if (!ticket?.branchId) return;

    const unsub = onSnapshot(
      doc(db, 'branches', ticket.branchId),
      (snap) => {
        if (snap.exists()) {
          setBranch({ id: snap.id, ...snap.data() } as BranchData);
        }
      }
    );
    return () => unsub();
  }, [ticket?.branchId]);

  // Subscribe to ticket document for real-time status changes
  useEffect(() => {
    if (!ticketId) return;

    const unsub = onSnapshot(doc(db, 'queueTickets', ticketId), (snap) => {
      if (snap.exists()) {
        const t = { ticketId: snap.id, ...snap.data() } as TicketData;
        setTicket(t);
        if (t.status === 'CALLED') {
          setShowCallOverlay(true);
        }
      }
    }, () => {
      // Silently ignore listener errors (e.g. demo tickets not in Firestore)
    });
    return () => unsub();
  }, [ticketId]);

  // Subscribe to the live queue to count people ahead
  useEffect(() => {
    if (!ticket?.branchId) return;

    const today = new Date().toISOString().split('T')[0];
    const sessionId = ticket.sessionId ?? `${ticket.branchId}_${today}`;

    const q = query(
      collection(db, 'queueTickets'),
      where('branchId', '==', ticket.branchId),
      where('sessionId', '==', sessionId),
      where('status', '==', 'WAITING'),
      orderBy('queuePositionAtIssue', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const myDocIdx = snap.docs.findIndex(d => d.id === ticketId);
      if (myDocIdx >= 0) {
        setWaitingAhead(myDocIdx);
      } else {
        // Fallback: use position from ticket data minus demo offset
        const pos = Math.max(0, (ticket.queuePositionAtIssue ?? 1) - 1 - demoOffset);
        setWaitingAhead(pos);
      }
    }, () => {
      // Fallback: use position from ticket data minus demo offset
      const pos = Math.max(0, (ticket.queuePositionAtIssue ?? 1) - 1 - demoOffset);
      setWaitingAhead(pos);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.branchId, ticket?.sessionId, ticketId]);

  // Apply demo offset to position
  const effectiveAhead = Math.max(0, waitingAhead - demoOffset);

  const handleLeaveQueue = async () => {
    await fetch(`/api/ticket/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    toast({
      variant: 'destructive',
      title: 'Left Queue',
      description: 'You have been removed from the queue.',
    });
    router.push('/');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    toast({ title: 'Link Copied', description: 'Shareable queue status link copied to clipboard.' });
  };

  // ── Loading / Error states ──
  if (loading) {
    return (
      <main className="min-h-screen bg-background pt-16 pb-24 flex items-center justify-center">
        <Navbar />
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-headline font-bold">Loading your ticket…</p>
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

  const branchName = branch?.name ?? ticket.branchName ?? ticket.branchId;
  const deptName = ticket.departmentName ?? '';
  const svcLabel = ticket.serviceLabel ?? SERVICE_LABELS[ticket.category] ?? ticket.category;
  const estimatedWait = branch?.estimatedWait ?? ticket.estimatedWait;
  const adjustedWait = Math.max(0, estimatedWait - demoOffset * 4);

  const totalQ = branch?.currentQueue ?? ticket.queuePositionAtIssue ?? 10;
  const progressPct = totalQ > 0
    ? Math.min(100, Math.round(((totalQ - effectiveAhead) / totalQ) * 100))
    : 50;

  const issuedAt = ticket.issuedAt?.seconds
    ? new Date(ticket.issuedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const issuedDate = ticket.issuedAt?.seconds
    ? new Date(ticket.issuedAt.seconds * 1000).toLocaleDateString()
    : '';

  return (
    <main className="min-h-screen bg-background pt-16 pb-24">
      <Navbar />

      <div className="container mx-auto px-4 md:px-8 space-y-5 py-8 max-w-2xl">

        {/* Live pulse */}
        <div className="flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span>Live Queue Stream</span>
        </div>

        {/* Ticket Header */}
        <Card className="p-8 border-primary border-2 bg-card relative overflow-hidden text-center space-y-4">
          {ticket.isPriority && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary text-primary-foreground font-bold">PRIORITY</Badge>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Your Ticket</p>
            <h1 className="text-8xl font-headline font-extrabold">{ticket.ticketNumber}</h1>
          </div>

          <div>
            <p className="text-xl font-headline font-bold">{ticket.citizenName}</p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {branchName}
            </p>
            {deptName && (
              <p className="text-xs text-primary font-bold mt-1 uppercase tracking-wide">{deptName} — {svcLabel}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-[11px] border-t border-white/10 pt-4 text-left">
            <div>
              <p className="font-bold uppercase text-muted-foreground">Date</p>
              <p className="font-semibold">{issuedDate}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> Issued
              </p>
              <p className="font-semibold">{issuedAt}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-muted-foreground">Est. Wait</p>
              <p className="font-semibold text-primary">{formatWait(adjustedWait)}</p>
            </div>
          </div>
        </Card>

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 bg-card border-white/5 space-y-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ahead of You</p>
            <div className="text-4xl font-headline font-extrabold">
              <AnimatePresence mode="wait">
                <motion.span key={effectiveAhead} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
                  {effectiveAhead}
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="text-xs text-muted-foreground">people</p>
          </Card>
          <Card className="p-6 bg-card border-white/5 space-y-1 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. Wait</p>
            <div className="text-4xl font-headline font-extrabold text-primary">
              <AnimatePresence mode="wait">
                <motion.span key={adjustedWait} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
                  {adjustedWait < 60 ? `${Math.max(0, adjustedWait)}m` : `${Math.floor(adjustedWait / 60)}h`}
                </motion.span>
              </AnimatePresence>
            </div>
            <p className="text-xs text-muted-foreground">approx</p>
          </Card>
        </div>

        {/* Progress bar */}
        <Card className="p-6 bg-card border-white/5 space-y-5">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">Queue Progress</p>
              <p className="text-xl font-headline font-bold mt-0.5">
                {effectiveAhead === 0 ? "You're next!" : `${effectiveAhead} ${effectiveAhead === 1 ? 'person' : 'people'} ahead`}
              </p>
            </div>
            <p className="text-xs text-primary font-bold">{progressPct}% complete</p>
          </div>
          <div className="relative pt-4">
            <Progress value={progressPct} className="h-3 bg-white/5" />
            <motion.div
              className="absolute top-0"
              style={{ left: `${Math.min(95, progressPct)}%` }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded -translate-x-1/2">YOU</div>
            </motion.div>
          </div>
          {branch?.congestionLevel === 'LOW' && (
            <p className="text-[10px] text-green-400 text-center">Queue is moving faster than usual. Stay close!</p>
          )}
          {branch?.surgeProbability && branch.surgeProbability > 60 && (
            <p className="text-[10px] text-amber-400 text-center">Surge detected — queue may grow in the next hour.</p>
          )}
          {demoOffset > 0 && (
            <p className="text-[10px] text-muted-foreground text-center">Queue auto-advanced {demoOffset} position{demoOffset > 1 ? 's' : ''} (demo mode)</p>
          )}
        </Card>

        {/* Branch info */}
        <Card className="p-4 bg-card border-white/5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/15 rounded-xl shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">{branchName}</p>
              {deptName && <p className="text-xs text-primary font-semibold">{deptName}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{svcLabel}</p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-4 bg-primary/5 border-primary/20 flex items-center space-x-4">
          <div className="p-2.5 bg-primary rounded-xl shrink-0">
            <Bell className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Notifications Active</p>
            <p className="text-xs text-muted-foreground">We&apos;ll alert you at 10 and 5 people remaining.</p>
          </div>
        </Card>

        {/* Best time tip */}
        {branch?.bestTimeToVisit && (
          <Card className="p-4 bg-card border-white/5 flex items-start space-x-3">
            <div className="p-2.5 bg-primary/20 rounded-xl shrink-0">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Best Time at This Branch</p>
              <p className="text-xs text-muted-foreground">{branch.bestTimeToVisit}</p>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-14 rounded-full border-white/10 hover:bg-white/5" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button variant="outline" className="h-14 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleLeaveQueue}>
            <X className="h-4 w-4 mr-2" /> Leave Queue
          </Button>
        </div>

        <Button variant="ghost" className="w-full h-12 rounded-full text-muted-foreground" onClick={() => router.push('/')}>
          <Home className="h-4 w-4 mr-2" /> Return Home
        </Button>

      </div>

      {/* Your Turn Overlay */}
      <AnimatePresence>
        {showCallOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }} className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-primary-foreground animate-pulse">
                  IT&apos;S YOUR TURN!
                </h2>
                <div className="text-9xl font-headline font-extrabold text-primary-foreground mt-4">{ticket.ticketNumber}</div>
              </div>
              <p className="text-2xl font-headline font-bold text-primary-foreground/90">Please proceed to the counter</p>
              <Button onClick={() => setShowCallOverlay(false)}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold text-xl h-16 w-full rounded-full shadow-2xl">
                I&apos;m here!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
