"use client"

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import {
  doc, onSnapshot, collection, query, where, orderBy, limit,
} from 'firebase/firestore';

type TicketDoc = {
  ticketId: string;
  ticketNumber: string;
  citizenName: string;
  status: string;
  queuePositionAtIssue: number;
  departmentName?: string;
  serviceLabel?: string;
};

type BranchDoc = {
  name: string;
  currentQueue?: number;
  nowServing?: string | null;
  estimatedWait?: number;
};

function TVDisplayContent() {
  const searchParams = useSearchParams();
  const branchId = searchParams?.get('branchId') ?? 'ha-bellville';

  const [time, setTime] = useState('');
  const [branch, setBranch] = useState<BranchDoc>({ name: 'Home Affairs Bellville' });
  const [nowServing, setNowServing] = useState<string>('—');
  const [calledName, setCalledName] = useState<string>('');
  const [nextTickets, setNextTickets] = useState<TicketDoc[]>([]);

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to branch document
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'branches', branchId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as BranchDoc;
        setBranch(data);
        if (data.nowServing) {
          setNowServing(data.nowServing);
        }
      }
    });
    return () => unsub();
  }, [branchId]);

  // Subscribe to CALLED tickets to show who's being served
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'queueTickets'),
      where('branchId', '==', branchId),
      where('sessionId', '==', `${branchId}_${today}`),
      where('status', '==', 'CALLED'),
      orderBy('calledAt', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data() as TicketDoc;
        setNowServing(d.ticketNumber);
        setCalledName(d.citizenName);
      }
    }, () => {
      // Silently ignore errors (e.g. index not ready)
    });
    return () => unsub();
  }, [branchId]);

  // Subscribe to next WAITING tickets
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'queueTickets'),
      where('branchId', '==', branchId),
      where('sessionId', '==', `${branchId}_${today}`),
      where('status', '==', 'WAITING'),
      orderBy('queuePositionAtIssue', 'asc'),
      limit(6)
    );
    const unsub = onSnapshot(q, (snap) => {
      const tickets = snap.docs.map(d => ({ ticketId: d.id, ...d.data() } as TicketDoc));
      setNextTickets(tickets);
    }, () => {
      // Silently ignore
    });
    return () => unsub();
  }, [branchId]);

  const nextUp = nextTickets[0];
  const upcoming = nextTickets.slice(1, 6);

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden font-headline">

      {/* Header */}
      <div className="h-28 px-12 border-b border-white/10 flex items-center justify-between bg-[#0A0A0A] shrink-0">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold">Que</span>
          <span className="text-5xl font-extrabold text-[#C4F135]">Up</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{branch.name}</h1>
          {branch.currentQueue !== undefined && (
            <p className="text-sm text-gray-400">{branch.currentQueue} in queue</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-5xl font-extrabold text-[#C4F135] tabular-nums">{time}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Now Serving Panel */}
        <div className="w-[68%] h-full flex flex-col items-center justify-center border-r border-white/10 p-16 relative">
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_center,_#C4F135_0%,_transparent_70%)]" />
          <div className="space-y-8 text-center relative z-10">
            <span className="text-4xl font-bold uppercase tracking-[0.4em] text-[#C4F135]">Now Serving</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={nowServing}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -80, opacity: 0 }}
                transition={{ duration: 0.7, type: 'spring' }}
                className="text-[20rem] font-extrabold leading-none tracking-tighter"
              >
                {nowServing}
              </motion.div>
            </AnimatePresence>
            {calledName && (
              <p className="text-5xl font-bold text-gray-300">{calledName}</p>
            )}
            <div className="text-5xl font-bold text-gray-400">
              Please proceed to <span className="text-white">Counter 01</span>
            </div>
          </div>
        </div>

        {/* Queue Panel */}
        <div className="w-[32%] h-full bg-[#050505] flex flex-col p-10">
          {nextUp ? (
            <div className="space-y-3 mb-8">
              <span className="text-2xl font-bold uppercase tracking-widest text-[#C4F135]">Next Up</span>
              <div className="text-8xl font-extrabold">{nextUp.ticketNumber}</div>
              {nextUp.citizenName && (
                <p className="text-xl text-gray-400">{nextUp.citizenName}</p>
              )}
            </div>
          ) : (
            <div className="mb-8">
              <span className="text-2xl font-bold uppercase tracking-widest text-[#C4F135]">Next Up</span>
              <div className="text-4xl font-extrabold text-gray-600 mt-2">—</div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-4 flex-1">
              <span className="text-lg font-bold uppercase tracking-widest text-gray-500">Coming Soon</span>
              <div className="space-y-3">
                {upcoming.map((t, i) => (
                  <motion.div key={t.ticketId}
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex justify-between items-center text-4xl font-bold pb-3 border-b border-white/5 last:border-0">
                    <span>{t.ticketNumber}</span>
                    <span className="text-lg text-gray-600 font-normal">Waiting</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Priority notice */}
          {nextTickets.some(t => t.ticketNumber?.startsWith('P-')) && (
            <div className="mt-auto bg-[#C4F135]/10 border border-[#C4F135]/30 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-[#C4F135] rounded-full flex items-center justify-center text-black text-2xl font-extrabold">P</div>
              <div>
                <p className="text-[#C4F135] font-extrabold text-lg uppercase tracking-widest">Priority Queue Active</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticker bar */}
      <div className="h-20 bg-[#C4F135] text-black flex items-center overflow-hidden shrink-0">
        <motion.div
          className="whitespace-nowrap text-3xl font-extrabold uppercase tracking-widest"
          animate={{ x: [0, -2000] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        >
          <span className="mr-32">QueUp Smart Queue Management · Join remotely at queup.co.za · {branch.name} Hours: Mon–Fri 08:00–15:30 · No waiting, just living · Your time matters · Save 2+ hours today</span>
          <span className="mr-32">QueUp Smart Queue Management · Join remotely at queup.co.za · {branch.name} Hours: Mon–Fri 08:00–15:30 · No waiting, just living · Your time matters · Save 2+ hours today</span>
        </motion.div>
      </div>
    </main>
  );
}

export default function TVDisplay() {
  return (
    <Suspense fallback={
      <main className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-4xl font-headline font-extrabold">Loading Display…</div>
      </main>
    }>
      <TVDisplayContent />
    </Suspense>
  );
}
