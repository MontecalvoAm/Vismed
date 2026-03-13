import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createAuditLog } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Guarantors';

export async function GET(req: NextRequest) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanView');
    if (error) return error;

    try {
        const guarantors = await prisma.T_Guarantor.findMany({
            where: { IsDeleted: false },
            orderBy: { Name: 'asc' },
        });

        return NextResponse.json({ success: true, guarantors });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanAdd');
    if (error) return error;

    try {
        const body = await req.json();
        const { GuarantorID, GuarantorName, DiscountPercentage, DiscountAmount, Description, SortOrder, IsActive } = body;

        const newGuarantor = await prisma.t_Guarantor.create({
            data: {
                GuarantorID: GuarantorID || undefined,
                Name: GuarantorName || '',
                DiscountPercentage: DiscountPercentage ? Number(DiscountPercentage) : 0,
                DiscountAmount: DiscountAmount ? Number(DiscountAmount) : 0,
                Description: Description || '',
                SortOrder: SortOrder ? Number(SortOrder) : 0,
                IsActive: IsActive !== undefined ? Boolean(IsActive) : true,
                CreatedBy: authUser?.UserID,
                UpdatedBy: authUser?.UserID,
            },
        });

        await createAuditLog({
            Action: 'CREATE_GUARANTOR',
            Module: MODULE_NAME,
            Target: newGuarantor.GuarantorID,
            Details: JSON.stringify({ GuarantorName, DiscountPercentage, DiscountAmount, Description, SortOrder, IsActive }),
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true, id: newGuarantor.GuarantorID });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
