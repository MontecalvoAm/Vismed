import { getUsageLogs } from '@/lib/firestore/audit';
import { prisma } from '@/lib/prisma';
import SidebarLayout from '@/components/layout/SidebarLayout';
import AuditLogsView from './AuditLogsView';
import { getServerUser } from '@/lib/getServerUser';
import AccessDenied from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Logs?.CanView) {
        return (
            <SidebarLayout pageTitle="Audit Logs">
                <AccessDenied moduleName="Logs" />
            </SidebarLayout>
        );
    }

    const [logs, quotationsData] = await Promise.all([
        getUsageLogs(),
        (prisma as any).t_Quotation.findMany({
            where: { IsDeleted: false },
            orderBy: { CreatedAt: 'desc' }
        })
    ]);

    const quotations = quotationsData.map((q: any) => ({
        ...q,
        id: q.QuotationID,
        Subtotal: q.Subtotal ? Number(q.Subtotal) : 0,
        Vat: q.Vat ? Number(q.Vat) : 0,
        Total: q.Total ? Number(q.Total) : 0,
        CreatedAt: q.CreatedAt.toISOString(),
        UpdatedAt: q.UpdatedAt.toISOString(),
    }));

    return (
        <SidebarLayout pageTitle="Audit Logs">
            <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <AuditLogsView 
                    initialLogs={logs}
                    initialQuotations={quotations}
                />
            </div>
        </SidebarLayout>
    );
}
