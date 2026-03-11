import { getServerUser } from '@/lib/getServerUser';
import ReportsPageView from './ReportsPageView';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export default async function ReportsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    await getServerUser();

    // Filters from URL
    const searchTerm = (searchParams.search as string) || '';
    const statusFilter = (searchParams.status as string) || 'all';
    const dateFrom = (searchParams.from as string) || '';
    const dateTo = (searchParams.to as string) || '';
    const guarantorFilter = (searchParams.guarantor as string) || 'all';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '10', 10);

    // Fetch all quotations to apply in-memory JS filtering & stat calculation 
    // This replicates the behavior of the massive client payload but does it on the server!
    let snap;
    try {
        snap = await adminDb.collection('T_Quotation').orderBy('CreatedAt', 'desc').get();
    } catch {
        snap = await adminDb.collection('T_Quotation').get();
    }

    const allQuotations = snap.docs
        .map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                CreatedAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
                UpdatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
            };
        })
        .filter((q: any) => q.IsDeleted !== true);

    const gSnap = await adminDb.collection('T_Guarantor').where('IsDeleted', '!=', true).get();
    const initialGuarantors = gSnap.docs.map(d => {
        const data = d.data() as any;
        return {
            id: d.id,
            ...data,
            CreatedAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
            UpdatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
        }
    });

    const dynamicStatuses = Array.from(new Set(allQuotations.map(q => q.Status).filter(Boolean))) as string[];
    dynamicStatuses.sort();

    // Apply JS filters exactly like the original client code
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

    // Compute Stats summary based on filtered data NOT paginated data
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
