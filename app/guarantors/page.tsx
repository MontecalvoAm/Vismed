import GuarantorManager from '@/components/manage/GuarantorManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function GuarantorsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    // Permissions check
    if (!(serverUser as any)?.Permissions?.Guarantors?.CanView) {
        return (
            <SidebarLayout pageTitle="Guarantors Management">
                <AccessDenied moduleName="Guarantors" />
            </SidebarLayout>
        );
    }

    const searchTerm = (searchParams.search as string) || '';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '5', 10);

    const guarantors = await (prisma as any).t_Guarantor.findMany({
        where: { IsDeleted: false },
        orderBy: { CreatedAt: 'desc' }
    });

    // Parse Guarantors
    const allGuarantors = guarantors.map(g => {
        return {
            ...g,
            id: g.GuarantorID, // For client component compatibility
            DiscountAmount: g.DiscountAmount ? Number(g.DiscountAmount) : null,
            DiscountPercentage: g.DiscountPercentage ? Number(g.DiscountPercentage) : null,
            CreatedAt: g.CreatedAt.toISOString(),
            UpdatedAt: g.UpdatedAt.toISOString(),
        }
    });

    // Filter
    let filteredGuarantors = allGuarantors;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredGuarantors = filteredGuarantors.filter(d =>
            (d.Name || '').toLowerCase().includes(term) ||
            (d.Description || '').toLowerCase().includes(term)
        );
    }

    const totalPages = Math.max(1, Math.ceil(filteredGuarantors.length / rowsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedGuarantors = filteredGuarantors.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

    return (
        <SidebarLayout pageTitle="Guarantors Management">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <GuarantorManager
                    paginatedGuarantors={paginatedGuarantors as any}
                    totalCount={filteredGuarantors.length}
                    totalPages={totalPages}
                    serverAllGuarantors={allGuarantors as any}
                />
            </div>
        </SidebarLayout>
    );
}
