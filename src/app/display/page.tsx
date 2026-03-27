
"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TVDisplay() {
  const [currentTicket, setCurrentTicket] = useState('B-047');
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden font-headline">
      {/* Header Bar */}
      <div className="h-32 px-16 border-b border-white/10 flex items-center justify-between bg-[#0A0A0A]">
        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-extrabold">Que</span>
          <span className="text-5xl font-extrabold text-[#C4F135]">Up</span>
        </div>
        <div className="text-right space-y-1">
           <h1 className="text-3xl font-bold">Home Affairs Bellville</h1>
           <p className="text-5xl font-extrabold text-[#C4F135]">{time}</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Serving Panel */}
        <div className="w-[70%] h-full flex flex-col items-center justify-center border-r border-white/10 p-20 relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
             <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#C4F135] via-transparent to-transparent"></div>
          </div>
          
          <div className="space-y-12 text-center relative z-10">
            <div className="space-y-4">
              <span className="text-5xl font-bold uppercase tracking-[0.4em] text-[#C4F135]">Now Serving</span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTicket}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -100, opacity: 0 }}
                  transition={{ duration: 0.8, type: "spring" }}
                  className="text-[24rem] font-extrabold leading-none tracking-tighter"
                >
                  {currentTicket}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="text-7xl font-bold text-gray-400">Please proceed to <span className="text-white">Counter 03</span></div>
          </div>
        </div>

        {/* Next Up Panel */}
        <div className="w-[30%] h-full bg-[#050505] p-16 flex flex-col">
          <div className="space-y-12">
            <div className="space-y-4">
               <span className="text-3xl font-bold uppercase tracking-widest text-[#C4F135]">Next Up</span>
               <div className="text-9xl font-extrabold">B-048</div>
            </div>

            <div className="space-y-8">
               <span className="text-xl font-bold uppercase tracking-widest text-gray-500">Coming Soon</span>
               <div className="space-y-6">
                  {['B-049', 'B-050', 'B-051', 'B-052', 'B-053'].map((t, i) => (
                    <motion.div 
                      key={t}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex justify-between items-center text-5xl font-bold pb-6 border-b border-white/5 last:border-0"
                    >
                      <span className="text-white">{t}</span>
                      <span className="text-2xl text-gray-600 uppercase">Wait</span>
                    </motion.div>
                  ))}
               </div>
            </div>
          </div>
          
          {/* Priority Alert Box */}
          <div className="mt-auto bg-[#C4F135]/10 border border-[#C4F135]/30 p-8 rounded-3xl flex items-center space-x-6">
             <div className="w-16 h-16 bg-[#C4F135] rounded-full flex items-center justify-center text-black">
                <span className="text-4xl font-extrabold">P</span>
             </div>
             <div>
                <p className="text-[#C4F135] font-extrabold text-2xl uppercase tracking-widest">Priority Queue</p>
                <p className="text-3xl font-bold">P-001 <span className="text-gray-500 text-xl font-normal ml-2">Thandi N.</span></p>
             </div>
          </div>
        </div>
      </div>

      {/* Ticker Bar */}
      <div className="h-24 bg-[#C4F135] text-black flex items-center overflow-hidden">
        <motion.div 
           className="whitespace-nowrap text-4xl font-extrabold uppercase tracking-widest flex items-center space-x-32"
           animate={{ x: [0, -2000] }}
           transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <span>QueUp Smart Queue Management • Join remotely at queup.co.za • Home Affairs Bellville Hours: Mon-Fri 08:00 - 15:30 • No waiting, just living • Your time matters to us • Join remotely at queup.co.za • Save 2+ hours today</span>
          <span>QueUp Smart Queue Management • Join remotely at queup.co.za • Home Affairs Bellville Hours: Mon-Fri 08:00 - 15:30 • No waiting, just living • Your time matters to us • Join remotely at queup.co.za • Save 2+ hours today</span>
        </motion.div>
      </div>
    </main>
  );
}
