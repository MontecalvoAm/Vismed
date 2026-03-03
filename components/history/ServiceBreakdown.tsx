'use client';

import React, { useState } from 'react';
import { Activity, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { QuotationRecord } from '@/lib/firestore/quotations';
import { isItemAutoComplete } from '@/lib/utils/quotationStatus';

interface ServiceBreakdownProps {
    quotation: QuotationRecord;
    onTrackItem: (quotation: QuotationRecord, index: number) => void;
}

export default function ServiceBreakdown({ quotation, onTrackItem }: ServiceBreakdownProps) {
    const items = quotation.Items || [];

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    if (items.length === 0) {
        return <p className="text-xs text-gray-400 italic">No items detailed in this quotation.</p>;
    }

    const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Ensure current page is valid when rows per page changes
    React.useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const paginatedItems = items.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <div className="bg-white border text-xs border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
            <div className="overflow-x-auto">
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
                        {paginatedItems.map((item, localIdx) => {
                            const originalIdx = (currentPage - 1) * rowsPerPage + localIdx;
                            const used = item.Used || 0;
                            const total = item.Quantity || 0;
                            // Use isItemAutoComplete for pharmacy items with qty <= 1
                            const isFullyUsed = isItemAutoComplete(item);

                            return (
                                <tr key={originalIdx} className="hover:bg-gray-50/50">
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
                                            onClick={() => onTrackItem(quotation, originalIdx)}
                                            title="Track Item Usage"
                                            className="p-1.5 rounded-lg text-brand-muted-blue hover:text-white hover:bg-brand-muted-blue transition-all shadow-sm border border-brand-light-grey/20 bg-white"
                                        >
                                            <Activity className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {items.length > 5 && (
                <div className="p-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-gray-50/50">
                    <div className="flex items-center gap-2 text-gray-500">
                        <span>Show</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="border border-gray-200 rounded text-xs py-1 px-1.5 focus:ring-primary focus:border-primary outline-none bg-white"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span>entries</span>
                        <span className="ml-2 hidden sm:inline">
                            (Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, items.length)} of {items.length})
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 py-0.5 font-medium text-gray-700">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                        >
                            <ChevronRightIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
