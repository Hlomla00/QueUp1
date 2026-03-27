
"use client"

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Bell, Share2, MapPin, AlertTriangle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QueueDashboard() {
  const [position, setPosition] = useState(23);
  const [serving, setServing] = useState(47);
  const [showCallOverlay, setShowCallOverlay] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate ticket being called for demo after 10 seconds
      // setShowCallOverlay(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

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

        {/* Your Ticket Massive Header */}
        <Card className="p-8 border-primary border-2 bg-card relative overflow-hidden text-center space-y-4">
          <div className="absolute top-0 right-0 p-4">
             <Badge className="bg-primary text-primary-foreground font-bold">PRIORITY</Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Your Ticket</p>
            <h1 className="text-8xl font-headline font-extrabold text-foreground">B-089</h1>
          </div>
          
          <div className="space-y-1">
            <p className="text-xl font-headline font-bold">Nomsa Dlamini</p>
            <p className="text-sm text-muted-foreground">Home Affairs Bellville • Smart ID Application</p>
          </div>
        </Card>

        {/* Real-time Status */}
        <div className="grid grid-cols-2 gap-4">
           <Card className="p-6 bg-card border-white/5 space-y-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Now Serving</p>
              <div className="text-4xl font-headline font-extrabold text-foreground">B-0{serving}</div>
           </Card>
           <Card className="p-6 bg-card border-white/5 space-y-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. Wait</p>
              <div className="text-4xl font-headline font-extrabold text-foreground">~1h 45m</div>
           </Card>
        </div>

        {/* Progress Section */}
        <Card className="p-6 bg-card border-white/5 space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-bold">Queue Position</p>
              <p className="text-2xl font-headline font-bold">You are {position}rd in line</p>
            </div>
            <p className="text-xs text-primary font-bold">78% to turn</p>
          </div>
          <div className="relative pt-1">
            <Progress value={78} className="h-3 bg-white/5" />
            <motion.div 
               className="absolute top-0 right-[22%] -mt-6"
               animate={{ y: [0, -5, 0] }}
               transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded">YOU</div>
            </motion.div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">The queue is moving faster than usual. Stay close to the branch!</p>
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

        {/* Full Queue List */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold">Queue Details</h3>
            <span className="text-xs text-muted-foreground">Showing 10 tickets</span>
          </div>
          <div className="space-y-2">
            {[87, 88, 89, 90, 91].map(n => (
              <div 
                key={n} 
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  n === 89 ? 'bg-primary/20 border-primary' : 'bg-card border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-headline font-extrabold">B-0{n}</span>
                  <span className="text-xs font-bold">
                    {n === 89 ? 'YOU' : n < 89 ? 'Ahead of you' : 'Behind you'}
                  </span>
                </div>
                <Badge variant="outline" className={n === 89 ? 'border-primary text-primary' : 'border-white/10'}>
                  {n === 89 ? 'READY' : 'WAITING'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-4">
           <Button variant="outline" className="h-14 rounded-full border-white/10 hover:bg-white/5 space-x-2">
              <Share2 className="h-4 w-4" />
              <span>Share Position</span>
           </Button>
           <Button variant="outline" className="h-14 rounded-full border-destructive/20 text-destructive hover:bg-destructive/10">
              Leave Queue
           </Button>
        </div>
      </div>

      {/* Turn Overlay */}
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
                <div className="text-9xl font-headline font-extrabold text-primary-foreground">B-089</div>
              </div>
              
              <div className="space-y-4">
                <p className="text-2xl font-headline font-bold text-primary-foreground/90">Please proceed to Counter 4</p>
                <Card className="bg-primary-foreground p-6 rounded-2xl">
                   <p className="text-primary font-extrabold text-4xl">10:00</p>
                   <p className="text-primary/60 text-xs font-bold uppercase tracking-widest mt-2">Remaining to check-in</p>
                </Card>
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
