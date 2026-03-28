
"use client"

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const provinces = [
  { name: 'Western Cape', active: true, status: 'PILOT ACTIVE' },
  { name: 'Gauteng', active: false, status: 'Coming Soon' },
  { name: 'KwaZulu-Natal', active: false, status: 'Coming Soon' },
  { name: 'Eastern Cape', active: false, status: 'Coming Soon' },
  { name: 'Free State', active: false, status: 'Coming Soon' },
  { name: 'Limpopo', active: false, status: 'Coming Soon' },
  { name: 'Mpumalanga', active: false, status: 'Coming Soon' },
  { name: 'North West', active: false, status: 'Coming Soon' },
  { name: 'Northern Cape', active: false, status: 'Coming Soon' },
];

export default function ProvinceSelection() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source');

  return (
    <main className="min-h-screen pt-24 pb-12 bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4">
        <header className="max-w-2xl mb-12 animate-in fade-in slide-in-from-left-4 duration-700">
          <h1 className="text-5xl md:text-7xl font-headline font-extrabold mb-6">Where are you?</h1>
          <p className="text-xl text-muted-foreground">Select your province to find nearby government branches and join a queue.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {provinces.map((province, i) => (
            <ProvinceCard key={province.name} province={province} index={i} source={source} />
          ))}
        </div>
      </div>
    </main>
  );
}

function ProvinceCard({ province, index, source }: { province: typeof provinces[0], index: number, source: string | null }) {
  const content = (
    <Card className={`relative overflow-hidden group h-48 flex flex-col items-center justify-center p-8 transition-all duration-300 ${
      province.active 
        ? 'border-primary cursor-pointer hover:bg-primary/5 hover:scale-[1.02]' 
        : 'opacity-50 grayscale border-white/10 cursor-not-allowed'
    }`}>
      <Badge 
        variant={province.active ? 'default' : 'secondary'}
        className={`absolute top-4 right-4 ${province.active ? 'bg-primary text-primary-foreground font-bold' : ''}`}
      >
        {province.status}
      </Badge>
      
      <h2 className="text-3xl font-headline font-bold text-center">{province.name}</h2>
      
      {province.active && (
        <motion.div 
          className="mt-4 text-primary font-bold flex items-center"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          Browse Branches →
        </motion.div>
      )}
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {province.active ? (
        <Link href={source ? `/join/browse?source=${source}` : '/join/browse'}>
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.div>
  );
}
