import { getServerUser } from '@/lib/getServerUser';
import UsersPageView from './UsersPageView';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';
import SidebarLayout from '@/components/layout/SidebarLayout';

export const dynamic = 'force-dynamic';

export default async function UsersPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Users?.CanView) {
        return (
            <SidebarLayout pageTitle="Users Management">
                <AccessDenied moduleName="Users" />
            </SidebarLayout>
        );
    }

    // Parse Search Params
    const tab = (searchParams.tab as string) || 'users';

    // User Filters
    const userSearchTerm = (searchParams.search as string) || '';
    const roleFilter = (searchParams.role as string) || 'all';
    const statusFilter = (searchParams.status as string) || 'all';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '10', 10);

    // Role Filters
    const roleSearchTerm = (searchParams.rsearch as string) || '';
    const roleCurrentPage = parseInt((searchParams.rpage as string) || '1', 10);
    const roleRowsPerPage = parseInt((searchParams.rlimit as string) || '10', 10);

    // Fetch Roles (always needed for the filter dropdown)
    const roles = await prisma.m_Role.findMany({
        where: { IsActive: true }
    });

    const allRoles = roles.map(r => ({
        ...r,
        id: r.RoleID,
        CreatedAt: r.CreatedAt.toISOString(),
        UpdatedAt: r.UpdatedAt.toISOString(),
    }));

    // Fetch Users (if users tab)
    let initialUsers: any[] = [];
    if (tab === 'users' || tab === undefined) {
        const users = await prisma.m_User.findMany({
            where: { IsDeleted: false }
        });

        initialUsers = users.map(u => ({
            ...u,
            id: u.UserID,
            CreatedAt: u.CreatedAt.toISOString(),
            UpdatedAt: u.UpdatedAt.toISOString(),
        }));
    }

    // Filter Users in JS
    const filteredUsers = initialUsers.filter((user) => {
        if (roleFilter !== 'all' && user.RoleID !== roleFilter) return false;

        if (statusFilter !== 'all') {
            const isActiveFilter = statusFilter === 'active';
            const isUserActive = user.IsActive !== false;
            if (isUserActive !== isActiveFilter) return false;
        }

        if (userSearchTerm.trim() !== '') {
            const term = userSearchTerm.toLowerCase();
            const fullName = `${user.FirstName} ${user.LastName}`.toLowerCase();
            if (!fullName.includes(term) && !(user.Email || '').toLowerCase().includes(term)) {
                return false;
            }
        }
        return true;
    });

    const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
    const safeCurrentPage = Math.min(currentPage, userTotalPages);
    const paginatedUsers = filteredUsers.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

    // Filter Roles in JS
    const filteredRoles = allRoles.filter((role) => {
        if (roleSearchTerm.trim() !== '') {
            const term = roleSearchTerm.toLowerCase();
            if (!role.RoleName.toLowerCase().includes(term) && !(role.Description || '').toLowerCase().includes(term)) {
                return false;
            }
        }
        return true;
    });

    const roleTotalPagesCalc = Math.max(1, Math.ceil(filteredRoles.length / roleRowsPerPage));
    const safeRoleCurrentPage = Math.min(roleCurrentPage, roleTotalPagesCalc);
    const paginatedRoles = filteredRoles.slice((safeRoleCurrentPage - 1) * roleRowsPerPage, safeRoleCurrentPage * roleRowsPerPage);

    return (
        <UsersPageView
            paginatedUsers={paginatedUsers}
            filteredUsersCount={filteredUsers.length}
            totalUsersCount={initialUsers.length}
            totalPages={userTotalPages}

            paginatedRoles={paginatedRoles}
            filteredRolesCount={filteredRoles.length}
            roleTotalPages={roleTotalPagesCalc}

            allRoles={allRoles as any}
            perms={(serverUser as any)?.Permissions?.Users}
        />
    );
}
