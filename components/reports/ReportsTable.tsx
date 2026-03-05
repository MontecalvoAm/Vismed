'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuotationRecord, updateQuotationStatus } from '@/lib/firestore/quotations';
import { Package, User, Activity, Edit3, FileSearch, Trash2, Pencil, ChevronDown, ChevronRight as ChevronRightIcon, ChevronLeft, Shield, Printer } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import TrackingModal from './TrackingModal';
import PdfViewerModal from './PdfViewerModal';
import ServiceBreakdown from './ServiceBreakdown';

interface ReportsTableProps {
    data: QuotationRecord[];
    isLoading: boolean;
    onRefresh?: () => void;
    onDelete?: (id: string) => Promise<void>;
    onBulkDelete?: (ids: string[]) => Promise<void>;
}

const statusStyles: Record<string, string> = {
    'Incomplete': 'bg-blue-100 text-blue-700',
    'Waiting for Approval': 'bg-amber-100 text-amber-700',
    'Completed': 'bg-green-100 text-green-700',
};

export default function ReportsTable({ data, isLoading, onRefresh, onDelete, onBulkDelete }: ReportsTableProps) {
    const router = useRouter();
    const { confirm, alert } = useConfirm();
    const { user } = useAuth();
    const perms = user?.Permissions?.Reports;
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
            await alert({
                title: 'Update Failed',
                message: 'Failed to update status',
                variant: 'danger'
            });
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

    const handleBulkDelete = async () => {
        if (!onBulkDelete || selectedRows.size === 0) return;
        const isConfirmed = await confirm({
            title: 'Delete Selected Records',
            message: `Are you sure you want to delete ${selectedRows.size} quotation(s)? This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete All'
        });
        if (isConfirmed) {
            await onBulkDelete(Array.from(selectedRows));
            setSelectedRows(new Set());
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
            {selectedRows.size > 0 && perms?.CanDelete && (
                <div className="bg-brand-muted-blue/10 border border-brand-muted-blue/20 rounded-xl p-3 flex items-center justify-between mb-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-sm font-semibold text-brand-dark-blue ml-2">
                        {selectedRows.size} record(s) selected
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const ids = Array.from(selectedRows).join(',');
                                router.push(`/reports/print?ids=${ids}`);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all border border-transparent"
                        >
                            <Printer className="w-4 h-4" />
                            Print Selected
                        </button>
                        {perms?.CanDelete && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 shadow-sm transition-all border border-rose-200"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Selected
                            </button>
                        )}
                    </div>
                </div>
            )}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50/80">
                            <tr>
                                {(perms?.CanEdit || perms?.CanDelete) && (
                                    <th className="px-4 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={paginatedData.length > 0 && paginatedData.every(q => q.id && selectedRows.has(q.id))}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="px-4 py-4 w-10"></th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Quotation Date</th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Client</th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Prepared By</th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Guarantor</th>
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
                                            {(perms?.CanEdit || perms?.CanDelete) && (
                                                <td className="px-4 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!q.id && selectedRows.has(q.id)}
                                                        onChange={() => q.id && toggleRowSelect(q.id)}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                    />
                                                </td>
                                            )}
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
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                                    <Shield className="w-3 h-3" />
                                                    {q.GuarantorName || <span className="italic text-gray-300">—</span>}
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
                                                        disabled={statusUpdatingId === q.id || !perms?.CanEdit}
                                                        className={`appearance-none bg-transparent border-none focus:ring-2 focus:ring-primary/20 rounded-full pl-3 pr-7 py-1 text-xs font-bold tracking-wider ${perms?.CanEdit ? 'cursor-pointer' : 'cursor-default opacity-75'} ${statusStyles[q.Status || 'Incomplete'] || 'bg-gray-100 text-gray-700'
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
                                                    {perms?.CanEdit && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); router.push('/reports/edit/' + q.id); }}
                                                            title="Edit Quotation"
                                                            className="p-1.5 rounded-lg text-primary hover:text-white hover:bg-primary transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {perms?.CanDelete && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const isConfirmed = await confirm({
                                                                    title: 'Delete Quotation',
                                                                    message: 'Are you sure you want to delete this quotation? This action cannot be undone.',
                                                                    variant: 'danger',
                                                                    confirmText: 'Delete'
                                                                });
                                                                if (isConfirmed) {
                                                                    if (onDelete && q.id) onDelete(q.id);
                                                                }
                                                            }}
                                                            title="Delete Quotation"
                                                            className="p-1.5 rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-gray-50/30">
                                                <td colSpan={9} className="px-0 py-0 border-b border-gray-100">
                                                    <div className="px-14 py-4">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                            <Package className="w-3.5 h-3.5" />
                                                            Service Breakdown
                                                        </h4>
                                                        {q.Items && q.Items.length > 0 ? (
                                                            <ServiceBreakdown
                                                                quotation={q}
                                                                onTrackItem={(quotation, idx) => {
                                                                    setTrackingQuotation(quotation);
                                                                    setTrackingItemIndex(idx);
                                                                }}
                                                            />
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
