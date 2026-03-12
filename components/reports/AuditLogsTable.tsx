'use client';

import React, { useState } from 'react';
import { deleteAuditLogAction, bulkDeleteAuditLogsAction } from '@/app/actions/auditActions';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';
import { Trash2, FileSearch, ChevronDown, ChevronRight as ChevronRightIcon, ChevronLeft, Shield, User, Activity, Clock, Printer, Loader2 } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import AuditLogsPrintModal from './AuditLogsPrintModal';

interface AuditLogEntry {
    id: string;
    Action: string;
    RecordID: string;
    Description: string;
    Details?: string;
    UserID?: string;
    IpAddress?: string;
    CreatedAt?: string;
    Metadata?: any;
}

interface AuditLogsTableProps {
    data: AuditLogEntry[];
    quotations?: any[];
    isLoading: boolean;
    onRefresh?: () => void;
}




export default function AuditLogsTable({ data, quotations = [], isLoading, onRefresh }: AuditLogsTableProps) {
    const { confirm } = useConfirm();
    const { user } = useAuth();
    // Assuming reports permissions control audit logs viewing/deletion for now
    const perms = user?.Permissions?.Reports;
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

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

    // Group data by RecordID
    const groupedData = React.useMemo(() => {
        const groups: Record<string, typeof data> = {};
        data.forEach(log => {
            if (!log.RecordID) return;
            if (!groups[log.RecordID]) groups[log.RecordID] = [];
            groups[log.RecordID].push(log);
        });

        // Sort each group's logs by CreatedAt descending
        Object.values(groups).forEach(group => {
            group.sort((a, b) => new Date(b.CreatedAt as string).getTime() - new Date(a.CreatedAt as string).getTime());
        });

        // Convert to array of groups and sort groups by their latest log's CreatedAt
        return Object.entries(groups).map(([recordId, logs]) => ({
            id: recordId, // Use RecordID as the main row ID
            recordId,
            logs,
            latestLog: logs[0]
        })).sort((a, b) => new Date(b.latestLog.CreatedAt as string).getTime() - new Date(a.latestLog.CreatedAt as string).getTime());
    }, [data]);

    const totalPages = Math.max(1, Math.ceil(groupedData.length / rowsPerPage));
    React.useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginatedGroups = groupedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const toggleSelectAll = () => {
        const visibleIds = paginatedGroups.map(group => group.id).filter(Boolean);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedRows.has(id));

        setSelectedRows(prev => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                visibleIds.forEach(id => next.delete(id));
            } else {
                visibleIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

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

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return;
        const isConfirmed = await confirm({
            title: 'Delete Selected Quotation Logs',
            message: `Are you sure you want to delete all logs for ${selectedRows.size} quotation(s)? This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete All'
        });
        if (isConfirmed) {
            try {
                // Collect all underlying log IDs for the selected groups
                const logIdsToDelete: string[] = [];
                Array.from(selectedRows).forEach(recordId => {
                    const group = groupedData.find(g => g.id === recordId);
                    if (group) {
                        logIdsToDelete.push(...group.logs.map(l => l.id));
                    }
                });

                const res = await bulkDeleteAuditLogsAction(logIdsToDelete);
                if (res.success) {
                    setSelectedRows(new Set());
                    setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Selected logs deleted successfully.' });
                    if (onRefresh) onRefresh();
                } else {
                    setFeedback({ isOpen: true, type: 'error', title: 'Error', message: res.error || 'Failed to delete logs.' });
                }
            } catch (err) {
                setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete logs.' });
            }
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                <div className="inline-flex flex-col items-center gap-3 text-gray-400">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
                    <p className="text-sm">Loading audit logs...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center text-gray-400">
                <p className="text-sm">No usage logs found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {selectedRows.size > 0 && perms?.CanDelete && (
                <div className="bg-brand-muted-blue/10 border border-brand-muted-blue/20 rounded-xl p-3 flex items-center justify-between mb-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-sm font-semibold text-brand-dark-blue ml-2">
                        {selectedRows.size} log(s) selected
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 shadow-sm transition-all border border-rose-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50/80">
                            <tr>
                                {perms?.CanDelete && (
                                    <th className="px-4 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={paginatedGroups.length > 0 && paginatedGroups.every((g: any) => selectedRows.has(g.id))}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="px-4 py-4 w-10"></th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Quotation Number</th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Latest Update</th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Patient</th>
                                <th className="px-5 py-4 text-left font-semibold text-gray-600 tracking-wider whitespace-nowrap">Guarantor</th>
                                {perms?.CanDelete && (
                                    <th className="px-5 py-4 text-center font-semibold text-gray-600 tracking-wider whitespace-nowrap">Log Count</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paginatedGroups.map((group) => {
                                const isExpanded = expandedRows.has(group.id);
                                const latestMeta = group.latestLog.Metadata || {};
                                const activeQuotation = quotations.find(q => q.id === group.recordId);

                                return (
                                    <React.Fragment key={group.id}>
                                        <tr
                                            onClick={() => toggleRowExpand(group.id)}
                                            className={`odd:bg-white even:bg-gray-50/50 hover:bg-primary/10 transition-colors group-hover cursor-pointer ${isExpanded ? 'bg-primary/5' : ''}`}
                                        >
                                            {perms?.CanDelete && (
                                                <td className="px-4 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(group.id)}
                                                        onChange={() => toggleRowSelect(group.id)}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleRowExpand(group.id); }}
                                                    className="p-1 rounded-md hover:bg-black/5 text-gray-500 transition-colors pointer-events-auto"
                                                >
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap font-medium text-gray-700">
                                                {group.recordId}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-gray-500 text-xs text-center">
                                                {group.latestLog.CreatedAt ? (
                                                    <>
                                                        <div>{new Date(group.latestLog.CreatedAt as string).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                        <div className="text-gray-400">{new Date(group.latestLog.CreatedAt as string).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</div>
                                                    </>
                                                ) : '—'}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                        {(String(latestMeta.PatientName) ?? '?').charAt(0)}
                                                    </div>
                                                    <div className="font-medium text-gray-900">{String(latestMeta.PatientName || 'Unknown')}</div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                                    <Shield className="w-3 h-3" />
                                                    {latestMeta.GuarantorName ? String(latestMeta.GuarantorName) : <span className="italic text-gray-300">—</span>}
                                                </div>
                                            </td>

                                            {perms?.CanDelete && (
                                                <td className="px-5 py-4 whitespace-nowrap text-center text-gray-500 font-medium">
                                                    {group.logs.length} Log(s)
                                                </td>
                                            )}
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={perms?.CanDelete ? 8 : 7} className="p-0 border-b border-gray-200">
                                                    <NestedLogsTable group={group} activeQuotation={activeQuotation} perms={perms} handleDelete={handleDelete} />
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

function NestedLogsTable({ group, activeQuotation, perms, handleDelete }: { group: any, activeQuotation: any, perms: any, handleDelete: (id: string) => void }) {
    const { user } = useAuth();
    const preparedBy = user ? `${user.FirstName} ${user.LastName}` : 'Unknown';
    const [page, setPage] = React.useState(1);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);
    const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);

    const totalPages = Math.max(1, Math.ceil(group.logs.length / rowsPerPage));
    const paginatedLogs = group.logs.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const handlePrintClick = () => {
        setIsPrintModalOpen(true);
    };

    return (
        <div className="bg-white m-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-lime-green" />
                    Quotation History Logs
                </h4>
                <button
                    onClick={handlePrintClick}
                    disabled={group.logs.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
                >
                    <Printer className="w-3.5 h-3.5 text-slate-400" /> Print Logs
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">Date & Time</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">Action</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">Description & Changes</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase">Edited By</th>
                            {perms?.CanDelete && (
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase">Remove</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedLogs.map((log: any) => {
                            const meta = log.Metadata || {};
                            return (
                                <tr key={log.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-slate-100 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-500 font-bold">
                                        {log.CreatedAt ? (
                                            <>
                                                <span className="font-bold text-slate-800">{new Date(log.CreatedAt as string).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="ml-1 text-slate-600">{new Date(log.CreatedAt as string).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</span>
                                            </>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] font-bold text-slate-800">
                                        {log.Action}
                                    </td>
                                    <td className="px-4 py-3 text-[11px] text-slate-800 min-w-[300px] max-w-sm whitespace-normal break-words">
                                        <div className="font-bold mb-1">{log.Description}</div>
                                        {log.Action === 'UPDATE_TRACKING' && (log.OldValues as any)?.Items && (log.NewValues as any)?.Items ? (
                                            <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                                                <table className="min-w-full divide-y divide-slate-200">
                                                    <thead className="bg-slate-100">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-600">Item</th>
                                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 whitespace-nowrap">Specific Qty</th>
                                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600">Before</th>
                                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600">After</th>
                                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-600 whitespace-nowrap">Remaining Qty</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-slate-100">
                                                        {(log.NewValues as any).Items.map((newItem: any, i: number) => {
                                                            const oldItem = (log.OldValues as any).Items.find((oi: any) => oi.Id === newItem.Id) || (log.OldValues as any).Items[i];
                                                            const oldUsed = oldItem ? oldItem.Used : 0;
                                                            const newUsed = newItem.Used;

                                                            // Live exact matching for specific quantity
                                                            let specificQty: number | string = newItem.Qty || oldItem?.Qty || '-';
                                                            if (activeQuotation && activeQuotation.Items) {
                                                                const matchingActiveObj = activeQuotation.Items.find(qi => qi.Id === newItem.Id || qi.Name === newItem.Name);
                                                                if (matchingActiveObj && matchingActiveObj.Quantity !== undefined) {
                                                                    specificQty = matchingActiveObj.Quantity;
                                                                }
                                                            }

                                                            const itemName = newItem.Name || oldItem?.Name || 'Unknown Item';
                                                            const remainingQty = typeof specificQty === 'number' ? specificQty - newUsed : '-';

                                                            if (oldUsed !== newUsed) {
                                                                return (
                                                                    <tr key={newItem.Id || i}>
                                                                        <td className="px-3 py-2 font-bold text-[10px] text-slate-800 break-words max-w-[150px]">{itemName}</td>
                                                                        <td className="px-3 py-2 font-bold text-[10px] text-slate-800 text-center">{specificQty}</td>
                                                                        <td className="px-3 py-2 font-bold text-[10px] text-rose-600 text-center">{oldUsed}</td>
                                                                        <td className="px-3 py-2 font-bold text-[10px] text-emerald-600 text-center">{newUsed}</td>
                                                                        <td className={`px-3 py-2 font-bold text-[10px] text-center ${remainingQty === '-' ? 'text-slate-400' :
                                                                            remainingQty === 0 ? 'text-emerald-600' :
                                                                                'text-amber-600'
                                                                            }`}>{remainingQty}</td>
                                                                    </tr>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : log.Action !== 'UPDATE_TRACKING' && Object.keys(meta).filter(k => k !== 'EditedBy').length > 0 ? (
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                {Object.entries(meta).filter(([k]) => k !== 'EditedBy').map(([k, v]) => (
                                                    <span key={k} className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                                                        <span className="text-slate-400">{k}:</span> {String(v)}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-[11px] font-bold text-slate-800">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-slate-600" />
                                            {meta.EditedBy ? String(meta.EditedBy) : 'Unknown'}
                                        </div>
                                    </td>
                                    {perms?.CanDelete && (
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                                title="Delete individual log"
                                                className="p-1.5 rounded text-rose-500 hover:text-white hover:bg-rose-500 transition-all border border-transparent hover:border-rose-600"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination for History Table */}
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Show</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setPage(1);
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
                        Showing {group.logs.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, group.logs.length)} of {group.logs.length} entries
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || group.logs.length === 0}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:bg-white bg-white shadow-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 font-medium text-gray-700">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || group.logs.length === 0}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:bg-white bg-white shadow-sm"
                    >
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <AuditLogsPrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                group={group}
                preparedBy={preparedBy}
            />
        </div>
    );
}
