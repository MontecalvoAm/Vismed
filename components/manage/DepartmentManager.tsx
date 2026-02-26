'use client';

// ============================================================
//  VisayasMed — Department Manager
//  RBAC-gated: renders only if CanView === true
//  Add/Edit/Delete buttons shown only if CanAdd/CanEdit/CanDelete === true
// ============================================================

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { getDepartments, addDepartment, updateDepartment, deleteDepartment, type Department } from '@/lib/firestore/departments';
import { useAuth } from '@/context/AuthContext';
import FormModal from '@/components/manage/FormModal';
import AccessDenied from '@/components/AccessDenied';

const EMPTY_FORM = { DepartmentName: '', Icon: '🏥', Description: '', SortOrder: 0 };

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

    const load = async () => {
        setLoading(true);
        try { setDepartments(await getDepartments()); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    if (!perms?.CanView) return <AccessDenied moduleName="Departments" />;

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (d: Department) => { setEditTarget(d); setForm({ DepartmentName: d.DepartmentName, Icon: d.Icon, Description: d.Description, SortOrder: d.SortOrder }); setModalOpen(true); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const createdBy = `${user?.FirstName} ${user?.LastName}`;
            if (editTarget) {
                await updateDepartment(editTarget.DepartmentID, { ...form }, createdBy);
            } else {
                await addDepartment({ ...form, IsActive: true }, createdBy);
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
            await deleteDepartment(deleteConfirm.DepartmentID, `${user?.FirstName} ${user?.LastName}`);
            setDeleteConfirm(null);
            await load();
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Departments</h3>
                {perms?.CanAdd && (
                    <button onClick={openAdd}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm">
                        <Plus className="w-4 h-4" /> Add Department
                    </button>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading...</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Icon</th>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Department Name</th>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Description</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {departments.length === 0 ? (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No departments found.</td></tr>
                            ) : departments.map((d) => (
                                <tr key={d.DepartmentID} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3.5 text-xl">{d.Icon}</td>
                                    <td className="px-5 py-3.5 font-semibold text-slate-800">{d.DepartmentName}</td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell max-w-xs truncate">{d.Description}</td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center justify-end gap-2">
                                            {perms?.CanEdit && (
                                                <button onClick={() => openEdit(d)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                                </button>
                                            )}
                                            {perms?.CanDelete && (
                                                <button onClick={() => setDeleteConfirm(d)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
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
            <FormModal isOpen={modalOpen} title={editTarget ? 'Edit Department' : 'Add Department'} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleSave} className="space-y-4">
                    {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
                    <div className="flex gap-3">
                        <div className="space-y-1 w-24">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Icon</label>
                            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.Icon} onChange={e => setForm(f => ({ ...f, Icon: e.target.value }))} required />
                        </div>
                        <div className="space-y-1 flex-1">
                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Department Name</label>
                            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40" value={form.DepartmentName} onChange={e => setForm(f => ({ ...f, DepartmentName: e.target.value }))} required placeholder="e.g. Cardiology" />
                        </div>
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
        </div>
    );
}
