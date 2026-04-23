import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { createAuditLog, diffDescription } from '@/lib/firestore/audit';
import { getClientIp } from '@/lib/rateLimit';

const MODULE_NAME = 'Guarantors';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user: authUser, error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
    if (error) return error;

    try {
        const resolvedParams = await params;
        const body = await req.json();
        const { GuarantorName, DiscountPercentage, DiscountAmount, Description, SortOrder, IsActive } = body;

        // Fetch old values for auditing
        const oldGuarantor = await prisma.t_Guarantor.findUnique({
            where: { GuarantorID: resolvedParams.id }
        });

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

        const labels = {
            GuarantorName: 'Name',
            DiscountPercentage: 'Discount %',
            DiscountAmount: 'Discount ₱',
            Description: 'Description',
            SortOrder: 'Sort Order',
            IsActive: 'Active Status'
        };

        // For diff, map 'Name' from DB to 'GuarantorName' from body
        const oldForDiff = oldGuarantor ? { ...oldGuarantor, GuarantorName: oldGuarantor.Name } : null;
        const diff = oldForDiff ? await diffDescription(oldForDiff, {
            ...body,
            DiscountPercentage: DiscountPercentage !== undefined ? Number(DiscountPercentage) : undefined,
            DiscountAmount: DiscountAmount !== undefined ? Number(DiscountAmount) : undefined
        }, labels) : 'Guarantor details updated';

        await createAuditLog({
            Action: 'UPDATE_GUARANTOR',
            Module: MODULE_NAME,
            Target: resolvedParams.id,
            Description: `Updated Guarantor ${GuarantorName || oldGuarantor?.Name || resolvedParams.id}: ${diff}`,
            Details: JSON.stringify({ GuarantorName, DiscountPercentage, DiscountAmount, Description, SortOrder, IsActive }),
            OldValues: oldGuarantor,
            NewValues: body,
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

        const oldGuarantor = await prisma.t_Guarantor.findUnique({
            where: { GuarantorID: resolvedParams.id }
        });

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
            Description: `Deleted Guarantor: ${oldGuarantor?.Name || resolvedParams.id}`,
            Details: 'Guarantor marked as deleted',
            UserID: authUser?.UserID,
            IpAddress: getClientIp(req),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
