'use client';

// ============================================================
//  VisayasMed — User Manager (embedded in main quotation layout)
//  Tabs: Users | Roles
//  RBAC-gated per permissions.Users
// ============================================================

import { useEffect, useState } from 'react';
import {
    Loader2, ShieldCheck, Plus, Edit2, Trash2,
    Users, CheckCircle, XCircle
} from 'lucide-react';
import { getAllUsers, type UserRecord } from '@/lib/firestore/users';
import { useAuth } from '@/context/AuthContext';
import AccessDenied from '@/components/AccessDenied';
import UserModal from '@/components/users/UserModal';
import RoleModal, { type RoleRecord } from '@/components/users/RoleModal';

type ActiveTab = 'users' | 'roles';

export default function UserManager() {
    const { user } = useAuth();
    const perms = user?.Permissions?.Users;

    const [activeTab, setActiveTab] = useState<ActiveTab>('users');

    // ── Users state ──────────────────────────────────────────
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

    // ── Roles state ──────────────────────────────────────────
    const [roles, setRoles] = useState<RoleRecord[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);

    // ── Load Users ───────────────────────────────────────────
    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setUsersLoading(false);
        }
    };

    // ── Load Roles ───────────────────────────────────────────
    const loadRoles = async () => {
        setRolesLoading(true);
        try {
            const res = await fetch('/api/roles');
            const data = await res.json();
            if (data.success) setRoles(data.roles as RoleRecord[]);
        } catch (err) {
            console.error('Failed to load roles:', err);
        } finally {
            setRolesLoading(false);
        }
    };

    useEffect(() => { loadUsers(); loadRoles(); }, []);

    // ── RBAC guard ───────────────────────────────────────────
    if (!perms?.CanView) return <AccessDenied moduleName="Users" />;

    // ── User actions ─────────────────────────────────────────
    const handleAddUser = () => { setSelectedUser(null); setIsUserModalOpen(true); };
    const handleEditUser = (u: UserRecord) => { setSelectedUser(u); setIsUserModalOpen(true); };
    const handleDeleteUser = async (u: UserRecord) => {
        if (!window.confirm(`Delete user ${u.FirstName} ${u.LastName}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/users/${u.UserID}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete user');
            loadUsers();
        } catch (err: any) {
            alert(err.message || 'Failed to delete user');
        }
    };

    // ── Role actions ─────────────────────────────────────────
    const handleAddRole = () => { setSelectedRole(null); setIsRoleModalOpen(true); };
    const handleEditRole = (r: RoleRecord) => { setSelectedRole(r); setIsRoleModalOpen(true); };
    const handleDeleteRole = async (r: RoleRecord) => {
        if (!window.confirm(`Delete role "${r.RoleName}"? Users assigned this role will need to be updated.`)) return;
        try {
            const res = await fetch(`/api/roles/${r.RoleID}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete role');
            loadRoles();
        } catch (err: any) {
            alert(err.message || 'Failed to delete role');
        }
    };

    const roleName = (id: string) => roles.find((r) => r.RoleID === id)?.RoleName ?? id;

    const tabs = [
        { key: 'users' as ActiveTab, label: 'Users', icon: <Users className="w-4 h-4" /> },
        { key: 'roles' as ActiveTab, label: 'Roles', icon: <ShieldCheck className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-5">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Tab bar */}
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                    ? 'bg-brand-muted-blue text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Context-aware Add button — only for permitted users */}
                {activeTab === 'users' && perms?.CanAdd && (
                    <button
                        onClick={handleAddUser}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-muted-blue text-white text-sm font-semibold rounded-xl shadow hover:opacity-90 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                )}
                {activeTab === 'roles' && perms?.CanAdd && (
                    <button
                        onClick={handleAddRole}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-muted-blue text-white text-sm font-semibold rounded-xl shadow hover:opacity-90 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Role
                    </button>
                )}
            </div>

            {/* ── USERS TAB ─────────────────────────────────────── */}
            {activeTab === 'users' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {usersLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading users...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Name</th>
                                        <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Email</th>
                                        <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Role</th>
                                        <th className="px-5 py-3.5 text-center font-semibold text-slate-600">Status</th>
                                        {(perms?.CanEdit || perms?.CanDelete) && (
                                            <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                                                No users found. Click "Add User" to create one.
                                            </td>
                                        </tr>
                                    ) : users.map((u) => (
                                        <tr key={u.UserID} className={`hover:bg-slate-50 transition-colors ${!u.IsActive ? 'opacity-60' : ''}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-brand-muted-blue/10 flex items-center justify-center text-brand-muted-blue text-xs font-bold shrink-0">
                                                        {u.FirstName?.charAt(0)}{u.LastName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-800">{u.FirstName} {u.LastName}</div>
                                                        <div className="text-xs text-slate-400 md:hidden">{u.Email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{u.Email}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-muted-blue/10 text-brand-muted-blue text-xs font-semibold">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    {roleName(u.RoleID)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${u.IsActive !== false
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {u.IsActive !== false
                                                        ? <><CheckCircle className="w-3 h-3" /> Active</>
                                                        : <><XCircle className="w-3 h-3" /> Inactive</>
                                                    }
                                                </span>
                                            </td>
                                            {(perms?.CanEdit || perms?.CanDelete) && (
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    {perms?.CanEdit && (
                                                        <button
                                                            onClick={() => handleEditUser(u)}
                                                            className="text-brand-muted-blue hover:text-brand-dark-blue mr-4 transition"
                                                            title="Edit user"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {perms?.CanDelete && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u)}
                                                            className="text-red-400 hover:text-red-600 transition"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── ROLES TAB ─────────────────────────────────────── */}
            {activeTab === 'roles' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {rolesLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading roles...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left font-semibold text-slate-600">Role Name</th>
                                        <th className="px-5 py-3.5 text-left font-semibold text-slate-600 hidden md:table-cell">Description</th>
                                        <th className="px-5 py-3.5 text-center font-semibold text-slate-600">Status</th>
                                        {(perms?.CanEdit || perms?.CanDelete) && (
                                            <th className="px-5 py-3.5 text-right font-semibold text-slate-600">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {roles.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                                                No roles found. Click "Add Role" to create one.
                                            </td>
                                        </tr>
                                    ) : roles.map((r) => (
                                        <tr key={r.RoleID} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                                                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <span className="font-semibold text-slate-800">{r.RoleName}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell max-w-xs truncate">
                                                {r.Description || <span className="italic text-slate-300">No description</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${r.IsActive !== false
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {r.IsActive !== false
                                                        ? <><CheckCircle className="w-3 h-3" /> Active</>
                                                        : <><XCircle className="w-3 h-3" /> Inactive</>
                                                    }
                                                </span>
                                            </td>
                                            {(perms?.CanEdit || perms?.CanDelete) && (
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    {perms?.CanEdit && (
                                                        <button
                                                            onClick={() => handleEditRole(r)}
                                                            className="text-brand-muted-blue hover:text-brand-dark-blue mr-4 transition"
                                                            title="Edit role"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {perms?.CanDelete && (
                                                        <button
                                                            onClick={() => handleDeleteRole(r)}
                                                            className="text-red-400 hover:text-red-600 transition"
                                                            title="Delete role"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <UserModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                user={selectedUser}
                onSave={loadUsers}
            />
            <RoleModal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                role={selectedRole}
                onSave={loadRoles}
            />
        </div>
    );
}
