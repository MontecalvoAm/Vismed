'use client';

import { useState } from 'react';
import { UserRecord } from '@/lib/firestore/users';
import { Role as RoleRecord } from '@/lib/firestore/roles';
import UserModal from '@/components/users/UserModal';
import RoleModal from '@/components/users/RoleModal';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useConfirm } from '@/context/ConfirmContext';
import {
    Plus, Edit2, Trash2, Shield,
    Users, ShieldCheck, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight, Key, ChevronDown
} from 'lucide-react';
import UserOverrideModal from '@/components/users/UserOverrideModal';
import { useAuth } from '@/context/AuthContext';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import UsersFilter from '@/components/users/UsersFilter';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface UsersPageViewProps {
    paginatedUsers: UserRecord[];
    filteredUsersCount: number;
    totalUsersCount: number;
    totalPages: number;

    paginatedRoles: RoleRecord[];
    filteredRolesCount: number;
    roleTotalPages: number;

    allRoles: RoleRecord[];
    allDepartments: any[];
    perms: any;
}

export default function UsersPageView({
    paginatedUsers,
    filteredUsersCount,
    totalUsersCount,
    totalPages,
    paginatedRoles,
    filteredRolesCount,
    roleTotalPages,
    allRoles,
    allDepartments,
    perms
}: UsersPageViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { confirm } = useConfirm();

    const activeTab = searchParams.get('tab') || 'users';

    // User Filters
    const userSearchTerm = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const rowsPerPage = parseInt(searchParams.get('limit') || '10', 10);

    const roleSearchTerm = searchParams.get('rsearch') || '';
    const roleStatusFilter = searchParams.get('rstatus') || 'all';
    const roleCurrentPage = parseInt(searchParams.get('rpage') || '1', 10);
    const roleRowsPerPage = parseInt(searchParams.get('rlimit') || '10', 10);

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);
    const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
        isOpen: false, type: 'success', title: '', message: ''
    });

    const updateQuery = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, val]) => {
            if (val === null) params.delete(key);
            else params.set(key, val);
        });
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

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
            router.refresh(); // Refresh Server Component!
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'User deleted successfully.' });
        } catch (error: any) {
            console.error(error);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: error.message || 'Failed to delete user' });
        }
    };

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
            router.refresh();
            setFeedback({ isOpen: true, type: 'success', title: 'Deleted', message: 'Role deleted successfully.' });
        } catch (error: any) {
            console.error(error);
            setFeedback({ isOpen: true, type: 'error', title: 'Error', message: error.message || 'Failed to delete role' });
        }
    };

    const getRoleName = (roleId: string) => {
        const found = allRoles.find((r) => r.RoleID === roleId);
        return found?.RoleName ?? roleId ?? 'Unknown';
    };

    const tabs = [
        { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
        { key: 'roles', label: 'Roles', icon: <ShieldCheck className="w-4 h-4" /> },
    ];

    let queryTimeout: NodeJS.Timeout;
    const debouncedSearch = (val: string, key: 'search' | 'rsearch', pageKey: 'page' | 'rpage') => {
        // Optimistically update the UI if needed, but for now just use standard timeout
        clearTimeout(queryTimeout);
        queryTimeout = setTimeout(() => {
            updateQuery({ [key]: val || null, [pageKey]: '1' });
        }, 300);
    };

    return (
        <SidebarLayout pageTitle="User Management">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-gray-500 mt-1">Manage staff accounts, roles, and system access.</p>
                </div>

                <div className="mb-6">
                    <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => updateQuery({ tab: tab.key, page: '1', rpage: '1' })}
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

                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <UsersFilter
                            searchTerm={userSearchTerm}
                            onSearchChange={(v) => {
                                updateQuery({ search: v || null, page: '1' });
                            }}
                            roleFilter={roleFilter}
                            onRoleChange={(v) => updateQuery({ role: v === 'all' ? null : v, page: '1' })}
                            availableRoles={allRoles.map(r => ({ id: r.RoleID, name: r.RoleName }))}
                            statusFilter={statusFilter}
                            onStatusChange={(v) => updateQuery({ status: v === 'all' ? null : v, page: '1' })}
                        >
                            {perms?.CanAdd && (
                                <button
                                    onClick={handleAddUser}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:outline-none transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm"
                                >
                                    <Plus className="w-4 h-4" /> Add User
                                </button>
                            )}
                        </UsersFilter>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50/80">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Name</th>
                                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Email</th>
                                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Department</th>
                                            <th className="px-6 py-4 text-left font-semibold text-gray-600 tracking-wider">Status</th>
                                            {(perms?.CanEdit || perms?.CanDelete) && (
                                                <th className="px-6 py-4 text-right font-semibold text-gray-600 tracking-wider">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {paginatedUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                    No users match the selected filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedUsers.map((user) => (
                                                <tr key={user.UserID} className="odd:bg-white even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
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
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.Department?.DepartmentName ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {user.Department?.DepartmentName || (getRoleName(user.RoleID) === 'Super Admin' ? 'Management' : 'None')}
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

                            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white">
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Show</span>
                                        <select
                                            value={rowsPerPage}
                                            onChange={(e) => updateQuery({ limit: e.target.value, page: '1' })}
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
                                        Showing {filteredUsersCount === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredUsersCount)} of {filteredUsersCount} entries
                                        {roleFilter !== 'all' && ` (filtered from ${totalUsersCount} total)`}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQuery({ page: String(Math.max(1, currentPage - 1)) })}
                                        disabled={currentPage === 1 || filteredUsersCount === 0}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 py-1 font-medium text-gray-700">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => updateQuery({ page: String(Math.min(totalPages, currentPage + 1)) })}
                                        disabled={currentPage === totalPages || filteredUsersCount === 0}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="space-y-4">
                        <div className="bg-white py-2 px-4 rounded-xl shadow-sm border border-gray-200 w-full hover:border-gray-300 transition-colors">
                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                                <div className="relative flex-1 w-full">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search roles..."
                                        className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-primary focus:border-primary focus:outline-none transition-colors shadow-sm"
                                        value={roleSearchTerm}
                                        onChange={(e) => updateQuery({ rsearch: e.target.value || null, rpage: '1' })}
                                    />
                                </div>
                                <div className="w-full sm:w-52">
                                    <SearchableSelect
                                        options={[
                                            { id: 'all', name: 'All Statuses' },
                                            { id: 'active', name: 'Active' },
                                            { id: 'inactive', name: 'Inactive' }
                                        ]}
                                        value={roleStatusFilter}
                                        onChange={(v) => updateQuery({ rstatus: v === 'all' ? null : v, rpage: '1' })}
                                        placeholder="Select Status"
                                        displayKey="name"
                                        valueKey="id"
                                    />
                                </div>
                                {perms?.CanAdd && (
                                    <div className="w-full sm:w-auto flex justify-end shrink-0 ml-auto">
                                        <button
                                            onClick={handleAddRole}
                                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:outline-none transition-all active:scale-[0.98] text-sm whitespace-nowrap shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" /> Add Role
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
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
                                        {paginatedRoles.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                    No roles found.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedRoles.map((role) => (
                                                <tr key={role.RoleID} className="odd:bg-white even:bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
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

                            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-white">
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Show</span>
                                        <select
                                            value={roleRowsPerPage}
                                            onChange={(e) => updateQuery({ rlimit: e.target.value, rpage: '1' })}
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
                                        Showing {filteredRolesCount === 0 ? 0 : ((roleCurrentPage - 1) * roleRowsPerPage) + 1} to {Math.min(roleCurrentPage * roleRowsPerPage, filteredRolesCount)} of {filteredRolesCount} entries
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQuery({ rpage: String(Math.max(1, roleCurrentPage - 1)) })}
                                        disabled={roleCurrentPage === 1 || filteredRolesCount === 0}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 py-1 font-medium text-gray-700">
                                        Page {roleCurrentPage} of {roleTotalPages}
                                    </span>
                                    <button
                                        onClick={() => updateQuery({ rpage: String(Math.min(roleTotalPages, roleCurrentPage + 1)) })}
                                        disabled={roleCurrentPage === roleTotalPages || filteredRolesCount === 0}
                                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={selectedUser} onSave={() => router.refresh()} allRoles={allRoles} allDepartments={allDepartments} />
            <UserOverrideModal isOpen={isOverrideModalOpen} onClose={() => setIsOverrideModalOpen(false)} user={selectedUser} />
            <RoleModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} role={selectedRole} onSave={() => router.refresh()} existingRoles={allRoles} />
            <FeedbackModal isOpen={feedback.isOpen} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback(f => ({ ...f, isOpen: false }))} />
        </SidebarLayout>
    );
}
