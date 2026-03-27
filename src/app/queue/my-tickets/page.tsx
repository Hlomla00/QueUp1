
"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MyTickets() {
  const router = useRouter();

  const activeTickets = [
    { 
      id: 'ticket-123', 
      num: 'B-089', 
      branch: 'Home Affairs Bellville', 
      service: 'Smart ID Application', 
      status: 'Active', 
      wait: '1h 45m', 
      pos: '23rd' 
    }
  ];

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 max-w-3xl">
        <header className="mb-12 space-y-2">
          <h1 className="text-5xl font-headline font-extrabold">My Tickets</h1>
          <p className="text-muted-foreground">Keep track of your active queue positions.</p>
        </header>

        <div className="space-y-6">
          {activeTickets.length > 0 ? (
            activeTickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card 
                  className="p-8 border-white/5 bg-card hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => router.push(`/queue/${ticket.id}`)}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-4xl font-headline font-extrabold">{ticket.num}</span>
                        <Badge className="bg-primary text-primary-foreground font-bold">{ticket.status}</Badge>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-headline font-bold">{ticket.service}</h3>
                        <p className="text-muted-foreground flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1" /> {ticket.branch}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 md:text-right">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center md:justify-end">
                          <Clock className="h-3 w-3 mr-1" /> Wait Time
                        </p>
                        <p className="text-2xl font-headline font-extrabold">{ticket.wait}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Position</p>
                        <p className="text-2xl font-headline font-extrabold text-primary">{ticket.pos}</p>
                      </div>
                      <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-white/5 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <ArrowRight className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="p-12 text-center space-y-6 border-dashed border-white/10">
              <p className="text-muted-foreground">You don't have any active tickets.</p>
              <Button onClick={() => router.push('/join')} className="rounded-full px-8 h-12 font-bold">
                Join a Queue
              </Button>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
