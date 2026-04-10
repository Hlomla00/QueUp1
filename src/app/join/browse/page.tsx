
"use client"

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

type BranchEntry = { id: string; name: string; area: string; wait: string; inQueue: number; congestion: 'LOW' | 'MODERATE' | 'HIGH' };

const BRANCH_DATA: { category: string; branches: BranchEntry[] }[] = [
  {
    category: 'Home Affairs',
    branches: [
      { id: 'ha-bellville', name: 'Home Affairs Bellville', area: 'Bellville', wait: '~1h 25m', inQueue: 23, congestion: 'MODERATE' },
      { id: 'ha-cbd', name: 'Home Affairs Cape Town CBD', area: 'CBD', wait: '~3h', inQueue: 51, congestion: 'HIGH' },
      { id: 'ha-mitchells-plain', name: 'Home Affairs Mitchells Plain', area: 'Mitchells Plain', wait: '~28m', inQueue: 8, congestion: 'LOW' },
      { id: 'ha-khayelitsha', name: 'Home Affairs Khayelitsha', area: 'Khayelitsha', wait: '~2h 24m', inQueue: 41, congestion: 'HIGH' },
    ],
  },
  {
    category: 'SASSA',
    branches: [
      { id: 'sassa-bellville', name: 'SASSA Bellville', area: 'Bellville', wait: '~1h 52m', inQueue: 32, congestion: 'MODERATE' },
      { id: 'sassa-khayelitsha', name: 'SASSA Khayelitsha', area: 'Khayelitsha', wait: '~5h 8m', inQueue: 88, congestion: 'HIGH' },
    ],
  },
  {
    category: 'SARS',
    branches: [
      { id: 'sars-pinelands', name: 'SARS Pinelands', area: 'Pinelands', wait: '~42m', inQueue: 12, congestion: 'LOW' },
    ],
  },
  {
    category: 'Hospitals',
    branches: [
      { id: 'hospital-groote', name: 'Groote Schuur Hospital', area: 'Observatory', wait: '~6h 32m', inQueue: 112, congestion: 'HIGH' },
      { id: 'hospital-tyger', name: 'Tygerberg Hospital', area: 'Parow', wait: '~4h 19m', inQueue: 74, congestion: 'HIGH' },
      { id: 'hospital-mitchells', name: "Mitchell's Plain Hospital", area: 'Mitchells Plain', wait: '~2h 37m', inQueue: 45, congestion: 'MODERATE' },
    ],
  },
  {
    category: 'DLTC (Driver & Vehicle Licences)',
    branches: [
      { id: 'dltc-milnerton', name: 'DLTC Milnerton', area: 'Milnerton', wait: '~53m', inQueue: 15, congestion: 'LOW' },
      { id: 'dltc-parow', name: 'DLTC Parow', area: 'Parow', wait: '~1h 38m', inQueue: 28, congestion: 'MODERATE' },
    ],
  },
  {
    category: 'Cape Town Magistrate',
    branches: [
      { id: 'magistrate-cbd', name: 'Cape Town Magistrate Court', area: 'CBD', wait: '~1h 3m', inQueue: 18, congestion: 'LOW' },
    ],
  },
  {
    category: 'Cape Town Municipality',
    branches: [
      { id: 'municipality-cbd', name: 'Cape Town Municipality', area: 'CBD', wait: '~2h 10m', inQueue: 37, congestion: 'MODERATE' },
    ],
  },
  {
    category: 'Department of Labour',
    branches: [
      { id: 'labour-bellville', name: 'Dept of Labour Bellville', area: 'Bellville', wait: '~1h 42m', inQueue: 29, congestion: 'MODERATE' },
    ],
  },
];

function BrowseBranchesContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const searchParams = useSearchParams();
  const source = searchParams.get('source');

  return (
    <main className="min-h-screen pt-20 pb-12 bg-background">
      <Navbar />
      
      {/* Search Header */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-white/5 py-6 mb-8 px-4 md:px-8">
        <div className="max-w-4xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input 
            className="h-14 pl-12 pr-4 bg-card border-white/10 text-lg rounded-full focus:ring-primary focus:border-primary"
            placeholder="Search by department, branch, or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-12 px-4 md:px-8">
        {BRANCH_DATA.map((row, i) => (
          <section key={row.category} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-headline font-bold uppercase tracking-[0.2em] text-primary">{row.category}</h2>
              <button className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">See all</button>
            </div>
            
            <div className="relative">
              <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                {row.branches.map((branch) => (
                  <BranchCard key={branch.id} branch={branch} source={source} />
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Heat Map Section Placeholder */}
        <section className="bg-card rounded-2xl p-8 border border-white/5">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-headline font-extrabold">Where is it quiet right now?</h2>
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/10" />
                <span className="text-muted-foreground font-headline font-bold">Interactive Cape Town Map</span>
                {/* Simulated Map Dots */}
                <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              </div>
            </div>
            
            <div className="w-full md:w-80 space-y-6">
              <h3 className="font-headline font-bold text-lg">Busiest branches right now</h3>
              <div className="space-y-4">
                {[
                  { name: 'Groote Schuur', val: 95 },
                  { name: 'SASSA Khayelitsha', val: 82 },
                  { name: 'Home Affairs Mitchells', val: 74 },
                  { name: 'Tygerberg Hospital', val: 68 },
                  { name: 'Home Affairs Bellville', val: 61 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span>{item.name}</span>
                      <span>{item.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.val}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function BrowseBranches() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-20 pb-12 bg-background">
          <Navbar />
          <div className="px-4 md:px-8 py-12 text-center text-muted-foreground font-bold">
            Loading branches...
          </div>
        </main>
      }
    >
      <BrowseBranchesContent />
    </Suspense>
  );
}

function BranchCard({ branch, source }: { branch: BranchEntry, source: string | null }) {
  const congestionColor = {
    LOW: 'bg-green-500',
    MODERATE: 'bg-yellow-500',
    HIGH: 'bg-red-500'
  }[branch.congestion];

  const href = `/join/flow?branchId=${encodeURIComponent(branch.id)}&branch=${encodeURIComponent(branch.name)}${source ? `&source=${source}` : ''}`;

  return (
    <Link href={href} className="flex-shrink-0 w-72 snap-start group">
      <Card className="h-full bg-card border-white/5 overflow-hidden group-hover:scale-[1.03] transition-all duration-300 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="font-headline font-bold text-xl leading-tight text-foreground group-hover:text-primary transition-colors">{branch.name}</h3>
            <div className="flex items-center text-xs text-muted-foreground font-bold uppercase tracking-wider">
              <MapPin className="h-3 w-3 mr-1" />
              {branch.area}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
            <div className="space-y-1">
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="h-3 w-3 mr-1" />
                In Queue
              </div>
              <div className="text-xl font-headline font-extrabold">{branch.inQueue}</div>
            </div>
            <div className="space-y-1 text-right">
              <div className="flex items-center justify-end text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Est. Wait
              </div>
              <div className="text-xl font-headline font-extrabold">{branch.wait}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <div className={`w-2.5 h-2.5 rounded-full ${congestionColor}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {branch.congestion} CONGESTION
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
