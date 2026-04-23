import { getServerUser } from '@/lib/getServerUser';
import ReportsPageView from './ReportsPageView';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { paginate } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export default async function ReportsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Reports?.CanView) {
        return (
            <SidebarLayout pageTitle="Reports">
                <AccessDenied moduleName="Reports" />
            </SidebarLayout>
        );
    }

    // Filters from URL
    const searchTerm = (searchParams.search as string) || '';
    const statusFilter = (searchParams.status as string) || 'all';
    const dateFrom = (searchParams.from as string) || '';
    const dateTo = (searchParams.to as string) || '';
    const guarantorFilter = (searchParams.guarantor as string) || 'all';
    const page = (searchParams.page as string) || '1';
    const limit = (searchParams.limit as string) || '10';

    // Build Where Clause
    const where: any = { IsDeleted: false };

    if (searchTerm) {
        where.OR = [
            { CustomerName: { contains: searchTerm } },
            { CustomerFirstName: { contains: searchTerm } },
            { CustomerLastName: { contains: searchTerm } },
            { DocumentNo: { contains: searchTerm } },
            { GuarantorName: { contains: searchTerm } },
        ];
    }

    if (statusFilter !== 'all') {
        where.Status = statusFilter;
    }

    if (dateFrom || dateTo) {
        where.CreatedAt = {};
        if (dateFrom) where.CreatedAt.gte = new Date(dateFrom);
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            where.CreatedAt.lte = toDate;
        }
    }

    if (guarantorFilter !== 'all') {
        where.GuarantorName = guarantorFilter;
    }
    
    // Auth-based Department Filter
    const isSuperAdmin = (serverUser as any)?.RoleName === 'Super Admin';
    const userDeptId = (serverUser as any)?.DepartmentID;

    if (!isSuperAdmin) {
        if (userDeptId) {
            // Filter by Dept OR their own old creations
            where.OR = [
                ...(where.OR || []),
                { DepartmentID: userDeptId },
                { 
                    AND: [
                        { DepartmentID: null },
                        { CreatedBy: (serverUser as any).UserID }
                    ]
                }
            ];
        } else {
            // No department and not admin -> restricted to only their own creations if any
            where.CreatedBy = (serverUser as any).UserID || 'RESTRICTED_NONE';
        }
    }

    // Fetch Paginated Data & Stats in parallel
    const [paginatedResult, guarantors, stats] = await Promise.all([
        paginate(prisma.t_Quotation, { page, pageSize: limit, orderBy: 'CreatedAt', orderDir: 'desc' }, where, { Items: true }),
        prisma.t_Guarantor.findMany({ where: { IsDeleted: false } }),
        prisma.t_Quotation.groupBy({
            by: ['Status'],
            where,
            _count: true
        })
    ]);

    const quotations = paginatedResult.data.map((q: any) => ({
        ...q,
        id: q.QuotationID,
        Subtotal: q.Subtotal ? Number(q.Subtotal) : 0,
        Vat: q.Vat ? Number(q.Vat) : 0,
        Total: q.Total ? Number(q.Total) : 0,
        Items: (q.Items || []).map((item: any) => ({
            ...item,
            Price: item.Price ? Number(item.Price) : 0
        })),
        CreatedAt: q.CreatedAt.toISOString(),
        UpdatedAt: q.UpdatedAt.toISOString(),
    }));

    const initialGuarantors = guarantors.map((g: any) => ({
        ...g,
        id: g.GuarantorID,
        DiscountAmount: g.DiscountAmount ? Number(g.DiscountAmount) : null,
        DiscountPercentage: g.DiscountPercentage ? Number(g.DiscountPercentage) : null,
        CreatedAt: g.CreatedAt.toISOString(),
        UpdatedAt: g.UpdatedAt.toISOString(),
    }));

    // Extract dynamic statuses (we can use a static list or fetch separately, but let's keep it simple)
    const dynamicStatuses = ['Completed', 'Generated', 'Incomplete', 'Paid', 'Waiting for Approval'];

    // Map stats counts
    const getCount = (status: string) => stats.find(s => s.Status === status)?._count || 0;
    
    return (
        <ReportsPageView
            paginatedQuotations={quotations as any}
            totalQuotationsCount={paginatedResult.meta.totalItems} // Note: This is total for the FILTERED set in current UI context or overall?
            completeQuotationsCount={getCount('Completed')}
            incompleteQuotationsCount={getCount('Incomplete')}
            waitingQuotationsCount={getCount('Waiting for Approval')}
            filteredQuotationsCount={paginatedResult.meta.totalItems}
            totalPages={paginatedResult.meta.totalPages}
            guarantors={initialGuarantors as any}
            dynamicStatuses={dynamicStatuses}
        />
    );
}
