"use client"

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  ChevronRight, ChevronLeft, Fingerprint, Globe, User, Smartphone,
  PrinterIcon, CheckCircle2, Share2, Clock, FileText, Loader2,
  AlertTriangle, X, MapPin, Users, Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Department / service data per branch ─────────────────────────────────────

type DeptDef = {
  id: string;
  name: string;
  icon: React.ElementType;
  services: ServiceDef[];
  category: string;
};

type ServiceDef = {
  id: string;
  title: string;
  desc: string;
  docs: string[];
};

const DEPARTMENTS_BY_BRANCH: Record<string, DeptDef[]> = {
  'ha-bellville': [
    {
      id: 'identity', name: 'Identity Documents', icon: Fingerprint, category: 'SMART_ID',
      services: [
        { id: 'smart-id-new', title: 'Smart ID Card (New)', desc: 'First-time Smart ID application.', docs: ['Birth Certificate', '2× ID Photos', 'No fee'] },
        { id: 'smart-id-renew', title: 'Smart ID Card (Renewal)', desc: 'Replace lost, stolen or expired Smart ID.', docs: ['Old ID Book / Smart ID', '2× ID Photos', 'R140 fee'] },
        { id: 'temp-id', title: 'Temporary ID Certificate', desc: 'Urgent temporary identity document.', docs: ['Proof of Identity', '2× ID Photos'] },
      ],
    },
    {
      id: 'travel', name: 'Travel Documents', icon: Globe, category: 'PASSPORT',
      services: [
        { id: 'passport-new', title: 'Passport (New)', desc: 'Apply for a South African passport.', docs: ['Smart ID / Green ID Book', '2× Passport Photos', 'R400 fee'] },
        { id: 'passport-renew', title: 'Passport (Renewal)', desc: 'Renew an expiring or expired passport.', docs: ['Old Passport', '2× Passport Photos', 'R400 fee'] },
        { id: 'emergency-travel', title: 'Emergency Travel Cert.', desc: 'Urgent one-trip travel document.', docs: ['Proof of Emergency Travel', '2× Photos'] },
      ],
    },
    {
      id: 'civil', name: 'Civil Registration', icon: User, category: 'BIRTH_CERTIFICATE',
      services: [
        { id: 'birth-cert', title: 'Birth Certificate', desc: 'Register a birth or get a certified copy.', docs: ["Parents' ID Documents", 'Hospital Birth Record'] },
        { id: 'marriage-cert', title: 'Marriage Certificate', desc: 'Register a marriage or get a copy.', docs: ["Both parties' ID Documents"] },
        { id: 'death-cert', title: 'Death Certificate', desc: 'Register a death or get a certified copy.', docs: ["Deceased's ID Document", 'Medical Certificate of Death'] },
      ],
    },
  ],
  'ha-cbd': [
    {
      id: 'identity', name: 'Identity Documents', icon: Fingerprint, category: 'SMART_ID',
      services: [
        { id: 'smart-id-new', title: 'Smart ID Card (New)', desc: 'First-time Smart ID application.', docs: ['Birth Certificate', '2× ID Photos'] },
        { id: 'smart-id-renew', title: 'Smart ID Card (Renewal)', desc: 'Replace lost, stolen or expired Smart ID.', docs: ['Old ID / Smart ID', '2× ID Photos', 'R140 fee'] },
      ],
    },
    {
      id: 'travel', name: 'Travel Documents', icon: Globe, category: 'PASSPORT',
      services: [
        { id: 'passport-new', title: 'Passport (New)', desc: 'Apply for a South African passport.', docs: ['Smart ID', '2× Passport Photos', 'R400 fee'] },
        { id: 'passport-renew', title: 'Passport (Renewal)', desc: 'Renew an expiring passport.', docs: ['Old Passport', '2× Photos', 'R400 fee'] },
      ],
    },
    {
      id: 'civil', name: 'Civil Registration', icon: User, category: 'BIRTH_CERTIFICATE',
      services: [
        { id: 'birth-cert', title: 'Birth Certificate', desc: 'Register a birth or get a copy.', docs: ["Parents' IDs", 'Hospital Birth Record'] },
        { id: 'marriage-cert', title: 'Marriage Certificate', desc: 'Register a marriage.', docs: ["Both parties' IDs"] },
      ],
    },
  ],
  'ha-mitchells-plain': [
    {
      id: 'identity', name: 'Identity Documents', icon: Fingerprint, category: 'SMART_ID',
      services: [
        { id: 'smart-id-new', title: 'Smart ID Card (New)', desc: 'First-time Smart ID application.', docs: ['Birth Certificate', '2× ID Photos'] },
        { id: 'smart-id-renew', title: 'Smart ID Card (Renewal)', desc: 'Replacement Smart ID.', docs: ['Old ID', '2× Photos', 'R140 fee'] },
      ],
    },
    {
      id: 'civil', name: 'Civil Registration', icon: User, category: 'BIRTH_CERTIFICATE',
      services: [
        { id: 'birth-cert', title: 'Birth Certificate', desc: 'Register a birth or get a copy.', docs: ["Parents' IDs"] },
        { id: 'marriage-cert', title: 'Marriage Certificate', desc: 'Get a marriage certificate.', docs: ["Both parties' IDs"] },
      ],
    },
  ],
  'ha-khayelitsha': [
    {
      id: 'identity', name: 'Identity Documents', icon: Fingerprint, category: 'SMART_ID',
      services: [
        { id: 'smart-id-new', title: 'Smart ID Card (New)', desc: 'First-time Smart ID.', docs: ['Birth Certificate', '2× ID Photos'] },
        { id: 'smart-id-renew', title: 'Smart ID Card (Renewal)', desc: 'Replacement Smart ID.', docs: ['Old ID', '2× Photos', 'R140 fee'] },
      ],
    },
    {
      id: 'travel', name: 'Travel Documents', icon: Globe, category: 'PASSPORT',
      services: [
        { id: 'passport-new', title: 'Passport (New)', desc: 'Apply for a passport.', docs: ['Smart ID', '2× Photos', 'R400 fee'] },
        { id: 'passport-renew', title: 'Passport (Renewal)', desc: 'Renew your passport.', docs: ['Old Passport', '2× Photos', 'R400 fee'] },
      ],
    },
  ],
  'sassa-bellville': [
    {
      id: 'grants', name: 'Social Grants', icon: Users, category: 'SASSA',
      services: [
        { id: 'old-age', title: 'Old Age Pension', desc: 'Apply for the old age social grant.', docs: ['ID Document', 'Proof of Income', 'Bank Statement'] },
        { id: 'disability', title: 'Disability Grant', desc: 'Apply for a disability grant.', docs: ['ID Document', 'Medical Certificate', 'Bank Statement'] },
        { id: 'child-support', title: 'Child Support Grant', desc: 'Apply for child support.', docs: ["Child's Birth Certificate", "Caregiver's ID", 'Bank Statement'] },
      ],
    },
    {
      id: 'status', name: 'Grant Status & Updates', icon: Smartphone, category: 'SASSA',
      services: [
        { id: 'grant-status', title: 'Grant Status Check', desc: 'Check the status of your grant application.', docs: ['ID Document'] },
        { id: 'bank-update', title: 'Banking Details Update', desc: 'Update your payment bank details.', docs: ['ID Document', 'New Bank Statement'] },
      ],
    },
  ],
  'sassa-khayelitsha': [
    {
      id: 'grants', name: 'Social Grants', icon: Users, category: 'SASSA',
      services: [
        { id: 'old-age', title: 'Old Age Pension', desc: 'Apply for the old age social grant.', docs: ['ID Document', 'Proof of Income'] },
        { id: 'disability', title: 'Disability Grant', desc: 'Apply for a disability grant.', docs: ['ID Document', 'Medical Certificate'] },
        { id: 'child-support', title: 'Child Support Grant', desc: 'Apply for child support.', docs: ["Child's Birth Certificate", "Caregiver's ID"] },
      ],
    },
  ],
  'sars-pinelands': [
    {
      id: 'tax-personal', name: 'Personal Tax', icon: Globe, category: 'TAX_QUERY',
      services: [
        { id: 'itr12', title: 'Income Tax Return (ITR12)', desc: 'Submit your annual tax return.', docs: ['IRP5 Documents', 'Bank Statements', 'ID Document'] },
        { id: 'tax-clearance', title: 'Tax Clearance Certificate', desc: 'Get a tax clearance certificate.', docs: ['ID Document', 'Latest Tax Return'] },
        { id: 'tax-number', title: 'Tax Number Registration', desc: 'Register for a tax number.', docs: ['ID Document', 'Proof of Address'] },
      ],
    },
    {
      id: 'tax-business', name: 'Business Tax', icon: Building2, category: 'TAX_QUERY',
      services: [
        { id: 'company-tax', title: 'Company Tax Return', desc: 'Submit company tax return.', docs: ['Financial Statements', 'CIPC Documents'] },
        { id: 'vat', title: 'VAT Registration', desc: 'Register for VAT.', docs: ['Company Registration', 'Bank Details'] },
      ],
    },
  ],
  'hospital-groote': [
    {
      id: 'outpatients', name: 'Outpatients', icon: User, category: 'OTHER',
      services: [
        { id: 'general', title: 'General Consultation', desc: 'See a general practitioner.', docs: ['ID Document', 'Medical Aid Card (if applicable)', 'Referral Letter (if applicable)'] },
        { id: 'specialist', title: 'Specialist Referral', desc: 'Referral to a specialist department.', docs: ['GP Referral Letter', 'ID Document'] },
        { id: 'followup', title: 'Follow-up Appointment', desc: 'Return visit for ongoing treatment.', docs: ['Previous Visit Card', 'ID Document'] },
      ],
    },
    {
      id: 'pharmacy', name: 'Pharmacy', icon: Globe, category: 'OTHER',
      services: [
        { id: 'prescription', title: 'Prescription Collection', desc: 'Collect your chronic medication.', docs: ['ID Document', 'Script / Appointment Card'] },
        { id: 'new-rx', title: 'New Prescription', desc: 'Fill a new prescription.', docs: ['Doctor\'s Script', 'ID Document'] },
      ],
    },
  ],
  'hospital-tyger': [
    {
      id: 'outpatients', name: 'Outpatients', icon: User, category: 'OTHER',
      services: [
        { id: 'general', title: 'General Consultation', desc: 'See a general practitioner.', docs: ['ID Document', 'Referral Letter'] },
        { id: 'paediatrics', title: 'Paediatrics', desc: "Children's health services.", docs: ["Child's Health Card", 'ID Document'] },
      ],
    },
    {
      id: 'pharmacy', name: 'Pharmacy', icon: Globe, category: 'OTHER',
      services: [
        { id: 'prescription', title: 'Prescription Collection', desc: 'Collect medication.', docs: ['ID Document', 'Script'] },
        { id: 'chronic', title: 'Chronic Medication', desc: 'Ongoing medication collection.', docs: ['Clinic Card', 'ID Document'] },
      ],
    },
  ],
  'dltc-milnerton': [
    {
      id: 'driving', name: 'Driving Licences', icon: Globe, category: 'MUNICIPAL_RATES',
      services: [
        { id: 'dl-first', title: "Driver's Licence (First)", desc: 'First-time driver\'s licence application.', docs: ['Learner\'s Licence', 'ID Document', '2× Photos', 'R300 fee'] },
        { id: 'dl-renew', title: "Driver's Licence (Renewal)", desc: 'Renew your driving licence.', docs: ['Current Driver\'s Licence', 'ID Document', '2× Photos', 'Eye Test'] },
        { id: 'learners', title: "Learner's Licence Test", desc: "Book and write your learner's test.", docs: ['ID Document', '2× Photos', 'R135 fee'] },
      ],
    },
    {
      id: 'vehicle', name: 'Vehicle Registration', icon: Smartphone, category: 'MUNICIPAL_RATES',
      services: [
        { id: 'new-reg', title: 'New Vehicle Registration', desc: 'Register a new or imported vehicle.', docs: ['Title Deed / Invoice', 'ID Document', 'Roadworthy Certificate'] },
        { id: 'ownership', title: 'Change of Ownership', desc: 'Transfer vehicle ownership.', docs: ['Original Title Deed', 'Both parties\' IDs', 'R350 fee'] },
        { id: 'disc', title: 'Licence Disc Renewal', desc: 'Renew your motor vehicle licence.', docs: ['Current Disc', 'ID Document'] },
      ],
    },
  ],
  'dltc-parow': [
    {
      id: 'driving', name: 'Driving Licences', icon: Globe, category: 'MUNICIPAL_RATES',
      services: [
        { id: 'dl-first', title: "Driver's Licence (First)", desc: 'First-time application.', docs: ['Learner\'s Licence', 'ID Document', '2× Photos'] },
        { id: 'dl-renew', title: "Driver's Licence (Renewal)", desc: 'Renew your driving licence.', docs: ['Current Licence', 'ID Document', '2× Photos'] },
        { id: 'learners', title: "Learner's Licence Test", desc: "Write your learner's test.", docs: ['ID Document', '2× Photos', 'R135 fee'] },
      ],
    },
    {
      id: 'vehicle', name: 'Vehicle Registration', icon: Smartphone, category: 'MUNICIPAL_RATES',
      services: [
        { id: 'new-reg', title: 'New Vehicle Registration', desc: 'Register a vehicle.', docs: ['Title Deed', 'ID Document'] },
        { id: 'ownership', title: 'Change of Ownership', desc: 'Transfer vehicle.', docs: ['Both parties\' IDs'] },
      ],
    },
  ],
  'magistrate-cbd': [
    {
      id: 'civil', name: 'Civil Matters', icon: Building2, category: 'OTHER',
      services: [
        { id: 'small-claims', title: 'Small Claims (under R20 000)', desc: 'File a small claims matter.', docs: ['ID Document', 'Written Description of Claim', 'Supporting Documents'] },
        { id: 'maintenance', title: 'Maintenance Orders', desc: 'Apply for or modify a maintenance order.', docs: ['ID Document', 'Birth Certificate (if for child)'] },
        { id: 'interdict', title: 'Interdict Application', desc: 'Apply for a court interdict.', docs: ['ID Document', 'Affidavit'] },
      ],
    },
    {
      id: 'admin', name: 'Administration', icon: Smartphone, category: 'OTHER',
      services: [
        { id: 'status', title: 'Case Status Enquiry', desc: 'Check the status of your case.', docs: ['Case Reference Number', 'ID Document'] },
        { id: 'fine', title: 'Fine Payment', desc: 'Pay a traffic or court fine.', docs: ['Fine Notice', 'ID Document'] },
      ],
    },
  ],
  'municipality-cbd': [
    {
      id: 'rates', name: 'Rates & Taxes', icon: Building2, category: 'MUNICIPAL_RATES',
      services: [
        { id: 'rates-enquiry', title: 'Rates Account Enquiry', desc: 'Enquire about your municipal rates account.', docs: ['ID Document', 'Property Address'] },
        { id: 'rebate', title: 'Rates Rebate Application', desc: 'Apply for a rates rebate.', docs: ['ID Document', 'Proof of Ownership', 'Income Statement'] },
        { id: 'payment-arrangement', title: 'Payment Arrangement', desc: 'Arrange to pay outstanding rates.', docs: ['ID Document', 'Latest Statement'] },
      ],
    },
    {
      id: 'utilities', name: 'Water & Electricity', icon: Globe, category: 'MUNICIPAL_RATES',
      services: [
        { id: 'new-connection', title: 'New Connection', desc: 'Apply for water or electricity connection.', docs: ['Proof of Ownership', 'ID Document'] },
        { id: 'meter-dispute', title: 'Meter Reading Dispute', desc: 'Dispute an incorrect meter reading.', docs: ['ID Document', 'Account Number', 'Own Meter Reading'] },
        { id: 'account-query', title: 'Account Query', desc: 'Query your utility account.', docs: ['ID Document', 'Account Number'] },
      ],
    },
    {
      id: 'permits', name: 'Licences & Permits', icon: Smartphone, category: 'MUNICIPAL_RATES',
      services: [
        { id: 'business-licence', title: 'Business Licence', desc: 'Apply for or renew a business licence.', docs: ['ID Document', 'Proof of Business Address', 'R450 fee'] },
        { id: 'building-plans', title: 'Building Plans', desc: 'Submit or collect building plan approval.', docs: ['Architectural Plans', 'Property Title', 'Application Fee'] },
      ],
    },
  ],
  'labour-bellville': [
    {
      id: 'uif', name: 'UIF Claims', icon: Users, category: 'OTHER',
      services: [
        { id: 'unemployment', title: 'Unemployment Benefits', desc: 'Claim UIF after losing your job.', docs: ['ID Document', 'UI-19 Form from Employer', 'Last 6 Months Payslips'] },
        { id: 'maternity', title: 'Maternity Benefits', desc: 'Claim UIF maternity benefits.', docs: ['ID Document', 'Birth Certificate', 'UI-2.7 Form'] },
        { id: 'illness', title: 'Illness Benefits', desc: 'Claim UIF while ill.', docs: ['ID Document', 'Medical Certificate', 'UI-2.2 Form'] },
      ],
    },
    {
      id: 'employment', name: 'Employment Services', icon: Globe, category: 'OTHER',
      services: [
        { id: 'job-reg', title: 'Job Registration', desc: 'Register as a jobseeker.', docs: ['ID Document', 'Qualifications', 'CV'] },
        { id: 'learnership', title: 'Learnership Application', desc: 'Apply for a learnership or internship.', docs: ['ID Document', 'Matric Certificate'] },
      ],
    },
    {
      id: 'compliance', name: 'Labour Compliance', icon: Building2, category: 'OTHER',
      services: [
        { id: 'complaint', title: 'Complaint Against Employer', desc: 'Lodge a labour complaint.', docs: ['ID Document', 'Proof of Employment', 'Written Complaint'] },
        { id: 'mediation', title: 'Mediation Request', desc: 'Request mediation for a labour dispute.', docs: ['ID Document', 'Documentation of Dispute'] },
      ],
    },
  ],
};

// Fallback departments for branches not in the map
const DEFAULT_DEPARTMENTS: DeptDef[] = [
  {
    id: 'general', name: 'General Services', icon: User, category: 'OTHER',
    services: [
      { id: 'enquiry', title: 'General Enquiry', desc: 'General information and assistance.', docs: ['ID Document'] },
      { id: 'documents', title: 'Document Submission', desc: 'Submit official documents.', docs: ['ID Document', 'Relevant Documents'] },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVINCE_LABEL = 'Western Cape';

function formatWait(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type Crumb = { label: string };
function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mb-6">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />}
          <span className={i === crumbs.length - 1 ? 'text-primary font-bold' : ''}>{c.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

type FlowStep = 'department' | 'service' | 'details' | 'joining' | 'success' | 'full';

function JoinFlowContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const branchName = searchParams?.get('branch') ?? 'Home Affairs Bellville';
  const branchId = searchParams?.get('branchId') ?? 'ha-bellville';

  const departments = DEPARTMENTS_BY_BRANCH[branchId] ?? DEFAULT_DEPARTMENTS;

  const [step, setStep] = useState<FlowStep>('department');
  const [deptId, setDeptId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [details, setDetails] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [redirectRec, setRedirectRec] = useState<string | null>(null);
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketId: string; ticketNumber: string; estimatedWait: number;
    queuePositionAtIssue: number; issuedAt: string; branchName: string;
  } | null>(null);

  const dept = departments.find(d => d.id === deptId);
  const svc = dept?.services.find(s => s.id === serviceId);

  const crumbs = (): Crumb[] => {
    const c: Crumb[] = [{ label: PROVINCE_LABEL }, { label: branchName }];
    if (dept) c.push({ label: dept.name });
    if (svc) c.push({ label: svc.title });
    return c;
  };

  const handleJoin = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          citizenName: details.name.trim(),
          citizenPhone: details.phone || undefined,
          category: dept?.category ?? 'OTHER',
          serviceLabel: svc?.title ?? serviceId,
          departmentId: deptId,
          departmentName: dept?.name,
          channel: 'QR',
          paymentStatus: 'FREE',
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        const redirectRes = await fetch('/api/redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentBranchId: branchId,
            serviceType: svc?.title ?? serviceId,
            citizenLocation: branchName,
          }),
        });
        const redirectData = await redirectRes.json();
        setRedirectRec(redirectData.recommendation ?? data.message);
        setStep('full');
        return;
      }

      if (!res.ok) {
        setSubmitError('Something went wrong. Please try again.');
        return;
      }

      const t = data.ticket;
      setIssuedTicket({
        ticketId: t.ticketId,
        ticketNumber: t.ticketNumber,
        estimatedWait: t.estimatedWait,
        queuePositionAtIssue: t.queuePositionAtIssue,
        issuedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        branchName: t.branchName ?? branchName,
      });
      setStep('success');
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-2xl">
      <AnimatePresence mode="wait">

        {/* STEP 1 — Department */}
        {step === 'department' && (
          <motion.div key="dept" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Breadcrumb crumbs={[{ label: PROVINCE_LABEL }, { label: branchName }]} />
            <div className="space-y-1">
              <h1 className="text-3xl font-headline font-extrabold">Select Department</h1>
              <p className="text-muted-foreground text-sm">What do you need help with today at <strong>{branchName}</strong>?</p>
            </div>
            <div className="space-y-3">
              {departments.map(d => {
                const Icon = d.icon;
                return (
                  <button key={d.id} onClick={() => { setDeptId(d.id); setStep('service'); }}
                    className="w-full p-5 bg-card rounded-2xl border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary group-hover:bg-primary/25 shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-base">{d.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.services.length} services</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-12 rounded-full" onClick={() => router.push('/join/browse')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Change Branch
              </Button>
              <Button variant="ghost" className="h-12 rounded-full text-muted-foreground" onClick={() => router.push('/')}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 — Service */}
        {step === 'service' && dept && (
          <motion.div key="svc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Breadcrumb crumbs={[{ label: PROVINCE_LABEL }, { label: branchName }, { label: dept.name }]} />
            <div className="space-y-1">
              <h1 className="text-3xl font-headline font-extrabold">Select Service</h1>
              <p className="text-muted-foreground text-sm">{dept.name} at {branchName}</p>
            </div>
            <div className="space-y-3">
              {dept.services.map(s => (
                <button key={s.id} onClick={() => { setServiceId(s.id); setStep('details'); }}
                  className="w-full p-5 bg-card rounded-2xl border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-base">{s.title}</p>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.docs.slice(0, 3).map((doc, i) => (
                      <span key={i} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">{doc}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-12 rounded-full" onClick={() => setStep('department')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="ghost" className="h-12 rounded-full text-muted-foreground" onClick={() => router.push('/')}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3 — Details */}
        {step === 'details' && dept && svc && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Breadcrumb crumbs={crumbs()} />
            <div className="space-y-1">
              <h1 className="text-3xl font-headline font-extrabold">Your Details</h1>
              <p className="text-muted-foreground text-sm">We'll use these for queue updates.</p>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-800/50 text-red-400 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}

            {/* Required docs reminder */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Documents needed for {svc.title}
              </p>
              <ul className="space-y-1">
                {svc.docs.map((doc, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="text-foreground/80">{doc}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 border-white/5 bg-card space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" placeholder="e.g. Nomsa Dlamini" className="h-12 text-base"
                  value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (WhatsApp/SMS — optional)</Label>
                <Input id="phone" placeholder="e.g. +27 81 234 5678" className="h-12 text-base"
                  value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} />
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="h-14 flex-1 rounded-full font-bold" onClick={() => setStep('service')}>
                <ChevronLeft className="mr-2 h-5 w-5" /> Back
              </Button>
              <Button className="h-14 flex-[2] rounded-full font-bold text-base"
                disabled={!details.name.trim() || isSubmitting}
                onClick={handleJoin}>
                {isSubmitting
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Joining Queue…</>
                  : <>Join Queue (Free) <ChevronRight className="ml-2 h-5 w-5" /></>}
              </Button>
            </div>
            <Button variant="ghost" className="w-full h-11 text-sm text-muted-foreground rounded-full" onClick={() => router.push('/')}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </motion.div>
        )}

        {/* STEP 4 — Success */}
        {step === 'success' && issuedTicket && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            <Breadcrumb crumbs={crumbs()} />
            <div className="text-center space-y-4">
              <div className="bg-primary/20 p-6 rounded-full inline-block relative">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
                <motion.div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              </div>
              <div>
                <h1 className="text-3xl font-headline font-extrabold">You&apos;re in the queue!</h1>
                <p className="text-muted-foreground mt-1">Ticket issued for {issuedTicket.branchName}</p>
              </div>
            </div>

            <Card className="p-6 bg-card border-primary/20 space-y-5 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded">DIGITAL</span>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Ticket Number</p>
                <div className="text-7xl font-headline font-extrabold">{issuedTicket.ticketNumber}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm border-t border-white/5 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Issued</p>
                  <p className="font-bold">{issuedTicket.issuedAt}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Est. Wait</p>
                  <p className="font-bold text-primary">{formatWait(issuedTicket.estimatedWait)}</p>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Details</p>
                <p className="text-xs"><strong>Branch:</strong> {issuedTicket.branchName}</p>
                <p className="text-xs"><strong>Department:</strong> {dept?.name}</p>
                <p className="text-xs"><strong>Service:</strong> {svc?.title}</p>
                <p className="text-xs"><strong>Position:</strong> #{issuedTicket.queuePositionAtIssue} in queue</p>
                <p className="text-xs"><strong>Name:</strong> {details.name}</p>
              </div>
            </Card>

            <div className="space-y-3">
              <Button onClick={() => router.push(`/queue/${issuedTicket.ticketId}`)} className="h-14 w-full rounded-full bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/20">
                Track Live Position
              </Button>
              <Button variant="outline" className="h-12 w-full rounded-full border-white/10"
                onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(window.location.origin + `/queue/${issuedTicket.ticketId}`); }}>
                <Share2 className="mr-2 h-4 w-4" /> Share Ticket Link
              </Button>
              <Button variant="ghost" className="h-12 w-full rounded-full text-muted-foreground" onClick={() => router.push('/')}>
                Return Home
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP — Branch Full */}
        {step === 'full' && (
          <motion.div key="full" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8">
            <div className="bg-destructive/20 p-6 rounded-full inline-block">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-extrabold">Branch Full</h1>
              <p className="text-muted-foreground mt-2">{branchName} has reached its daily capacity.</p>
            </div>
            {redirectRec && (
              <Card className="p-5 bg-card border-primary/30 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">QueUp AI Recommendation</p>
                <p className="text-sm leading-relaxed">{redirectRec}</p>
              </Card>
            )}
            <div className="space-y-3">
              <Button className="h-14 w-full rounded-full font-bold" onClick={() => router.push('/join/browse')}>
                <MapPin className="mr-2 h-5 w-5" /> Find Nearby Branch
              </Button>
              <Button variant="ghost" className="h-12 w-full rounded-full text-muted-foreground" onClick={() => router.push('/')}>
                Return Home
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

export default function JoinFlow() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground font-headline font-bold">Loading queue details…</p>
          </div>
        </div>
      }>
        <JoinFlowContent />
      </Suspense>
    </main>
  );
}
