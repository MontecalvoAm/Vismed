import ServiceManager from '@/components/manage/ServiceManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function ServicesPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Services?.CanView) {
        return (
            <SidebarLayout pageTitle="Services Management">
                <AccessDenied moduleName="Services" />
            </SidebarLayout>
        );
    }

    const searchTerm = (searchParams.search as string) || '';
    const filterDeptId = (searchParams.department as string) || '';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '10', 10);

    const [services, departments] = await Promise.all([
        prisma.m_Service.findMany({ where: { IsDeleted: false } }),
        prisma.m_Department.findMany({
            where: { IsDeleted: false },
            orderBy: { DepartmentName: 'asc' }
        })
    ]);

    // Parse Departments
    const allDepartments = departments.map(d => ({
        ...d,
        id: d.DepartmentID,
        CreatedAt: d.CreatedAt.toISOString(),
        UpdatedAt: d.UpdatedAt.toISOString(),
    }));

    // Parse Services
    const allServices = services.map(s => ({
        ...s,
        id: s.ServiceID,
        Price: s.Price ? Number(s.Price) : 0,
        CreatedAt: s.CreatedAt.toISOString(),
        UpdatedAt: s.UpdatedAt.toISOString(),
    }));

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
