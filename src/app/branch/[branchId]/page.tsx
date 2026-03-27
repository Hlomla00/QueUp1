
"use client"

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Clock, Users, AlertCircle, Info, ChevronRight, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

const mockHistoricalData = [
  { time: '07:00', size: 5, avg: 10 },
  { time: '08:00', size: 15, avg: 25 },
  { time: '09:00', size: 35, avg: 45 },
  { time: '10:00', size: 42, avg: 50 },
  { time: '11:00', size: 55, avg: 52 },
  { time: '12:00', size: 68, avg: 60 },
  { time: '13:00', size: 45, avg: 48 },
  { time: '14:00', size: 30, avg: 35 },
  { time: '15:00', size: 20, avg: 22 },
];

export default function BranchDetail() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('live');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(interval);
  }, []);

  const branchName = "Home Affairs Bellville";
  const deptName = "Department of Home Affairs";

  return (
    <main className="min-h-screen bg-background pt-16">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-card border-b border-white/5 pt-12 pb-8 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-1">
                <p className="text-primary font-bold uppercase tracking-widest text-xs">{deptName}</p>
                <h1 className="text-4xl md:text-6xl font-headline font-extrabold">{branchName}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-primary" /> 123 Voortrekker Road, Bellville</div>
                <div className="flex items-center"><Clock className="h-4 w-4 mr-1 text-primary" /> Mon–Fri 08:00–15:30</div>
              </div>
            </div>
            
            <Button size="lg" className="h-14 px-8 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20">
              Join this queue
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
            <StatCard label="People in queue" value="47" sub="Updates live" />
            <StatCard label="Estimated wait" value="2.5 hrs" sub="Dynamic prediction" />
            <StatCard label="Congestion" value="HIGH" status="HIGH" />
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="container mx-auto px-4 md:px-8 py-12">
        <Tabs defaultValue="live" onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-card border border-white/5 p-1 h-14 rounded-full max-w-md">
            <TabsTrigger value="live" className="rounded-full h-full text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Live Queue</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-full h-full text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Analytics</TabsTrigger>
            <TabsTrigger value="services" className="rounded-full h-full text-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-8 border-primary/20 bg-primary/5">
                  <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="text-center md:text-left space-y-2">
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Currently Serving</p>
                      <div className="text-7xl md:text-9xl font-headline font-extrabold text-foreground">B-047</div>
                    </div>
                    <div className="flex flex-col justify-center space-y-4">
                      <div className="p-4 bg-background rounded-xl border border-white/5 flex items-center justify-between">
                        <span className="text-muted-foreground font-bold">Next Up:</span>
                        <span className="text-2xl font-headline font-extrabold">B-048</span>
                      </div>
                      <div className="p-4 bg-background rounded-xl border border-white/5 flex items-center justify-between">
                        <span className="text-muted-foreground font-bold">Last issued:</span>
                        <span className="text-2xl font-headline font-extrabold">B-089</span>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-xl font-headline font-bold">Upcoming Tickets</h3>
                  <div className="space-y-2">
                    {[49, 50, 51, 52, 53].map(n => (
                      <div key={n} className="p-4 bg-card rounded-xl border border-white/5 flex items-center justify-between hover:border-primary/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <span className="text-xl font-headline font-extrabold">B-0{n}</span>
                          <span className="text-sm text-muted-foreground">Smart ID Application</span>
                        </div>
                        <Badge variant="outline" className="border-foreground/20">Waiting</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="p-6 border-white/5 bg-card space-y-4">
                  <h3 className="font-headline font-bold flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" />
                    Queue Insights
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The queue is currently moving at a rate of approximately <strong>15 minutes per citizen</strong>. 
                    Lunch breaks start at 13:00, which may slow down serving times.
                  </p>
                  <Button variant="outline" className="w-full rounded-full border-primary text-primary hover:bg-primary/10">
                    Get Notify Settings
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 space-y-6">
                  <h3 className="text-2xl font-headline font-bold">Should you come now?</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockHistoricalData}>
                        <defs>
                          <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                        <Area type="monotone" dataKey="size" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSize)" />
                        <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeDasharray="5 5" fill="none" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center"><div className="w-3 h-3 bg-primary rounded-full mr-2" /> Today's Queue</div>
                    <div className="flex items-center"><div className="w-3 h-3 border border-primary border-dashed rounded-full mr-2" /> Historical Average</div>
                  </div>
                </Card>

                <div className="space-y-6">
                  <Card className="p-8 border-primary/50 bg-primary/5 space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary rounded-xl">
                        <AlertCircle className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-headline font-bold">Smart Recommendation</h3>
                        <p className="text-foreground/80">Historically, <strong>Wednesday afternoons (14:00–15:00)</strong> are the quietest at this branch. We recommend visiting then to minimize wait time.</p>
                      </div>
                    </div>
                    <Button className="w-full rounded-full bg-primary text-primary-foreground font-bold h-12">
                      Schedule Reminder
                    </Button>
                  </Card>
                  
                  <Card className="p-6 space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Weekly Heatmap</h4>
                    <div className="grid grid-cols-6 gap-2">
                      <div className="h-10"></div>
                      {['M','T','W','T','F'].map(d => <div key={d} className="flex items-center justify-center text-xs font-bold">{d}</div>)}
                      {['08','10','12','14'].map(h => (
                        <React.Fragment key={h}>
                          <div className="flex items-center text-[10px] text-muted-foreground font-bold">{h}:00</div>
                          {[1,2,3,4,5].map(d => (
                             <div key={d} className={`h-10 rounded-md ${
                               Math.random() > 0.7 ? 'bg-red-500/40' : Math.random() > 0.4 ? 'bg-yellow-500/40' : 'bg-green-500/40'
                             }`} />
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">Color intensity based on historical volume</p>
                  </Card>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="services" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <ServiceCard 
              title="Smart ID — New Application" 
              docs={["Birth Certificate", "2x Passport Photos", "R140 Fee"]}
              time="20 mins"
              queue="12 people"
            />
            <ServiceCard 
              title="Passport Renewal" 
              docs={["Old Passport", "ID Document", "R600 Fee"]}
              time="15 mins"
              queue="8 people"
            />
            <ServiceCard 
              title="Death Certificate" 
              docs={["Medical Report", "ID of deceased", "Application Form"]}
              time="30 mins"
              queue="3 people"
            />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function StatCard({ label, value, sub, status }: { label: string, value: string, sub?: string, status?: string }) {
  const statusColor = {
    LOW: 'text-green-500',
    MODERATE: 'text-yellow-500',
    HIGH: 'text-red-500'
  }[status as any] || 'text-foreground';

  return (
    <Card className="p-6 bg-card border-white/5 space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className={`text-4xl font-headline font-extrabold ${statusColor}`}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function ServiceCard({ title, docs, time, queue }: { title: string, docs: string[], time: string, queue: string }) {
  const router = useRouter();
  
  return (
    <Card className="group p-6 bg-card border-white/5 hover:border-primary/50 transition-all flex flex-col cursor-pointer" onClick={() => router.push('/join/flow')}>
      <div className="flex-1 space-y-4">
        <h3 className="text-xl font-headline font-bold group-hover:text-primary transition-colors">{title}</h3>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Required Documents</p>
          <ul className="text-xs text-foreground/80 space-y-1">
            {docs.map(doc => <li key={doc} className="flex items-center"><ChevronRight className="h-3 w-3 mr-1 text-primary" /> {doc}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
        <div className="text-xs">
          <span className="text-muted-foreground">Avg:</span> <span className="font-bold">{time}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Queue:</span> <span className="font-bold">{queue}</span>
        </div>
      </div>
    </Card>
  );
}
