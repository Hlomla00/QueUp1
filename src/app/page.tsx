
"use client"

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/navbar';
import { SplashScreen } from '@/components/splash-screen';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const departments = [
  { name: 'Home Affairs', image: '/images/home%20affairs.jpg' },
  { name: 'SASSA', image: '/images/sassa.jpeg' },
  { name: 'SARS', image: '/images/sars.jpg' },
  { name: 'Groote Schuur Hospital', image: '/images/hospital.jpg' },
  { name: 'Tygerberg Hospital', image: '/images/hospital.jpg' },
  { name: 'Mitchell\'s Plain Hospital', image: '/images/hospital.jpg' },
  { name: 'Cape Town Magistrate Court', image: '/images/court.jpg' },
  { name: 'DLTC Milnerton', image: '/images/transport.jpeg' },
  { name: 'DLTC Parow', image: '/images/transport.jpeg' },
  { name: 'Cape Town Municipality', image: '/images/municipality.png' },
  { name: 'Dept of Labour', image: '/images/labour.jpg' },
];

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-bg');

  return (
    <main className="min-h-screen">
      <SplashScreen />
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen w-full flex flex-col items-center justify-center text-center px-4 pt-24">
        <div className="absolute inset-0 z-0">
          {heroImage?.imageUrl ? (
            <Image
              src={heroImage.imageUrl}
              alt="South African Government Building"
              fill
              className="object-cover opacity-40 blur-[2px]"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-muted/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-8xl font-headline font-extrabold tracking-tight leading-none text-foreground">
            Your queue.<br />
            <span className="text-primary">Without the wait.</span>
          </h1>
          
          <p className="text-lg md:text-2xl font-body text-foreground/80 max-w-2xl mx-auto">
            Join any government queue from anywhere. We&apos;ll call you when it&apos;s your turn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-14 px-10 text-lg font-bold rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg shadow-primary/20">
              <Link href="/join/flow">Join a Queue</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg font-bold rounded-full border-foreground/30 hover:bg-foreground/5 transition-all">
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Department Scroller */}
      <section className="py-20 bg-background overflow-hidden">
        <div className="px-4 md:px-8 mb-8">
          <h2 className="text-sm font-headline font-bold uppercase tracking-[0.2em] text-primary">Where QueUp is available</h2>
        </div>
        
        <div className="relative">
          <div className="flex space-x-6 overflow-x-auto pb-8 px-4 md:px-8 scrollbar-hide snap-x">
            {departments.map((dept, i) => (
              <div 
                key={i}
                className="relative flex-shrink-0 w-48 h-64 bg-card rounded-xl border border-white/5 overflow-hidden hover:scale-105 transition-transform snap-start cursor-pointer group hover:border-primary/50"
              >
                <Image
                  src={dept.image}
                  alt={dept.name}
                  fill
                  className="object-contain p-3 bg-white group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <h3 className="absolute bottom-4 left-4 right-4 font-headline font-bold text-sm leading-tight text-white text-left">
                  {dept.name}
                </h3>
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-card border-y border-white/5">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-2">
            <div className="text-5xl font-headline font-extrabold text-primary">1.2M+</div>
            <p className="text-muted-foreground font-body">Wait hours saved</p>
          </div>
          <div className="space-y-2">
            <div className="text-5xl font-headline font-extrabold text-primary">450</div>
            <p className="text-muted-foreground font-body">Active branches</p>
          </div>
          <div className="space-y-2">
            <div className="text-5xl font-headline font-extrabold text-primary">4.9/5</div>
            <p className="text-muted-foreground font-body">User satisfaction</p>
          </div>
        </div>
      </section>
      
      <footer className="py-12 bg-background border-t border-white/5 text-center">
        <div className="flex items-center justify-center space-x-1 mb-6">
          <span className="text-xl font-headline font-extrabold">Que</span>
          <span className="text-xl font-headline font-extrabold text-primary">Up</span>
        </div>
        <p className="text-muted-foreground text-sm">© 2024 QueUp SA. All rights reserved.</p>
      </footer>
    </main>
  );
}
