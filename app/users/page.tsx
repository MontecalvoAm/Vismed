'use client';

import { useState, useEffect } from 'react';
import { UserRecord, getAllUsers } from '@/lib/firestore/users';
import { Role as RoleRecord, getAllRoles } from '@/lib/firestore/roles';
import UserModal from '@/components/users/UserModal';
import RoleModal from '@/components/users/RoleModal';
import SidebarLayout from '@/components/layout/SidebarLayout';
import {
    Plus, Edit2, Trash2, Shield, User as UserIcon,
    Users, ShieldCheck, CheckCircle, XCircle
} from 'lucide-react';

type ActiveTab = 'users' | 'roles';

export default function UsersPage() {
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
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    // ── Load Roles ───────────────────────────────────────────
    const loadRoles = async () => {
        setRolesLoading(true);
        try {
            const data = await getAllRoles();
            setRoles(data as RoleRecord[]);
        } catch (error) {
            console.error('Failed to load roles:', error);
        } finally {
            setRolesLoading(false);
        }
    };

    // Load both on mount; reload roles whenever the Roles tab becomes active
    useEffect(() => {
        loadUsers();
        loadRoles();
    }, []);
    useEffect(() => {
        if (activeTab === 'roles') loadRoles();
    }, [activeTab]);

    // ── User actions ─────────────────────────────────────────
    const handleAddUser = () => { setSelectedUser(null); setIsUserModalOpen(true); };
    const handleEditUser = (user: UserRecord) => { setSelectedUser(user); setIsUserModalOpen(true); };
    const handleDeleteUser = async (user: UserRecord) => {
        if (!window.confirm(`Delete user ${user.FirstName} ${user.LastName}?`)) return;
        try {
            const res = await fetch(`/api/users/${user.UserID}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete user');
            loadUsers();
        } catch (error) {
            console.error(error);
            alert('Failed to delete user');
        }
    };

    // ── Role actions ─────────────────────────────────────────
    const handleAddRole = () => { setSelectedRole(null); setIsRoleModalOpen(true); };
    const handleEditRole = (role: RoleRecord) => { setSelectedRole(role); setIsRoleModalOpen(true); };
    const handleDeleteRole = async (role: RoleRecord) => {
        if (!window.confirm(`Delete role "${role.RoleName}"? Users assigned this role will need to be updated.`)) return;
        try {
            const res = await fetch(`/api/roles/${role.RoleID}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete role');
            loadRoles();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to delete role');
        }
    };

    // ── Role name lookup ─────────────────────────────────────
    const getRoleName = (roleId: string) => {
        const found = roles.find((r) => r.RoleID === roleId);
        return found?.RoleName ?? roleId ?? 'Unknown';
    };

    const tabs = [
        { key: 'users' as ActiveTab, label: 'Users', icon: <Users className="w-4 h-4" /> },
        { key: 'roles' as ActiveTab, label: 'Roles', icon: <ShieldCheck className="w-4 h-4" /> },
    ];

    return (
        <SidebarLayout pageTitle="User Management">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage staff accounts, roles, and system access.</p>
                </div>

                {/* Tabs + Action Button row */}
                <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                    {/* Tab Switcher */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Context-aware Add button */}
                    {activeTab === 'users' ? (
                        <button
                            onClick={handleAddUser}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl shadow hover:shadow-md hover:bg-primary/90 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add User
                        </button>
                    ) : (
                        <button
                            onClick={handleAddRole}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl shadow hover:shadow-md hover:bg-primary/90 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Role
                        </button>
                    )}
                </div>

                {/* ── USERS TAB ────────────────────────────────────────── */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {usersLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                Loading users...
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                No users found. Click "Add User" to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.UserID} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                                            {user.FirstName?.charAt(0)}{user.LastName?.charAt(0)}
                                                        </div>
                                                        <span className="text-gray-900 font-medium">
                                                            {user.FirstName} {user.LastName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.Email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                        <Shield className="w-3 h-3" />
                                                        {getRoleName(user.RoleID)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.IsActive !== false
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {user.IsActive !== false
                                                            ? <><CheckCircle className="w-3 h-3" /> Active</>
                                                            : <><XCircle className="w-3 h-3" /> Inactive</>
                                                        }
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className="text-primary hover:text-primary/70 mr-4 transition"
                                                        title="Edit user"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="text-red-500 hover:text-red-600 transition"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── ROLES TAB ────────────────────────────────────────── */}
                {activeTab === 'roles' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Role Name</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {rolesLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                Loading roles...
                                            </td>
                                        </tr>
                                    ) : roles.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                No roles found. Click "Add Role" to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        roles.map((role) => (
                                            <tr key={role.RoleID} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                                                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                                                        </div>
                                                        <span className="text-gray-900 font-semibold">{role.RoleName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                                                    {role.Description || <span className="italic text-gray-300">No description</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${role.IsActive !== false
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {role.IsActive !== false
                                                            ? <><CheckCircle className="w-3 h-3" /> Active</>
                                                            : <><XCircle className="w-3 h-3" /> Inactive</>
                                                        }
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => handleEditRole(role)}
                                                        className="text-primary hover:text-primary/70 mr-4 transition"
                                                        title="Edit role"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRole(role)}
                                                        className="text-red-500 hover:text-red-600 transition"
                                                        title="Delete role"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

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
        </SidebarLayout>
    );
}
