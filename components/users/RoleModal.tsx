'use client';

import { useState, useEffect } from 'react';

import { Loader2 } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

export interface RoleRecord {
    RoleID: string;
    RoleName: string;
    Description: string;
    IsActive: boolean;
}

interface AppModule {
    ModuleID: string;
    ModuleName: string;
    Label: string;
    Path: string;
    Icon: string;
    SortOrder: number;
    IsActive: boolean;
}

export type ModulePermissions = {
    CanView: boolean;
    CanAdd: boolean;
    CanEdit: boolean;
    CanDelete: boolean;
};

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    role?: RoleRecord | null;
    onSave: () => void;
    existingRoles?: RoleRecord[];
}

export default function RoleModal({ isOpen, onClose, role, onSave, existingRoles = [] }: RoleModalProps) {
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Dynamic permissions state
    const [modules, setModules] = useState<AppModule[]>([]);
    const [permissions, setPermissions] = useState<Record<string, ModulePermissions>>({});

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setLoading(true);
        setError('');

        if (role) {
            setRoleName(role.RoleName || '');
            setDescription(role.Description || '');
            setIsActive(role.IsActive !== false);
        } else {
            setRoleName('');
            setDescription('');
            setIsActive(true);
        }

        // Fetch modules and existing permissions (if editing)
        Promise.all([
            fetch('/api/modules').then(r => r.json()),
            role ? fetch(`/api/roles/${role.RoleID}/permissions`).then(r => r.json()) : Promise.resolve({ success: true, permissions: {} })
        ])
            .then(([modData, permData]) => {
                if (!isMounted) return;
                if (!modData.success) throw new Error(modData.error || 'Failed to load modules');
                if (!permData.success) throw new Error(permData.error || 'Failed to load role permissions');

                setModules(modData.modules || []);
                setPermissions(permData.permissions || {});
            })
            .catch(err => {
                if (isMounted) setError(err.message || 'Failed to initialize role form');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [role, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // ── Client-side duplicate check ──
        const isDuplicate = existingRoles.some(
            r => r.RoleName.toLowerCase() === roleName.trim().toLowerCase()
                && r.RoleID !== role?.RoleID
        );
        if (isDuplicate) {
            setError('A role with this name already exists.');
            return;
        }

        setSaving(true);

        try {
            const endpoint = role ? `/api/roles/${role.RoleID}` : '/api/roles';
            const method = role ? 'PUT' : 'POST';

            // 1. Save Role core info
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ RoleName: roleName, Description: description, IsActive: isActive }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to save role.');

            // 2. Save Role Permissions
            const roleIdToUpdate = role ? role.RoleID : data.RoleID; // if new, data.RoleID must be returned from POST
            if (!roleIdToUpdate) throw new Error('Role ID missing for permissions update.');

            const permsRes = await fetch(`/api/roles/${roleIdToUpdate}/permissions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissions }),
            });

            const permsData = await permsRes.json();
            if (!permsData.success) throw new Error(permsData.error || 'Failed to save permissions.');

            setFeedback({ isOpen: true, type: 'success', title: 'Success', message: role ? 'Role updated successfully.' : 'Role created successfully.' });
        } catch (err: any) {
            setError(err.message);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message || 'Failed to save role.' });
        } finally {
            setSaving(false);
        }
    };

    const handleFeedbackClose = () => {
        setFeedback(f => ({ ...f, isOpen: false }));
        if (feedback.type === 'success') {
            onSave();
            onClose();
        }
    };

    // Toggle a specific permission bit for a module
    const togglePermission = (moduleName: string, perm: keyof ModulePermissions) => {
        setPermissions(prev => {
            const current = prev[moduleName] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };
            return {
                ...prev,
                [moduleName]: { ...current, [perm]: !current[perm] }
            };
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {role ? 'Edit Role' : 'Add New Role'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                Loading role data...
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Role Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={roleName}
                                            onChange={(e) => setRoleName(e.target.value)}
                                            placeholder="e.g. Admin, Staff, Billing Officer"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Brief description of what this role can do..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition resize-none"
                                        />
                                    </div>

                                    {/* Active toggle */}
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center cursor-pointer gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">Active Role</span>
                                        </label>
                                        <span className="text-xs text-gray-400">(Inactive roles are hidden from assignment)</span>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg overflow-hidden h-[300px] flex flex-col">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-700">Module Permissions</h3>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500 font-medium text-xs sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-2">Module</th>
                                                    <th className="px-2 py-2 text-center">View</th>
                                                    <th className="px-2 py-2 text-center">Add</th>
                                                    <th className="px-2 py-2 text-center">Edit</th>
                                                    <th className="px-2 py-2 text-center">Delete</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {modules.map(moduleDef => {
                                                    const mod = moduleDef.ModuleName;
                                                    const oPerms = permissions[mod] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };

                                                    return (
                                                        <tr key={mod} className="odd:bg-white even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                                                            <td className="px-4 py-2 font-medium text-gray-800">
                                                                {moduleDef.Label}
                                                            </td>
                                                            {(['CanView', 'CanAdd', 'CanEdit', 'CanDelete'] as const).map(perm => (
                                                                <td key={perm} className="px-2 py-2 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={oPerms[perm]}
                                                                        onChange={() => togglePermission(mod, perm)}
                                                                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                                {modules.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="py-8 text-center text-gray-400">No modules found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </form>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-100 bg-gray-50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="role-form"
                        disabled={saving || loading}
                        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-60 flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
                    </button>
                </div>
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={handleFeedbackClose}
            />
        </div>
    );
}
