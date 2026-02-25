'use client';

import { useState } from 'react';
import { QuotationRecord, computeTotalQuantity, computeUsedQuantity, updateQuotationStatus } from '@/lib/firestore/quotations';
import { Package, User, Activity, Edit3, FileSearch } from 'lucide-react';
import TrackingModal from './TrackingModal';
import PdfViewerModal from './PdfViewerModal';

interface HistoryTableProps {
    data: QuotationRecord[];
    isLoading: boolean;
    onRefresh?: () => void;
}

const statusStyles: Record<string, string> = {
    'Incomplete Sessions': 'bg-blue-100 text-blue-700',
    'Waiting for Approval': 'bg-amber-100 text-amber-700',
    'Completed': 'bg-green-100 text-green-700',
};

export default function HistoryTable({ data, isLoading, onRefresh }: HistoryTableProps) {
    const [trackingQuotation, setTrackingQuotation] = useState<QuotationRecord | null>(null);
    const [viewingQuotation, setViewingQuotation] = useState<QuotationRecord | null>(null);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

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
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Date</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Client</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Prepared By</th>
                            <th className="px-5 py-4 text-right font-semibold text-gray-600 tracking-wider whitespace-nowrap">Total</th>
                            <th className="px-5 py-4 text-center font-semibold text-gray-600 tracking-wider whitespace-nowrap">Quantity</th>
                            <th className="px-5 py-4 text-center font-semibold text-gray-600 tracking-wider whitespace-nowrap">Status</th>
                            <th className="px-5 py-4 text-center font-semibold text-gray-600 tracking-wider whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {data.map((q) => {
                            const totalQuantity = computeTotalQuantity(q.Items ?? []);
                            const usedQuantity = computeUsedQuantity(q.Items ?? []);

                            return (
                                <tr key={q.id} className="hover:bg-primary/5 transition-colors group">
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
                                        {totalQuantity > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                                <Package className="w-3.5 h-3.5" />
                                                {usedQuantity} / {totalQuantity}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center">
                                        <div className="relative inline-block">
                                            <select
                                                value={q.Status || 'Incomplete Sessions'}
                                                onChange={(e) => handleStatusChange(q.id!, e.target.value)}
                                                disabled={statusUpdatingId === q.id}
                                                className={`appearance-none bg-transparent border-none focus:ring-2 focus:ring-primary/20 rounded-full pl-3 pr-7 py-1 text-xs font-bold tracking-wider cursor-pointer ${statusStyles[q.Status || 'Incomplete Sessions'] || 'bg-gray-100 text-gray-700'
                                                    } ${statusUpdatingId === q.id ? 'opacity-50' : ''}`}
                                                style={{ textAlignLast: 'center' }}
                                            >
                                                <option value="Incomplete Sessions" className="text-gray-800 font-medium bg-white">Incomplete Sessions</option>
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
                                            <button
                                                onClick={() => setTrackingQuotation(q)}
                                                title="Track Usage Progress"
                                                className="p-1.5 rounded-lg text-brand-muted-blue hover:text-white hover:bg-brand-muted-blue transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                                            >
                                                <Activity className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TrackingModal
                isOpen={!!trackingQuotation}
                onClose={() => setTrackingQuotation(null)}
                quotation={trackingQuotation}
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
