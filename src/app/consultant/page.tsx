"use client"

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Clock,
  CheckCircle2,
  UserMinus,
  RotateCcw,
  Play,
  Search,
  LayoutDashboard,
  History,
  Settings,
  LogOut,
  Star,
  BarChart3,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  type DocumentData
} from 'firebase/firestore';
import type { QueueTicket, Branch, AnalyticsSnapshot } from '@/lib/firestore';

const BRANCH_ID = 'ha-bellville';

// Map ServiceCategory to readable label
const SERVICE_LABELS: Record<string, string> = {
  SMART_ID: 'Smart ID',
  PASSPORT: 'Passport',
  BIRTH_CERTIFICATE: 'Birth Cert',
  TAX_QUERY: 'Tax Query',
  SASSA: 'SASSA',
  MUNICIPAL_RATES: 'Rates',
  OTHER: 'Other',
};

// Build hourly chart data from Firestore analytics snapshots
function buildChartData(history: AnalyticsSnapshot[]) {
  const byHour: Record<string, number[]> = {};
  history.forEach(s => {
    const key = `${String(s.hourOfDay).padStart(2, '0')}:00`;
    if (!byHour[key]) byHour[key] = [];
    byHour[key].push(s.queueCount);
  });
  return Object.entries(byHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, counts]) => ({
      time,
      total: Math.round(counts.reduce((s, c) => s + c, 0) / counts.length),
    }));
}

export default function ConsultantDashboard() {
  const { toast } = useToast();

  const [branch, setBranch] = useState<Branch | null>(null);
  const [waitingQueue, setWaitingQueue] = useState<QueueTicket[]>([]);
  const [servingTicket, setServingTicket] = useState<QueueTicket | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{ time: string; total: number }[]>([]);
  const [connected, setConnected] = useState(true);
  const [search, setSearch] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Live clock
  useEffect(() => {
    const tick = () =>
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to branch document
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'branches', BRANCH_ID),
      snap => {
        setConnected(true);
        if (snap.exists()) setBranch({ id: snap.id, ...snap.data() } as Branch);
      },
      () => setConnected(false)
    );
    return () => unsub();
  }, []);

  // Subscribe to today's active ticket queue
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const sessionId = `${BRANCH_ID}_${today}`;
    const q = query(
      collection(db, 'queueTickets'),
      where('sessionId', '==', sessionId),
      where('status', 'in', ['WAITING', 'CALLED']),
      orderBy('isPriority', 'desc'),
      orderBy('issuedAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      const tickets = snap.docs.map(d => ({ ticketId: d.id, ...d.data() } as QueueTicket));
      const called = tickets.find(t => t.status === 'CALLED');
      const waiting = tickets.filter(t => t.status === 'WAITING');
      setServingTicket(called ?? null);
      setWaitingQueue(waiting);
    });
    return () => unsub();
  }, []);

  // Fetch analytics history for chart (non-real-time, refresh on mount)
  useEffect(() => {
    fetch(`/api/analytics?branchId=${BRANCH_ID}`)
      .then(r => r.json())
      .then(data => {
        if (data.history) setAnalyticsData(buildChartData(data.history));
      })
      .catch(() => {});
  }, []);

  const handleCallNext = async () => {
    if (waitingQueue.length === 0) {
      toast({ title: 'Queue Empty', description: 'There are no more citizens waiting.' });
      return;
    }
    const next = waitingQueue[0];
    await fetch(`/api/ticket/${next.ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CALLED' }),
    });
    toast({ title: 'Calling Ticket', description: `Now calling ${next.ticketNumber} to the counter.` });
  };

  const handleMarkServed = async () => {
    if (!servingTicket) return;
    await fetch(`/api/ticket/${servingTicket.ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SERVED' }),
    });
    toast({ title: 'Citizen Served', description: `${servingTicket.ticketNumber} has been successfully assisted.` });
  };

  const handleNoShow = async () => {
    if (!servingTicket) return;
    await fetch(`/api/ticket/${servingTicket.ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'NO_SHOW' }),
    });
    toast({ variant: 'destructive', title: 'No Show Logged', description: `${servingTicket.ticketNumber} was not present.` });
  };

  const handleCallTicket = async (ticket: QueueTicket) => {
    await fetch(`/api/ticket/${ticket.ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CALLED' }),
    });
    toast({ title: 'Calling Ticket', description: `Calling ${ticket.ticketNumber}.` });
  };

  const filteredQueue = search
    ? waitingQueue.filter(t =>
        t.citizenName.toLowerCase().includes(search.toLowerCase()) ||
        t.ticketNumber.toLowerCase().includes(search.toLowerCase())
      )
    : waitingQueue;

  const formatIssuedAt = (ticket: QueueTicket) => {
    try {
      const secs = (ticket.issuedAt as unknown as { seconds: number }).seconds;
      if (!secs) return '—';
      const diff = Math.round((Date.now() / 1000 - secs) / 60);
      return diff < 60 ? `${diff}m ago` : `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
    } catch {
      return '—';
    }
  };

  return (
    <main className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-white/5 hidden lg:flex lg:flex-col">
        <div className="p-8">
           <div className="flex items-baseline space-x-0.5">
             <span className="text-2xl font-headline font-extrabold">Que</span>
             <span className="text-2xl font-headline font-extrabold text-primary">Up</span>
           </div>
        </div>

        <div className="p-6 space-y-1">
           <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4 mb-4">Branch Management</div>
           <NavButton active icon={<LayoutDashboard />} label="Dashboard" />
           <NavButton icon={<Users />} label="Queue" />
           <NavButton icon={<History />} label="History" />
           <NavButton icon={<Settings />} label="Settings" />
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
           <div className="flex items-center space-x-3 mb-6 px-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">SN</div>
              <div className="space-y-0.5">
                 <p className="text-sm font-bold">Sipho Nkosi</p>
                 <p className="text-[10px] text-muted-foreground font-bold uppercase">Counter 3</p>
              </div>
           </div>
           <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-white/5 bg-card/50 px-8 flex items-center justify-between">
           <div className="flex items-center space-x-4">
              <h1 className="font-headline font-extrabold text-xl">{branch?.name ?? 'Home Affairs Bellville'}</h1>
              <Badge
                variant="outline"
                className={connected
                  ? 'text-green-500 border-green-500/20 bg-green-500/5'
                  : 'text-red-500 border-red-500/20 bg-red-500/5'}
              >
                {connected ? (
                  <><Wifi className="h-3 w-3 mr-1" /> Live</>
                ) : (
                  <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                )}
              </Badge>
              {branch && (
                <Badge
                  variant="outline"
                  className={
                    branch.branchStatus === 'FULL'
                      ? 'text-red-500 border-red-500/20'
                      : branch.congestionLevel === 'HIGH'
                      ? 'text-amber-400 border-amber-400/20'
                      : 'text-green-500 border-green-500/20'
                  }
                >
                  {branch.branchStatus === 'FULL' ? 'FULL' : branch.congestionLevel}
                </Badge>
              )}
           </div>
           <div className="flex items-center space-x-4">
              <div className="text-right">
                 <p className="text-xs text-muted-foreground font-bold">Current Time</p>
                 <p className="text-sm font-bold">{currentTime}</p>
              </div>
           </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
           {/* Stats Row */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatItem label="In Queue Now" value={String(waitingQueue.length)} />
              <StatItem label="Serving Now" value={servingTicket?.ticketNumber ?? '—'} />
              <StatItem label="Est. Wait" value={branch ? `${branch.estimatedWait}m` : '—'} />
              <StatItem label="Capacity" value={branch ? `${branch.currentQueue}/${branch.dailyCapacity}` : '—'} />
           </div>

           {/* Analytics Chart */}
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card className="p-6 bg-card border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                         <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Analytics Dashboard</p>
                            <h3 className="text-2xl font-headline font-extrabold flex items-center"><BarChart3 className="h-5 w-5 mr-2 text-primary" />Congestion Trend</h3>
                         </div>
                         <Badge variant="outline" className="border-primary/30 text-primary">Live: {branch?.currentQueue ?? 0}</Badge>
                    </div>
                    <div className="h-[240px] w-full">
                         {analyticsData.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analyticsData}>
                                 <defs>
                                    <linearGradient id="digitalCongestion" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/>
                                       <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                 <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#digitalCongestion)" />
                              </AreaChart>
                           </ResponsiveContainer>
                         ) : (
                           <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                             No analytics data yet. Issue some tickets to see trends.
                           </div>
                         )}
                    </div>
                    <p className="text-xs text-muted-foreground">Live from Firestore analytics collection.</p>
                </Card>

                <Card className="p-6 bg-card border-white/5 space-y-4">
                    <div>
                         <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI Intelligence</p>
                         <h3 className="text-2xl font-headline font-extrabold">Branch Status</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                        <span className="text-sm font-bold text-muted-foreground">Surge Probability</span>
                        <span className="font-headline font-extrabold text-xl">
                          {branch?.surgeProbability != null ? `${branch.surgeProbability}%` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                        <span className="text-sm font-bold text-muted-foreground">Congestion Level</span>
                        <Badge className={
                          branch?.congestionLevel === 'HIGH' ? 'bg-red-500' :
                          branch?.congestionLevel === 'MODERATE' ? 'bg-amber-500' :
                          'bg-green-500'
                        }>
                          {branch?.congestionLevel ?? '—'}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Best Time to Visit</span>
                        <p className="text-sm font-bold">{branch?.bestTimeToVisit ?? 'Calculating...'}</p>
                      </div>
                    </div>
                </Card>
           </div>

           <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Serving Panel */}
              <div className="xl:col-span-2 space-y-6">
                 <Card className="p-8 border-primary border-2 bg-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 flex space-x-2">
                       {servingTicket?.isPriority && <Badge className="bg-primary text-primary-foreground">PRIORITY</Badge>}
                       {servingTicket && <Badge variant="outline" className="border-white/10">{servingTicket.channel}</Badge>}
                    </div>

                    {servingTicket ? (
                      <div className="space-y-8">
                         <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-primary">Now Serving</p>
                            <div className="text-8xl font-headline font-extrabold leading-none">{servingTicket.ticketNumber}</div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground font-bold uppercase">Citizen Name</p>
                                  <p className="text-2xl font-headline font-bold">{servingTicket.citizenName}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground font-bold uppercase">Service Category</p>
                                  <p className="text-xl font-bold">{SERVICE_LABELS[servingTicket.category] ?? servingTicket.category}</p>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground font-bold uppercase">Channel</p>
                                  <p className="text-2xl font-headline font-bold">{servingTicket.channel}</p>
                               </div>
                               <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground font-bold uppercase">Waiting Since</p>
                                  <p className="text-xl font-bold text-primary">{formatIssuedAt(servingTicket)}</p>
                               </div>
                            </div>
                         </div>

                         <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                            <Button size="lg" className="h-16 px-8 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl flex-1" onClick={handleMarkServed}>
                               <CheckCircle2 className="mr-2" /> Mark as Served
                            </Button>
                            <Button size="lg" className="h-16 px-8 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-2xl flex-1" onClick={handleNoShow}>
                               <UserMinus className="mr-2" /> No Show
                            </Button>
                         </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground space-y-2">
                        <Users className="h-12 w-12 mx-auto opacity-30" />
                        <p className="font-headline font-bold">No citizen is currently being served.</p>
                        <p className="text-sm">Press CALL NEXT to serve the first person in queue.</p>
                      </div>
                    )}
                 </Card>

                 <Button
                   size="lg"
                   className="w-full h-20 text-3xl font-headline font-extrabold bg-primary text-primary-foreground rounded-3xl shadow-2xl shadow-primary/20"
                   onClick={handleCallNext}
                   disabled={waitingQueue.length === 0}
                 >
                    {waitingQueue.length === 0 ? 'Queue Empty' : (
                      <>CALL NEXT <Play className="ml-4 h-8 w-8 fill-current" /></>
                    )}
                 </Button>
              </div>

              {/* Queue List Panel */}
              <div className="space-y-6">
                 <Card className="p-6 bg-card border-white/5 space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                       <h3 className="font-headline font-bold text-xl">Upcoming Queue</h3>
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="h-10 pl-9 w-40 bg-white/5"
                            placeholder="Search name"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                          />
                       </div>
                    </div>

                    {filteredQueue.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                        {search ? 'No tickets match your search.' : 'Queue is empty.'}
                      </div>
                    ) : (
                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2">
                         {filteredQueue.map((t) => (
                            <div key={t.ticketId} className={`p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 ${t.isPriority ? 'border-primary/50' : ''}`}>
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                     <span className="font-headline font-extrabold text-xl">{t.ticketNumber}</span>
                                     {t.isPriority && <Star className="h-4 w-4 fill-primary text-primary" />}
                                  </div>
                                  <Badge variant="outline" className="text-[10px] opacity-60">{t.channel}</Badge>
                               </div>
                               <div className="flex justify-between items-end">
                                  <div>
                                     <p className="font-bold text-sm">{t.citizenName}</p>
                                     <p className="text-xs text-muted-foreground">{SERVICE_LABELS[t.category] ?? t.category}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[10px] text-muted-foreground font-bold">WAITING</p>
                                     <p className="text-sm font-bold text-primary">{formatIssuedAt(t)}</p>
                                  </div>
                               </div>
                               <div className="flex space-x-2 pt-2 border-t border-white/5">
                                  <Button size="sm" className="flex-1 h-8 text-xs font-bold rounded-lg bg-primary text-primary-foreground" onClick={() => handleCallTicket(t)}>Call</Button>
                               </div>
                            </div>
                         ))}
                      </div>
                    )}
                 </Card>
              </div>
           </div>
        </div>
      </section>
    </main>
  );
}

function NavButton({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start h-12 rounded-xl transition-all ${
        active ? 'bg-primary text-primary-foreground hover:bg-primary' : 'hover:bg-white/5 text-muted-foreground hover:text-white'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5 mr-3' })}
      <span className="font-bold">{label}</span>
    </Button>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <Card className="p-6 bg-card border-white/5 space-y-1">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="text-4xl font-headline font-extrabold text-foreground">{value}</div>
    </Card>
  );
}
