"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, User, Fingerprint, Smartphone, Printer, CheckCircle2,
  ChevronRight, ChevronLeft, Loader2, X, MapPin, Clock, Users,
  Building2,
} from 'lucide-react';

// ─── Static demo data (mirrors Firestore seed) ────────────────────────────────

const PROVINCES = [
  { id: 'western-cape', name: 'Western Cape', active: true },
  { id: 'gauteng', name: 'Gauteng', active: false },
  { id: 'kwazulu-natal', name: 'KwaZulu-Natal', active: false },
  { id: 'eastern-cape', name: 'Eastern Cape', active: false },
  { id: 'free-state', name: 'Free State', active: false },
  { id: 'limpopo', name: 'Limpopo', active: false },
  { id: 'mpumalanga', name: 'Mpumalanga', active: false },
  { id: 'north-west', name: 'North West', active: false },
  { id: 'northern-cape', name: 'Northern Cape', active: false },
];

type KioskBranch = {
  id: string;
  name: string;
  address: string;
  department: string;
  currentQueue: number;
  estimatedWait: number;
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH';
};

type KioskDepartment = {
  id: string;
  name: string;
  services: string[];
  icon: React.ElementType;
  category: string;
};

const BRANCHES_BY_PROVINCE: Record<string, KioskBranch[]> = {
  'western-cape': [
    { id: 'ha-bellville', name: 'Home Affairs Bellville', address: '2 Voortrekker Rd, Bellville', department: 'Home Affairs', currentQueue: 23, estimatedWait: 82, congestionLevel: 'MODERATE' },
    { id: 'ha-cbd', name: 'Home Affairs Cape Town CBD', address: '56 Barrack St, CBD', department: 'Home Affairs', currentQueue: 51, estimatedWait: 179, congestionLevel: 'HIGH' },
    { id: 'ha-mitchells-plain', name: 'Home Affairs Mitchells Plain', address: 'Town Centre Mall', department: 'Home Affairs', currentQueue: 8, estimatedWait: 28, congestionLevel: 'LOW' },
    { id: 'ha-khayelitsha', name: 'Home Affairs Khayelitsha', address: 'Khayelitsha Mall', department: 'Home Affairs', currentQueue: 41, estimatedWait: 144, congestionLevel: 'HIGH' },
    { id: 'sassa-bellville', name: 'SASSA Bellville', address: 'Willie van Schoor Ave', department: 'SASSA', currentQueue: 32, estimatedWait: 112, congestionLevel: 'MODERATE' },
    { id: 'sassa-khayelitsha', name: 'SASSA Khayelitsha', address: 'Ntlazane Rd, Khayelitsha', department: 'SASSA', currentQueue: 88, estimatedWait: 308, congestionLevel: 'HIGH' },
    { id: 'sars-pinelands', name: 'SARS Pinelands', address: 'Neels Bothma St, Pinelands', department: 'SARS', currentQueue: 12, estimatedWait: 42, congestionLevel: 'LOW' },
    { id: 'hospital-groote', name: 'Groote Schuur Hospital', address: 'Main Road, Observatory', department: 'Groote Schuur Hospital', currentQueue: 112, estimatedWait: 392, congestionLevel: 'HIGH' },
    { id: 'hospital-tyger', name: 'Tygerberg Hospital', address: 'Francie van Zijl Dr, Parow', department: 'Tygerberg Hospital', currentQueue: 74, estimatedWait: 259, congestionLevel: 'MODERATE' },
    { id: 'magistrate-cbd', name: 'Cape Town Magistrate Court', address: 'Keerom St, CBD', department: 'Cape Town Magistrate', currentQueue: 18, estimatedWait: 63, congestionLevel: 'LOW' },
    { id: 'dltc-milnerton', name: 'DLTC Milnerton', address: 'Race Course Rd, Milnerton', department: 'DLTC Milnerton', currentQueue: 15, estimatedWait: 53, congestionLevel: 'LOW' },
    { id: 'dltc-parow', name: 'DLTC Parow', address: 'Voortrekker Rd, Parow', department: 'DLTC Parow', currentQueue: 28, estimatedWait: 98, congestionLevel: 'MODERATE' },
    { id: 'municipality-cbd', name: 'Cape Town Municipality', address: '12 Hertzog Blvd, CBD', department: 'Cape Town Municipality', currentQueue: 37, estimatedWait: 130, congestionLevel: 'MODERATE' },
    { id: 'labour-bellville', name: 'Dept of Labour Bellville', address: 'Cnr Voortrekker & Durban Rd', department: 'Dept of Labour', currentQueue: 29, estimatedWait: 102, congestionLevel: 'MODERATE' },
  ],
};

const DEPARTMENTS_BY_BRANCH: Record<string, KioskDepartment[]> = {
  'ha-bellville': [
    { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)', 'Temporary ID Certificate'], icon: Fingerprint, category: 'SMART_ID' },
    { id: 'travel', name: 'Travel Documents', services: ['Passport (New)', 'Passport (Renewal)', 'Emergency Travel Certificate'], icon: Globe, category: 'PASSPORT' },
    { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate', 'Death Certificate'], icon: User, category: 'BIRTH_CERTIFICATE' },
  ],
  'ha-cbd': [
    { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)'], icon: Fingerprint, category: 'SMART_ID' },
    { id: 'travel', name: 'Travel Documents', services: ['Passport (New)', 'Passport (Renewal)'], icon: Globe, category: 'PASSPORT' },
    { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate', 'Death Certificate'], icon: User, category: 'BIRTH_CERTIFICATE' },
  ],
  'ha-mitchells-plain': [
    { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)', 'Temporary ID Certificate'], icon: Fingerprint, category: 'SMART_ID' },
    { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate', 'Death Certificate'], icon: User, category: 'BIRTH_CERTIFICATE' },
  ],
  'ha-khayelitsha': [
    { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)'], icon: Fingerprint, category: 'SMART_ID' },
    { id: 'travel', name: 'Travel Documents', services: ['Passport (New)', 'Passport (Renewal)'], icon: Globe, category: 'PASSPORT' },
    { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate'], icon: User, category: 'BIRTH_CERTIFICATE' },
  ],
  'sassa-bellville': [
    { id: 'grants', name: 'Social Grants', services: ['Old Age Pension', 'Disability Grant', 'Child Support Grant', 'Foster Child Grant'], icon: Users, category: 'SASSA' },
    { id: 'status', name: 'Grant Status & Updates', services: ['Grant Status Check', 'Banking Details Update', 'Address Change'], icon: Smartphone, category: 'SASSA' },
  ],
  'sassa-khayelitsha': [
    { id: 'grants', name: 'Social Grants', services: ['Old Age Pension', 'Disability Grant', 'Child Support Grant'], icon: Users, category: 'SASSA' },
    { id: 'status', name: 'Grant Status & Updates', services: ['Grant Status Check', 'Banking Details Update'], icon: Smartphone, category: 'SASSA' },
  ],
  'sars-pinelands': [
    { id: 'tax-personal', name: 'Personal Tax', services: ['Income Tax Return (ITR12)', 'Tax Clearance Certificate', 'Tax Number Registration'], icon: Globe, category: 'TAX_QUERY' },
    { id: 'tax-business', name: 'Business Tax', services: ['Company Tax Return', 'VAT Registration', 'PAYE Registration'], icon: Building2, category: 'TAX_QUERY' },
  ],
  'hospital-groote': [
    { id: 'outpatients', name: 'Outpatients', services: ['General Consultation', 'Specialist Referral', 'Follow-up Appointment'], icon: User, category: 'OTHER' },
    { id: 'pharmacy', name: 'Pharmacy', services: ['Prescription Collection', 'New Prescription', 'Chronic Medication'], icon: Globe, category: 'OTHER' },
    { id: 'admin', name: 'Patient Administration', services: ['New Patient Registration', 'Medical Records', 'Billing Enquiry'], icon: Smartphone, category: 'OTHER' },
  ],
  'hospital-tyger': [
    { id: 'outpatients', name: 'Outpatients', services: ['General Consultation', 'Specialist Referral', 'Paediatrics'], icon: User, category: 'OTHER' },
    { id: 'pharmacy', name: 'Pharmacy', services: ['Prescription Collection', 'New Prescription', 'Chronic Medication'], icon: Globe, category: 'OTHER' },
  ],
  'magistrate-cbd': [
    { id: 'civil', name: 'Civil Matters', services: ['Small Claims (under R20 000)', 'Maintenance Orders', 'Interdicts', 'Eviction Orders'], icon: Building2, category: 'OTHER' },
    { id: 'admin', name: 'Administration', services: ['Case Status Enquiry', 'Document Submission', 'Fine Payment'], icon: Smartphone, category: 'OTHER' },
  ],
  'dltc-milnerton': [
    { id: 'driving', name: 'Driving Licences', services: ["Driver's Licence (First Application)", "Driver's Licence Renewal", "Learner's Licence Test"], icon: Globe, category: 'MUNICIPAL_RATES' },
    { id: 'vehicle', name: 'Vehicle Registration', services: ['New Vehicle Registration', 'Change of Ownership', 'Licence Disc Renewal'], icon: Smartphone, category: 'MUNICIPAL_RATES' },
  ],
  'dltc-parow': [
    { id: 'driving', name: 'Driving Licences', services: ["Driver's Licence (First Application)", "Driver's Licence Renewal", "Learner's Licence Test"], icon: Globe, category: 'MUNICIPAL_RATES' },
    { id: 'vehicle', name: 'Vehicle Registration', services: ['New Vehicle Registration', 'Change of Ownership', 'Licence Disc Renewal'], icon: Smartphone, category: 'MUNICIPAL_RATES' },
  ],
  'municipality-cbd': [
    { id: 'rates', name: 'Rates & Taxes', services: ['Rates Account Enquiry', 'Rates Rebate Application', 'Valuation Objection', 'Payment Arrangement'], icon: Building2, category: 'MUNICIPAL_RATES' },
    { id: 'utilities', name: 'Water & Electricity', services: ['New Connection', 'Meter Reading Dispute', 'Fault Reporting', 'Account Query'], icon: Globe, category: 'MUNICIPAL_RATES' },
    { id: 'permits', name: 'Licences & Permits', services: ['Business Licence', 'Building Plans', 'Event Permit'], icon: Smartphone, category: 'MUNICIPAL_RATES' },
  ],
  'labour-bellville': [
    { id: 'uif', name: 'UIF Claims', services: ['Unemployment Benefits', 'Maternity Benefits', 'Illness Benefits', 'Death Benefits'], icon: Users, category: 'OTHER' },
    { id: 'employment', name: 'Employment Services', services: ['Job Registration', 'Learnership Application', 'Skills Development'], icon: Globe, category: 'OTHER' },
    { id: 'compliance', name: 'Labour Compliance', services: ['Complaint Against Employer', 'Mediation Request'], icon: Building2, category: 'OTHER' },
  ],
};

// ─── Congestion helpers ───────────────────────────────────────────────────────

function congestionColor(level: string) {
  if (level === 'LOW') return 'text-green-400';
  if (level === 'HIGH') return 'text-red-400';
  return 'text-yellow-400';
}

function congestionLabel(level: string) {
  if (level === 'LOW') return 'Short wait';
  if (level === 'HIGH') return 'Very busy';
  return 'Moderate';
}

function formatWait(minutes: number) {
  if (minutes < 60) return `~${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

// ─── On-screen keyboard ───────────────────────────────────────────────────────

type KeyboardProps = { onKey: (k: string) => void };

function OnScreenKeyboard({ onKey }: KeyboardProps) {
  const rows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M'],
  ];
  return (
    <div className="bg-card rounded-2xl border border-white/8 p-3 space-y-1.5">
      {rows.map((row, ri) => (
        <div key={ri} className={`flex gap-1.5 justify-center`}>
          {row.map(k => (
            <button key={k} onMouseDown={e => { e.preventDefault(); onKey(k); }}
              className="h-10 min-w-[32px] px-2 bg-white/5 rounded-lg text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
              {k}
            </button>
          ))}
        </div>
      ))}
      <div className="flex gap-1.5 justify-center">
        <button onMouseDown={e => { e.preventDefault(); onKey('1'); }} className="h-10 w-10 bg-white/5 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">1</button>
        <button onMouseDown={e => { e.preventDefault(); onKey('2'); }} className="h-10 w-10 bg-white/5 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">2</button>
        <button onMouseDown={e => { e.preventDefault(); onKey('3'); }} className="h-10 w-10 bg-white/5 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">3</button>
        <button onMouseDown={e => { e.preventDefault(); onKey(' '); }} className="h-10 flex-1 bg-white/5 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">SPACE</button>
        <button onMouseDown={e => { e.preventDefault(); onKey('0'); }} className="h-10 w-10 bg-white/5 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">0</button>
        <button onMouseDown={e => { e.preventDefault(); onKey('DEL'); }} className="h-10 px-4 bg-destructive/80 rounded-lg text-xs font-bold hover:bg-destructive transition-colors">⌫</button>
      </div>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

type Crumb = { label: string };
function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />}
          <span className={i === crumbs.length - 1 ? 'text-primary font-bold' : ''}>{c.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main kiosk component ─────────────────────────────────────────────────────

type Step = 'welcome' | 'province' | 'branch' | 'department' | 'service' | 'details' | 'confirm' | 'printing' | 'done';

function KioskContent() {
  const searchParams = useSearchParams();
  const preselectedBranchId = searchParams?.get('branchId');

  const [step, setStep] = useState<Step>(preselectedBranchId ? 'department' : 'welcome');
  const [clock, setClock] = useState('');

  // Selections
  const [provinceId, setProvinceId] = useState('western-cape');
  const [branchId, setBranchId] = useState(preselectedBranchId ?? '');
  const [departmentId, setDepartmentId] = useState('');
  const [service, setService] = useState('');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [activeField, setActiveField] = useState<'name' | 'id' | 'phone'>('name');

  // Ticket result
  const [issuedTicket, setIssuedTicket] = useState<{ ticketId: string; ticketNumber: string; estimatedWait: number; queuePositionAtIssue: number } | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [issueTime, setIssueTime] = useState('');

  const branch = BRANCHES_BY_PROVINCE['western-cape']?.find(b => b.id === branchId);
  const departments = branchId ? (DEPARTMENTS_BY_BRANCH[branchId] ?? []) : [];
  const department = departments.find(d => d.id === departmentId);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleKey = useCallback((k: string) => {
    const setters = { name: setName, id: setIdNumber, phone: setPhone };
    const setter = setters[activeField];
    if (k === 'DEL') setter(v => v.slice(0, -1));
    else setter(v => v + k);
  }, [activeField]);

  const handleFinish = async () => {
    setStep('printing');

    try {
      const dept = department;
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          citizenName: name || 'Guest',
          citizenPhone: phone || undefined,
          category: dept?.category ?? 'OTHER',
          serviceLabel: service,
          departmentId,
          departmentName: dept?.name,
          channel: 'KIOSK',
          paymentStatus: 'FREE',
        }),
      });
      const data = await res.json();
      const t = data.ticket;
      setIssuedTicket(t);
    } catch {
      // Fallback mock ticket for demo
      setIssuedTicket({
        ticketId: `kiosk_${Date.now()}`,
        ticketNumber: `${branch?.id?.split('-')[0]?.toUpperCase() ?? 'TK'}-${Math.floor(Math.random() * 60 + 10)}`,
        estimatedWait: 45,
        queuePositionAtIssue: 12,
      });
    }

    setIssueDate(new Date().toLocaleDateString('en-ZA'));
    setIssueTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setStep('done');
  };

  const reset = () => {
    setBranchId(''); setDepartmentId(''); setService('');
    setName(''); setIdNumber(''); setPhone('');
    setIssuedTicket(null);
    setStep('welcome');
  };

  const crumbs = (): Crumb[] => {
    const c: Crumb[] = [{ label: 'Western Cape' }];
    if (branch) c.push({ label: branch.name });
    if (department) c.push({ label: department.name });
    if (service) c.push({ label: service });
    return c;
  };

  const progress = { welcome: 0, province: 1, branch: 2, department: 3, service: 4, details: 5, confirm: 6, printing: 6, done: 6 };
  const totalSteps = 6;
  const pct = (progress[step] / totalSteps) * 100;

  return (
    <main className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden text-[#F5F2EE]">

      {/* Header */}
      <header className="h-16 px-8 border-b border-white/8 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-headline font-extrabold">Que</span>
          <span className="text-2xl font-headline font-extrabold text-primary">Up</span>
        </div>
        <div className="text-center">
          {branch && step !== 'welcome' && step !== 'province' && (
            <p className="text-sm font-headline font-bold">{branch.name}</p>
          )}
          {department && (step === 'service' || step === 'details' || step === 'confirm') && (
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{department.name}</p>
          )}
        </div>
        <div className="text-right tabular-nums">
          <p className="text-xl font-headline font-extrabold text-primary">{clock}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Self-Service Kiosk</p>
        </div>
      </header>

      {/* Progress bar */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="h-1 bg-white/5 shrink-0">
          <motion.div className="h-full bg-primary" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
        </div>
      )}

      {/* Breadcrumb */}
      {step !== 'welcome' && step !== 'province' && step !== 'done' && (
        <div className="px-8 py-3 border-b border-white/5 shrink-0">
          <Breadcrumb crumbs={crumbs()} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">

          {/* WELCOME */}
          {step === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.3 }} className="text-center space-y-8 w-full max-w-lg">
              <div className="flex justify-center">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
                </span>
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-headline font-extrabold leading-tight">Welcome.<br /><span className="text-primary">Touch to begin.</span></h2>
                <p className="text-sm text-muted-foreground">Self-Service Queue · All Government Departments</p>
              </div>
              <Button onClick={() => setStep('province')} className="w-full h-16 text-xl font-headline font-extrabold rounded-2xl bg-primary text-primary-foreground hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">
                START
              </Button>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground font-bold pt-2">
                <span>English</span><span className="opacity-30">|</span>
                <span>isiXhosa</span><span className="opacity-30">|</span>
                <span>Afrikaans</span>
              </div>
            </motion.div>
          )}

          {/* PROVINCE */}
          {step === 'province' && (
            <motion.div key="province" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="w-full max-w-2xl space-y-6">
              <div>
                <h2 className="text-2xl font-headline font-extrabold">Select Province</h2>
                <p className="text-sm text-muted-foreground">Where are you located?</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {PROVINCES.map(p => (
                  <button key={p.id} onClick={() => { if (p.active) { setProvinceId(p.id); setStep('branch'); } }}
                    className={`p-4 rounded-2xl border text-center transition-all ${p.active ? 'border-primary/40 hover:border-primary hover:bg-primary/5 cursor-pointer' : 'border-white/5 opacity-40 cursor-not-allowed'}`}>
                    <p className="font-bold text-sm">{p.name}</p>
                    {!p.active && <p className="text-[10px] text-muted-foreground mt-1">Coming Soon</p>}
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={reset} className="h-11 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4 mr-1" /> Back to Welcome</Button>
            </motion.div>
          )}

          {/* BRANCH */}
          {step === 'branch' && (
            <motion.div key="branch" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="w-full max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-extrabold">Select Branch</h2>
                  <p className="text-sm text-muted-foreground">Western Cape — choose your nearest branch</p>
                </div>
                <Button variant="ghost" onClick={() => setStep('province')} className="h-10 text-sm text-muted-foreground shrink-0"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {(BRANCHES_BY_PROVINCE[provinceId] ?? []).map(b => (
                  <button key={b.id} onClick={() => { setBranchId(b.id); setStep('department'); }}
                    className="w-full p-4 bg-card rounded-2xl border border-white/8 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] transition-all text-left flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{b.address}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className={`text-xs font-bold ${congestionColor(b.congestionLevel)}`}>{congestionLabel(b.congestionLevel)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5"><Clock className="h-3 w-3" />{formatWait(b.estimatedWait)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Users className="h-3 w-3" />{b.currentQueue} in queue</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* DEPARTMENT */}
          {step === 'department' && branchId && (
            <motion.div key="department" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="w-full max-w-lg space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-extrabold">Select Department</h2>
                  <p className="text-sm text-muted-foreground">{branch?.name}</p>
                </div>
                <Button variant="ghost" onClick={() => setStep(preselectedBranchId ? 'branch' : 'branch')} className="h-10 text-sm text-muted-foreground shrink-0"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              </div>
              <div className="space-y-3">
                {(DEPARTMENTS_BY_BRANCH[branchId] ?? []).map(dept => {
                  const Icon = dept.icon;
                  return (
                    <button key={dept.id} onClick={() => { setDepartmentId(dept.id); setStep('service'); }}
                      className="w-full p-5 bg-card rounded-2xl border border-white/8 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] transition-all text-left flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary group-hover:bg-primary/25 transition-colors shrink-0">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-headline font-bold text-base">{dept.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{dept.services.length} services available</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" onClick={() => { reset(); setStep('welcome'); }} className="h-11 text-sm text-muted-foreground w-full"><X className="h-4 w-4 mr-1" /> Cancel</Button>
            </motion.div>
          )}

          {/* SERVICE */}
          {step === 'service' && department && (
            <motion.div key="service" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="w-full max-w-lg space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-extrabold">Select Service</h2>
                  <p className="text-sm text-muted-foreground">{department.name}</p>
                </div>
                <Button variant="ghost" onClick={() => setStep('department')} className="h-10 text-sm text-muted-foreground shrink-0"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {department.services.map(svc => (
                  <button key={svc} onClick={() => { setService(svc); setStep('details'); }}
                    className="p-5 bg-card rounded-2xl border border-white/8 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] transition-all text-left group flex items-center justify-between">
                    <div>
                      <p className="font-headline font-bold text-base">{svc}</p>
                      <p className="text-xs text-primary font-bold uppercase tracking-wider mt-1">Touch to select →</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => { reset(); setStep('welcome'); }} className="h-11 text-sm text-muted-foreground w-full"><X className="h-4 w-4 mr-1" /> Cancel</Button>
            </motion.div>
          )}

          {/* DETAILS */}
          {step === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="w-full max-w-lg space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-extrabold">Your Details</h2>
                  <p className="text-sm text-muted-foreground">Enter your info to receive your ticket.</p>
                </div>
                <Button variant="ghost" onClick={() => setStep('service')} className="h-10 text-sm text-muted-foreground shrink-0"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary">First Name *</label>
                  <Input
                    className={`h-14 text-lg bg-card rounded-xl px-4 cursor-pointer ${activeField === 'name' ? 'border-primary' : 'border-white/10'}`}
                    placeholder="e.g. Thabo"
                    value={name}
                    readOnly
                    onFocus={() => setActiveField('name')}
                    onClick={() => setActiveField('name')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary">SA ID Number (optional)</label>
                  <Input
                    className={`h-14 text-lg bg-card rounded-xl px-4 cursor-pointer ${activeField === 'id' ? 'border-primary' : 'border-white/10'}`}
                    placeholder="13-digit ID"
                    value={idNumber}
                    readOnly
                    onFocus={() => setActiveField('id')}
                    onClick={() => setActiveField('id')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary">Phone (optional — for SMS updates)</label>
                  <Input
                    className={`h-14 text-lg bg-card rounded-xl px-4 cursor-pointer ${activeField === 'phone' ? 'border-primary' : 'border-white/10'}`}
                    placeholder="+27 8X XXX XXXX"
                    value={phone}
                    readOnly
                    onFocus={() => setActiveField('phone')}
                    onClick={() => setActiveField('phone')}
                  />
                </div>
              </div>

              <OnScreenKeyboard onKey={handleKey} />

              <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" onClick={() => { reset(); setStep('welcome'); }} className="h-12 text-sm text-muted-foreground">
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button onClick={() => setStep('confirm')} className="h-12 px-10 text-base font-bold rounded-xl bg-primary text-primary-foreground" disabled={!name.trim()}>
                  Continue <ChevronRight className="h-5 w-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* CONFIRM */}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.3 }} className="w-full max-w-lg space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-extrabold">Confirm Details</h2>
                  <p className="text-sm text-muted-foreground">Review your information before printing.</p>
                </div>
                <Button variant="ghost" onClick={() => setStep('details')} className="h-10 text-sm text-muted-foreground shrink-0"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              </div>

              <div className="bg-card rounded-2xl border border-white/8 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-primary font-bold uppercase tracking-wide">Branch</p><p className="font-semibold mt-0.5">{branch?.name}</p></div>
                  <div><p className="text-xs text-primary font-bold uppercase tracking-wide">Department</p><p className="font-semibold mt-0.5">{department?.name}</p></div>
                  <div><p className="text-xs text-primary font-bold uppercase tracking-wide">Service</p><p className="font-semibold mt-0.5">{service}</p></div>
                  <div><p className="text-xs text-primary font-bold uppercase tracking-wide">Name</p><p className="font-semibold mt-0.5">{name || 'Guest'}</p></div>
                  {phone && <div><p className="text-xs text-primary font-bold uppercase tracking-wide">Phone</p><p className="font-semibold mt-0.5">{phone}</p></div>}
                </div>
                <div className="border-t border-white/8 pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 text-primary" />
                  <span>Est. wait: <strong className="text-primary">{formatWait(branch?.estimatedWait ?? 60)}</strong> · {branch?.currentQueue ?? 0} people ahead</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button onClick={handleFinish} className="w-full h-14 text-lg font-bold rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Printer className="h-5 w-5 mr-2" /> Confirm & Print Ticket
                </Button>
                <Button variant="ghost" onClick={() => { reset(); setStep('welcome'); }} className="w-full h-11 text-sm text-muted-foreground">
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* PRINTING */}
          {step === 'printing' && (
            <motion.div key="printing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
              <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
              <h2 className="text-3xl font-headline font-bold">Printing your ticket…</h2>
              <p className="text-base text-muted-foreground">Please wait a moment.</p>
            </motion.div>
          )}

          {/* DONE */}
          {step === 'done' && issuedTicket && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center space-y-6 w-full max-w-sm">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                  <Printer className="h-10 w-10 text-primary" />
                </div>
                <motion.div className="absolute -top-1 -right-1 h-7 w-7 bg-green-500 rounded-full flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </motion.div>
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl font-headline font-extrabold">Ticket Printed!</h2>
                <p className="text-sm text-muted-foreground">Collect your slip from the slot below.</p>
              </div>

              {/* Paper ticket mockup */}
              <div className="bg-white text-black rounded-2xl p-6 shadow-2xl text-left space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Ticket Number</p>
                    <div className="text-6xl font-headline font-extrabold leading-none mt-1">{issuedTicket.ticketNumber}</div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Est. Wait</p>
                    <p className="text-2xl font-headline font-extrabold text-primary">{formatWait(issuedTicket.estimatedWait)}</p>
                  </div>
                </div>
                <div className="border-t border-black/10 pt-3 space-y-1 text-xs text-gray-500">
                  <p className="font-bold text-sm text-black">{branch?.name}</p>
                  <p className="font-semibold text-black/80">{department?.name} — {service}</p>
                  <p>Name: {name || 'Guest'}</p>
                  <p>Date: {issueDate}</p>
                  <p>Issued: {issueTime}</p>
                  <p>Position: #{issuedTicket.queuePositionAtIssue} in queue</p>
                </div>
                <div className="flex justify-center pt-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div key={i} className="w-0.5 bg-black" style={{ height: i % 3 === 0 ? 20 : 14 }} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Returning to start in 30 seconds…</p>
              <Button onClick={reset} className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-bold">
                Done
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}

export default function KioskPage() {
  return (
    <Suspense fallback={
      <main className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white font-headline font-bold text-2xl">Loading Kiosk...</div>
      </main>
    }>
      <KioskContent />
    </Suspense>
  );
}
