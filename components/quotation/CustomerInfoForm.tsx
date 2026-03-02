'use client';

import { useState, useEffect } from 'react';
import { UserSquare2, Phone, Mail, MapPin, FileText, Calendar, ArrowRight, Shield, Layers } from 'lucide-react';
import { getGuarantors, addGuarantor, GuarantorRecord } from '@/lib/firestore/guarantors';

interface CustomerInfoFormProps {
    data: any;
    onChange: (data: any) => void;
    onNext: () => void;
}

export default function CustomerInfoForm({ data, onChange, onNext }: CustomerInfoFormProps) {
    const [guarantors, setGuarantors] = useState<GuarantorRecord[]>([]);
    const [guarantorSearch, setGuarantorSearch] = useState('');
    const [isGuarantorOpen, setIsGuarantorOpen] = useState(false);
    const [isCreatingGuarantor, setIsCreatingGuarantor] = useState(false);

    useEffect(() => {
        getGuarantors().then(setGuarantors).catch(console.error);
    }, []);

    useEffect(() => {
        if (data.guarantorName && !guarantorSearch) {
            setGuarantorSearch(data.guarantorName);
        }
    }, [data.guarantorName]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        let updates = { [e.target.name]: e.target.value };
        onChange({ ...data, ...updates });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof onNext === 'function') onNext();
    };

    const inputClasses =
        'w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-muted-blue/20 focus:border-brand-muted-blue transition-all shadow-md relative z-10 font-medium';
    const selectClasses =
        'w-full pl-10 pr-10 py-2.5 bg-white/95 backdrop-blur border border-slate-300 rounded-xl text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-muted-blue/20 focus:border-brand-muted-blue transition-all shadow-md cursor-pointer relative z-10 font-medium';

    return (
        <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

                {/* 1. Name Split fields */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                <UserSquare2 className="h-4 w-4" />
                            </div>
                            <input type="text" name="firstName" className={inputClasses} placeholder="First name" value={data.firstName || ''} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            Middle Name <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                <UserSquare2 className="h-4 w-4" />
                            </div>
                            <input type="text" name="middleName" className={inputClasses} placeholder="Middle name" value={data.middleName || ''} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                <UserSquare2 className="h-4 w-4" />
                            </div>
                            <input type="text" name="lastName" className={inputClasses} placeholder="Last name" value={data.lastName || ''} onChange={handleChange} required />
                        </div>
                    </div>
                </div>

                {/* 2. DOB */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <input type="date" name="dob" className={inputClasses} value={data.dob || ''} onChange={handleChange} />
                    </div>
                </div>

                {/* 3. Gender */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Gender</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <UserSquare2 className="h-4 w-4" />
                        </div>
                        <select name="gender" className={selectClasses} value={data.gender || ''} onChange={handleChange}>
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* 4. Company, Contact, Email Split fields */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Guarantor */}
                    <div className="space-y-1.5 relative">
                        <label className="text-sm font-medium text-slate-700">Guarantor Company <span className="text-slate-400 font-normal">(optional)</span></label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                <Shield className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                className={inputClasses}
                                placeholder="Search & select guarantor..."
                                value={guarantorSearch}
                                onChange={(e) => {
                                    setGuarantorSearch(e.target.value);
                                    setIsGuarantorOpen(true);
                                    if (!e.target.value) {
                                        onChange({ ...data, guarantorId: '', guarantorName: '' });
                                    }
                                }}
                                onFocus={() => setIsGuarantorOpen(true)}
                                onBlur={async () => {
                                    // Delay to allow dropdown click to register first
                                    await new Promise(r => setTimeout(r, 200));
                                    setIsGuarantorOpen(false);

                                    const trimmed = guarantorSearch.trim();
                                    if (!trimmed) return;

                                    // Check if already selected from the list
                                    if (data.guarantorName === trimmed) return;

                                    // Check if name matches an existing guarantor (case-insensitive)
                                    const existing = guarantors.find(g => g.Name.toLowerCase() === trimmed.toLowerCase());
                                    if (existing) {
                                        setGuarantorSearch(existing.Name);
                                        onChange({ ...data, guarantorId: existing.id, guarantorName: existing.Name });
                                        return;
                                    }

                                    // Auto-create the new guarantor
                                    setIsCreatingGuarantor(true);
                                    try {
                                        const newId = await addGuarantor({ Name: trimmed });
                                        const refreshed = await getGuarantors();
                                        setGuarantors(refreshed);
                                        setGuarantorSearch(trimmed);
                                        onChange({ ...data, guarantorId: newId, guarantorName: trimmed });
                                    } catch (err) {
                                        console.error('Auto-create guarantor failed:', err);
                                    } finally {
                                        setIsCreatingGuarantor(false);
                                    }
                                }}
                            />
                            {/* Dropdown list */}
                            {isCreatingGuarantor && (
                                <p className="text-xs text-primary font-medium mt-1 animate-pulse">Creating new guarantor...</p>
                            )}
                            {isGuarantorOpen && (
                                <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg ring-1 ring-black/5">
                                    <li
                                        className="px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
                                        onClick={() => {
                                            setGuarantorSearch('');
                                            onChange({ ...data, guarantorId: '', guarantorName: '' });
                                            setIsGuarantorOpen(false);
                                        }}
                                    >
                                        None (Self-pay)
                                    </li>
                                    {guarantors.filter(g => g.Name.toLowerCase().includes(guarantorSearch.toLowerCase())).map(g => (
                                        <li
                                            key={g.id}
                                            className="px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary cursor-pointer border-t border-slate-100 transition-colors"
                                            onClick={() => {
                                                setGuarantorSearch(g.Name);
                                                onChange({ ...data, guarantorId: g.id, guarantorName: g.Name });
                                                setIsGuarantorOpen(false);
                                            }}
                                        >
                                            {g.Name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Contact Number */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            Contact Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                <Phone className="h-4 w-4" />
                            </div>
                            <input type="tel" name="phone" className={inputClasses} placeholder="+63 9XX XXX XXXX" value={data.phone || ''} onChange={handleChange} required />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                                <Mail className="h-4 w-4" />
                            </div>
                            <input type="email" name="email" className={inputClasses} placeholder="patient@email.com" value={data.email || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* 6. Address */}
                <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Address</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-[14px] top-[14px] flex items-start pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <textarea name="address" rows={2} className={`${inputClasses} pl-10 resize-none py-3`} placeholder="Street, City, Province" value={data.address || ''} onChange={handleChange} />
                    </div>
                </div>

                {/* 7. Remarks */}
                <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">
                        Remarks / Complaint <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <FileText className="h-4 w-4" />
                        </div>
                        <input type="text" name="notes" className={inputClasses} placeholder="Brief description" value={data.notes || ''} onChange={handleChange} />
                    </div>
                </div>

            </div>

            {/* Read-only auto fields */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Quotation Date</span>
                    <span className="font-medium text-slate-800">{data.date}</span>
                </div>
                <div className="hidden sm:block w-px h-10 bg-slate-200" />
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Prepared By</span>
                    <span className="font-medium text-slate-800">{data.preparedBy || '—'}</span>
                </div>
                <div className="hidden sm:block w-px h-10 bg-slate-200" />
                <div className="flex flex-col sm:items-end">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Quotation No.</span>
                    <span className="font-mono font-bold text-lg text-primary">{data.quotationNo}</span>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                    type="submit"
                    className="group flex items-center justify-center py-2.5 px-6 bg-primary text-white font-medium rounded-xl transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
                >
                    Next: Select Services
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </form>
    );
}
