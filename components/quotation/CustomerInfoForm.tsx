'use client';

import { useState, useEffect } from 'react';
import { UserSquare2, Phone, Mail, MapPin, FileText, Calendar, ArrowRight, Shield } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { addGuarantorAction } from '@/app/actions/setupActions';

interface CustomerInfoFormProps {
    data: any;
    onChange: (data: any) => void;
    onNext: () => void;
    initialGuarantors: any[];
}

export default function CustomerInfoForm({ data, onChange, onNext, initialGuarantors }: CustomerInfoFormProps) {
    const [guarantors, setGuarantors] = useState<any[]>(initialGuarantors || []);
    const [guarantorSearch, setGuarantorSearch] = useState('');
    const [isGuarantorOpen, setIsGuarantorOpen] = useState(false);
    const [isCreatingGuarantor, setIsCreatingGuarantor] = useState(false);
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    useEffect(() => {
        if (data.guarantorName && !guarantorSearch) {
            setGuarantorSearch(data.guarantorName);
        }
    }, [data.guarantorName]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Fields that should be forced to uppercase
        const uppercaseFields = ['firstName', 'middleName', 'lastName', 'notes'];
        const finalValue = uppercaseFields.includes(name) ? value.toUpperCase() : value;

        let updates = { [name]: finalValue };
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

                {/* 1. Guarantor Section (Priority) */}
                <div className="md:col-span-2 space-y-1.5 relative">
                    <label className="text-sm font-bold text-brand-dark-blue flex items-center gap-2">
                        <Shield className="h-4 w-4 text-brand-muted-blue" />
                        Guarantor Company <span className="text-slate-400 font-normal">(Search or Add New)</span>
                    </label>
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
                                const val = e.target.value.toUpperCase();
                                setGuarantorSearch(val);
                                setIsGuarantorOpen(true);
                                if (!val) {
                                    onChange({ ...data, guarantorId: '', guarantorName: '' });
                                }
                            }}
                            onFocus={() => setIsGuarantorOpen(true)}
                            onBlur={async () => {
                                await new Promise(r => setTimeout(r, 200));
                                setIsGuarantorOpen(false);
                                const trimmed = guarantorSearch.trim();
                                if (!trimmed) return;
                                if (data.guarantorName === trimmed) return;
                                const existing = guarantors.find(g => g.Name.toLowerCase() === trimmed.toLowerCase());
                                if (existing) {
                                    setGuarantorSearch(existing.Name);
                                    onChange({ ...data, guarantorId: existing.id, guarantorName: existing.Name });
                                    return;
                                }
                                setIsCreatingGuarantor(true);
                                try {
                                    const res = await addGuarantorAction({ Name: trimmed });
                                    if (res.success) {
                                        const newGuarantor = { id: res.id, Name: res.name };
                                        setGuarantors(prev => [...prev, newGuarantor]);
                                        setGuarantorSearch(trimmed);
                                        onChange({ ...data, guarantorId: res.id, guarantorName: trimmed });
                                        setFeedback({ isOpen: true, type: 'success', title: 'Created', message: `Guarantor '${trimmed}' added successfully.` });
                                    } else {
                                        onChange({ ...data, guarantorId: '', guarantorName: trimmed });
                                        if (res.error !== 'Permission Denied') {
                                            setFeedback({ isOpen: true, type: 'error', title: 'Creation Failed', message: res.error || 'Could not save guarantor to master list.' });
                                        }
                                    }
                                } catch (err) {
                                    console.error('Auto-create guarantor failed:', err);
                                    setFeedback({ isOpen: true, type: 'error', title: 'Failed', message: 'Could not auto-create guarantor.' });
                                } finally {
                                    setIsCreatingGuarantor(false);
                                }
                            }}
                        />
                        {isCreatingGuarantor && (
                            <p className="text-xs text-primary font-medium mt-1 animate-pulse pl-10">Creating new guarantor...</p>
                        )}
                        {isGuarantorOpen && (
                            <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg ring-1 ring-black/5">
                                <li
                                    className="px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
                                    onMouseDown={() => {
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
                                        onMouseDown={() => {
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

                {/* 2. Name fields */}
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

                {/* 3. DOB & Gender */}
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <input type="date" name="dob" className={inputClasses} value={data.dob || ''} onChange={handleChange} />
                    </div>
                </div>

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

                {/* 4. Contact Info */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* 5. Remarks (Required) */}
                <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-bold text-brand-dark-blue flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand-muted-blue" />
                        Remarks <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                            <FileText className="h-4 w-4" />
                        </div>
                        <input type="text" name="notes" className={inputClasses} placeholder="Brief description of patient's request or condition" value={data.notes || ''} onChange={handleChange} required />
                    </div>
                </div>

                {/* 6. One Time Visit Checkbox */}
                <div className="md:col-span-2 mt-2">
                    <label className="flex items-center gap-3 cursor-pointer group p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                name="isOneTimeVisit"
                                className="peer sr-only"
                                checked={data.isOneTimeVisit || false}
                                onChange={(e) => onChange({ ...data, isOneTimeVisit: e.target.checked })}
                            />
                            <div className="w-6 h-6 rounded-md bg-white border-2 border-slate-300 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center shadow-sm group-hover:border-primary/50">
                                <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">One Time Visit</span>
                            <span className="text-xs text-slate-500">Check this if all items on this quotation will be completed in a single session.</span>
                        </div>
                    </label>
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

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={() => setFeedback(f => ({ ...f, isOpen: false }))}
            />
        </form>
    );
}
