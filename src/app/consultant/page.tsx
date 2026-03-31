
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
   Bot,
   TrendingUp,
   AlertTriangle,
   MessageCircle,
   Route,
   Sparkles,
   Loader2,
   Send,
   Ticket,
} from 'lucide-react';
import {
   ResponsiveContainer,
   LineChart,
   Line,
   CartesianGrid,
   XAxis,
   YAxis,
   Tooltip,
   BarChart,
   Bar,
} from 'recharts';

type WaitPredictionResult = {
   etaMinutes: number;
   confidence: number;
   ticketNumber: string;
   smsNotice: string;
   source: 'claude' | 'heuristic';
};

type ChatLanguage = 'English' | 'Zulu' | 'Xhosa' | 'Afrikaans';

type ChatMessage = {
   role: 'user' | 'assistant';
   text: string;
   language: ChatLanguage;
};

type AlertRecord = {
   severity: 'LOW' | 'MEDIUM' | 'HIGH';
   description: string;
   timestamp: string;
};

const SERVICES = [
   { id: 'passport', label: 'Passport Renewal', avgServiceMinutes: 13 },
   { id: 'smart-id', label: 'Smart ID Application', avgServiceMinutes: 11 },
   { id: 'birth-cert', label: 'Birth Certificate', avgServiceMinutes: 9 },
   { id: 'marriage', label: 'Marriage Registration', avgServiceMinutes: 16 },
   { id: 'permit', label: 'Permit/Immigration', avgServiceMinutes: 19 },
];

const COUNTERS = [
   { id: 1, name: 'Counter 1', specialty: 'ID + Birth Records', baseWait: 22 },
   { id: 2, name: 'Counter 2', specialty: 'Passports', baseWait: 29 },
   { id: 3, name: 'Counter 3', specialty: 'Permits + Immigration', baseWait: 34 },
   { id: 4, name: 'Counter 4', specialty: 'Collections + Corrections', baseWait: 15 },
   { id: 5, name: 'Counter 5', specialty: 'Complex Cases', baseWait: 41 },
];

const FORECAST_VS_HISTORY = [
   { day: 'Mon', forecast: 262, historical: 238 },
   { day: 'Tue', forecast: 226, historical: 211 },
   { day: 'Wed', forecast: 204, historical: 199 },
   { day: 'Thu', forecast: 236, historical: 221 },
   { day: 'Fri', forecast: 289, historical: 255 },
   { day: 'Sat', forecast: 118, historical: 104 },
   { day: 'Sun', forecast: 64, historical: 58 },
];

const HEATMAP_HOURS = ['08:00', '10:00', '12:00', '14:00', '16:00'];
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const FORECAST_HEATMAP = [
   [66, 58, 52, 61, 78, 39, 24],
   [84, 73, 67, 79, 91, 48, 31],
   [91, 84, 72, 88, 96, 56, 35],
   [74, 70, 63, 75, 89, 51, 29],
   [49, 46, 42, 55, 68, 38, 20],
];

function toTicket(prefix: string) {
   return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

function classifyCounter(text: string): number {
   const lower = text.toLowerCase();
   if (lower.includes('passport')) return 2;
   if (lower.includes('permit') || lower.includes('visa') || lower.includes('immigration')) return 3;
   if (lower.includes('collect') || lower.includes('pickup') || lower.includes('correction')) return 4;
   if (lower.includes('marriage') || lower.includes('court') || lower.includes('expired')) return 5;
   return 1;
}

function baseVolumes() {
   return ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'].map((slot, i) => {
      const expected = 40 + i * 3 + (i % 2 === 0 ? 5 : -2);
      const stdDev = expected * 0.14;
      const actual = Math.max(10, Math.round(expected + (Math.random() * 2 - 1) * 7));
      return {
         slot,
         expected,
         actual,
         threshold: Math.round(expected + stdDev * 3),
      };
   });
}

function heatColor(value: number) {
   if (value >= 86) return '#ef4444';
   if (value >= 70) return '#f97316';
   if (value >= 50) return '#eab308';
   if (value >= 35) return '#84cc16';
   return '#22c55e';
}

export default function ConsultantDashboard() {
   const { toast } = useToast();

   const [serviceId, setServiceId] = useState(SERVICES[0].id);
   const [queuePosition, setQueuePosition] = useState('18');
   const [staffCount, setStaffCount] = useState('4');
   const [queueVelocity, setQueueVelocity] = useState('7');
   const [predicting, setPredicting] = useState(false);
   const [prediction, setPrediction] = useState<WaitPredictionResult | null>(null);

   const [routingText, setRoutingText] = useState('I need to renew my passport, it expired last year');
   const [activeCounter, setActiveCounter] = useState<number | null>(null);
   const [routingTicket, setRoutingTicket] = useState<string | null>(null);
   const [routingWait, setRoutingWait] = useState<number | null>(null);

   const [volumeData, setVolumeData] = useState(baseVolumes);
   const [liveAlert, setLiveAlert] = useState<AlertRecord | null>(null);

   const [language, setLanguage] = useState<ChatLanguage>('English');
   const [chatInput, setChatInput] = useState('');
   const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      {
         role: 'assistant',
         language: 'English',
         text: 'Hi, I am Q Assistant. Ask me for a ticket, counter, or wait time in English, Zulu, Xhosa, or Afrikaans.',
      },
   ]);

   useEffect(() => {
      const interval = setInterval(() => {
         setVolumeData((prev) => {
            const last = prev[prev.length - 1];
            const nextExpected = Math.max(35, Math.round(last.expected + (Math.random() * 2 - 1) * 4));
            const nextStd = nextExpected * 0.14;
            const nextActual = Math.max(12, Math.round(nextExpected + (Math.random() * 2 - 1) * 8));

            const minute = Number(last.slot.slice(3, 5));
            const hour = Number(last.slot.slice(0, 2));
            const nextMinute = (minute + 30) % 60;
            const nextHour = nextMinute === 0 ? hour + 1 : hour;
            const nextSlot = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;

            const nextPoint = {
               slot: nextSlot,
               expected: nextExpected,
               actual: nextActual,
               threshold: Math.round(nextExpected + nextStd * 3),
            };

            return [...prev.slice(1), nextPoint];
         });
      }, 4000);

      return () => clearInterval(interval);
   }, []);

   const anomalies = useMemo(() => {
      return volumeData.filter((point) => point.actual > point.threshold);
   }, [volumeData]);

   const staffingGuidance = useMemo(() => {
      return [
         { slot: '08:00-10:00', recommendation: '+1 staff', reason: 'Morning ID demand spike' },
         { slot: '10:00-12:00', recommendation: '+2 staff', reason: 'Peak passport intake' },
         { slot: '12:00-14:00', recommendation: '-1 staff', reason: 'Lower mid-day arrival rate' },
         { slot: '14:00-16:00', recommendation: '+1 staff', reason: 'Late-day permit arrivals' },
      ];
   }, []);

   async function handlePredictWait() {
      setPredicting(true);
      setPrediction(null);
      try {
         const selectedService = SERVICES.find((s) => s.id === serviceId);
         const res = await fetch('/api/smart-wait', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               service: selectedService?.label,
               queuePosition: Number(queuePosition),
               staffCount: Number(staffCount),
               queueVelocity: Number(queueVelocity),
            }),
         });

         if (!res.ok) {
            throw new Error('Prediction request failed');
         }

         const data = (await res.json()) as WaitPredictionResult;
         setPrediction(data);
         toast({
            title: 'Smart ETA Ready',
            description: `${data.ticketNumber} estimated in ${data.etaMinutes} minutes (${data.confidence}% confidence).`,
         });
      } catch {
         toast({
            variant: 'destructive',
            title: 'Prediction failed',
            description: 'Unable to fetch ETA right now. Please retry in a few seconds.',
         });
      } finally {
         setPredicting(false);
      }
   }

   function handleRoute() {
      const selectedCounter = classifyCounter(routingText);
      const counterMeta = COUNTERS.find((counter) => counter.id === selectedCounter);

      setActiveCounter(selectedCounter);
      setRoutingTicket(toTicket('Q'));
      setRoutingWait((counterMeta?.baseWait ?? 20) + Math.floor(Math.random() * 12));

      toast({
         title: 'Counter routed',
         description: `Assigned to ${counterMeta?.name}. Ticket issued instantly.`,
      });
   }

   function assistantResponse(text: string, lang: ChatLanguage) {
      const counter = classifyCounter(text);
      const wait = (COUNTERS.find((c) => c.id === counter)?.baseWait ?? 20) + Math.floor(Math.random() * 10);
      const ticket = toTicket('WA');

      if (lang === 'Zulu') {
         return `Ngiyabonga. Ithikithi lakho ngu ${ticket}. Sicela uye ku Counter ${counter}. Isikhathi sokulinda cishe imizuzu engu ${wait}. Sizokuthumela i-SMS ngaphambi kwemizuzu emihlanu.`;
      }
      if (lang === 'Xhosa') {
         return `Enkosi. Itikiti lakho ngu ${ticket}. Nceda uye kwi Counter ${counter}. Ixesha lokulinda limalunga nemizuzu eyi ${wait}. Siza kukuthumela i-SMS imizuzu emi-5 ngaphambi kwethuba lakho.`;
      }
      if (lang === 'Afrikaans') {
         return `Dankie. Jou kaartjie is ${ticket}. Gaan asseblief na Toonbank ${counter}. Geskatte wagtyd is ongeveer ${wait} minute. Ons stuur 'n SMS 5 minute voor jou beurt.`;
      }

      return `Done. Your ticket is ${ticket}. Please proceed to Counter ${counter}. Estimated wait is about ${wait} minutes. Q will SMS you 5 minutes before your turn.`;
   }

   function handleSendChat() {
      const trimmed = chatInput.trim();
      if (!trimmed) return;

      const userMessage: ChatMessage = { role: 'user', text: trimmed, language };
      const assistantMessage: ChatMessage = {
         role: 'assistant',
         text: assistantResponse(trimmed, language),
         language,
      };

      setChatMessages((prev) => [...prev, userMessage, assistantMessage]);
      setChatInput('');
   }

   function simulateAnomaly() {
      setVolumeData((prev) => {
         const last = prev[prev.length - 1];
         const severePoint = {
            ...last,
            actual: last.threshold + 22,
         };
         return [...prev.slice(0, prev.length - 1), severePoint];
      });

      const alert: AlertRecord = {
         severity: 'HIGH',
         description: 'Queue volume exceeded 3-sigma threshold. Sudden walk-in surge detected.',
         timestamp: new Date().toLocaleTimeString(),
      };
      setLiveAlert(alert);

      toast({
         variant: 'destructive',
         title: 'Anomaly alert simulated',
         description: `${alert.severity}: ${alert.description}`,
      });
   }

   return (
      <main className="min-h-screen bg-background">
         <section className="border-b border-white/5 bg-card/60">
            <div className="container mx-auto px-4 md:px-8 py-10 space-y-4">
               <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  AI Command Center
               </div>
               <h1 className="text-4xl md:text-6xl font-headline font-extrabold leading-tight">
                  Five live intelligence features.
                  <span className="text-primary"> One queue interface.</span>
               </h1>
               <p className="text-muted-foreground max-w-3xl">
                  Smart ETA prediction, natural-language routing, 3-sigma anomaly detection, multilingual WhatsApp-style assistance,
                  and demand forecasting in one operational dashboard.
               </p>
            </div>
         </section>

         <section className="container mx-auto px-4 md:px-8 py-10 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <Card className="p-6 border-primary/25 bg-card space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Feature 1</p>
                        <h2 className="text-2xl font-headline font-extrabold flex items-center gap-2">
                           <Bot className="h-5 w-5 text-primary" /> Smart Wait Time Prediction
                        </h2>
                     </div>
                     <Badge variant="outline" className="border-primary/30 text-primary">Claude + ML</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">Service</p>
                        <select
                           className="h-11 w-full rounded-xl border border-white/10 bg-background px-3 text-sm"
                           value={serviceId}
                           onChange={(e) => setServiceId(e.target.value)}
                        >
                           {SERVICES.map((service) => (
                              <option key={service.id} value={service.id}>{service.label}</option>
                           ))}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">Queue Position</p>
                        <Input value={queuePosition} onChange={(e) => setQueuePosition(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">Staff On Shift</p>
                        <Input value={staffCount} onChange={(e) => setStaffCount(e.target.value)} />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">Queue Velocity (pph)</p>
                        <Input value={queueVelocity} onChange={(e) => setQueueVelocity(e.target.value)} />
                     </div>
                  </div>

                  <Button className="w-full h-12 rounded-xl font-bold" onClick={handlePredictWait} disabled={predicting}>
                     {predicting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                     Predict Exact ETA
                  </Button>

                  {prediction && (
                     <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 space-y-2">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Prediction Result</p>
                        <div className="flex flex-wrap items-center gap-4">
                           <p className="text-4xl font-headline font-extrabold text-primary">{prediction.etaMinutes} min</p>
                           <p className="text-sm">Confidence: <span className="font-bold">{prediction.confidence}%</span></p>
                           <p className="text-sm">Ticket: <span className="font-bold">{prediction.ticketNumber}</span></p>
                        </div>
                        <p className="text-sm text-muted-foreground">{prediction.smsNotice}</p>
                     </div>
                  )}
               </Card>

               <Card className="p-6 border-white/10 bg-card space-y-6">
                  <div className="space-y-1">
                     <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Feature 2</p>
                     <h2 className="text-2xl font-headline font-extrabold flex items-center gap-2">
                        <Route className="h-5 w-5 text-primary" /> Intelligent Queue Routing
                     </h2>
                  </div>

                  <Input
                     value={routingText}
                     onChange={(e) => setRoutingText(e.target.value)}
                     placeholder="Type naturally, e.g. I need to renew my passport, it expired last year"
                  />

                  <Button className="h-12 rounded-xl w-full font-bold" onClick={handleRoute}>
                     Route to Correct Counter
                  </Button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                     {COUNTERS.map((counter) => (
                        <div
                           key={counter.id}
                           className={`rounded-xl border p-3 transition-colors ${
                              activeCounter === counter.id
                                 ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary))]'
                                 : 'border-white/10 bg-background'
                           }`}
                        >
                           <p className="font-bold text-sm">#{counter.id}</p>
                           <p className="text-[11px] text-muted-foreground">{counter.specialty}</p>
                        </div>
                     ))}
                  </div>

                  {routingTicket && routingWait !== null && (
                     <div className="rounded-2xl border border-white/10 bg-background p-4 flex items-center justify-between">
                        <div>
                           <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Issued instantly</p>
                           <p className="text-xl font-headline font-extrabold flex items-center gap-2"><Ticket className="h-4 w-4" /> {routingTicket}</p>
                        </div>
                        <p className="text-sm">Est. wait <span className="font-bold text-primary">{routingWait} min</span></p>
                     </div>
                  )}
               </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <Card className="p-6 border-white/10 bg-card space-y-5">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Feature 3</p>
                        <h2 className="text-2xl font-headline font-extrabold flex items-center gap-2">
                           <AlertTriangle className="h-5 w-5 text-primary" /> Anomaly Detection
                        </h2>
                     </div>
                     <Button variant="outline" className="border-primary/40 text-primary" onClick={simulateAnomaly}>Simulate Alert</Button>
                  </div>

                  <div className="h-[290px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={volumeData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                           <XAxis dataKey="slot" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                           <Tooltip />
                           <Line type="monotone" dataKey="expected" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                           <Line
                              type="monotone"
                              dataKey="actual"
                              stroke="#e5e7eb"
                              strokeWidth={2}
                              dot={(props: any) => {
                                 const isAnomaly = props.payload.actual > props.payload.threshold;
                                 return (
                                    <circle
                                       cx={props.cx}
                                       cy={props.cy}
                                       r={isAnomaly ? 5 : 3}
                                       fill={isAnomaly ? '#ef4444' : '#e5e7eb'}
                                       stroke={isAnomaly ? '#ef4444' : 'none'}
                                    />
                                 );
                              }}
                           />
                           <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-muted-foreground">
                     Actual vs expected queue volume is monitored with a 3-sigma threshold. Red dots are anomaly events.
                  </p>
                  {liveAlert && (
                     <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
                        <p className="font-bold text-red-400">{liveAlert.severity} ALERT</p>
                        <p>{liveAlert.description}</p>
                        <p className="text-muted-foreground">{liveAlert.timestamp}</p>
                     </div>
                  )}
                  <p className="text-xs text-muted-foreground">Active anomaly points: {anomalies.length}</p>
               </Card>

               <Card className="p-6 border-white/10 bg-card space-y-5">
                  <div className="space-y-1">
                     <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Feature 4</p>
                     <h2 className="text-2xl font-headline font-extrabold flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" /> Q Assistant (WhatsApp Mockup)
                     </h2>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b141a] p-4 h-[290px] overflow-y-auto space-y-3">
                     {chatMessages.map((msg, idx) => (
                        <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div
                              className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                                 msg.role === 'user' ? 'bg-[#005c4b] text-[#ecfdf5]' : 'bg-[#202c33] text-[#e2e8f0]'
                              }`}
                           >
                              {msg.text}
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                     {(['English', 'Zulu', 'Xhosa', 'Afrikaans'] as ChatLanguage[]).map((lang) => (
                        <button
                           key={lang}
                           onClick={() => setLanguage(lang)}
                           className={`h-9 rounded-lg text-xs font-bold ${
                              language === lang ? 'bg-primary text-primary-foreground' : 'bg-background border border-white/10'
                           }`}
                        >
                           {lang}
                        </button>
                     ))}
                  </div>

                  <div className="flex gap-2">
                     <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type to Q Assistant..."
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendChat();
                           }
                        }}
                     />
                     <Button size="icon" onClick={handleSendChat}>
                        <Send className="h-4 w-4" />
                     </Button>
                  </div>
               </Card>
            </div>

            <Card className="p-6 border-white/10 bg-card space-y-6">
               <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Feature 5</p>
                  <h2 className="text-2xl font-headline font-extrabold flex items-center gap-2">
                     <TrendingUp className="h-5 w-5 text-primary" /> Demand Forecasting
                  </h2>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <p className="text-sm font-bold">Predicted Queue Volume Heatmap (Day x Hour)</p>
                     <div className="grid grid-cols-8 gap-2">
                        <div></div>
                        {HEATMAP_DAYS.map((day) => (
                           <div key={day} className="text-xs text-center font-bold text-muted-foreground">{day}</div>
                        ))}
                        {HEATMAP_HOURS.map((hour, hIdx) => (
                           <React.Fragment key={hour}>
                              <div className="text-xs font-bold text-muted-foreground flex items-center">{hour}</div>
                              {FORECAST_HEATMAP[hIdx].map((value, dIdx) => (
                                 <div
                                    key={`${hour}-${dIdx}`}
                                    className="h-10 rounded-md flex items-center justify-center text-[10px] font-bold text-black"
                                    style={{ backgroundColor: heatColor(value) }}
                                 >
                                    {value}
                                 </div>
                              ))}
                           </React.Fragment>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={FORECAST_VS_HISTORY}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="day" axisLine={false} tickLine={false} />
                              <YAxis axisLine={false} tickLine={false} />
                              <Tooltip />
                              <Bar dataKey="historical" fill="#64748b" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="forecast" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>

                     <div className="space-y-2">
                        <p className="text-sm font-bold">Staffing Recommendations</p>
                        {staffingGuidance.map((item) => (
                           <div key={item.slot} className="rounded-xl border border-white/10 bg-background p-3 flex items-center justify-between">
                              <div>
                                 <p className="font-bold text-sm">{item.slot}</p>
                                 <p className="text-xs text-muted-foreground">{item.reason}</p>
                              </div>
                              <Badge variant="outline" className="border-primary/40 text-primary">{item.recommendation}</Badge>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </Card>
         </section>
      </main>
   );
}
