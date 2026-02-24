'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerInfoForm from '@/components/quotation/CustomerInfoForm';
import ServiceSelector from '@/components/quotation/ServiceSelector';
import QuotationSummary from '@/components/quotation/QuotationSummary';
import { clearSession } from '@/lib/auth';

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

export default function QuotationPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [customer, setCustomer] = useState(initialCustomer);
    const [items, setItems] = useState([]);

    const goNext = () => setStep((s) => Math.min(s + 1, 2));
    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    const handleLogout = () => {
        clearSession();
        router.push('/login');
    };

    return (
        <div className="q-page">
            {/* Top bar */}
            <div className="q-topbar">
                <button onClick={() => window.open('http://localhost:3001', '_blank')} className="q-back-home">
                    <span>←</span> Back to Home
                </button>
                <div className="q-logo">
                    <div className="q-logo-icon">✚</div>
                    <span className="q-logo-vis">Vis</span><span className="q-logo-med">Med</span>
                </div>
                <div className="q-topbar-right">
                    <div className="q-doc-no">{customer.quotationNo}</div>
                    <button className="q-logout-btn" onClick={handleLogout}>
                        🔓 Logout
                    </button>
                </div>
            </div>

            {/* Step indicator */}
            <div className="q-steps-wrap">
                <div className="q-steps">
                    {STEPS.map((label, i) => (
                        <div key={i} className={`q-step${i === step ? ' q-step-active' : ''}${i < step ? ' q-step-done' : ''}`}>
                            <div className="q-step-circle">
                                {i < step ? '✓' : i + 1}
                            </div>
                            <span className="q-step-label">{label}</span>
                            {i < STEPS.length - 1 && <div className="q-step-line" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="q-content">
                <div className="q-card">
                    {/* Step header */}
                    <div className="q-card-header">
                        <div className="q-step-num">Step {step + 1} of {STEPS.length}</div>
                        <h2 className="q-card-title">{STEPS[step]}</h2>
                        <p className="q-card-sub">
                            {step === 0 && 'Enter the patient or customer details below. Fields marked * are required.'}
                            {step === 1 && 'Search for a department and service, set the number of sessions, then click Add.'}
                            {step === 2 && 'Review the complete quotation below, then download it as a PDF.'}
                        </p>
                    </div>

                    {/* Step body */}
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

            {/* Footer strip */}
            <div className="q-footer">
                © 2026 VisMed Medical Hospital · All rights reserved
            </div>
        </div>
    );
}
