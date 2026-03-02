'use client';

// ============================================================
//  VisayasMed — Service Manager
//  RBAC-gated per permissions.Services
// ============================================================

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Upload, Stethoscope, CheckCircle2, LayoutGrid, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAllServices, addService, updateService, deleteService, type Service } from '@/lib/firestore/services';
import { getDepartments, addDepartment, type Department } from '@/lib/firestore/departments';
import { useAuth } from '@/context/AuthContext';
import FormModal from '@/components/manage/FormModal';
import AccessDenied from '@/components/AccessDenied';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

const fmt = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2 });
const EMPTY_FORM = { ServiceName: '', DepartmentID: '', Price: 0, Unit: 'per session', Description: '' };

export default function ServiceManager() {
    const { user } = useAuth();
    const perms = user?.Permissions?.Services;

    const [services, setServices] = useState<Service[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [filterDeptId, setFilterDeptId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Service | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deleteConfirm, setDeleteConfirm] = useState<Service | null>(null);
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
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Upload Excel state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadData, setUploadData] = useState<any[] | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, status: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [svcs, depts] = await Promise.all([getAllServices(), getDepartments()]);
            setServices(svcs);
            setDepartments(depts);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    if (!perms?.CanView) return <AccessDenied moduleName="Services" />;

    const filtered = services.filter(s => {
        const matchesDept = filterDeptId ? s.DepartmentID === filterDeptId : true;
        const matchesSearch = s.ServiceName.toLowerCase().includes(searchTerm.toLowerCase()) || s.Description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginatedServices = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const deptName = (id: string) => departments.find(d => d.DepartmentID === id)?.DepartmentName ?? id;

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (s: Service) => {
        setEditTarget(s);
        setForm({ ServiceName: s.ServiceName, DepartmentID: s.DepartmentID, Price: s.Price, Unit: s.Unit, Description: s.Description });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const isDuplicate = services.some(
            s => s.DepartmentID === form.DepartmentID && s.ServiceName.toLowerCase() === form.ServiceName.trim().toLowerCase() && s.ServiceID !== editTarget?.ServiceID
        );
        if (isDuplicate) {
            setError('A service with this name already exists in the selected department.');
            return;
        }

        setSaving(true);
        try {
            const by = `${user?.FirstName} ${user?.LastName}`;
            if (editTarget) {
                await updateService(editTarget.ServiceID, { ...form, Price: Number(form.Price) }, by);
            } else {
                await addService({ ...form, Price: Number(form.Price), IsActive: true }, by);
            }
            setModalOpen(false);
            setFeedback({ isOpen: true, type: 'success', title: 'Success', message: editTarget ? 'Service updated successfully.' : 'Service added successfully.' });
            await load();
        } catch {
            setError('Failed to save. Please try again.');
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to save service. Please try again.' });
        }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setSaving(true);
        try {
            await deleteService(deleteConfirm.ServiceID, `${user?.FirstName} ${user?.LastName}`);
            setDeleteConfirm(null);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(deleteConfirm.ServiceID);
                return next;
            });
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Service successfully deleted.' });
        } catch (err) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete service.' });
        } finally { setSaving(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setSaving(true);
        try {
            const by = `${user?.FirstName} ${user?.LastName}`;
            const promises = Array.from(selectedIds).map(id => deleteService(id, by));
            await Promise.all(promises);
            setSelectedIds(new Set());
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Selected services successfully deleted.' });
        } catch (err) {
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete selected services.' });
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
                    return {
                        ServiceName: newRow['servicename'],
                        DepartmentName: newRow['departmentname'] || '',
                        Description: newRow['description'] || '',
                        Price: newRow['price'] || 0,
                        Unit: newRow['unit'] || 'per session'
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
        try {
            const createdBy = `${user?.FirstName} ${user?.LastName}`;
            // 1) First Pass: Identify and create missing departments
            setUploadProgress({ current: 0, total: 1, status: 'Preparing Departments...' });

            const newlyCreatedDepts: Record<string, string> = {};
            const uniqueRawDepts = new Set(
                uploadData.map(r => String(r.DepartmentName || '').trim()).filter(Boolean)
            );

            let deptsProcessed = 0;
            setUploadProgress({ current: 0, total: uniqueRawDepts.size, status: 'Preparing Departments...' });

            for (const deptName of uniqueRawDepts) {
                const lowerDeptName = deptName.toLowerCase();
                const matched = departments.find(d => d.DepartmentName.toLowerCase() === lowerDeptName);

                if (!matched && !newlyCreatedDepts[lowerDeptName]) {
                    const newId = await addDepartment({
                        DepartmentName: deptName,
                        Description: '',
                        SortOrder: 0,
                        IsActive: true
                    }, createdBy);
                    newlyCreatedDepts[lowerDeptName] = newId;
                }

                deptsProcessed++;
                setUploadProgress({ current: deptsProcessed, total: uniqueRawDepts.size, status: 'Preparing Departments...' });
            }

            // 2) Second Pass: Deduplicate all valid services
            setUploadProgress({ current: 0, total: 1, status: 'Processing Data...' });
            const validServices: any[] = [];
            const newlyCreatedServices: Set<string> = new Set();

            for (const row of uploadData) {
                if (!row.ServiceName) continue;

                const deptName = String(row.DepartmentName).trim();
                const lowerDeptName = deptName.toLowerCase();
                const serviceName = String(row.ServiceName).trim();
                const lowerServiceName = serviceName.toLowerCase();

                let deptId = '';
                if (lowerDeptName) {
                    const matched = departments.find(d => d.DepartmentName.toLowerCase() === lowerDeptName);
                    if (matched) {
                        deptId = matched.DepartmentID;
                    } else if (newlyCreatedDepts[lowerDeptName]) {
                        deptId = newlyCreatedDepts[lowerDeptName];
                    }
                }

                if (!deptId) continue; // Unlikely to happen due to step 1, but safe fallback

                const existsInDb = services.some(s => s.DepartmentID === deptId && s.ServiceName.toLowerCase() === lowerServiceName);
                const uniqueKey = `${deptId}:${lowerServiceName}`;

                if (existsInDb || newlyCreatedServices.has(uniqueKey)) continue;

                validServices.push({
                    ServiceName: serviceName,
                    DepartmentID: deptId,
                    Description: String(row.Description || ''),
                    Price: Number(row.Price || 0),
                    Unit: String(row.Unit || 'per session'),
                    IsActive: true
                });

                newlyCreatedServices.add(uniqueKey);
            }

            // 3) Third Pass: Concurrent batch uploads of valid services
            setUploadProgress({ current: 0, total: validServices.length, status: 'Uploading Services...' });
            const chunkSize = 50;
            let currentUploaded = 0;

            for (let i = 0; i < validServices.length; i += chunkSize) {
                const chunk = validServices.slice(i, i + chunkSize);
                await Promise.all(chunk.map(data => addService(data, createdBy)));
                currentUploaded += chunk.length;
                setUploadProgress({ current: currentUploaded, total: validServices.length, status: 'Uploading Services...' });
            }

            setUploadData(null);
            setUploadProgress(null);
            await load();
            setFeedback({ isOpen: true, type: 'success', title: 'Upload Complete', message: 'Services successfully uploaded and created.' });
        } catch (err) {
            setError('Failed to batch save uploaded data.');
            setFeedback({ isOpen: true, type: 'error', title: 'Upload Failed', message: 'Failed to batch save uploaded data.' });
            console.error(err);
        } finally {
            setSaving(false);
            setUploadProgress(null);
        }
    };

    const activeCount = services.filter(s => s.IsActive !== false).length;
    const departmentsCount = new Set(services.map(s => s.DepartmentID).filter(Boolean)).size;

    const toggleSelectAll = () => {
        const visibleIds = paginatedServices.map(s => s.ServiceID);
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
                        <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Services Management</h1>
                        <p className="text-gray-500 mt-0.5 text-sm">Manage medical services, prices, and departments.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                        <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Services</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {loading ? '—' : services.length}
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-green-50 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Active Services</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {loading ? '—' : activeCount}
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Servicing Departments</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">
                            {loading ? '—' : departmentsCount}
                        </p>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                {/* Header Controls */}
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4 bg-white">
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:max-w-md">
                            <input
                                type="search"
                                placeholder="Search services..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-slate-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <Search className="w-4 h-4" />
                            </div>
                        </div>
                        <select className="w-full sm:w-auto text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                            value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}>
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 w-full lg:w-auto mt-3 sm:mt-0">
                        {selectedIds.size > 0 && perms?.CanDelete && (
                            <button onClick={handleBulkDelete}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl hover:bg-red-100 transition-all text-sm whitespace-nowrap shadow-sm disabled:opacity-50"
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
                                <Upload className="w-4 h-4" /> Upload Services or Items
                            </button>
                        )}
                        {perms?.CanAdd && (
                            <button onClick={openAdd}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm">
                                <Plus className="w-4 h-4" /> Add Services or Items
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
                                            checked={paginatedServices.length > 0 && paginatedServices.every(s => selectedIds.has(s.ServiceID))}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Service Name</th>
                                    <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Department</th>
                                    <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Price</th>
                                    {(perms?.CanEdit || perms?.CanDelete) && (
                                        <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedServices.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No services found.</td></tr>
                                ) : paginatedServices.map((s) => (
                                    <tr key={s.ServiceID} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => toggleRowSelect(s.ServiceID)}>
                                        <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(s.ServiceID)}
                                                onChange={() => toggleRowSelect(s.ServiceID)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-slate-800">{s.ServiceName}</td>
                                        <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{deptName(s.DepartmentID)}</td>
                                        <td className="px-5 py-3.5 text-right font-bold text-slate-800 tabular-nums">{fmt(s.Price)} <span className="font-normal text-slate-400 text-xs">/{s.Unit}</span></td>
                                        {(perms?.CanEdit || perms?.CanDelete) && (
                                            <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    {perms?.CanEdit && (
                                                        <button onClick={() => openEdit(s)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Edit Service">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {perms?.CanDelete && (
                                                        <button onClick={() => setDeleteConfirm(s)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Delete Service">
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
            <FormModal isOpen={modalOpen} title={editTarget ? 'Edit Service' : 'Add Service'} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleSave} className="space-y-4">
                    {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4" />{error}</div>}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department</label>
                        <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.DepartmentID} onChange={e => setForm(f => ({ ...f, DepartmentID: e.target.value }))} required>
                            <option value="">Select a department...</option>
                            {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Service Name</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.ServiceName} onChange={e => setForm(f => ({ ...f, ServiceName: e.target.value }))} required placeholder="e.g. ECG" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</label>
                        <textarea className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" rows={2} value={form.Description} onChange={e => setForm(f => ({ ...f, Description: e.target.value }))} placeholder="Short description..." />
                    </div>
                    <div className="flex gap-3">
                        <div className="space-y-1 flex-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Price (₱)</label>
                            <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.Price} onChange={e => setForm(f => ({ ...f, Price: parseFloat(e.target.value) || 0 }))} required min={0} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit</label>
                            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.Unit} onChange={e => setForm(f => ({ ...f, Unit: e.target.value }))} required placeholder="per session" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editTarget ? 'Save Changes' : 'Add Service'}
                        </button>
                    </div>
                </form>
            </FormModal>

            {/* Delete Confirm */}
            <FormModal isOpen={!!deleteConfirm} title="Delete Service" onClose={() => setDeleteConfirm(null)} size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Remove <strong className="text-slate-800">{deleteConfirm?.ServiceName}</strong> from the system?</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleDelete} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete
                        </button>
                    </div>
                </div>
            </FormModal>

            {/* Upload Confirm Modal */}
            <FormModal isOpen={!!uploadData} title="Review Uploaded Services" size="lg" onClose={() => setUploadData(null)}>
                <div className="space-y-4">
                    <div className="bg-amber-50 text-amber-800 text-sm p-4 rounded-xl border border-amber-200">
                        Please review the {uploadData?.length} parsed services. Make sure the columns match: <strong>ServiceName, DepartmentName, Description, Price, Unit</strong>.
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Service Name</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Department Name</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Description</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Price</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {uploadData?.map((row, idx) => {
                                    const deptName = String(row.DepartmentName || '').trim();
                                    const lowerDeptName = deptName.toLowerCase();
                                    const matched = lowerDeptName ? departments.find(d => d.DepartmentName.toLowerCase() === lowerDeptName) : null;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-2.5 font-medium text-slate-800">{row.ServiceName || '-'}</td>
                                            <td className="px-4 py-2.5 text-slate-600">
                                                {deptName ? (
                                                    matched ? <span className="text-green-600 font-medium">✓ {matched.DepartmentName}</span> : <span className="text-amber-500 font-medium">+ {deptName} (Will create)</span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 truncate max-w-xs">{row.Description || '-'}</td>
                                            <td className="px-4 py-2.5 font-bold text-slate-700">{fmt(Number(row.Price || 0))}</td>
                                            <td className="px-4 py-2.5 text-slate-600">{row.Unit || 'per session'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        {uploadProgress ? (
                            <div className="flex-1 flex items-center justify-between bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 text-sm font-medium text-primary shadow-inner mr-4">
                                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress.status}</span>
                                <span>{uploadProgress.current} / {uploadProgress.total}</span>
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
