import { getServerUser } from '@/lib/getServerUser';
import QuotationClient from './QuotationClient';
import { prisma } from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';
import SidebarLayout from '@/components/layout/SidebarLayout';

export const dynamic = 'force-dynamic';

export default async function QuotationPage() {
    const serverUser = await getServerUser();

    if (!(serverUser as any)?.Permissions?.Quotation?.CanView) {
        return (
            <SidebarLayout pageTitle="Quotation">
                <AccessDenied moduleName="Quotation" />
            </SidebarLayout>
        );
    }

    // Fetch initial data on the server
    const [departments, services, guarantors] = await Promise.all([
        prisma.m_Department.findMany({
            where: { IsActive: true, IsDeleted: false } as any,
            orderBy: { SortOrder: 'asc' }
        }),
        prisma.m_Service.findMany({
            where: { IsActive: true, IsDeleted: false } as any
        }),
        (prisma as any).t_Guarantor.findMany({
            where: { IsDeleted: false } as any
        }),
    ]);

    const initialDepartments = departments.map(d => ({
        ...d,
        id: d.DepartmentID, // For compatibility with client components expecting 'id'
        CreatedAt: d.CreatedAt.toISOString(),
    }));

    const initialServices = services.map(s => ({
        ...s,
        id: s.ServiceID,
        CreatedAt: s.CreatedAt.toISOString(),
        Price: Number(s.Price),
    }));

    const initialGuarantors = guarantors.map((g: any) => ({
        ...g,
        id: g.GuarantorID,
        DiscountAmount: g.DiscountAmount ? Number(g.DiscountAmount) : null,
        DiscountPercentage: g.DiscountPercentage ? Number(g.DiscountPercentage) : null,
        CreatedAt: g.CreatedAt.toISOString(),
        UpdatedAt: g.UpdatedAt.toISOString(),
    }));

    return (
        <QuotationClient
            initialDepartments={initialDepartments as any}
            initialServices={initialServices as any}
            initialGuarantors={initialGuarantors as any}
        />
    );
}
