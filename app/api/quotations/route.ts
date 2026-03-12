// ============================================================
//  VisayasMed — API: GET /api/quotations
//  GET → Prisma SDK
//  Fetches all records from T_Quotation ordered by CreatedAt
// ============================================================

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@/lib/rateLimit';
import { errorResponse, successResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const guarantorId = searchParams.get('guarantorId');

        let whereClause = {};
        if (guarantorId) {
            const guarantor = await (prisma as any).t_Guarantor.findUnique({
                where: { GuarantorID: guarantorId }
            });
            if (guarantor) {
                whereClause = { GuarantorName: guarantor.Name };
            }
        }

        const quotationsData = await prisma.t_Quotation.findMany({
            where: whereClause,
            orderBy: { CreatedAt: 'desc' },
            include: {
                Items: true // Include items if needed, or follow existing logic
            }
        });

        const quotations = quotationsData.map((q: any) => ({
            ...q,
            id: q.QuotationID, // Compatibility
            TotalAmount: q.TotalAmount ? Number(q.TotalAmount) : 0,
            Discount: q.Discount ? Number(q.Discount) : 0,
            Subtotal: q.Subtotal ? Number(q.Subtotal) : 0,
            Vat: q.Vat ? Number(q.Vat) : 0,
            Total: q.Total ? Number(q.Total) : 0,
            Items: q.Items ? q.Items.map((item: any) => ({
                ...item,
                Price: item.Price ? Number(item.Price) : 0,
                Total: item.Total ? Number(item.Total) : 0
            })) : [],
            CreatedAt: q.CreatedAt ? q.CreatedAt.toISOString() : null,
            UpdatedAt: q.UpdatedAt ? q.UpdatedAt.toISOString() : null,
        }));

        return successResponse({ success: true, quotations });
    } catch (e: unknown) {
        return errorResponse(e, 'Failed to fetch quotations');
    }
}
