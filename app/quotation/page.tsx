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

    // Auth-based Department Filter
    const isSuperAdmin = serverUser.RoleName === 'Super Admin';
    const userDeptId = serverUser.DepartmentID;

    // Build filters
    const serviceWhere: any = { IsActive: true, IsDeleted: false };
    const deptWhere: any = { IsActive: true, IsDeleted: false };

    if (!isSuperAdmin) {
        if (userDeptId) {
            serviceWhere.DepartmentID = userDeptId;
            deptWhere.DepartmentID = userDeptId;
        } else {
            // Restricted -> see nothing
            serviceWhere.DepartmentID = 'RESTRICTED_NONE';
            deptWhere.DepartmentID = 'RESTRICTED_NONE';
        }
    }

    const [departments, services, guarantors] = await Promise.all([
        prisma.m_Department.findMany({
            where: deptWhere as any,
            orderBy: { DepartmentName: 'asc' },
            select: { DepartmentID: true, DepartmentName: true, Icon: true, CreatedAt: true }
        }),
        prisma.m_Service.findMany({
            where: serviceWhere as any,
            select: { ServiceID: true, DepartmentID: true, ServiceName: true, Price: true, Unit: true, CreatedAt: true }
        }),
        (prisma as any).t_Guarantor.findMany({
            where: { IsDeleted: false } as any,
            select: { GuarantorID: true, Name: true, DiscountAmount: true, DiscountPercentage: true, CreatedAt: true, UpdatedAt: true }
        }),
    ]);

    const initialDepartments = departments.map(d => ({
        ...d,
        id: d.DepartmentID,
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
