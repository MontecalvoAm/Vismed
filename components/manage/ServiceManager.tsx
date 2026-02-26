'use client';

// ============================================================
//  VisayasMed — Service Manager
//  RBAC-gated per permissions.Services
// ============================================================

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { getAllServices, addService, updateService, deleteService, type Service } from '@/lib/firestore/services';
import { getDepartments, type Department } from '@/lib/firestore/departments';
import { useAuth } from '@/context/AuthContext';
import FormModal from '@/components/manage/FormModal';
import AccessDenied from '@/components/AccessDenied';

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

    const filtered = filterDeptId ? services.filter(s => s.DepartmentID === filterDeptId) : services;
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
        setSaving(true);
        try {
            const by = `${user?.FirstName} ${user?.LastName}`;
            if (editTarget) {
                await updateService(editTarget.ServiceID, { ...form, Price: Number(form.Price) }, by);
            } else {
                await addService({ ...form, Price: Number(form.Price), IsActive: true }, by);
            }
            setModalOpen(false);
            await load();
        } catch { setError('Failed to save. Please try again.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setSaving(true);
        try {
            await deleteService(deleteConfirm.ServiceID, `${user?.FirstName} ${user?.LastName}`);
            setDeleteConfirm(null);
            await load();
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-800">Services</h3>
                <div className="flex items-center gap-3">
                    <select className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                        value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.Icon} {d.DepartmentName}</option>)}
                    </select>
                    {perms?.CanAdd && (
                        <button onClick={openAdd}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm whitespace-nowrap">
                            <Plus className="w-4 h-4" /> Add Service
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading...</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Service Name</th>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Department</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Price</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No services found.</td></tr>
                            ) : filtered.map((s) => (
                                <tr key={s.ServiceID} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3.5 font-semibold text-slate-800">{s.ServiceName}</td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{deptName(s.DepartmentID)}</td>
                                    <td className="px-5 py-3.5 text-right font-bold text-slate-800 tabular-nums">{fmt(s.Price)} <span className="font-normal text-slate-400 text-xs">/{s.Unit}</span></td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center justify-end gap-2">
                                            {perms?.CanEdit && (
                                                <button onClick={() => openEdit(s)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                                </button>
                                            )}
                                            {perms?.CanDelete && (
                                                <button onClick={() => setDeleteConfirm(s)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Modal */}
            <FormModal isOpen={modalOpen} title={editTarget ? 'Edit Service' : 'Add Service'} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleSave} className="space-y-4">
                    {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4" />{error}</div>}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department</label>
                        <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.DepartmentID} onChange={e => setForm(f => ({ ...f, DepartmentID: e.target.value }))} required>
                            <option value="">Select a department...</option>
                            {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.Icon} {d.DepartmentName}</option>)}
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
        </div>
    );
}
