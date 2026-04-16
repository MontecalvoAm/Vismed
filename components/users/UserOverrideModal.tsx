import { useState, useEffect } from 'react';
import { UserRecord } from '@/lib/firestore/users';
import { Loader2 } from 'lucide-react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

interface UserOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserRecord | null;
}

export type ModulePermissions = {
    CanView: boolean;
    CanAdd: boolean;
    CanEdit: boolean;
    CanDelete: boolean;
};

interface AppModule {
    ModuleID: string;
    ModuleName: string;
    Label: string;
    Path: string;
    Icon: string;
    SortOrder: number;
    IsActive: boolean;
}

export default function UserOverrideModal({ isOpen, onClose, user }: UserOverrideModalProps) {
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

    const [rolePerms, setRolePerms] = useState<Record<string, ModulePermissions>>({});
    const [overrides, setOverrides] = useState<Record<string, ModulePermissions>>({});
    // Track which modules have specific overrides active (so we know whether to render the override or the default)
    const [activeOverrides, setActiveOverrides] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isOpen || !user) return;

        let isMounted = true;
        setLoading(true);
        setError('');

        Promise.all([
            fetch(`/api/modules`).then(r => r.json()),
            fetch(`/api/users/${user.UserID}/overrides`).then(r => r.json())
        ])
            .then(([modData, permData]) => {
                if (!isMounted) return;
                if (!modData.success) throw new Error(modData.error || 'Failed to load modules');
                if (!permData.success) throw new Error(permData.error || 'Failed to load permissions');

                setModules(modData.modules || []);
                setRolePerms(permData.rolePerms || {});

                const ov: Record<string, ModulePermissions> = {};
                const active: Record<string, boolean> = {};

                // Initialize state with fetched overrides
                Object.keys(permData.overrides || {}).forEach(mod => {
                    ov[mod] = permData.overrides[mod];
                    active[mod] = true;
                });

                setOverrides(ov);
                setActiveOverrides(active);
            })
            .catch(err => {
                if (isMounted) setError(err.message || 'Failed to load data');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const handleSave = async () => {
        setSaving(true);
        setError('');

        try {
            // Only submit overrides that are currently active
            const finalOverrides: Record<string, ModulePermissions> = {};
            modules.forEach(m => {
                const mod = m.ModuleName;
                if (activeOverrides[mod]) {
                    finalOverrides[mod] = overrides[mod] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };
                }
            });

            const res = await fetch(`/api/users/${user.UserID}/overrides`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overrides: finalOverrides })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            setFeedback({ isOpen: true, type: 'success', title: 'Success', message: 'Overrides saved successfully.' });
        } catch (err: any) {
            setError(err.message || 'Failed to save overrides');
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message || 'Failed to save overrides.' });
        } finally {
            setSaving(false);
        }
    };

    const handleFeedbackClose = () => {
        setFeedback(f => ({ ...f, isOpen: false }));
        if (feedback.type === 'success') {
            onClose();
        }
    };

    // Toggle whether a module has an override or uses the role default
    const toggleOverrideActive = (moduleName: string) => {
        setActiveOverrides(prev => {
            const next = { ...prev, [moduleName]: !prev[moduleName] };

            // If turning on override for the first time, clone the role defaults so it's a smooth transition
            if (next[moduleName] && !overrides[moduleName]) {
                const rp = rolePerms[moduleName] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };
                setOverrides(o => ({ ...o, [moduleName]: { ...rp } }));
            }
            return next;
        });
    };

    // Toggle a specific permission bit for a module
    const togglePermission = (moduleName: string, perm: keyof ModulePermissions) => {
        setOverrides(prev => {
            const current = prev[moduleName] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };
            return {
                ...prev,
                [moduleName]: { ...current, [perm]: !current[perm] }
            };
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300 md:pl-64">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Custom Permissions
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            User: <span className="font-semibold text-gray-700">{user.FirstName} {user.LastName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 mb-4">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            Loading role permissions...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-600">
                                This user normally inherits permissions from their assigned role.
                                You can activate a <b>Custom Override</b> for specific modules to explicitly grant or deny access, overriding the role default.
                            </p>

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3">Module</th>
                                            <th className="px-4 py-3 text-center">Use Override</th>
                                            <th className="px-4 py-3 text-center">Can View</th>
                                            <th className="px-4 py-3 text-center">Can Add</th>
                                            <th className="px-4 py-3 text-center">Can Edit</th>
                                            <th className="px-4 py-3 text-center">Can Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {modules.map(moduleDef => {
                                            const mod = moduleDef.ModuleName;
                                            const isActive = !!activeOverrides[mod];
                                            const rPerms = rolePerms[mod] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };
                                            const oPerms = overrides[mod] || { CanView: false, CanAdd: false, CanEdit: false, CanDelete: false };

                                            // The effective permissions are the overrides if active, else the role defaults
                                            const effective = isActive ? oPerms : rPerms;

                                            return (
                                                <tr key={mod} className={`odd:bg-white even:bg-gray-50/50 transition-colors ${isActive ? 'bg-blue-50/30' : 'hover:bg-gray-100/50'}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-800">{moduleDef.Label}</div>
                                                        <div className="text-[10px] text-gray-400 font-mono tracking-tight">{mod}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <label className="inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={isActive}
                                                                onChange={() => toggleOverrideActive(mod)}
                                                            />
                                                            <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                                        </label>
                                                    </td>
                                                    {(['CanView', 'CanAdd', 'CanEdit', 'CanDelete'] as const).map(perm => (
                                                        <td key={perm} className="px-4 py-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                disabled={!isActive}
                                                                checked={effective[perm]}
                                                                onChange={() => togglePermission(mod, perm)}
                                                                className={`w-4 h-4 rounded border-gray-300 
                                                                    ${isActive ? 'text-primary focus:ring-primary cursor-pointer' : 'text-gray-300 bg-gray-100 cursor-not-allowed opacity-50'}
                                                                `}
                                                                title={!isActive ? 'Inherited from Role. Enable Override to edit.' : ''}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

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
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm disabled:opacity-60 flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? 'Saving...' : 'Save Permissions'}
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
