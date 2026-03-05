'use client';

// ============================================================
//  VisayasMed — Guarantor Manager
// ============================================================

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Shield, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown, ChevronRightIcon, FileText, FileSearch, Activity, User, Edit3, Printer, Calendar } from 'lucide-react';
import { getGuarantors, addGuarantor, updateGuarantor, deleteGuarantor, GuarantorRecord } from '@/lib/firestore/guarantors';
import { getQuotationsByGuarantor, QuotationRecord, updateQuotationStatus, deleteQuotation } from '@/lib/firestore/quotations';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import FormModal from '@/components/manage/FormModal';
import AccessDenied from '@/components/AccessDenied';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import TrackingModal from '@/components/reports/TrackingModal';
import PdfViewerModal from '@/components/reports/PdfViewerModal';
import GuarantorReportModal from '@/components/manage/GuarantorReportModal';
import ServiceBreakdown from '@/components/reports/ServiceBreakdown';

const EMPTY_FORM = { Name: '', Description: '' };

const statusStyles: Record<string, string> = {
    'Incomplete': 'bg-blue-100 text-blue-700',
    'Waiting for Approval': 'bg-amber-100 text-amber-700',
    'Completed': 'bg-green-100 text-green-700',
};

export default function GuarantorManager() {
    const { user } = useAuth();
    const { alert, confirm } = useConfirm();
    const perms = user?.Permissions?.Guarantors;
    const historyPerms = user?.Permissions?.Reports; // For quotation actions in expanded rows
    const router = useRouter();

    const [guarantors, setGuarantors] = useState<GuarantorRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<GuarantorRecord | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deleteConfirm, setDeleteConfirm] = useState<GuarantorRecord | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [expandedLoading, setExpandedLoading] = useState(false);
    const [expandedData, setExpandedData] = useState<QuotationRecord[]>([]);

    // For quotation actions in expanded rows
    const [trackingQuotation, setTrackingQuotation] = useState<QuotationRecord | null>(null);
    const [trackingItemIndex, setTrackingItemIndex] = useState<number | null>(null);
    const [viewingQuotation, setViewingQuotation] = useState<QuotationRecord | null>(null);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
    const [expandedQuotationRows, setExpandedQuotationRows] = useState<Set<string>>(new Set());

    // For quotation search and pagination within expanded guarantor
    const [quotationSearchTerm, setQuotationSearchTerm] = useState('');
    const [quotationFilterDate, setQuotationFilterDate] = useState('');
    const [quotationCurrentPage, setQuotationCurrentPage] = useState(1);
    const [quotationRowsPerPage, setQuotationRowsPerPage] = useState(5);
    const [reportModalOpen, setReportModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const load = async () => {
        setLoading(true);
        try { setGuarantors(await getGuarantors()); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    if (!perms?.CanView) return <AccessDenied moduleName="Guarantors" />;

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (d: GuarantorRecord) => { setEditTarget(d); setForm({ Name: d.Name, Description: d.Description || '' }); setModalOpen(true); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const isDuplicate = guarantors.some(
            d => d.Name.toLowerCase() === form.Name.trim().toLowerCase() && d.id !== editTarget?.id
        );
        if (isDuplicate) {
            setError('A guarantor with this name already exists.');
            return;
        }

        setSaving(true);
        try {
            if (editTarget) {
                await updateGuarantor(editTarget.id!, { ...form, Name: form.Name.trim() });
            } else {
                await addGuarantor({ ...form, Name: form.Name.trim() });
            }
            setModalOpen(false);
            setFeedback({ isOpen: true, type: 'success', title: 'Success', message: editTarget ? 'Guarantor updated successfully.' : 'Guarantor added successfully.' });
            await load();
        } catch {
            setError('Failed to save. Please try again.');
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to save guarantor. Please try again.' });
        }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteConfirm || !deleteConfirm.id) return;
        setSaving(true);
        try {
            await deleteGuarantor(deleteConfirm.id);
            setDeleteConfirm(null);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(deleteConfirm.id!);
                return next;
            });
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Guarantor successfully deleted.' });
        } catch (err) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete guarantor.' });
        } finally { setSaving(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setSaving(true);
        try {
            const promises = Array.from(selectedIds).map(id => deleteGuarantor(id));
            await Promise.all(promises);
            setSelectedIds(new Set());
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Selected guarantors successfully deleted.' });
        } catch (err) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete selected guarantors.' });
        } finally { setSaving(false); }
    };

    const filtered = guarantors.filter(d =>
        d.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.Description && d.Description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const toggleSelectAll = () => {
        const visibleIds = paginated.map(d => d.id!);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                visibleIds.forEach(id => next.delete(id));
            } else {
                visibleIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const toggleRowSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRowExpand = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (expandedRow === id) {
            setExpandedRow(null);
            return;
        }
        setExpandedRow(id);
        setExpandedLoading(true);
        // Reset quotation search and pagination when switching guarantors
        setQuotationSearchTerm('');
        setQuotationFilterDate('');
        setQuotationCurrentPage(1);
        setExpandedQuotationRows(new Set());
        try {
            const data = await getQuotationsByGuarantor(id);
            setExpandedData(data);
        } catch (err: any) {
            console.error('Failed to load quotations for guarantor:', err);
            if (err.message && err.message.includes('requires an index')) {
                await alert({
                    title: 'Database Index Required',
                    message: 'A database index applies to these records. Please check the browser console for the creation link.',
                    variant: 'warning'
                });
            } else {
                await alert({
                    title: 'Load Failed',
                    message: 'Failed to load related quotations.',
                    variant: 'danger'
                });
            }
        } finally {
            setExpandedLoading(false);
        }
    };

    // Toggle quotation row expansion for ServiceBreakdown
    const toggleQuotationRowExpand = (id: string) => {
        setExpandedQuotationRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Handle status change for quotations in expanded rows
    const handleStatusChange = async (id: string, newStatus: string) => {
        setStatusUpdatingId(id);
        try {
            await updateQuotationStatus(id, newStatus as QuotationRecord['Status']);
            // Refresh expanded data
            if (expandedRow) {
                const data = await getQuotationsByGuarantor(expandedRow);
                setExpandedData(data);
            }
            setFeedback({ isOpen: true, type: 'success', title: 'Updated', message: 'Status updated successfully.' });
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

    // Handle delete quotation from expanded rows
    const handleDeleteQuotation = async (q: QuotationRecord) => {
        if (!q.id) return;
        const isConfirmed = await confirm({
            title: 'Delete Quotation',
            message: `Are you sure you want to delete quotation ${q.DocumentNo || q.id}? This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete'
        });
        if (!isConfirmed) return;

        try {
            await deleteQuotation(q.id);
            // Refresh expanded data
            if (expandedRow) {
                const data = await getQuotationsByGuarantor(expandedRow);
                setExpandedData(data);
            }
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Quotation deleted successfully.' });
        } catch (error) {
            console.error('Failed to delete quotation:', error);
            await alert({
                title: 'Delete Failed',
                message: 'Failed to delete quotation',
                variant: 'danger'
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Guarantors Management</h1>
                        <p className="text-gray-500 mt-0.5 text-sm">Manage companies that guarantee clinical quotations.</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Guarantors</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {loading ? '—' : guarantors.length}
                        </p>
                    </div>
                </div>
            </div>


            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                    <div className="relative w-full sm:max-w-md">
                        <input
                            type="search"
                            placeholder="Search guarantors..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                        {selectedIds.size > 0 && perms?.CanDelete && (
                            <button onClick={handleBulkDelete}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl hover:bg-red-100 transition-all text-sm whitespace-nowrap shadow-sm disabled:opacity-50 mr-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete Selected ({selectedIds.size})
                            </button>
                        )}
                        {perms?.CanAdd && (
                            <button onClick={openAdd}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm">
                                <Plus className="w-4 h-4" /> Add Guarantor
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-5 py-3.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={paginated.length > 0 && paginated.every(d => selectedIds.has(d.id!))}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="w-10"></th>
                                    <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Name</th>
                                    <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Description</th>
                                    {(perms?.CanEdit || perms?.CanDelete) && (
                                        <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={(perms?.CanEdit || perms?.CanDelete) ? 5 : 4} className="px-5 py-10 text-center text-slate-400">No guarantors found.</td></tr>
                                ) : paginated.map((d) => (
                                    <React.Fragment key={d.id}>
                                        <tr className={`hover:bg-slate-50 transition-colors group cursor-pointer ${expandedRow === d.id ? 'bg-primary/5' : ''}`} onClick={(e) => handleRowExpand(d.id!, e)}>
                                            <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(d.id!)}
                                                    onChange={() => toggleRowSelect(d.id!)}
                                                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                />
                                            </td>
                                            <td className="py-3.5 text-center px-2">
                                                <button className="p-1 rounded text-slate-400 hover:text-slate-600 focus:outline-none">
                                                    {expandedRow === d.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="px-5 py-3.5 font-semibold text-slate-800">{d.Name}</td>
                                            <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell max-w-xs truncate">{d.Description || '—'}</td>
                                            {(perms?.CanEdit || perms?.CanDelete) && (
                                                <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        {perms?.CanEdit && (
                                                            <button onClick={() => openEdit(d)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                                title="Edit Guarantor">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {perms?.CanDelete && (
                                                            <button onClick={() => setDeleteConfirm(d)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                                title="Delete Guarantor">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {/* Expanded Row Content */}
                                        {expandedRow === d.id && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={5} className="p-0 border-b border-slate-200">
                                                    <div className="py-4 px-8 md:px-14">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                                    <FileText className="w-4 h-4 text-primary" /> Connected Quotations
                                                                </h4>
                                                                {!expandedLoading && expandedData.length > 0 && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setReportModalOpen(true); }}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg transition-colors border border-emerald-200/50"
                                                                    >
                                                                        <Printer className="w-3.5 h-3.5" /> Print Report
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {!expandedLoading && expandedData.length > 0 && (
                                                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                                                    <div className="relative w-full sm:w-40">
                                                                        <input
                                                                            type="date"
                                                                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-slate-700 appearance-none"
                                                                            value={quotationFilterDate}
                                                                            onChange={(e) => {
                                                                                setQuotationFilterDate(e.target.value);
                                                                                setQuotationCurrentPage(1);
                                                                            }}
                                                                        />
                                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                                            <Calendar className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="relative w-full sm:w-64">
                                                                        <input
                                                                            type="search"
                                                                            placeholder="Search quotations..."
                                                                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-slate-700"
                                                                            value={quotationSearchTerm}
                                                                            onChange={(e) => {
                                                                                setQuotationSearchTerm(e.target.value);
                                                                                setQuotationCurrentPage(1);
                                                                            }}
                                                                        />
                                                                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {expandedLoading ? (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400 py-3"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching records...</div>
                                                        ) : expandedData.length === 0 ? (
                                                            <p className="text-xs text-slate-400 italic py-2">No active records for this guarantor.</p>
                                                        ) : (() => {
                                                            // Filter quotations based on search term and date
                                                            const filteredQuotations = expandedData.filter(q => {
                                                                const matchesSearch = (q.DocumentNo || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                                                                    (q.CustomerName || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                                                                    (q.CustomerEmail || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                                                                    (q.CustomerPhone || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                                                                    (q.PreparedBy || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                                                                    (q.Status || '').toLowerCase().includes(quotationSearchTerm.toLowerCase());

                                                                const matchesDate = !quotationFilterDate || (q.CreatedAt && new Date(q.CreatedAt).toISOString().split('T')[0] === quotationFilterDate);

                                                                return matchesSearch && matchesDate;
                                                            });
                                                            const quotationTotalPages = Math.max(1, Math.ceil(filteredQuotations.length / quotationRowsPerPage));
                                                            const paginatedQuotations = filteredQuotations.slice(
                                                                (quotationCurrentPage - 1) * quotationRowsPerPage,
                                                                quotationCurrentPage * quotationRowsPerPage
                                                            );

                                                            const grandTotalAmount = filteredQuotations.reduce((sum, q) => sum + (q.Total || 0), 0);
                                                            const pageTotalAmount = paginatedQuotations.reduce((sum, q) => sum + (q.Total || 0), 0);

                                                            return (
                                                                <div className="space-y-3">
                                                                    <div className="bg-white border text-xs border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                                        <table className="min-w-full divide-y divide-slate-100">
                                                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                                                <tr>
                                                                                    <th className="px-2 py-2.5 w-8"></th>
                                                                                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Doc No.</th>
                                                                                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Patient</th>
                                                                                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Date</th>
                                                                                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Prepared By</th>
                                                                                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Total</th>
                                                                                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Status</th>
                                                                                    {(historyPerms?.CanEdit || historyPerms?.CanDelete) && (
                                                                                        <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Actions</th>
                                                                                    )}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100">
                                                                                {paginatedQuotations.length === 0 ? (
                                                                                    <tr>
                                                                                        <td colSpan={(historyPerms?.CanEdit || historyPerms?.CanDelete) ? 8 : 7} className="px-4 py-6 text-center text-slate-400">
                                                                                            No quotations match your search.
                                                                                        </td>
                                                                                    </tr>
                                                                                ) : paginatedQuotations.map(q => {
                                                                                    const isQuotationExpanded = q.id ? expandedQuotationRows.has(q.id) : false;
                                                                                    return (
                                                                                        <React.Fragment key={q.id}>
                                                                                            <tr
                                                                                                onClick={() => q.id && toggleQuotationRowExpand(q.id)}
                                                                                                className={`hover:bg-primary/5 transition-colors cursor-pointer ${isQuotationExpanded ? 'bg-primary/5' : ''}`}
                                                                                            >
                                                                                                <td className="px-2 py-2.5 text-center">
                                                                                                    <button
                                                                                                        onClick={(e) => { e.stopPropagation(); q.id && toggleQuotationRowExpand(q.id); }}
                                                                                                        className="p-1 rounded-md hover:bg-black/5 text-slate-500 transition-colors"
                                                                                                    >
                                                                                                        {isQuotationExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                                                                                                    </button>
                                                                                                </td>
                                                                                                <td className="px-4 py-2.5 font-mono text-slate-600">{q.DocumentNo || q.id}</td>
                                                                                                <td className="px-4 py-2.5">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                                                                                                            {(q.CustomerName ?? '?').charAt(0)}
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <div className="font-medium text-slate-800">{q.CustomerName}</div>
                                                                                                            <div className="text-[10px] text-slate-400">{q.CustomerEmail || q.CustomerPhone}</div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td className="px-4 py-2.5 text-slate-500">
                                                                                                    {q.CreatedAt ? new Date(q.CreatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                                                                </td>
                                                                                                <td className="px-4 py-2.5">
                                                                                                    <div className="flex items-center gap-1 text-slate-600">
                                                                                                        <User className="w-3 h-3" />
                                                                                                        {q.PreparedBy || <span className="italic text-slate-300">—</span>}
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                                                                                                    ₱{(q.Total ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                                                </td>
                                                                                                <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                                                                                    <div className="relative inline-block">
                                                                                                        <select
                                                                                                            value={q.Status || 'Incomplete'}
                                                                                                            onChange={(e) => handleStatusChange(q.id!, e.target.value)}
                                                                                                            disabled={statusUpdatingId === q.id || !historyPerms?.CanEdit}
                                                                                                            className={`appearance-none bg-transparent border-none focus:ring-2 focus:ring-primary/20 rounded-full pl-3 pr-7 py-1 text-[10px] font-bold tracking-wider ${historyPerms?.CanEdit ? 'cursor-pointer' : 'cursor-default opacity-75'} ${statusStyles[q.Status || 'Incomplete'] || 'bg-gray-100 text-gray-700'} ${statusUpdatingId === q.id ? 'opacity-50' : ''}`}
                                                                                                            style={{ textAlignLast: 'center' }}
                                                                                                        >
                                                                                                            <option value="Incomplete" className="text-gray-800 font-medium bg-white">Incomplete</option>
                                                                                                            <option value="Waiting for Approval" className="text-gray-800 font-medium bg-white">Waiting for Approval</option>
                                                                                                            <option value="Completed" className="text-gray-800 font-medium bg-white">Completed</option>
                                                                                                        </select>
                                                                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                                                                            <Edit3 className="w-2.5 h-2.5 text-current opacity-70" />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </td>
                                                                                                {(historyPerms?.CanEdit || historyPerms?.CanDelete) && (
                                                                                                    <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                                                            <button
                                                                                                                onClick={() => setViewingQuotation(q)}
                                                                                                                title="View & Download PDF"
                                                                                                                className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 transition-all shadow-sm border border-slate-200 bg-white"
                                                                                                            >
                                                                                                                <FileSearch className="w-3.5 h-3.5" />
                                                                                                            </button>
                                                                                                            {historyPerms?.CanEdit && (
                                                                                                                <button
                                                                                                                    onClick={() => router.push('/reports/edit/' + q.id)}
                                                                                                                    title="Edit Quotation"
                                                                                                                    className="p-1.5 rounded-lg text-primary hover:text-white hover:bg-primary transition-all shadow-sm border border-slate-200 bg-white"
                                                                                                                >
                                                                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                                                                </button>
                                                                                                            )}
                                                                                                            {historyPerms?.CanDelete && (
                                                                                                                <button
                                                                                                                    onClick={() => handleDeleteQuotation(q)}
                                                                                                                    title="Delete Quotation"
                                                                                                                    className="p-1.5 rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-all shadow-sm border border-slate-200 bg-white"
                                                                                                                >
                                                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                                                </button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                )}
                                                                                            </tr>
                                                                                            {/* Service Breakdown Row - Only shown when expanded */}
                                                                                            {isQuotationExpanded && (
                                                                                                <tr className="bg-slate-100/50">
                                                                                                    <td colSpan={(historyPerms?.CanEdit || historyPerms?.CanDelete) ? 8 : 7} className="px-0 py-0 border-b border-slate-100">
                                                                                                        <div className="px-10 py-4">
                                                                                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                                                                                <Activity className="w-3 h-3" />
                                                                                                                Service Breakdown
                                                                                                            </h5>
                                                                                                            {q.Items && q.Items.length > 0 ? (
                                                                                                                <ServiceBreakdown
                                                                                                                    quotation={q}
                                                                                                                    onTrackItem={(quotation, idx) => {
                                                                                                                        setTrackingQuotation(quotation);
                                                                                                                        setTrackingItemIndex(idx);
                                                                                                                    }}
                                                                                                                />
                                                                                                            ) : (
                                                                                                                <p className="text-xs text-slate-400 italic">No items detailed in this quotation.</p>
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

                                                                    {/* Quotation Totals & Pagination */}
                                                                    {filteredQuotations.length > 0 && (
                                                                        <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm mt-3">
                                                                            <div className="flex justify-end p-3 lg:px-6 bg-slate-50 border-b border-slate-100">
                                                                                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                                                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Page Total:</span>
                                                                                    <span className="text-base font-bold text-primary">₱{pageTotalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white">
                                                                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-slate-500">Show</span>
                                                                                        <select
                                                                                            value={quotationRowsPerPage}
                                                                                            onChange={(e) => {
                                                                                                setQuotationRowsPerPage(Number(e.target.value));
                                                                                                setQuotationCurrentPage(1);
                                                                                            }}
                                                                                            className="border border-slate-300 rounded text-xs py-1 px-1.5 focus:ring-primary focus:border-primary outline-none bg-white"
                                                                                        >
                                                                                            <option value={5}>5</option>
                                                                                            <option value={10}>10</option>
                                                                                            <option value={20}>20</option>
                                                                                            <option value={50}>50</option>
                                                                                        </select>
                                                                                        <span className="text-slate-500">entries</span>
                                                                                    </div>
                                                                                    <span className="text-slate-500">
                                                                                        Showing {filteredQuotations.length === 0 ? 0 : (quotationCurrentPage - 1) * quotationRowsPerPage + 1} to {Math.min(quotationCurrentPage * quotationRowsPerPage, filteredQuotations.length)} of {filteredQuotations.length} entries
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        onClick={() => setQuotationCurrentPage(p => Math.max(1, p - 1))}
                                                                                        disabled={quotationCurrentPage === 1}
                                                                                        className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                                                                                    >
                                                                                        <ChevronLeft className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <span className="px-2 py-0.5 font-medium text-slate-700">
                                                                                        Page {quotationCurrentPage} of {quotationTotalPages}
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={() => setQuotationCurrentPage(p => Math.min(quotationTotalPages, p + 1))}
                                                                                        disabled={quotationCurrentPage === quotationTotalPages}
                                                                                        className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                                                                                    >
                                                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination footer */}
                {!loading && (
                    <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-slate-50/50">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">Show</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border border-slate-300 rounded-md text-sm py-1 px-2 focus:ring-primary focus:border-primary outline-none bg-white shadow-sm"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="text-sm text-slate-500">entries</span>
                            </div>
                            <span className="text-slate-500 text-center sm:text-left">
                                Showing {filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} entries
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || filtered.length === 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 font-medium text-slate-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || filtered.length === 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            <FormModal isOpen={modalOpen} title={editTarget ? 'Edit Guarantor' : 'Add Guarantor'} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleSave} className="space-y-4">
                    {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

                    <div className="space-y-1 w-full">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Guarantor Name</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.Name} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} required placeholder="e.g. Maxicare" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description (Optional)</label>
                        <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" rows={3} value={form.Description} onChange={e => setForm(f => ({ ...f, Description: e.target.value }))} placeholder="Brief details about the guarantor..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editTarget ? 'Save Changes' : 'Add Guarantor'}
                        </button>
                    </div>
                </form>
            </FormModal>

            {/* Delete Confirm Modal */}
            <FormModal isOpen={!!deleteConfirm} title="Delete Guarantor" onClose={() => setDeleteConfirm(null)} size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Are you sure you want to remove <strong className="text-slate-800">{deleteConfirm?.Name}</strong>?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleDelete} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete
                        </button>
                    </div>
                </div>
            </FormModal>

            {/* Global Feedback Modal */}
            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={() => setFeedback(f => ({ ...f, isOpen: false }))}
            />

            {/* Tracking Modal for Service Breakdown */}
            <TrackingModal
                isOpen={!!trackingQuotation}
                onClose={() => { setTrackingQuotation(null); setTrackingItemIndex(null); }}
                quotation={trackingQuotation}
                initialItemIndex={trackingItemIndex}
                onSaveSuccess={async () => {
                    // Refresh expanded data after tracking save
                    if (expandedRow) {
                        const data = await getQuotationsByGuarantor(expandedRow);
                        setExpandedData(data);
                    }
                }}
            />

            {/* PDF Viewer Modal */}
            <PdfViewerModal
                isOpen={!!viewingQuotation}
                onClose={() => setViewingQuotation(null)}
                quotation={viewingQuotation}
            />

            {/* Guarantor Report Modal */}
            {expandedRow && (
                <GuarantorReportModal
                    isOpen={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                    guarantor={guarantors.find(g => g.id === expandedRow) || null}
                    preparedBy={user ? `${user.FirstName} ${user.LastName}` : 'System Admin'}
                    quotations={expandedData.filter(q => {
                        const matchesSearch = (q.DocumentNo || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                            (q.CustomerName || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                            (q.CustomerEmail || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                            (q.CustomerPhone || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                            (q.PreparedBy || '').toLowerCase().includes(quotationSearchTerm.toLowerCase()) ||
                            (q.Status || '').toLowerCase().includes(quotationSearchTerm.toLowerCase());
                        const matchesDate = !quotationFilterDate || (q.CreatedAt && new Date(q.CreatedAt).toISOString().split('T')[0] === quotationFilterDate);
                        return matchesSearch && matchesDate;
                    })}
                    filterDate={quotationFilterDate}
                />
            )}
        </div>
    );
}
