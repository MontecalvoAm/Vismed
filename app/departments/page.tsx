import DepartmentManager from '@/components/manage/DepartmentManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Departments?.CanView) {
        return null;
    }

    const searchTerm = (searchParams.search as string) || '';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '5', 10);

    const snap = await adminDb.collection('M_Department').orderBy('SortOrder', 'asc').get();

    // Parse
    const allDepartments = snap.docs.map(d => {
        const data = d.data() as any;
        return {
            DepartmentID: d.id,
            ...data,
            CreatedAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
            UpdatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
        };
    }).filter(d => d.IsDeleted !== true);

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
