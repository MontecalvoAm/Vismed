// ============================================================
//  VisayasMed — API: GET /api/archive
//  GET → Prisma SDK with Pagination & Search
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/serverAuth';
import { paginate } from '@/lib/pagination';

const MODULE_NAME = 'Archive';

export async function GET(req: NextRequest) {
    const { error } = await requireAuth(req, MODULE_NAME, 'CanView');
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'guarantors';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';
    const search = searchParams.get('search') || '';

    try {
        let result: any;

        switch (tab) {
            case 'guarantors': {
                result = await paginate(prisma.t_Guarantor, { page, pageSize, search }, { 
                    IsDeleted: true,
                    OR: search ? [
                        { Name: { contains: search } },
                        { Description: { contains: search } }
                    ] : undefined
                });
                result.data = result.data.map((d: any) => ({ ...d, id: d.GuarantorID }));
                break;
            }
            case 'quotations': {
                result = await paginate(prisma.t_Quotation, { page, pageSize, search }, { 
                    IsDeleted: true,
                    OR: search ? [
                        { CustomerName: { contains: search } },
                        { DocumentNo: { contains: search } }
                    ] : undefined
                });
                result.data = result.data.map((d: any) => ({ ...d, id: d.QuotationID }));
                break;
            }
            case 'departments': {
                result = await paginate(prisma.m_Department, { page, pageSize, search }, { 
                    IsDeleted: true,
                    OR: search ? [
                        { DepartmentName: { contains: search } },
                        { Description: { contains: search } }
                    ] : undefined
                });
                result.data = result.data.map((d: any) => ({ ...d, id: d.DepartmentID }));
                break;
            }
            case 'services': {
                result = await paginate(prisma.m_Service, { page, pageSize, search }, { 
                    IsDeleted: true,
                    OR: search ? [
                        { ServiceName: { contains: search } },
                        { Description: { contains: search } }
                    ] : undefined
                });
                result.data = result.data.map((d: any) => ({ ...d, id: d.ServiceID }));
                break;
            }
            case 'users': {
                result = await paginate(prisma.m_User, { page, pageSize, search }, { 
                    IsDeleted: true,
                    OR: search ? [
                        { Email: { contains: search } },
                        { FirstName: { contains: search } },
                        { LastName: { contains: search } }
                    ] : undefined
                }, undefined, { 
                    UserID: true, Email: true, FirstName: true, LastName: true, IsActive: true, CreatedAt: true, UpdatedAt: true 
                });
                result.data = result.data.map((d: any) => ({ ...d, id: d.UserID }));
                break;
            }
            case 'logs': {
                result = await paginate(prisma.t_AuditLog, { page, pageSize, search }, {
                    OR: search ? [
                        { Action: { contains: search } },
                        { Target: { contains: search } },
                        { Details: { contains: search } }
                    ] : undefined
                });
                result.data = result.data.map((d: any) => ({ ...d, id: d.LogID }));
                break;
            }
            default:
                return NextResponse.json({ success: false, error: 'Invalid tab' }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            records: result.data,
            meta: result.meta 
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
