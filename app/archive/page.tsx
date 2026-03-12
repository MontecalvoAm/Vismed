import ArchiveClient from '@/components/archive/ArchiveClient';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { getServerUser } from '@/lib/getServerUser';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function ArchivePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Archive?.CanView) {
        return (
            <SidebarLayout pageTitle="Archive">
                <AccessDenied moduleName="Archive" />
            </SidebarLayout>
        );
    }

    const tab = (searchParams.tab as string) || 'guarantors';

    let records: Record<string, any>[] = [];
    switch (tab) {
        case 'guarantors': {
            const data = await prisma.t_Guarantor.findMany({
                where: { IsDeleted: true },
                orderBy: { Name: 'asc' }
            });
            records = data.map(r => ({ ...r, id: r.GuarantorID }));
            break;
        }
        case 'quotations': {
            const data = await prisma.t_Quotation.findMany({
                where: { IsDeleted: true },
                orderBy: { CreatedAt: 'desc' },
                include: { Items: true }
            });
            records = data.map(r => ({ ...r, id: r.QuotationID, TotalAmount: r.TotalAmount ? Number(r.TotalAmount) : 0, Discount: r.Discount ? Number(r.Discount) : 0 }));
            break;
        }
        case 'departments': {
            const data = await prisma.m_Department.findMany({
                where: { IsDeleted: true },
                orderBy: { SortOrder: 'asc' }
            });
            records = data.map(r => ({ ...r, id: r.DepartmentID }));
            break;
        }
        case 'services': {
            const data = await prisma.m_Service.findMany({
                where: { IsDeleted: true },
                orderBy: { ServiceName: 'asc' }
            });
            records = data.map(r => ({ ...r, id: r.ServiceID, Price: r.Price ? Number(r.Price) : 0 }));
            break;
        }
        case 'users': {
            const data = await prisma.m_User.findMany({
                where: { IsDeleted: true },
                orderBy: { LastName: 'asc' }
            });
            records = data.map(({ Password, ...r }) => ({ ...r, id: r.UserID }));
            break;
        }
        case 'logs': {
            const data = await prisma.t_AuditLog.findMany({
                take: 200,
                orderBy: { CreatedAt: 'desc' }
            });
            records = data.map(r => ({ ...r, id: r.LogID }));
            break;
        }
    }

    return (
        <SidebarLayout pageTitle="Archive">
            <ArchiveClient initialTab={tab as any} serverRecords={records as any} perms={(serverUser as any)?.Permissions?.Archive} />
        </SidebarLayout>
    );
}
