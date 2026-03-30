import { getServerUser } from '@/lib/getServerUser';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EditQuotationClient from './EditQuotationClient';

export const dynamic = 'force-dynamic';

export default async function EditQuotationPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    await getServerUser();

    // Fetch initial data on the server
    const [dSnap, sSnap, gSnap, qDoc] = await Promise.all([
        prisma.m_Department.findMany({ where: { IsActive: true, IsDeleted: false } as any, orderBy: { SortOrder: 'asc' } }),
        prisma.m_Service.findMany({ where: { IsActive: true, IsDeleted: false } as any, orderBy: { ServiceName: 'asc' } }),
        (prisma as any).t_Guarantor.findMany({ where: { IsDeleted: false } as any, orderBy: { Name: 'asc' } }),
        prisma.t_Quotation.findUnique({
            where: { QuotationID: params.id },
            include: { Items: true }
        })
    ]);

    if (!qDoc) {
        redirect('/reports');
    }

    const quotation = {
        ...qDoc,
        id: qDoc.QuotationID,
        Discount: qDoc.Discount ? Number(qDoc.Discount) : 0,
        TotalAmount: qDoc.TotalAmount ? Number(qDoc.TotalAmount) : 0,
        Subtotal: qDoc.Subtotal ? Number(qDoc.Subtotal) : 0,
        Vat: qDoc.Vat ? Number(qDoc.Vat) : 0,
        Total: qDoc.Total ? Number(qDoc.Total) : 0,
        CreatedAt: qDoc.CreatedAt.toISOString(),
        UpdatedAt: qDoc.UpdatedAt.toISOString(),
        Items: qDoc.Items.map(i => ({
            ...i,
            Id: i.ItemID,
            Price: i.Price ? Number(i.Price) : 0,
            Total: i.Total ? Number(i.Total) : 0,
        }))
    };

    const initialDepartments = dSnap.map((d: any) => ({
        ...d,
        DepartmentID: d.DepartmentID,
        CreatedAt: d.CreatedAt.toISOString(),
        UpdatedAt: d.UpdatedAt?.toISOString(),
    }));

    const initialServices = sSnap.map((s: any) => ({
        ...s,
        ServiceID: s.ServiceID,
        Price: s.Price ? Number(s.Price) : 0,
        CreatedAt: s.CreatedAt.toISOString(),
        UpdatedAt: s.UpdatedAt?.toISOString(),
    }));

    const initialGuarantors = gSnap.map((g: any) => ({
        ...g,
        id: g.GuarantorID,
        DiscountPercentage: g.DiscountPercentage ? Number(g.DiscountPercentage) : 0,
        DiscountAmount: g.DiscountAmount ? Number(g.DiscountAmount) : 0,
        CreatedAt: g.CreatedAt.toISOString(),
        UpdatedAt: g.UpdatedAt?.toISOString(),
    }));

    return (
        <EditQuotationClient
            initialQuotation={quotation as any}
            initialDepartments={initialDepartments as any}
            initialServices={initialServices as any}
            initialGuarantors={initialGuarantors as any}
            id={params.id}
        />
    );
}
