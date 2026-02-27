'use client';

// ============================================================
//  VisayasMed — Guarantor Manager
// ============================================================

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Shield, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown, ChevronRightIcon, FileText } from 'lucide-react';
import { getGuarantors, addGuarantor, updateGuarantor, deleteGuarantor, GuarantorRecord } from '@/lib/firestore/guarantors';
import { getQuotationsByGuarantor, QuotationRecord } from '@/lib/firestore/quotations';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import FormModal from '@/components/manage/FormModal';
import AccessDenied from '@/components/AccessDenied';

const EMPTY_FORM = { Name: '', Description: '' };

export default function GuarantorManager() {
    const { user } = useAuth();
    const { alert } = useConfirm();
    const perms = user?.Permissions?.Departments;

    const [guarantors, setGuarantors] = useState<GuarantorRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<GuarantorRecord | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deleteConfirm, setDeleteConfirm] = useState<GuarantorRecord | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [expandedLoading, setExpandedLoading] = useState(false);
    const [expandedData, setExpandedData] = useState<QuotationRecord[]>([]);

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
            await load();
        } catch { setError('Failed to save. Please try again.'); }
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
                    {perms?.CanAdd && (
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
                            <button onClick={openAdd}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm">
                                <Plus className="w-4 h-4" /> Add Guarantor
                            </button>
                        </div>
                    )}
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
                                    <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No guarantors found.</td></tr>
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
                                        </tr>
                                        {/* Expanded Row Content */}
                                        {expandedRow === d.id && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={5} className="p-0 border-b border-slate-200">
                                                    <div className="py-4 px-8 md:px-14">
                                                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                                            <FileText className="w-4 h-4 text-primary" /> Connected Quotations
                                                        </h4>
                                                        {expandedLoading ? (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400 py-3"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching records...</div>
                                                        ) : expandedData.length === 0 ? (
                                                            <p className="text-xs text-slate-400 italic py-2">No active records for this guarantor.</p>
                                                        ) : (
                                                            <div className="bg-white border text-xs border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                                <table className="min-w-full divide-y divide-slate-100">
                                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                                        <tr>
                                                                            <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Doc No.</th>
                                                                            <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Patient</th>
                                                                            <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Date Issued</th>
                                                                            <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {expandedData.map(q => (
                                                                            <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                                                                                <td className="px-4 py-2.5 font-mono text-slate-600">{q.DocumentNo || q.id}</td>
                                                                                <td className="px-4 py-2.5 font-medium text-slate-800">{q.CustomerName}</td>
                                                                                <td className="px-4 py-2.5 text-slate-500">{q.CreatedAt ? new Date(q.CreatedAt).toLocaleDateString() : '—'}</td>
                                                                                <td className="px-4 py-2.5 text-center">
                                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${q.Status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                                        {q.Status || 'Incomplete'}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
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
        </div>
    );
}
