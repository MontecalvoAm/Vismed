'use client';

import React, { useState } from 'react';
import { deleteAuditLogAction } from '@/app/actions/auditActions';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { Trash2, ChevronLeft, ChevronRight, User, Shield, Info } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

interface AuditLogEntry {
    id: string;
    Action: string;
    Target?: string;
    Description?: string;
    Details?: string;
    RecordID?: string;
    UserID?: string;
    UserName?: string;
    IpAddress?: string;
    CreatedAt?: string;
    Metadata?: any;
}

interface StandardAuditLogsTableProps {
    data: AuditLogEntry[];
    isLoading: boolean;
    activeTab?: string;
    onRefresh?: () => void;
}

export default function StandardAuditLogsTable({ data, isLoading, activeTab, onRefresh }: StandardAuditLogsTableProps) {
    const { confirm } = useConfirm();
    const { user } = useAuth();
    const perms = user?.Permissions?.Reports;

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
    React.useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginatedData = React.useMemo(() => {
        // Data should already be sorted by date descending from props, but ensure it just in case
        const sorted = [...data].sort((a, b) => new Date(b.CreatedAt as string).getTime() - new Date(a.CreatedAt as string).getTime());
        return sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    }, [data, currentPage, rowsPerPage]);

    const handleDelete = async (id: string) => {
        const isConfirmed = await confirm({
            title: 'Delete Audit Log',
            message: 'Are you sure you want to delete this log? This action cannot be undone.',
            variant: 'danger',
            confirmText: 'Delete'
        });
        if (isConfirmed) {
            try {
                const res = await deleteAuditLogAction(id);
                if (res.success) {
                    setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Log deleted successfully.' });
                    if (onRefresh) onRefresh();
                } else {
                    setFeedback({ isOpen: true, type: 'error', title: 'Error', message: res.error || 'Failed to delete log.' });
                }
            } catch (err) {
                setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete log.' });
            }
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                <div className="inline-flex flex-col items-center gap-3 text-gray-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-dark-blue" />
                    <p className="text-sm">Loading audit logs...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center flex flex-col items-center text-gray-500 hover:bg-gray-50 transition-colors">
                 <Info className="w-10 h-10 mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">No logs found</p>
                <p className="text-sm mt-1">There is no activity matching your filters for this category.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Date & Time</th>
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Action</th>
                            {activeTab !== 'logins' && (
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Details</th>
                            )}
                            <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">
                                {activeTab === 'created' ? 'Created By:' : 'User'}
                            </th>
                            {perms?.CanDelete && (
                                <th className="px-5 py-4 text-center font-semibold text-gray-600 tracking-wider whitespace-nowrap">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {paginatedData.map((log) => {
                            const meta = log.Metadata || {};
                            return (
                                <tr key={log.id} className="odd:bg-white even:bg-gray-50/50 hover:bg-brand-dark-blue/5 transition-colors cursor-default">
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        {log.CreatedAt ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">
                                                    {new Date(log.CreatedAt as string).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-xs text-gray-500 mt-0.5">
                                                    {new Date(log.CreatedAt as string).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
                                            {log.Action}
                                        </span>
                                    </td>
                                    {activeTab !== 'logins' && (
                                        <td className="px-5 py-4 text-gray-600 max-w-md">
                                            <div className="font-medium text-gray-800 mb-1">{log.Description || log.Details || (log.RecordID ? `Target: ${log.RecordID}` : '')}</div>
                                            {Object.keys(meta).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {Object.entries(meta).map(([k, v]) => (
                                                        k !== 'EditedBy' && k !== 'PatientName' && k !== 'GuarantorName' && (
                                                            <span key={k} className="inline-flex items-center text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded shadow-sm">
                                                                <span className="text-gray-400 font-medium mr-1">{k}:</span> {String(v)}
                                                            </span>
                                                        )
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-5 py-4 whitespace-nowrap text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-brand-light-blue/20 rounded-full flex items-center justify-center shrink-0">
                                                <User className="w-3.5 h-3.5 text-brand-dark-blue" />
                                            </div>
                                            <div className="flex flex-col">
                                                 <span className="font-medium text-sm">{meta.EditedBy || log.UserName || log.UserID || 'System'}</span>
                                                 {log.IpAddress && <span className="text-[10px] text-gray-400 font-mono">{log.IpAddress}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    {perms?.CanDelete && (
                                        <td className="px-5 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                                title="Delete Log"
                                                className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-all border border-transparent hover:border-rose-600 hover:shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-gray-50/50 rounded-b-xl">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">Show</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded-lg text-sm py-1.5 px-2.5 focus:ring-brand-dark-blue focus:border-brand-dark-blue outline-none bg-white shadow-sm font-medium text-gray-700 transition-shadow"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-500 font-medium">entries</span>
                    </div>
                    <span className="text-gray-500 text-center sm:text-left font-medium">
                        Showing {data.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of <span className="font-bold text-gray-700">{data.length}</span> entries
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || data.length === 0}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark-blue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm bg-white"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[5rem] text-center">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || data.length === 0}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-dark-blue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm bg-white"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={() => setFeedback(f => ({ ...f, isOpen: false }))}
            />
        </div>
    );
}
