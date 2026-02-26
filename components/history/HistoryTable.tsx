'use client';

import React, { useState } from 'react';
import { QuotationRecord, updateQuotationStatus } from '@/lib/firestore/quotations';
import { Package, User, Activity, Edit3, FileSearch, ChevronDown, ChevronRight as ChevronRightIcon, ChevronLeft } from 'lucide-react';
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
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const toggleRowExpand = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleRowSelect = (id: string) => {
        setSelectedRows(prev => {
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

    const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
    React.useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginatedData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const toggleSelectAll = () => {
        // If all currently visible rows are selected, deselect them all
        const visibleIds = paginatedData.map(q => q.id!).filter(Boolean);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedRows.has(id));

        if (allVisibleSelected) {
            setSelectedRows(prev => {
                const next = new Set(prev);
                visibleIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setSelectedRows(prev => {
                const next = new Set(prev);
                visibleIds.forEach(id => next.add(id));
                return next;
            });
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
        <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50/80">
                            <tr>
                                <th className="px-4 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={paginatedData.length > 0 && paginatedData.every(q => q.id && selectedRows.has(q.id))}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                    />
                                </th>
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
                            {paginatedData.map((q) => {
                                const isExpanded = q.id ? expandedRows.has(q.id) : false;

                                return (
                                    <React.Fragment key={q.id}>
                                        <tr
                                            onClick={() => q.id && toggleRowExpand(q.id)}
                                            className={`hover:bg-primary/5 transition-colors group cursor-pointer ${isExpanded ? 'bg-primary/5' : ''}`}
                                        >
                                            <td className="px-4 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!q.id && selectedRows.has(q.id)}
                                                    onChange={() => q.id && toggleRowSelect(q.id)}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); q.id && toggleRowExpand(q.id); }}
                                                    className="p-1 rounded-md hover:bg-black/5 text-gray-500 transition-colors pointer-events-auto"
                                                >
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
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
                                            <td className="px-5 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
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
                                                        onClick={(e) => { e.stopPropagation(); setViewingQuotation(q); }}
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
                                                <td colSpan={8} className="px-0 py-0 border-b border-gray-100">
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
                                                                                        <div className="flex flex-col items-center gap-1.5 w-full max-w-[120px] mx-auto">
                                                                                            <div className="flex w-full items-center justify-between text-[10px] font-bold">
                                                                                                <span className={`px-2 py-0.5 rounded-full ${isFullyUsed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                                    {isFullyUsed ? 'Completed' : 'Lacking'}
                                                                                                </span>
                                                                                                <span className="text-gray-500">{used} / {total}</span>
                                                                                            </div>
                                                                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className={`h-full rounded-full ${isFullyUsed ? 'bg-green-500' : 'bg-amber-500'}`}
                                                                                                    style={{ width: `${Math.min(100, total > 0 ? (used / total) * 100 : 0)}%` }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
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

                {/* Pagination footer */}
                <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white rounded-b-xl">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Show</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-primary focus:border-primary outline-none bg-white shadow-sm"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-sm text-gray-500">entries</span>
                        </div>
                        <span className="text-gray-500 text-center sm:text-left">
                            Showing {data.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} entries
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || data.length === 0}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:bg-white bg-white shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 font-medium text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || data.length === 0}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:bg-white bg-white shadow-sm"
                        >
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
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
        </div>
    );
}
