'use client';

/**
 * BranchFullModal.tsx
 *
 * Shown when POST /api/ticket returns HTTP 409 (branch full).
 * Calls POST /api/redirect to get Claude's agentic branch recommendation.
 * Citizen can accept the redirect (pre-fills the join flow for the new branch)
 * or dismiss and choose manually.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { XCircle, MapPin, Clock, AlertTriangle, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface BranchFullError {
  branchId: string;
  branchName: string;
  currentQueue: number;
  capacity: number;
  congestionLevel: string;
}

interface RedirectResult {
  id: string;
  name: string;
  address: string;
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH';
  currentQueue: number;
  capacity: number;
  distanceKm: number;
  estimatedWaitMinutes: number;
  coordinates: { lat: number; lng: number };
}

interface Props {
  error: BranchFullError | null;
  serviceType: string;
  serviceLabel: string;
  citizenName: string;
  citizenPhone: string;
  citizenLocation?: { lat: number; lng: number };
  onClose: () => void;
}

const CONGESTION_COLOR: Record<string, string> = {
  LOW: 'bg-[#C4F135] text-black',
  MODERATE: 'bg-amber-500 text-white',
  HIGH: 'bg-orange-600 text-white',
  FULL: 'bg-red-600 text-white',
};

export default function BranchFullModal({
  error,
  serviceType,
  serviceLabel,
  citizenName,
  citizenPhone,
  citizenLocation,
  onClose,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [redirect, setRedirect] = useState<{
    recommended: RedirectResult;
    reasoning: string;
    alternatives: RedirectResult[];
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    fetchRedirect();
  }, [error]);

  async function fetchRedirect() {
    if (!error) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: error.branchId,
          serviceType,
          citizenLocation,
        }),
      });
      if (!res.ok) throw new Error('Redirect fetch failed');
      const data = await res.json();
      if (data.success) {
        setRedirect({
          recommended: data.recommended,
          reasoning: data.reasoning,
          alternatives: data.alternatives ?? [],
        });
      } else {
        setFetchError(data.message ?? 'No alternatives found.');
      }
    } catch {
      setFetchError('Unable to find alternative branches right now.');
    } finally {
      setLoading(false);
    }
  }

  function acceptRedirect() {
    if (!redirect) return;
    const params = new URLSearchParams({
      branch: redirect.recommended.name,
      branchId: redirect.recommended.id,
      service: serviceType,
      name: citizenName,
      phone: citizenPhone,
      redirected: 'true',
    });
    onClose();
    router.push(`/join/flow?${params.toString()}`);
  }

  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          {/* Header */}
          <div className="bg-red-600/20 border-b border-red-600/30 px-6 py-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm">{error.branchName}</p>
                <p className="text-red-300 text-xs mt-0.5">
                  Queue full ({error.currentQueue}/{error.capacity}) — unable to issue ticket
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Loader2 className="h-8 w-8 text-[#C4F135] animate-spin" />
                <p className="text-white/60 text-sm">Claude is finding the best alternative...</p>
              </div>
            )}

            {fetchError && !loading && (
              <div className="text-center py-4">
                <p className="text-white/60 text-sm">{fetchError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchRedirect}>
                  Retry
                </Button>
              </div>
            )}

            {redirect && !loading && (
              <>
                {/* Claude reasoning */}
                <div className="bg-[#C4F135]/10 border border-[#C4F135]/20 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C4F135] mb-1.5">
                    Claude Recommendation
                  </p>
                  <p className="text-white/80 text-xs leading-relaxed">{redirect.reasoning}</p>
                </div>

                {/* Recommended branch card */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{redirect.recommended.name}</p>
                      <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {redirect.recommended.address}
                      </p>
                    </div>
                    <Badge className={CONGESTION_COLOR[redirect.recommended.congestionLevel] ?? 'bg-gray-600 text-white'}>
                      {redirect.recommended.congestionLevel}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-white/40 uppercase">Queue</p>
                      <p className="font-bold text-white text-sm">
                        {redirect.recommended.currentQueue}/{redirect.recommended.capacity}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-white/40 uppercase">Wait</p>
                      <p className="font-bold text-[#C4F135] text-sm">
                        {redirect.recommended.estimatedWaitMinutes}m
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-white/40 uppercase">Distance</p>
                      <p className="font-bold text-white text-sm">
                        {redirect.recommended.distanceKm.toFixed(1)} km
                      </p>
                    </div>
                  </div>
                </div>

                {/* Other options */}
                {redirect.alternatives.length > 1 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Other Options</p>
                    <div className="space-y-1.5">
                      {redirect.alternatives.slice(1, 3).map((alt) => (
                        <div key={alt.id} className="flex items-center justify-between text-xs text-white/50 bg-white/3 rounded-lg px-3 py-2">
                          <span>{alt.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {alt.estimatedWaitMinutes}m
                            </span>
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" /> {alt.distanceKm.toFixed(1)}km
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    onClick={acceptRedirect}
                    className="h-12 rounded-full bg-[#C4F135] text-black font-bold hover:bg-[#d4ff45] transition-colors shadow-lg shadow-[#C4F135]/20"
                  >
                    Join Queue at {redirect.recommended.name.split(' ').slice(-1)[0]}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="h-10 rounded-full text-white/50 hover:text-white hover:bg-white/5"
                  >
                    Choose a Different Branch
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
