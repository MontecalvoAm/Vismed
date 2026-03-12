import { getServerUser } from '@/lib/getServerUser';
import ReportsPageView from './ReportsPageView';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';
import SidebarLayout from '@/components/layout/SidebarLayout';

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
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '10', 10);

    // Fetch all quotations and guarantors
    const [quotations, guarantors] = await Promise.all([
        (prisma as any).t_Quotation.findMany({
            where: { IsDeleted: false },
            include: { Items: true },
            orderBy: { CreatedAt: 'desc' }
        }),
        (prisma as any).t_Guarantor.findMany({
            where: { IsDeleted: false }
        })
    ]);

    const allQuotations = quotations.map((q: any) => ({
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

    const dynamicStatuses = Array.from(new Set(allQuotations.map(q => q.Status).filter(Boolean))) as string[];
    dynamicStatuses.sort();

    // Apply JS filters
    let filteredData = allQuotations;

    if (searchTerm) {
        const qStr = searchTerm.toLowerCase();
        filteredData = filteredData.filter(
            (r: any) =>
                (r.CustomerFirstName ?? '').toLowerCase().includes(qStr) ||
                (r.CustomerLastName ?? '').toLowerCase().includes(qStr) ||
                (r.CustomerName ?? '').toLowerCase().includes(qStr) ||
                (r.CustomerEmail ?? '').toLowerCase().includes(qStr) ||
                (r.DocumentNo ?? '').toLowerCase().includes(qStr) ||
                (r.GuarantorName ?? '').toLowerCase().includes(qStr) ||
                (r.Items ?? []).some((item: any) => (item.Name ?? '').toLowerCase().includes(qStr))
        );
    }

    if (statusFilter !== 'all') {
        filteredData = filteredData.filter((r) => r.Status === statusFilter);
    }

    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredData = filteredData.filter((r) => r.CreatedAt && new Date(r.CreatedAt) >= fromDate);
    }

    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter((r) => r.CreatedAt && new Date(r.CreatedAt) <= toDate);
    }

    if (guarantorFilter !== 'all') {
        filteredData = filteredData.filter((r) => r.GuarantorName === guarantorFilter);
    }

    // Compute Stats summary
    const completeQuotationsCount = filteredData.filter((q) => q.Status === 'Completed').length;
    const incompleteQuotationsCount = filteredData.filter((q) => q.Status === 'Incomplete').length;
    const waitingQuotationsCount = filteredData.filter((q) => q.Status === 'Waiting for Approval').length;

    // Paginate
    const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedQuotations = filteredData.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

    return (
        <ReportsPageView
            paginatedQuotations={paginatedQuotations as any}
            totalQuotationsCount={allQuotations.length}
            completeQuotationsCount={completeQuotationsCount}
            incompleteQuotationsCount={incompleteQuotationsCount}
            waitingQuotationsCount={waitingQuotationsCount}
            filteredQuotationsCount={filteredData.length}
            totalPages={totalPages}
            guarantors={initialGuarantors as any}
            dynamicStatuses={dynamicStatuses}
        />
    );
}
