'use client';

import { useState, useEffect } from 'react';
import CustomerInfoForm from '@/components/quotation/CustomerInfoForm';
import ServiceSelector from '@/components/quotation/ServiceSelector';
import QuotationSummary from '@/components/quotation/QuotationSummary';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, LayoutDashboard } from 'lucide-react';

const STEPS = ['Customer Info', 'Select Services', 'Review & Download'];

function generateQuotationNo() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 900) + 100;
    return `VMQ-${date}-${rand}`;
}

function getTodayFormatted() {
    return new Date().toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

const initialCustomer = {
    name: '', dob: '', gender: '', phone: '', email: '',
    address: '', notes: '', preparedBy: '',
    quotationNo: generateQuotationNo(),
    date: getTodayFormatted(),
    guarantorId: '',
    guarantorName: '',
    sessionType: 'Per-session',
    isOneTimeVisit: false
};

type ItemType = {
    id: string;
    deptId: string;
    deptName: string;
    serviceId: string;
    serviceName: string;
    unitPrice: number;
    unit: string;
    sessions: number;
    subtotal: number;
}

export default function QuotationPage() {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [customer, setCustomer] = useState(initialCustomer);
    const [items, setItems] = useState<ItemType[]>([]);

    useEffect(() => {
        if (user) {
            setCustomer((prev) => ({
                ...prev,
                preparedBy: `${user.FirstName} ${user.LastName}`.trim(),
            }));
        }
    }, [user]);

    const goNext = () => setStep((s) => Math.min(s + 1, 2));
    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    return (
        <SidebarLayout pageTitle="New Quotation">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
                {/* Active Quotation Information Box */}
                <div className="mb-8 bg-white/90 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-brand-muted-blue/20 ring-1 ring-slate-900/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-lime-green/10 flex items-center justify-center border border-brand-lime-green/20">
                            <LayoutDashboard className="w-5 h-5 text-brand-lime-green" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-brand-dark-blue">Active Quotation Draft</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Complete the steps below to finalize the document.</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex items-center shadow-inner">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-3">Document No:</span>
                        <span className="text-base font-mono font-bold text-brand-lime-green tracking-tight">{customer.quotationNo}</span>
                    </div>
                </div>

                {/* Stepper */}
                <div className="mb-8">
                    <div className="flex items-center justify-between relative z-0">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10" />
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-muted-blue -z-10 transition-all duration-500 ease-in-out"
                            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                        />
                        {STEPS.map((label, i) => {
                            const isActive = i === step;
                            const isDone = i < step;
                            return (
                                <div key={i} className="flex flex-col items-center relative group">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 shadow-sm
                                        ${isActive ? 'bg-brand-muted-blue text-white ring-4 ring-brand-muted-blue/20 scale-110' : ''}
                                        ${isDone ? 'bg-brand-dark-blue text-white' : ''}
                                        ${!isActive && !isDone ? 'bg-white text-slate-400 border-2 border-slate-200 group-hover:border-brand-muted-blue/50' : ''}
                                    `}>
                                        {isDone ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
                                    </div>
                                    <div className={`mt-3 text-[10px] md:text-sm font-medium absolute top-10 whitespace-nowrap transition-colors duration-300
                                        ${isActive ? 'text-brand-dark-blue font-bold' : (isDone ? 'text-slate-700' : 'text-slate-400')}
                                    `}>
                                        {label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Form Cards */}
                <div className="mt-12 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5">
                    <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-5 sm:px-8 flex items-start justify-between gap-4">
                        <div className="flex flex-col items-start gap-3">
                            {step > 0 && (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                >
                                    ← Back
                                </button>
                            )}
                            <div>
                                <div className="text-xs font-semibold text-brand-muted-blue uppercase tracking-wider mb-1">
                                    Step {step + 1} of {STEPS.length}
                                </div>
                                <h2 className="text-xl font-bold text-brand-dark-blue">{STEPS[step]}</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {step === 0 && 'Enter the patient or customer details below. Fields marked * are required.'}
                                    {step === 1 && 'Search for a department and service, set the number of sessions, then click Add.'}
                                    {step === 2 && 'Review the complete quotation below, then download it as a PDF.'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 sm:p-8">
                        {step === 0 && <CustomerInfoForm data={customer} onChange={setCustomer} onNext={goNext} />}
                        {step === 1 && <ServiceSelector items={items} onChange={setItems} onNext={goNext} onBack={goBack} />}
                        {step === 2 && <QuotationSummary customer={customer} items={items} onBack={goBack} preparedBy={customer.preparedBy} />}
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
