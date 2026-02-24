'use client';

// ============================================================
//  VisayasMed — User Manager
//  RBAC-gated per permissions.Users
//  Allows role assignment and user deactivation
// ============================================================

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { getAllUsers, updateUserRole, setUserActiveStatus, type UserRecord } from '@/lib/firestore/users';
import { getRoles, type Role } from '@/lib/firestore/roles';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/AccessDenied';

export default function UserManager() {
    const { user } = useAuth();
    const perms = user?.Permissions?.Users;

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // saving userID

    const load = async () => {
        setLoading(true);
        try {
            const [u, r] = await Promise.all([getAllUsers(), getRoles()]);
            setUsers(u);
            setRoles(r);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    if (!perms?.CanView) return <AccessDenied moduleName="Users" />;

    const roleName = (id: string) => roles.find(r => r.RoleID === id)?.RoleName ?? id;
    const byLine = `${user?.FirstName} ${user?.LastName}`;

    const handleRoleChange = async (UserID: string, RoleID: string) => {
        setSaving(UserID);
        try { await updateUserRole(UserID, RoleID, byLine); await load(); }
        finally { setSaving(null); }
    };

    const handleToggleActive = async (u: UserRecord) => {
        setSaving(u.UserID);
        try { await setUserActiveStatus(u.UserID, !u.IsActive, byLine); await load(); }
        finally { setSaving(null); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Users</h3>
            </div>
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading...</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Name</th>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Email</th>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Role</th>
                                <th className="px-5 py-3.5 text-center font-semibold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.length === 0 ? (
                                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No users found.</td></tr>
                            ) : users.map((u) => (
                                <tr key={u.UserID} className={`hover:bg-slate-50 transition-colors ${!u.IsActive ? 'opacity-50' : ''}`}>
                                    <td className="px-5 py-3.5">
                                        <div className="font-semibold text-slate-800">{u.FirstName} {u.LastName}</div>
                                        <div className="text-xs text-slate-400 md:hidden">{u.Email}</div>
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{u.Email}</td>
                                    <td className="px-5 py-3.5">
                                        {perms?.CanEdit ? (
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                                                <select
                                                    className="border border-slate-200 rounded-xl px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
                                                    value={u.RoleID}
                                                    onChange={e => handleRoleChange(u.UserID, e.target.value)}
                                                    disabled={saving === u.UserID}
                                                >
                                                    {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
                                                </select>
                                                {saving === u.UserID && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                                <ShieldCheck className="w-3.5 h-3.5" />{roleName(u.RoleID)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        {perms?.CanEdit ? (
                                            <button
                                                onClick={() => handleToggleActive(u)}
                                                disabled={saving === u.UserID}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${u.IsActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {u.IsActive ? 'Active' : 'Inactive'}
                                            </button>
                                        ) : (
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${u.IsActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {u.IsActive ? 'Active' : 'Inactive'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
