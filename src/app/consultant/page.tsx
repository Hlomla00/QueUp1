
"use client"

import React, { useState } from 'react';
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
   BarChart3
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

const INITIAL_QUEUE = [
  { id: '1', num: 'B-048', name: 'Sipho Mokoena', cat: 'Smart ID', wait: '2h 10m', channel: 'HOME', priority: false },
  { id: '2', num: 'P-001', name: 'Fatima Adams', cat: 'Passport', wait: '15m', channel: 'KIOSK', priority: true },
  { id: '3', num: 'B-049', name: 'Thandi Nkosi', cat: 'Smart ID', wait: '1h 55m', channel: 'QR', priority: false },
  { id: '4', num: 'B-050', name: 'Yusuf Jacobs', cat: 'Birth Cert', wait: '1h 40m', channel: 'KIOSK', priority: false },
];

const DIGITAL_CONGESTION_DATA = [
   { time: '08:00', total: 12, qr: 7, home: 5 },
   { time: '09:00', total: 21, qr: 12, home: 9 },
   { time: '10:00', total: 33, qr: 19, home: 14 },
   { time: '11:00', total: 41, qr: 24, home: 17 },
   { time: '12:00', total: 38, qr: 22, home: 16 },
   { time: '13:00', total: 29, qr: 16, home: 13 },
   { time: '14:00', total: 24, qr: 13, home: 11 },
   { time: '15:00', total: 18, qr: 10, home: 8 },
];

const DIGITAL_HEATMAP = [
   ['bg-green-500/40', 'bg-yellow-500/40', 'bg-red-500/40', 'bg-red-500/40', 'bg-yellow-500/40'],
   ['bg-green-500/40', 'bg-yellow-500/40', 'bg-yellow-500/40', 'bg-red-500/40', 'bg-yellow-500/40'],
   ['bg-yellow-500/40', 'bg-red-500/40', 'bg-red-500/40', 'bg-yellow-500/40', 'bg-green-500/40'],
   ['bg-green-500/40', 'bg-green-500/40', 'bg-yellow-500/40', 'bg-yellow-500/40', 'bg-green-500/40'],
];

export default function ConsultantDashboard() {
  const { toast } = useToast();
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [serving, setServing] = useState<any>({
    num: 'B-047',
    name: 'Nomsa Dlamini',
    id: '830112*****',
    cat: 'Smart ID Application',
    wait: '2h 14m',
    channel: 'HOME',
    priority: true
  });

   const digitalTicketsLive = [serving, ...queue].filter((t) => t.channel === 'QR' || t.channel === 'HOME').length;

  const handleCallNext = () => {
    if (queue.length === 0) {
      toast({
        title: "Queue Empty",
        description: "There are no more citizens waiting in the queue.",
      });
      return;
    }

    const next = queue[0];
    setServing({
      num: next.num,
      name: next.name,
      id: '********',
      cat: next.cat,
      wait: next.wait,
      channel: next.channel,
      priority: next.priority
    });
    setQueue(prev => prev.slice(1));
    
    toast({
      title: "Calling Ticket",
      description: `Now calling ${next.num} to Counter 3.`,
    });
  };

  const handleMarkServed = () => {
    toast({
      title: "Citizen Served",
      description: `${serving.num} has been successfully assisted.`,
    });
    // For demo: call next automatically or wait for next button
  };

  const handleNoShow = () => {
    toast({
      variant: "destructive",
      title: "No Show Logged",
      description: `${serving.num} was not present at the counter.`,
    });
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
              <h1 className="font-headline font-extrabold text-xl">Home Affairs Bellville</h1>
              <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5">System Online</Badge>
           </div>
           <div className="flex items-center space-x-4">
              <div className="text-right">
                 <p className="text-xs text-muted-foreground font-bold">Current Time</p>
                 <p className="text-sm font-bold">11:42 AM</p>
              </div>
           </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
           {/* Stats Row */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatItem label="In Queue Now" value={String(queue.length + 1)} />
              <StatItem label="Serving Now" value={serving.num} />
              <StatItem label="Avg Wait Today" value="34m" />
           </div>

                {/* Digital Tickets Analytics */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                     <Card className="p-6 bg-card border-white/5 space-y-4">
                         <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Digital Tickets Dashboard</p>
                                 <h3 className="text-2xl font-headline font-extrabold flex items-center"><BarChart3 className="h-5 w-5 mr-2 text-primary" />Congestion Trend</h3>
                              </div>
                              <Badge variant="outline" className="border-primary/30 text-primary">Live: {digitalTicketsLive}</Badge>
                         </div>
                         <div className="h-[240px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={DIGITAL_CONGESTION_DATA}>
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
                         </div>
                         <p className="text-xs text-muted-foreground">Includes all digital tickets from <strong>QR scan</strong> and <strong>home signup</strong> channels.</p>
                     </Card>

                     <Card className="p-6 bg-card border-white/5 space-y-4">
                         <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Digital Heatmap</p>
                              <h3 className="text-2xl font-headline font-extrabold">Weekly Congestion (QR + Home)</h3>
                         </div>
                         <div className="grid grid-cols-6 gap-2">
                              <div className="h-8"></div>
                              {['M', 'T', 'W', 'T', 'F'].map((d) => (
                                 <div key={d} className="flex items-center justify-center text-xs font-bold">{d}</div>
                              ))}
                              {['08', '10', '12', '14'].map((h, hIdx) => (
                                 <React.Fragment key={h}>
                                    <div className="flex items-center text-[10px] text-muted-foreground font-bold">{h}:00</div>
                                    {[0, 1, 2, 3, 4].map((dIdx) => (
                                       <div key={`${h}-${dIdx}`} className={`h-8 rounded-md ${DIGITAL_HEATMAP[hIdx][dIdx]}`} />
                                    ))}
                                 </React.Fragment>
                              ))}
                         </div>
                         <p className="text-[10px] text-muted-foreground">Color intensity indicates digital-ticket congestion level by hour/day.</p>
                     </Card>
                </div>

           <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Serving Panel */}
              <div className="xl:col-span-2 space-y-6">
                 <Card className="p-8 border-primary border-2 bg-card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 flex space-x-2">
                       {serving.priority && <Badge className="bg-primary text-primary-foreground">PRIORITY</Badge>}
                       <Badge variant="outline" className="border-white/10">{serving.channel}</Badge>
                    </div>

                    <div className="space-y-8">
                       <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-widest text-primary">Now Serving</p>
                          <div className="text-8xl font-headline font-extrabold leading-none">{serving.num}</div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                             <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-bold uppercase">Citizen Name</p>
                                <p className="text-2xl font-headline font-bold">{serving.name}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-bold uppercase">Service Category</p>
                                <p className="text-xl font-body font-bold">{serving.cat}</p>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-bold uppercase">ID Number</p>
                                <p className="text-2xl font-headline font-bold">{serving.id}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-bold uppercase">Time Waiting</p>
                                <p className="text-xl font-body font-bold text-primary">{serving.wait}</p>
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
                          <Button size="lg" variant="outline" className="h-16 px-8 border-white/10 font-bold rounded-2xl flex-1">
                             <RotateCcw className="mr-2" /> Defer
                          </Button>
                       </div>
                    </div>
                 </Card>

                 <Button 
                   size="lg" 
                   className="w-full h-20 text-3xl font-headline font-extrabold bg-primary text-primary-foreground rounded-3xl shadow-2xl shadow-primary/20"
                   onClick={handleCallNext}
                 >
                    CALL NEXT <Play className="ml-4 h-8 w-8 fill-current" />
                 </Button>
              </div>

              {/* Queue List Panel */}
              <div className="space-y-6">
                 <Card className="p-6 bg-card border-white/5 space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                       <h3 className="font-headline font-bold text-xl">Upcoming Queue</h3>
                       <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="h-10 pl-9 w-40 bg-white/5" placeholder="Search name" />
                       </div>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2 scrollbar-hide">
                       {queue.map(ticket => (
                          <div key={ticket.id} className={`p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 ${ticket.priority ? 'border-primary/50' : ''}`}>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                   <span className="font-headline font-extrabold text-xl">{ticket.num}</span>
                                   {ticket.priority && <Star className="h-4 w-4 fill-primary text-primary" />}
                                </div>
                                <Badge variant="outline" className="text-[10px] opacity-60">{ticket.channel}</Badge>
                             </div>
                             <div className="flex justify-between items-end">
                                <div>
                                   <p className="font-bold text-sm">{ticket.name}</p>
                                   <p className="text-xs text-muted-foreground">{ticket.cat}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] text-muted-foreground font-bold">WAITING</p>
                                   <p className="text-sm font-bold text-primary">{ticket.wait}</p>
                                </div>
                             </div>
                             <div className="flex space-x-2 pt-2 border-t border-white/5">
                                <Button size="sm" className="flex-1 h-8 text-xs font-bold rounded-lg bg-primary text-primary-foreground">Call</Button>
                                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-bold rounded-lg border-white/10">Skip</Button>
                             </div>
                          </div>
                       ))}
                    </div>
                 </Card>
              </div>
           </div>
        </div>
      </section>
    </main>
  );
}

function NavButton({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <Button 
      variant="ghost" 
      className={`w-full justify-start h-12 rounded-xl transition-all ${
        active ? 'bg-primary text-primary-foreground hover:bg-primary' : 'hover:bg-white/5 text-muted-foreground hover:text-white'
      }`}
    >
      {React.cloneElement(icon, { className: 'h-5 w-5 mr-3' })}
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
