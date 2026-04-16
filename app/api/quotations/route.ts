// ============================================================
//  VisayasMed — API: GET /api/quotations
//  GET → Prisma SDK with Pagination & Search
// ============================================================

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paginate } from '@/lib/pagination';
import { errorResponse, successResponse } from '@/lib/errors';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        // Pagination & Search params
        const page = searchParams.get('page') || '1';
        const pageSize = searchParams.get('pageSize') || '20';
        const search = searchParams.get('search') || '';
        const guarantorId = searchParams.get('guarantorId');
        const status = searchParams.get('status');
        const isDeleted = searchParams.get('isDeleted') === 'true';

        // Build where clause
        const whereClause: any = {
            IsDeleted: isDeleted,
        };

        if (guarantorId) {
            whereClause.GuarantorId = guarantorId;
        }

        if (status) {
            whereClause.Status = status;
        }

        if (search) {
            whereClause.OR = [
                { CustomerName: { contains: search } },
                { DocumentNo: { contains: search } },
                { CustomerFirstName: { contains: search } },
                { CustomerLastName: { contains: search } },
            ];
        }

        const result = await paginate(prisma.t_Quotation, 
            { page, pageSize, search, orderBy: 'CreatedAt', orderDir: 'desc' },
            whereClause,
            { Items: true } // Maintenance of existing include logic, though we could optimize this later
        );

        // Format data for frontend compatibility
        const quotations = result.data.map((q: any) => ({
            ...q,
            id: q.QuotationID,
            Total: q.Total ? Number(q.Total) : 0,
            Subtotal: q.Subtotal ? Number(q.Subtotal) : 0,
            Vat: q.Vat ? Number(q.Vat) : 0,
            Items: q.Items ? q.Items.map((item: any) => ({
                ...item,
                Price: item.Price ? Number(item.Price) : 0,
            })) : [],
            CreatedAt: q.CreatedAt ? q.CreatedAt.toISOString() : null,
            UpdatedAt: q.UpdatedAt ? q.UpdatedAt.toISOString() : null,
        }));

        return successResponse({ 
            success: true, 
            quotations,
            meta: result.meta 
        });
    } catch (e: unknown) {
        return errorResponse(e, 'Failed to fetch quotations');
    }
}
