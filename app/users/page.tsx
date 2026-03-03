'use client';

import { useState, useEffect } from 'react';
import { UserRecord, getAllUsers } from '@/lib/firestore/users';
import { Role as RoleRecord, getAllRoles } from '@/lib/firestore/roles';
import UserModal from '@/components/users/UserModal';
import RoleModal from '@/components/users/RoleModal';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useConfirm } from '@/context/ConfirmContext';
import {
    Plus, Edit2, Trash2, Shield, User as UserIcon,
    Users, ShieldCheck, CheckCircle, XCircle, Search, Filter, ChevronLeft, ChevronRight, Key
} from 'lucide-react';
import UserOverrideModal from '@/components/users/UserOverrideModal';
import { useAuth } from '@/context/AuthContext';
import { FeedbackModal } from '@/components/ui/FeedbackModal';

type ActiveTab = 'users' | 'roles';

export default function UsersPage() {
    const { confirm, alert } = useConfirm();
    const { user } = useAuth();
    const perms = user?.Permissions?.Users;
    const [activeTab, setActiveTab] = useState<ActiveTab>('users');
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    // ── Users state ──────────────────────────────────────────
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

    // Filter & Pagination state
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    // Role filtering & Search
    const [roleSearchTerm, setRoleSearchTerm] = useState('');
    const [roleCurrentPage, setRoleCurrentPage] = useState(1);
    const [roleRowsPerPage, setRoleRowsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

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
    const handleEditOverrides = (user: UserRecord) => { setSelectedUser(user); setIsOverrideModalOpen(true); };
    const handleDeleteUser = async (user: UserRecord) => {
        const isConfirmed = await confirm({
            title: 'Delete User',
            message: `Delete user ${user.FirstName} ${user.LastName}? This action cannot be undone.`,
            variant: 'danger',
            confirmText: 'Delete'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/users/${user.UserID}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete user');
            loadUsers();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'User deleted successfully.' });
        } catch (error: any) {
            console.error(error);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: error.message || 'Failed to delete user' });
        }
    };

    // ── Role actions ─────────────────────────────────────────
    const handleAddRole = () => { setSelectedRole(null); setIsRoleModalOpen(true); };
    const handleEditRole = (role: RoleRecord) => { setSelectedRole(role); setIsRoleModalOpen(true); };
    const handleDeleteRole = async (role: RoleRecord) => {
        const isConfirmed = await confirm({
            title: 'Delete Role',
            message: `Delete role "${role.RoleName}"? Users assigned this role will need to be updated.`,
            variant: 'danger',
            confirmText: 'Delete Role'
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/roles/${role.RoleID}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete role');
            loadRoles();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Role deleted successfully.' });
        } catch (error: any) {
            console.error(error);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: error.message || 'Failed to delete role' });
        }
    };

    // ── Role name lookup ─────────────────────────────────────
    const getRoleName = (roleId: string) => {
        const found = roles.find((r) => r.RoleID === roleId);
        return found?.RoleName ?? roleId ?? 'Unknown';
    };

    // ── Filtered & Paginated Users ───────────────────────────
    const filteredRoles = roles.filter(role =>
        role.RoleName.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
        role.Description.toLowerCase().includes(roleSearchTerm.toLowerCase())
    );

    const roleTotalPages = Math.max(1, Math.ceil(filteredRoles.length / roleRowsPerPage));
    useEffect(() => {
        if (roleCurrentPage > roleTotalPages) setRoleCurrentPage(roleTotalPages);
    }, [roleTotalPages, roleCurrentPage]);

    const paginatedRoles = filteredRoles.slice((roleCurrentPage - 1) * roleRowsPerPage, roleCurrentPage * roleRowsPerPage);

    const filteredUsers = users.filter((user) => {
        if (roleFilter !== 'all' && user.RoleID !== roleFilter) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
    // Ensure current page is valid after filtering or changing rows per page
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const paginatedUsers = filteredUsers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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

                {/* Tabs row */}
                <div className="mb-6">
                    {/* Tab Switcher */}
                    <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1">
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
                </div>

                {/* ── USERS TAB ────────────────────────────────────────── */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        {/* Toolbar: Filter */}
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                            <div className="relative w-full sm:w-auto">
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none w-full sm:w-auto justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Role: {roleFilter === 'all' ? 'All' : getRoleName(roleFilter)}
                                    </div>
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search roles..."
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                                    value={roleSearchTerm}
                                                    onChange={(e) => setRoleSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <ul className="max-h-60 overflow-y-auto p-1">
                                            <li>
                                                <button
                                                    onClick={() => { setRoleFilter('all'); setIsFilterOpen(false); setCurrentPage(1); }}
                                                    className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 ${roleFilter === 'all' ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'}`}
                                                >
                                                    All Roles
                                                </button>
                                            </li>
                                            {filteredRoles.map(role => (
                                                <li key={role.RoleID}>
                                                    <button
                                                        onClick={() => { setRoleFilter(role.RoleID); setIsFilterOpen(false); setCurrentPage(1); }}
                                                        className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-50 ${roleFilter === role.RoleID ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'}`}
                                                    >
                                                        {role.RoleName}
                                                    </button>
                                                </li>
                                            ))}
                                            {filteredRoles.length === 0 && (
                                                <li className="px-3 py-2 text-sm text-gray-500 text-center">No roles found</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {perms?.CanAdd && (
                                <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={handleAddUser}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" /> Add User
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Status</th>
                                        {(perms?.CanEdit || perms?.CanDelete) && (
                                            <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {usersLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                Loading users...
                                            </td>
                                        </tr>
                                    ) : paginatedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                {users.length === 0 ? 'No users found. Click "Add User" to get started.' : 'No users match the selected filters.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedUsers.map((user) => (
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
                                                {(perms?.CanEdit || perms?.CanDelete) && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        {perms?.CanEdit && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditOverrides(user)}
                                                                    className="text-amber-500 hover:text-amber-600 mr-4 transition"
                                                                    title="Custom Permissions"
                                                                >
                                                                    <Key className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditUser(user)}
                                                                    className="text-primary hover:text-primary/70 mr-4 transition"
                                                                    title="Edit user"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {perms?.CanDelete && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user)}
                                                                className="text-red-500 hover:text-red-600 transition"
                                                                title="Delete user"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Show</span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={(e) => {
                                            setRowsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-primary focus:border-primary outline-none shadow-sm"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                    <span className="text-sm text-gray-500">entries</span>
                                </div>
                                <span className="text-gray-500 text-center sm:text-left">
                                    Showing {usersLoading || filteredUsers.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
                                    {roleFilter !== 'all' && ` (filtered from ${users.length} total)`}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || usersLoading || filteredUsers.length === 0}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 font-medium text-gray-700">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || usersLoading || filteredUsers.length === 0}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ROLES TAB ────────────────────────────────────────── */}
                {activeTab === 'roles' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                            <div className="relative w-full sm:max-w-md">
                                <input
                                    type="search"
                                    placeholder="Search roles..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all text-slate-700"
                                    value={roleSearchTerm}
                                    onChange={(e) => setRoleSearchTerm(e.target.value)}
                                />
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Search className="w-4 h-4" />
                                </div>
                            </div>
                            {perms?.CanAdd && (
                                <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={handleAddRole}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 focus:ring-2 focus:ring-primary transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" /> Add Role
                                    </button>
                                </div>
                            )}
                        </div>

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
                                    ) : paginatedRoles.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                No roles found.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRoles.map((role) => (
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
                                                {(perms?.CanEdit || perms?.CanDelete) && (
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        {perms?.CanEdit && (
                                                            <button
                                                                onClick={() => handleEditRole(role)}
                                                                className="text-primary hover:text-primary/70 mr-4 transition"
                                                                title="Edit role"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {perms?.CanDelete && (
                                                            <button
                                                                onClick={() => handleDeleteRole(role)}
                                                                className="text-red-500 hover:text-red-600 transition"
                                                                title="Delete role"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Show</span>
                                    <select
                                        value={roleRowsPerPage}
                                        onChange={(e) => {
                                            setRoleRowsPerPage(Number(e.target.value));
                                            setRoleCurrentPage(1);
                                        }}
                                        className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-primary focus:border-primary outline-none shadow-sm"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                    <span className="text-sm text-gray-500">entries</span>
                                </div>
                                <span className="text-gray-500 text-center sm:text-left">
                                    Showing {rolesLoading || filteredRoles.length === 0 ? 0 : (roleCurrentPage - 1) * roleRowsPerPage + 1} to {Math.min(roleCurrentPage * roleRowsPerPage, filteredRoles.length)} of {filteredRoles.length} entries
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setRoleCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={roleCurrentPage === 1 || rolesLoading || filteredRoles.length === 0}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 font-medium text-gray-700">
                                    Page {roleCurrentPage} of {roleTotalPages}
                                </span>
                                <button
                                    onClick={() => setRoleCurrentPage(p => Math.min(roleTotalPages, p + 1))}
                                    disabled={roleCurrentPage === roleTotalPages || rolesLoading || filteredRoles.length === 0}
                                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
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
            <UserOverrideModal
                isOpen={isOverrideModalOpen}
                onClose={() => setIsOverrideModalOpen(false)}
                user={selectedUser}
            />
            <RoleModal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                role={selectedRole}
                onSave={loadRoles}
                existingRoles={roles}
            />

            <FeedbackModal
                isOpen={feedback.isOpen}
                type={feedback.type}
                title={feedback.title}
                message={feedback.message}
                onClose={() => setFeedback(f => ({ ...f, isOpen: false }))}
            />
        </SidebarLayout >
    );
}
