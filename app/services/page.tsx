import ServiceManager from '@/components/manage/ServiceManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export default async function ServicesPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Services?.CanView) {
        return null;
    }

    const searchTerm = (searchParams.search as string) || '';
    const filterDeptId = (searchParams.department as string) || '';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '10', 10);

    const [servicesSnap, deptsSnap] = await Promise.all([
        adminDb.collection('M_Service').get(),
        adminDb.collection('M_Department').orderBy('SortOrder', 'asc').get()
    ]);

    // Parse Departments
    const allDepartments = deptsSnap.docs.map(d => {
        const data = d.data() as any;
        return {
            DepartmentID: d.id,
            ...data,
            CreatedAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
            UpdatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
        }
    }).filter(d => d.IsDeleted !== true);

    // Parse Services
    const allServices = servicesSnap.docs.map(s => {
        const data = s.data() as any;
        return {
            ServiceID: s.id,
            ...data,
            CreatedAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
            UpdatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
        }
    }).filter(s => s.IsDeleted !== true);

    const activeCount = allServices.filter(s => s.IsActive !== false).length;
    const departmentsCount = new Set(allServices.map(s => s.DepartmentID).filter(Boolean)).size;

    // Filter
    let filteredServices = allServices;
    if (filterDeptId) {
        filteredServices = filteredServices.filter(s => s.DepartmentID === filterDeptId);
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredServices = filteredServices.filter(s =>
            (s.ServiceName || '').toLowerCase().includes(term) ||
            (s.Description || '').toLowerCase().includes(term)
        );
    }

    const totalPages = Math.max(1, Math.ceil(filteredServices.length / rowsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedServices = filteredServices.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

    return (
        <SidebarLayout pageTitle="Services Management">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <ServiceManager
                    paginatedServices={paginatedServices as any}
                    totalCount={filteredServices.length}
                    activeCount={activeCount}
                    departmentsCount={departmentsCount}
                    totalPages={totalPages}
                    serverAllDepartments={allDepartments as any}
                    serverAllServices={allServices as any}
                />
            </div>
        </SidebarLayout>
    );
}
