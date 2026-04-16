import DepartmentManager from '@/components/manage/DepartmentManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Departments?.CanView) {
        return (
            <SidebarLayout pageTitle="Departments Management">
                <AccessDenied moduleName="Departments" />
            </SidebarLayout>
        );
    }

    const searchTerm = (searchParams.search as string) || '';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '5', 10);

    const departments = await prisma.m_Department.findMany({
        where: { IsDeleted: false },
        orderBy: { DepartmentName: 'asc' }
    });

    const allDepartments = departments.map(d => ({
        ...d,
        id: d.DepartmentID, // For client component compatibility
        CreatedAt: d.CreatedAt.toISOString(),
        UpdatedAt: d.UpdatedAt.toISOString(),
    }));

    const activeCount = allDepartments.filter(d => d.IsActive !== false).length;

    // Filter
    let filteredDepartments = allDepartments;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredDepartments = filteredDepartments.filter(d =>
            (d.DepartmentName || '').toLowerCase().includes(term) ||
            (d.Description || '').toLowerCase().includes(term)
        );
    }

    const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / rowsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedDepartments = filteredDepartments.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

    return (
        <SidebarLayout pageTitle="Departments Management">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <DepartmentManager
                    paginatedDepartments={paginatedDepartments as any}
                    totalCount={filteredDepartments.length}
                    activeCount={activeCount}
                    totalPages={totalPages}
                    serverAllDepartments={allDepartments as any}
                />
            </div>
        </SidebarLayout>
    );
}
