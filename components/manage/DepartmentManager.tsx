'use client';

// ============================================================
//  VisayasMed — Department Manager
//  RBAC-gated: renders only if CanView === true
//  Add/Edit/Delete buttons shown only if CanAdd/CanEdit/CanDelete === true
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Upload, Building2, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDepartments, addDepartment, updateDepartment, deleteDepartment, type Department } from '@/lib/firestore/departments';
import { useAuth } from '@/context/AuthContext';
import FormModal from '@/components/manage/FormModal';
import AccessDenied from '@/components/AccessDenied';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

const EMPTY_FORM = { DepartmentName: '', Description: '', SortOrder: 0 };

export default function DepartmentManager() {
    const { user } = useAuth();
    const perms = user?.Permissions?.Departments;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Department | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Filter & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // Upload Excel state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadData, setUploadData] = useState<any[] | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);

    const load = async () => {
        setLoading(true);
        try { setDepartments(await getDepartments()); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    if (!perms?.CanView) return <AccessDenied moduleName="Departments" />;

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (d: Department) => { setEditTarget(d); setForm({ DepartmentName: d.DepartmentName, Description: d.Description, SortOrder: d.SortOrder }); setModalOpen(true); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const isDuplicate = departments.some(
            d => d.DepartmentName.toLowerCase() === form.DepartmentName.trim().toLowerCase() && d.DepartmentID !== editTarget?.DepartmentID
        );
        if (isDuplicate) {
            setError('A department with this name already exists.');
            return;
        }

        setSaving(true);
        try {
            const createdBy = `${user?.FirstName} ${user?.LastName}`;
            if (editTarget) {
                await updateDepartment(editTarget.DepartmentID, { ...form, DepartmentName: form.DepartmentName.trim() }, createdBy);
            } else {
                await addDepartment({ ...form, DepartmentName: form.DepartmentName.trim(), IsActive: true }, createdBy);
            }
            setModalOpen(false);
            setFeedback({ isOpen: true, type: 'success', title: 'Success', message: editTarget ? 'Department updated successfully.' : 'Department added successfully.' });
            await load();
        } catch {
            setError('Failed to save. Please try again.');
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to save department. Please try again.' });
        }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setSaving(true);
        try {
            await deleteDepartment(deleteConfirm.DepartmentID, `${user?.FirstName} ${user?.LastName}`);
            setDeleteConfirm(null);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(deleteConfirm.DepartmentID);
                return next;
            });
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Department successfully deleted.' });
        } catch (err) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete department.' });
        } finally { setSaving(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setSaving(true);
        try {
            const by = `${user?.FirstName} ${user?.LastName}`;
            const promises = Array.from(selectedIds).map(id => deleteDepartment(id, by));
            await Promise.all(promises);
            setSelectedIds(new Set());
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Selected departments successfully deleted.' });
        } catch (err) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete selected departments.' });
        } finally { setSaving(false); }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData: any[] = XLSX.utils.sheet_to_json(ws);

                // Normalize keys (remove spaces, lowercase)
                const normalizedData = rawData.map(row => {
                    const newRow: any = {};
                    Object.keys(row).forEach(k => {
                        const normalizedKey = k.replace(/\s+/g, '').toLowerCase();
                        newRow[normalizedKey] = row[k];
                    });
                    // For UI display, map back to standard keys
                    return {
                        DepartmentName: newRow['departmentname'],
                        Description: newRow['description'] || '',
                        SortOrder: newRow['sortorder'] || 0
                    };
                });

                setUploadData(normalizedData);
            } catch (err) {
                setError('Failed to parse Excel/CSV file.');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = ''; // reset input
    };

    const handleConfirmUpload = async () => {
        if (!uploadData) return;
        setSaving(true);
        setError('');
        setUploadProgress({ current: 0, total: 1 }); // initial state
        try {
            const createdBy = `${user?.FirstName} ${user?.LastName}`;
            const newlyCreatedDepts: Set<string> = new Set();

            // 1) Pre-filter the valid unique departments
            const validRows: any[] = [];

            for (const row of uploadData) {
                if (!row.DepartmentName) continue;

                const deptName = String(row.DepartmentName).trim();
                const lowerDeptName = deptName.toLowerCase();

                const existsInDb = departments.some(d => d.DepartmentName.toLowerCase() === lowerDeptName);
                if (existsInDb || newlyCreatedDepts.has(lowerDeptName)) {
                    continue; // Skip duplicate
                }

                validRows.push({
                    DepartmentName: deptName,
                    Description: String(row.Description || ''),
                    SortOrder: Number(row.SortOrder || 0),
                    IsActive: true
                });

                newlyCreatedDepts.add(lowerDeptName);
            }

            setUploadProgress({ current: 0, total: validRows.length });

            // 2) Chunk parallel uploads 
            const chunkSize = 50;
            let currentUploaded = 0;

            for (let i = 0; i < validRows.length; i += chunkSize) {
                const chunk = validRows.slice(i, i + chunkSize);
                await Promise.all(chunk.map(data => addDepartment(data, createdBy)));
                currentUploaded += chunk.length;
                setUploadProgress({ current: currentUploaded, total: validRows.length });
            }

            setUploadData(null);
            setUploadProgress(null);
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Upload Complete', message: 'Departments successfully uploaded and created.' });
        } catch (err) {
            setError('Failed to batch save uploaded data.');
            setFeedback({ isOpen: true, type: 'error', title: 'Upload Failed', message: 'Failed to batch save uploaded data.' });
            console.error(err);
        } finally {
            setSaving(false);
            setUploadProgress(null);
        }
    };

    const activeCount = departments.filter(d => d.IsActive !== false).length;
    const filteredDepartments = departments.filter(d =>
        d.DepartmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.Description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / rowsPerPage));
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginatedDepartments = filteredDepartments.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const toggleSelectAll = () => {
        const visibleIds = paginatedDepartments.map(d => d.DepartmentID);
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

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Departments Management</h1>
                        <p className="text-gray-500 mt-0.5 text-sm">Manage and organize hospital departments for services.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Departments</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {loading ? '—' : departments.length}
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-green-50 text-green-600">
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Active Departments</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {loading ? '—' : activeCount}
                        </p>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                {/* Header Controls */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                    <div className="relative w-full sm:max-w-md">
                        <input
                            type="search"
                            placeholder="Search departments..."
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
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
                        {perms?.CanAdd && (
                            <button onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 focus:ring-2 focus:ring-primary/20 transition-all active:scale-[0.98] text-sm shadow-sm whitespace-nowrap"
                            >
                                <Upload className="w-4 h-4" /> Upload Department
                            </button>
                        )}
                        {perms?.CanAdd && (
                            <button onClick={openAdd}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm">
                                <Plus className="w-4 h-4" /> Add Department
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
                                <tr>
                                    <th className="px-5 py-3.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={paginatedDepartments.length > 0 && paginatedDepartments.every(d => selectedIds.has(d.DepartmentID))}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Department Name</th>
                                    <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Description</th>
                                    {(perms?.CanEdit || perms?.CanDelete) && (
                                        <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedDepartments.length === 0 ? (
                                    <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No departments found.</td></tr>
                                ) : paginatedDepartments.map((d) => (
                                    <tr key={d.DepartmentID} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => toggleRowSelect(d.DepartmentID)}>
                                        <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(d.DepartmentID)}
                                                onChange={() => toggleRowSelect(d.DepartmentID)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-slate-800">{d.DepartmentName}</td>
                                        <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell max-w-xs truncate">{d.Description}</td>
                                        {(perms?.CanEdit || perms?.CanDelete) && (
                                            <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    {perms?.CanEdit && (
                                                        <button onClick={() => openEdit(d)}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                            title="Edit Department">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {perms?.CanDelete && (
                                                        <button onClick={() => setDeleteConfirm(d)}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                            title="Delete Department">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
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
                                Showing {filteredDepartments.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredDepartments.length)} of {filteredDepartments.length} entries
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || filteredDepartments.length === 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 font-medium text-slate-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || filteredDepartments.length === 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            <FormModal isOpen={modalOpen} title={editTarget ? 'Edit Department' : 'Add Department'} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleSave} className="space-y-4">
                    {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

                    <div className="space-y-1 w-full">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department Name</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.DepartmentName} onChange={e => setForm(f => ({ ...f, DepartmentName: e.target.value }))} required placeholder="e.g. Cardiology" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</label>
                        <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" rows={3} value={form.Description} onChange={e => setForm(f => ({ ...f, Description: e.target.value }))} placeholder="Short department description..." />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Sort Order</label>
                        <input type="number" className="w-32 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.SortOrder} onChange={e => setForm(f => ({ ...f, SortOrder: parseInt(e.target.value) || 0 }))} min={0} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editTarget ? 'Save Changes' : 'Add Department'}
                        </button>
                    </div>
                </form>
            </FormModal>

            {/* Delete Confirm Modal */}
            <FormModal isOpen={!!deleteConfirm} title="Delete Department" onClose={() => setDeleteConfirm(null)} size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Are you sure you want to remove <strong className="text-slate-800">{deleteConfirm?.DepartmentName}</strong>? This will hide it and all its services from the quotation system.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleDelete} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete
                        </button>
                    </div>
                </div>
            </FormModal>

            {/* Upload Confirm Modal */}
            <FormModal isOpen={!!uploadData} title="Review Uploaded Departments" size="lg" onClose={() => setUploadData(null)}>
                <div className="space-y-4">
                    <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-xl border border-amber-200">
                        Please review the {uploadData?.length} parsed departments. Make sure the columns mapped correctly to: <strong>DepartmentName, Description, SortOrder</strong>.
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Department Name</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Description</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {uploadData?.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-2.5 font-medium text-slate-800">{row.DepartmentName || '-'}</td>
                                        <td className="px-4 py-2.5 text-slate-500 truncate max-w-xs">{row.Description || '-'}</td>
                                        <td className="px-4 py-2.5 text-slate-600">{row.SortOrder || '0'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        {uploadProgress ? (
                            <div className="flex-1 flex items-center justify-between bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 text-sm font-medium text-primary shadow-inner mr-4">
                                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading Departments...</span>
                                <span>{uploadProgress.current} / {uploadProgress.total} Data</span>
                            </div>
                        ) : (
                            <div className="flex-1" />
                        )}
                        <div className="flex items-center gap-3">
                            <button onClick={() => setUploadData(null)} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleConfirmUpload} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing...</> : 'Confirm Upload'}
                            </button>
                        </div>
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
        </div>
    );
}
