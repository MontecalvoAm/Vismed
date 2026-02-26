'use client';

import React, { useState } from 'react';
import { QuotationRecord, updateQuotationStatus } from '@/lib/firestore/quotations';
import { Package, User, Activity, Edit3, FileSearch, ChevronDown, ChevronRight } from 'lucide-react';
import TrackingModal from './TrackingModal';
import PdfViewerModal from './PdfViewerModal';

interface HistoryTableProps {
    data: QuotationRecord[];
    isLoading: boolean;
    onRefresh?: () => void;
}

const statusStyles: Record<string, string> = {
    'Incomplete': 'bg-blue-100 text-blue-700',
    'Waiting for Approval': 'bg-amber-100 text-amber-700',
    'Completed': 'bg-green-100 text-green-700',
};

export default function HistoryTable({ data, isLoading, onRefresh }: HistoryTableProps) {
    const [trackingQuotation, setTrackingQuotation] = useState<QuotationRecord | null>(null);
    const [trackingItemIndex, setTrackingItemIndex] = useState<number | null>(null);
    const [viewingQuotation, setViewingQuotation] = useState<QuotationRecord | null>(null);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRowExpand = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setStatusUpdatingId(id);
        try {
            await updateQuotationStatus(id, newStatus as QuotationRecord['Status']);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status');
        } finally {
            setStatusUpdatingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                <div className="inline-flex flex-col items-center gap-3 text-gray-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
                    <p className="text-sm">Loading history...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center text-gray-400">
                <p className="text-sm">No records found matching your filters.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-4 py-4 w-10"></th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Date</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Client</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Prepared By</th>
                            <th className="px-5 py-4 text-right font-semibold text-gray-600 tracking-wider whitespace-nowrap">Total</th>
                            <th className="px-5 py-4 text-center font-semibold text-gray-600 tracking-wider whitespace-nowrap">Status</th>
                            <th className="px-5 py-4 text-center font-semibold text-gray-600 tracking-wider whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {data.map((q) => {
                            const isExpanded = q.id ? expandedRows.has(q.id) : false;

                            return (
                                <React.Fragment key={q.id}>
                                    <tr className={`hover:bg-primary/5 transition-colors group ${isExpanded ? 'bg-primary/5' : ''}`}>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => q.id && toggleRowExpand(q.id)}
                                                className="p-1 rounded-md hover:bg-black/5 text-gray-500 transition-colors"
                                            >
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-gray-500 text-xs">
                                            {q.CreatedAt ? new Date(q.CreatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            <div className="text-gray-400">{q.CreatedAt ? new Date(q.CreatedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : ''}</div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                    {(q.CustomerName ?? '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{q.CustomerName}</div>
                                                    <div className="text-xs text-gray-400">{q.CustomerEmail || q.CustomerPhone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                                <User className="w-3 h-3" />
                                                {q.PreparedBy || <span className="italic text-gray-300">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                                            ₱{(q.Total ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                            <div className="relative inline-block">
                                                <select
                                                    value={q.Status || 'Incomplete'}
                                                    onChange={(e) => handleStatusChange(q.id!, e.target.value)}
                                                    disabled={statusUpdatingId === q.id}
                                                    className={`appearance-none bg-transparent border-none focus:ring-2 focus:ring-primary/20 rounded-full pl-3 pr-7 py-1 text-xs font-bold tracking-wider cursor-pointer ${statusStyles[q.Status || 'Incomplete'] || 'bg-gray-100 text-gray-700'
                                                        } ${statusUpdatingId === q.id ? 'opacity-50' : ''}`}
                                                    style={{ textAlignLast: 'center' }}
                                                >
                                                    <option value="Incomplete" className="text-gray-800 font-medium bg-white">Incomplete</option>
                                                    <option value="Waiting for Approval" className="text-gray-800 font-medium bg-white">Waiting for Approval</option>
                                                    <option value="Completed" className="text-gray-800 font-medium bg-white">Completed</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                    <Edit3 className="w-3 h-3 text-current opacity-70" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setViewingQuotation(q)}
                                                    title="View & Download PDF"
                                                    className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                                                >
                                                    <FileSearch className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50/30">
                                            <td colSpan={7} className="px-0 py-0 border-b border-gray-100">
                                                <div className="px-14 py-4">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <Package className="w-3.5 h-3.5" />
                                                        Service Breakdown
                                                    </h4>
                                                    {q.Items && q.Items.length > 0 ? (
                                                        <div className="bg-white border text-xs border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Item Name</th>
                                                                        <th className="px-4 py-2.5 text-center font-semibold text-gray-600 w-32">Usage Status</th>
                                                                        <th className="px-4 py-2.5 text-center font-semibold text-gray-600 w-24">Specific Qty</th>
                                                                        <th className="px-4 py-2.5 text-center font-semibold text-gray-600 w-20">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {q.Items.map((item, idx) => {
                                                                        const used = item.Used || 0;
                                                                        const total = item.Quantity || 0;
                                                                        const isFullyUsed = total > 0 && used >= total;
                                                                        return (
                                                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                                                <td className="px-4 py-2 text-gray-800 font-medium">{item.Name}</td>
                                                                                <td className="px-4 py-2 text-center">
                                                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${isFullyUsed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                        <span>{used} / {total}</span>
                                                                                        <span className="w-1 h-1 bg-current rounded-full" />
                                                                                        <span>{isFullyUsed ? 'Completed' : 'Lacking'}</span>
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-2 text-center font-medium text-gray-900">{total}</td>
                                                                                <td className="px-4 py-2 text-center">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setTrackingQuotation(q);
                                                                                            setTrackingItemIndex(idx);
                                                                                        }}
                                                                                        title="Track Item Usage"
                                                                                        className="p-1.5 rounded-lg text-brand-muted-blue hover:text-white hover:bg-brand-muted-blue transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                                                                                    >
                                                                                        <Activity className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 italic">No items detailed in this quotation.</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TrackingModal
                isOpen={!!trackingQuotation}
                onClose={() => { setTrackingQuotation(null); setTrackingItemIndex(null); }}
                quotation={trackingQuotation}
                initialItemIndex={trackingItemIndex}
                onSaveSuccess={() => { if (onRefresh) onRefresh(); }}
            />

            <PdfViewerModal
                isOpen={!!viewingQuotation}
                onClose={() => setViewingQuotation(null)}
                quotation={viewingQuotation}
            />
        </div>
    );
}
