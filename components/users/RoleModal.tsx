'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, Settings, Info, Save, X } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { ClearableInput } from '@/components/ui/ClearableInput';
import { Switch } from '@/components/ui/Switch';

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

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ RoleName: roleName, Description: description, IsActive: isActive }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to save role.');

            const roleIdToUpdate = role ? role.RoleID : data.RoleID;
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                {role ? 'Edit User Role' : 'Create New Role'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">Configure permissions and access levels</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <form id="role-form" onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
                                <Info className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                                <p className="font-semibold text-lg">Loading role configuration...</p>
                                <p className="text-sm">This will only take a moment</p>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {/* Role Identity Section */}
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Settings className="w-5 h-5" />
                                        <h3 className="font-bold text-slate-800 tracking-tight uppercase text-xs">General Information</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                                        <div className="space-y-6">
                                            <ClearableInput
                                                label="Role Name"
                                                required
                                                value={roleName}
                                                onChange={(e) => setRoleName(e.target.value)}
                                                placeholder="e.g. Administrator, Auditor, Staff"
                                                className="font-medium"
                                            />
                                            
                                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                                                <Switch 
                                                    checked={isActive} 
                                                    onChange={setIsActive} 
                                                    label="Active Status"
                                                    description="Enable this role for user assignment"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-semibold text-slate-700 ml-1">
                                                Role Description
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Briefly describe the responsibilities of this role..."
                                                rows={4}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all resize-none shadow-sm hover:border-slate-300"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Permissions Grid Section */}
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Shield className="w-5 h-5" />
                                            <h3 className="font-bold text-slate-800 tracking-tight uppercase text-xs">Module Permissions</h3>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                                            Granular Access Control
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {modules.map(moduleDef => {
                                            const mod = moduleDef.ModuleName;
                                            const oPerms = permissions[mod] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };

                                            return (
                                                <div key={mod} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                                                    <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/30 group-hover:bg-primary/5 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:border-primary/20 transition-all">
                                                                <span className="text-xl">{moduleDef.Icon || '📦'}</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 leading-tight">{moduleDef.Label}</h4>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{mod}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-5">
                                                        <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                                                            <Switch 
                                                                checked={oPerms.CanView} 
                                                                onChange={() => togglePermission(mod, 'CanView')} 
                                                                label="View"
                                                            />
                                                            <Switch 
                                                                checked={oPerms.CanAdd} 
                                                                onChange={() => togglePermission(mod, 'CanAdd')} 
                                                                label="Add"
                                                            />
                                                            <Switch 
                                                                checked={oPerms.CanEdit} 
                                                                onChange={() => togglePermission(mod, 'CanEdit')} 
                                                                label="Edit"
                                                            />
                                                            <Switch 
                                                                checked={oPerms.CanDelete} 
                                                                onChange={() => togglePermission(mod, 'CanDelete')} 
                                                                label="Delete"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {modules.length === 0 && (
                                            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                                <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                                                    <Settings className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <p className="text-slate-500 font-semibold">No modules available found</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-5 flex justify-between items-center border-t border-slate-100 bg-slate-50/80 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-all duration-200"
                    >
                        Discard Changes
                    </button>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            form="role-form"
                            disabled={saving || loading}
                            className="btn-primary min-w-[140px] gap-2 py-6 rounded-xl"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span className="font-bold">{saving ? 'Processing...' : role ? 'Save Changes' : 'Create Role'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={handleFeedbackClose}
            />
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
