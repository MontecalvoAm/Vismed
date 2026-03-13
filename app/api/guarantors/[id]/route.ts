import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createAuditLog } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Guarantors';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

    try {
        const resolvedParams = await params;
        const body = await req.json();
        const { GuarantorName, DiscountPercentage, DiscountAmount, Description, SortOrder, IsActive } = body;

        await prisma.t_Guarantor.update({
            where: { GuarantorID: resolvedParams.id },
            data: {
                Name: GuarantorName !== undefined ? GuarantorName : undefined,
                Description: Description !== undefined ? Description : undefined,
                DiscountPercentage: DiscountPercentage !== undefined ? Number(DiscountPercentage) : undefined,
                DiscountAmount: DiscountAmount !== undefined ? Number(DiscountAmount) : undefined,
                SortOrder: SortOrder !== undefined ? Number(SortOrder) : undefined,
                IsActive: IsActive !== undefined ? Boolean(IsActive) : undefined,
                UpdatedBy: authUser?.UserID,
            },
        });

        await createAuditLog({
            Action: 'UPDATE_GUARANTOR',
            Module: MODULE_NAME,
            Target: resolvedParams.id,
            Details: JSON.stringify({ GuarantorName, DiscountPercentage, DiscountAmount, Description, SortOrder, IsActive }),
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const resolvedParams = await params;

        // Soft delete
        await prisma.t_Guarantor.update({
            where: { GuarantorID: resolvedParams.id },
            data: {
                IsDeleted: true,
                IsActive: false,
                UpdatedBy: authUser?.UserID,
            },
        });

        await createAuditLog({
            Action: 'DELETE_GUARANTOR',
            Module: MODULE_NAME,
            Target: resolvedParams.id,
            Details: 'Guarantor marked as deleted',
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
