'use client';

import { useState, useEffect } from 'react';
import { QuotationRecord, updateQuotation, QuotationItem } from '@/lib/firestore/quotations';
import { createAuditLog } from '@/lib/firestore/audit';
import { useConfirm } from '@/context/ConfirmContext';
import { X, Save, Clock, Package, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

interface TrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
    quotation: QuotationRecord | null;
    initialItemIndex?: number | null;
    onSaveSuccess: () => void;
}

export default function TrackingModal({ isOpen, onClose, quotation, initialItemIndex, onSaveSuccess }: TrackingModalProps) {
    const { alert } = useConfirm();
    const [items, setItems] = useState<QuotationItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    useEffect(() => {
        if (quotation?.Items) {
            setItems(JSON.parse(JSON.stringify(quotation.Items)));
        } else {
            setItems([]);
        }
    }, [quotation]);

    if (!isOpen || !quotation) return null;

    const handleIncrement = (index: number) => {
        setItems((prev) => {
            const newItems = [...prev];
            const item = { ...newItems[index] };
            const max = item.Quantity;
            const current = item.Used || 0;
            if (current < max) item.Used = current + 1;
            newItems[index] = item;
            return newItems;
        });
    };

    const handleDecrement = (index: number) => {
        setItems((prev) => {
            const newItems = [...prev];
            const item = { ...newItems[index] };
            const current = item.Used || 0;
            if (current > 0) item.Used = current - 1;
            newItems[index] = item;
            return newItems;
        });
    };

    const handleSetMax = (index: number) => {
        setItems((prev) => {
            const newItems = [...prev];
            const item = { ...newItems[index] };
            item.Used = item.Quantity;
            newItems[index] = item;
            return newItems;
        });
    };

    const handleSave = async () => {
        if (!quotation?.id) return;
        setIsSaving(true);
        try {
            const totalQty = items.reduce((sum, item) => sum + item.Quantity, 0);
            const totalUsed = items.reduce((sum, item) => sum + (item.Used || 0), 0);

            let updatedStatus = quotation.Status;
            if (totalQty > 0) {
                if (totalUsed === totalQty && quotation.Status !== 'Completed') {
                    updatedStatus = 'Completed';
                } else if (totalUsed < totalQty && quotation.Status === 'Completed') {
                    updatedStatus = 'Incomplete';
                }
            }

            const updatePayload: any = { Items: items };
            if (updatedStatus !== quotation.Status) {
                updatePayload.Status = updatedStatus;
            }

            await updateQuotation(quotation.id, updatePayload);

            // Calculate exact audit payload
            const changes = items.filter((item, i) => item.Used !== quotation.Items[i].Used)
                .map(item => `${item.Name}: ${quotation.Items[items.indexOf(item)].Used || 0} -> ${item.Used}`);
            if (changes.length > 0) {
                await createAuditLog({
                    Action: 'UPDATE_TRACKING',
                    Module: 'Quotation',
                    RecordID: quotation.id,
                    Description: `Updated usage tracking on ${changes.length} item(s)`,
                    OldValues: { Items: quotation.Items.map(i => ({ Id: i.Id, Used: i.Used || 0 })) },
                    NewValues: { Items: items.map(i => ({ Id: i.Id, Used: i.Used || 0 })) },
                });
            }

            setFeedback({ isOpen: true, type: 'success', title: 'Saved', message: 'Tracking progress saved successfully.' });
        } catch (error) {
            console.error('Failed to update tracking:', error);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to save tracking progress.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFeedbackClose = () => {
        setFeedback(f => ({ ...f, isOpen: false }));
        if (feedback.type === 'success') {
            onSaveSuccess();
            onClose();
        }
    };

    // Calculate overall progress
    const totalQty = items.reduce((sum, item) => sum + item.Quantity, 0);
    const totalUsed = items.reduce((sum, item) => sum + (item.Used || 0), 0);
    const progressPercent = totalQty > 0 ? Math.round((totalUsed / totalQty) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-lime-green/10 flex items-center justify-center border border-brand-lime-green/20">
                            <Activity className="w-5 h-5 text-brand-lime-green" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Track Progress</h2>
                            <p className="text-xs text-slate-500 font-medium">Record sessions or medicines used</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Patient Context & Progress Bar */}
                <div className="px-6 py-5 bg-white border-b border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-muted-blue flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                {(quotation.CustomerName || '?').charAt(0)}
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">{quotation.CustomerName}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5 max-w-[200px] truncate">
                                    {quotation.CustomerEmail || quotation.CustomerPhone || 'No Contact'}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center text-xs font-semibold text-slate-600">
                            <span className="uppercase tracking-wider text-[10px] text-slate-400 mr-2">Status</span>
                            <span className={quotation.Status === 'Completed' ? 'text-green-600' : 'text-slate-700'}>
                                {(quotation.Status || 'UNKNOWN').toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Overall Progress Bar */}
                    <div>
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Overall Fulfillment</span>
                            <span className="text-xs font-bold text-brand-lime-green">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner flex">
                            <div
                                className="h-full bg-brand-lime-green transition-all duration-500 ease-out flex bg-[length:10px_10px] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tracking List */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="space-y-3">
                        {items.filter((_, index) => initialItemIndex == null || initialItemIndex === index).map((item, localIndex) => {
                            // Recover the original index so that handleDecrement/handleIncrement/handleSetMax update the correct item in state
                            const originalIndex = initialItemIndex != null ? initialItemIndex : localIndex;
                            const used = item.Used || 0;
                            const max = item.Quantity;
                            const isCompleted = used === max;
                            const isSession = item.Unit?.toLowerCase().includes('session');

                            const isHighlighted = initialItemIndex === originalIndex;

                            return (
                                <div
                                    key={originalIndex}
                                    className={`relative p-4 rounded-xl border transition-all ${isCompleted ? 'bg-green-50/50 border-green-200' : isHighlighted ? 'bg-brand-muted-blue/5 border-brand-muted-blue shadow-md scale-[1.01]' : 'bg-white border-slate-200 shadow-sm'}`}
                                >
                                    {isCompleted && (
                                        <div className="absolute top-0 right-0 -mr-1 -mt-1 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center border-2 border-white shadow-sm">
                                            <CheckCircle2 className="w-3 h-3" />
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isSession ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {isSession ? <Clock className="w-3 h-3 inline mr-1 -mt-0.5" /> : <Package className="w-3 h-3 inline mr-1 -mt-0.5" />}
                                                    {item.Department}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800 truncate">{item.Name}</h3>
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                <span>Price: ₱{item.Price?.toLocaleString('en-PH')}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>Total required: <span className="font-bold text-slate-700">{max} {item.Unit || (isSession ? 'sessions' : 'items')}</span></span>
                                            </div>
                                        </div>

                                        <div className="flex items-center shrink-0 bg-slate-50 rounded-lg p-1 border border-slate-200 shadow-inner">
                                            <button
                                                onClick={() => handleDecrement(originalIndex)}
                                                disabled={used <= 0}
                                                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all font-mono text-lg"
                                            >
                                                -
                                            </button>
                                            <div className="w-16 flex flex-col items-center justify-center font-mono">
                                                <span className={`text-lg font-bold leading-none ${isCompleted ? 'text-green-600' : 'text-brand-dark-blue'}`}>
                                                    {used}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
                                                    / {max}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleIncrement(originalIndex)}
                                                disabled={used >= max}
                                                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all font-mono text-lg"
                                            >
                                                +
                                            </button>

                                            {!isCompleted && (
                                                <button
                                                    onClick={() => handleSetMax(originalIndex)}
                                                    className="ml-1 px-2 h-8 rounded-md text-[10px] font-bold text-brand-muted-blue hover:bg-brand-muted-blue/10 transition-colors uppercase tracking-wider"
                                                    title="Mark all as completed"
                                                >
                                                    Max
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-brand-dark-blue rounded-xl hover:bg-brand-muted-blue shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Progress
                            </>
                        )}
                    </button>
                </div>

            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={handleFeedbackClose}
            />
        </div>
    );
}
