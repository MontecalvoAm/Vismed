import GuarantorManager from '@/components/manage/GuarantorManager';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export default async function GuarantorsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    // Fix copy-paste bug: Guarantors module requires Guarantors permissions, not Departments.
    if (!(serverUser as any)?.Permissions?.Guarantors?.CanView) {
        return null;
    }

    const searchTerm = (searchParams.search as string) || '';
    const currentPage = parseInt((searchParams.page as string) || '1', 10);
    const rowsPerPage = parseInt((searchParams.limit as string) || '5', 10);

    const guarantorsSnap = await adminDb.collection('T_Guarantor').get();

    // Parse Guarantors
    const allGuarantors = guarantorsSnap.docs.map(d => {
        const data = d.data() as any;
        return {
            id: d.id,
            ...data,
            CreatedAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
            UpdatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
        }
    }).filter(d => d.IsDeleted !== true);

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
