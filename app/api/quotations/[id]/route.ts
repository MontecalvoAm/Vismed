import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/getServerUser';
import { createAuditLog } from '@/lib/firestore/audit';
import { requireAuth } from '@/lib/auth/serverAuth';
import { getClientIp } from '@/lib/rateLimit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const quotationData = await (prisma as any).t_Quotation.findUnique({
            where: { QuotationID: params.id },
            include: { Items: true }
        });

        if (!quotationData) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        const quotation = {
            ...quotationData,
            id: quotationData.QuotationID,
            TotalAmount: quotationData.TotalAmount ? Number(quotationData.TotalAmount) : 0,
            Discount: quotationData.Discount ? Number(quotationData.Discount) : 0,
            Subtotal: quotationData.Subtotal ? Number(quotationData.Subtotal) : 0,
            Vat: quotationData.Vat ? Number(quotationData.Vat) : 0,
            Total: quotationData.Total ? Number(quotationData.Total) : 0,
            Items: (quotationData.Items || []).map((item: any) => ({
                ...item,
                Price: item.Price ? Number(item.Price) : 0,
                Total: item.Total ? Number(item.Total) : 0,
                Id: item.ItemID
            })),
            CreatedAt: quotationData.CreatedAt ? quotationData.CreatedAt.toISOString() : null,
            UpdatedAt: quotationData.UpdatedAt ? quotationData.UpdatedAt.toISOString() : null,
        };

        return NextResponse.json({ success: true, quotation });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getServerUser();
        const body = await req.json();
        const { Status, Items } = body;

        // Start transaction if we need to update items too
        const updateData: any = {};
        if (Status !== undefined) updateData.Status = Status;

        await prisma.$transaction(async (tx) => {
            // Update quotation status
            if (Object.keys(updateData).length > 0) {
                await (tx as any).t_Quotation.update({
                    where: { QuotationID: params.id },
                    data: updateData
                });
            }

            // Update items if provided (e.g., tracking "Used" sessions)
            if (Items && Array.isArray(Items)) {
                for (const item of Items) {
                    const targetId = item.Id || item.ItemID;
                    if (targetId && item.Used !== undefined) {
                        await (tx as any).t_QuotationItem.update({
                            where: { ItemID: targetId },
                            data: { Used: item.Used }
                        });
                    }
                }
            }
        });

        // Add Audit Log using unified helper
        if (user) {
            await createAuditLog({
                Action: 'UPDATE_QUOTATION',
                Module: 'Quotations',
                Target: params.id,
                Details: JSON.stringify({ Status, Items }),
                UserID: (user as any).UserID,
            });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
