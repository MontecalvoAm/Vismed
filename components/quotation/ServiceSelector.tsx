'use client';

// ============================================================
//  VisayasMed — Dynamic Service Selector
//  Pulls Departments and Services directly from Firestore
// ============================================================

import { useState, useEffect } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Plus, Minus, X, AlertCircle, Loader2 } from 'lucide-react';
import { getDepartments, type Department } from '@/lib/firestore/departments';
import { getAllServices, type Service } from '@/lib/firestore/services';

const fmt = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });

export default function ServiceSelector({ items, onChange, onNext, onBack }: any) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [sessions, setSessions] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [d, s] = await Promise.all([getDepartments(), getAllServices()]);
                setDepartments(d);
                setServices(s);
            } catch (err: any) {
                console.error("Firestore Loading Error:", err);
                setError(`Failed to load data: ${err?.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const selectedDept = departments.find((d) => d.DepartmentID === selectedDeptId);
    const serviceOptions = services.filter((s) => s.DepartmentID === selectedDeptId);
    const selectedService = serviceOptions.find((s) => s.ServiceID === selectedServiceId);

    const handleDeptChange = (id: string) => {
        setSelectedDeptId(id);
        setSelectedServiceId('');
        setError('');
    };

    const handleAddService = () => {
        if (!selectedDeptId) { setError('Please select a department.'); return; }
        if (!selectedServiceId) { setError('Please select a service.'); return; }
        if (sessions < 1) { setError('Sessions must be at least 1.'); return; }

        const existing = items.findIndex((i: any) => i.serviceId === selectedServiceId);
        if (existing > -1) {
            const updated = [...items];
            updated[existing] = {
                ...updated[existing],
                sessions: updated[existing].sessions + sessions,
                subtotal: updated[existing].unitPrice * (updated[existing].sessions + sessions)
            };
            onChange(updated);
        } else {
            onChange([
                ...items,
                {
                    id: `${selectedServiceId}-${Date.now()}`,
                    deptId: selectedDeptId,
                    deptName: selectedDept?.DepartmentName,
                    serviceId: selectedServiceId,
                    serviceName: selectedService?.ServiceName,
                    unitPrice: selectedService?.Price,
                    unit: selectedService?.Unit,
                    sessions,
                    subtotal: (selectedService?.Price || 0) * sessions,
                },
            ]);
        }

        setSelectedServiceId('');
        setSessions(1);
        setError('');
    };

    const handleRemove = (id: string) => onChange(items.filter((i: any) => i.id !== id));

    const handleSessionChange = (id: string, val: string | number) => {
        const n = Math.max(1, typeof val === 'string' ? parseInt(val) || 1 : val);
        onChange(items.map((i: any) => i.id === id ? { ...i, sessions: n, subtotal: i.unitPrice * n } : i));
    };

    const grandTotal = items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

    const grouped = items.reduce((acc: any, item: any) => {
        if (!acc[item.deptName]) acc[item.deptName] = [];
        acc[item.deptName].push(item);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-slate-500">Loading catalog from VisayasMed servers...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Component Panel */}
            <div className="w-full lg:w-5/12 space-y-6">
                <div className="bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl p-6 shadow-md relative z-10">
                    <h3 className="text-lg font-bold text-brand-dark-blue mb-6 flex items-center">
                        <Plus className="w-5 h-5 mr-2 text-brand-lime-green" /> Add a Service
                    </h3>

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Department</label>
                            <SearchableSelect
                                options={departments}
                                value={selectedDeptId}
                                onChange={handleDeptChange}
                                placeholder="Search department..."
                                valueKey="DepartmentID"
                                displayKey="DepartmentName"
                                renderOption={(d: Department) => (
                                    <div className="flex items-center space-x-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500">{d.Icon}</span>
                                        <div className="flex flex-col">
                                            <strong className="text-slate-800 font-medium">{d.DepartmentName}</strong>
                                            <small className="text-slate-500 text-xs">{d.Description}</small>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Service</label>
                            <SearchableSelect
                                options={serviceOptions}
                                value={selectedServiceId}
                                onChange={(id: string) => { setSelectedServiceId(id); setError(''); }}
                                placeholder={selectedDeptId ? 'Search service...' : 'Select a department first'}
                                valueKey="ServiceID"
                                displayKey="ServiceName"
                                renderOption={(s: Service) => (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                                        <span className="font-medium text-slate-800 mb-1 sm:mb-0 pr-4">{s.ServiceName}</span>
                                        <div className="flex items-center space-x-2 shrink-0">
                                            <small className="text-slate-400 hidden sm:inline-block max-w-[120px] truncate">{s.Description}</small>
                                            <span className="inline-flex items-center bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                                {fmt(s.Price)} <span className="text-green-600/60 font-medium ml-1">/{s.Unit}</span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>

                        {selectedService && (
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="font-semibold text-slate-800">{selectedService.ServiceName}</div>
                                <div className="text-sm text-slate-500 mt-1 mb-3">{selectedService.Description}</div>
                                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                                    <span className="text-slate-500 text-sm">Unit Price</span>
                                    <div className="font-bold text-lg text-slate-800">
                                        {fmt(selectedService.Price)} <span className="text-sm font-normal text-slate-500">/{selectedService.Unit}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5 pt-2">
                            <label className="text-sm font-medium text-slate-700">Number of Sessions / Quantity</label>
                            <div className="flex items-center w-full max-w-[200px] h-11 border border-slate-300 rounded-xl bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-muted-blue/20 focus-within:border-brand-muted-blue transition-all">
                                <button type="button" className="w-12 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:bg-slate-100 transition-colors" onClick={() => setSessions((s) => Math.max(1, s - 1))} aria-label="Decrease quantity">
                                    <Minus className="w-4 h-4" />
                                </button>
                                <input
                                    type="number"
                                    className="w-full h-full text-center font-semibold text-slate-800 focus:outline-none bg-transparent"
                                    min="1"
                                    value={sessions}
                                    onChange={(e) => setSessions(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                                <button type="button" className="w-12 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:bg-slate-100 transition-colors" onClick={() => setSessions((s) => s + 1)} aria-label="Increase quantity">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {selectedService && (
                                <div className="text-sm flex items-center pt-1 animate-in fade-in">
                                    <span className="text-slate-500">Subtotal:</span>
                                    <strong className="ml-2 text-slate-800 font-bold">{fmt(selectedService.Price * sessions)}</strong>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            className="w-full flex items-center justify-center py-3 bg-brand-dark-blue text-white font-semibold rounded-xl hover:bg-brand-muted-blue focus:ring-2 focus:ring-brand-dark-blue transition-all active:scale-[0.98] mt-4 disabled:opacity-50 shadow-md"
                            onClick={handleAddService}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add to Quotation
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Selected Summary Panel */}
            <div className="w-full lg:w-7/12 flex flex-col h-full min-h-[500px] relative z-10">
                <div className="flex-grow flex flex-col bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl shadow-md overflow-hidden flex flex-col h-full">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 bg-white/95 flex items-center justify-between shrink-0">
                        <h3 className="text-lg font-bold text-brand-dark-blue">Selected Services</h3>
                        {items.length > 0 && (
                            <span className="bg-brand-muted-blue/10 text-brand-dark-blue px-3 py-1 rounded-full text-sm font-semibold border border-brand-muted-blue/20">
                                {items.length} item{items.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-grow overflow-y-auto p-6 min-h-[320px]">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-brand-light-grey/20 flex items-center justify-center rounded-2xl border border-slate-200 shadow-inner">
                                    <span className="text-3xl opacity-50">🗒️</span>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-slate-600">No services added yet</p>
                                    <p className="text-sm text-slate-400 mt-1">Use the panel on the left to add services.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in">
                                {Object.entries(grouped).map(([deptName, deptItems]: [string, any]) => (
                                    <div key={deptName} className="space-y-3">
                                        <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            <span className="bg-slate-100 px-2 py-1 rounded bg-slate-100 text-slate-500">{deptName}</span>
                                            <div className="h-px bg-slate-100 ml-3 flex-grow"></div>
                                        </div>

                                        <div className="space-y-2.5">
                                            {deptItems.map((item: any) => (
                                                <div key={item.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white border border-slate-300 rounded-xl hover:border-brand-muted-blue hover:shadow-md transition-all relative overflow-hidden">

                                                    {/* Decorator line */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-brand-muted-blue transition-colors"></div>

                                                    <div className="flex-1 min-w-0 pr-4 pl-2">
                                                        <div className="font-semibold text-slate-800 mb-0.5 truncate">{item.serviceName}</div>
                                                        <div className="text-sm text-slate-500 font-medium">
                                                            {fmt(item.unitPrice)} <span className="text-slate-400 font-normal">/{item.unit}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end mt-4 sm:mt-0 gap-4 pl-2 shrink-0">
                                                        {/* Qty tiny controls */}
                                                        <div className="flex items-center w-[90px] h-9 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                                                            <button className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors" onClick={() => handleSessionChange(item.id, item.sessions - 1)}>
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <input
                                                                type="text"
                                                                className="w-full h-full text-center text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
                                                                value={item.sessions}
                                                                onChange={(e) => handleSessionChange(item.id, e.target.value)}
                                                            />
                                                            <button className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors" onClick={() => handleSessionChange(item.id, item.sessions + 1)}>
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>

                                                        {/* Subtotal */}
                                                        <div className="w-[100px] text-right font-bold text-slate-800 tabular-nums">
                                                            {fmt(item.subtotal)}
                                                        </div>

                                                        {/* Remove */}
                                                        <button
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                                                            onClick={() => handleRemove(item.id)}
                                                            title="Remove service"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Total Bar */}
                    <div className="p-6 bg-white/95 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between shrink-0 rounded-b-2xl">
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1 sm:mb-0">Grand Total</div>
                        <div className="text-2xl font-black text-brand-dark-blue tabular-nums tracking-tight">
                            {fmt(grandTotal)}
                        </div>
                    </div>
                </div>

                {/* Navigation actions */}
                <div className="flex items-center justify-between mt-6 relative z-10 bg-white/80 backdrop-blur p-4 rounded-xl shadow-sm border border-slate-200">
                    <button type="button" className="px-5 py-2.5 flex items-center font-bold text-brand-muted-blue hover:text-brand-dark-blue hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200" onClick={onBack}>
                        ← Back
                    </button>
                    <button
                        type="button"
                        className="px-6 py-2.5 flex items-center justify-center font-medium bg-brand-dark-blue text-white rounded-xl shadow-md transition-all hover:bg-brand-muted-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark-blue disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        onClick={() => { if (items.length === 0) { setError('Please add at least one service.'); return; } onNext(); }}
                    >
                        Review Quotation →
                    </button>
                </div>
            </div>
        </div>
    );
}
