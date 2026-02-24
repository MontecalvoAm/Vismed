'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CustomerInfoForm from '@/components/quotation/CustomerInfoForm';
import ServiceSelector from '@/components/quotation/ServiceSelector';
import QuotationSummary from '@/components/quotation/QuotationSummary';
import { clearSession } from '@/lib/auth';
import { LogOut, CheckCircle2 } from 'lucide-react';

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
    address: '', physician: '', notes: '',
    quotationNo: generateQuotationNo(),
    date: getTodayFormatted(),
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
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [customer, setCustomer] = useState(initialCustomer);
    const [items, setItems] = useState<ItemType[]>([]);

    const goNext = () => setStep((s) => Math.min(s + 1, 2));
    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    const handleLogout = () => {
        clearSession();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-primary/20">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Image src="/VisayasMedical.png" alt="Logo" width={32} height={32} className="object-contain" />
                    <span className="font-bold text-lg hidden sm:inline-block tracking-tight text-slate-800">
                        VisayasMed <span className="text-primary font-medium">Hospital</span>
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 mr-2">DOC:</span>
                        <span className="text-sm font-mono font-medium text-slate-800">{customer.quotationNo}</span>
                    </div>
                    <button
                        className="flex items-center text-sm font-medium bg-white text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 transition-all px-3 py-1.5 rounded-lg shadow-sm"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-5xl">

                    {/* Stepper */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between relative z-0">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10"></div>
                            <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary -z-10 transition-all duration-500 ease-in-out"
                                style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                            ></div>

                            {STEPS.map((label, i) => {
                                const isActive = i === step;
                                const isDone = i < step;
                                return (
                                    <div key={i} className="flex flex-col items-center relative group">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 shadow-sm
                                            ${isActive ? 'bg-primary text-white ring-4 ring-primary/20 scale-110' : ''}
                                            ${isDone ? 'bg-primary text-white' : ''}
                                            ${!isActive && !isDone ? 'bg-white text-slate-400 border-2 border-slate-200 group-hover:border-primary/50' : ''}
                                        `}>
                                            {isDone ? <CheckCircle2 className="w-6 h-6" /> : i + 1}
                                        </div>
                                        <div className={`mt-3 text-sm font-medium absolute top-10 whitespace-nowrap transition-colors duration-300
                                            ${isActive ? 'text-primary' : (isDone ? 'text-slate-700' : 'text-slate-400')}
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
                        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-5 sm:px-8">
                            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                                Step {step + 1} of {STEPS.length}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{STEPS[step]}</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {step === 0 && 'Enter the patient or customer details below. Fields marked * are required.'}
                                {step === 1 && 'Search for a department and service, set the number of sessions, then click Add.'}
                                {step === 2 && 'Review the complete quotation below, then download it as a PDF.'}
                            </p>
                        </div>

                        <div className="p-6 sm:p-8">
                            {step === 0 && (
                                <CustomerInfoForm data={customer} onChange={setCustomer} onNext={goNext} />
                            )}
                            {step === 1 && (
                                <ServiceSelector items={items} onChange={setItems} onNext={goNext} onBack={goBack} />
                            )}
                            {step === 2 && (
                                <QuotationSummary customer={customer} items={items} onBack={goBack} />
                            )}
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-slate-500 border-t border-slate-200 bg-white">
                © 2026 VisayasMed Hospital · All rights reserved
            </footer>
        </div>
    );
}
