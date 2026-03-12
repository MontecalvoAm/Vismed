import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';

const MODULE_NAME = 'Guarantors';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanEdit');
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
            },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanDelete');
    if (error) return error;

    try {
        const resolvedParams = await params;

        // Soft delete
        await prisma.t_Guarantor.update({
            where: { GuarantorID: resolvedParams.id },
            data: {
                IsDeleted: true,
                IsActive: false,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
